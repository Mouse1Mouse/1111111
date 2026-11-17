import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyNovaPayAuthFailure,
  configuredNovaPayBootstrap,
  createNovaPayMonitorScheduledHandler,
  fetchNovaPayPaymentsWithCredentialLease,
  novaPayBootstrapConfigurationStatus,
  selectNovaPayCredentials
} from '../netlify/functions/novapay-monitor.js';

const bootstrap = {
  refreshToken: 'fresh-bootstrap-token',
  publicCertificate: 'fresh-bootstrap-certificate',
  credentialEpoch: 'epoch-2026-10-22'
};
const noPendingAuthAttempt = async () => null;

test('requires versioned bootstrap credentials and an epoch', () => {
  assert.equal(configuredNovaPayBootstrap({ NOVAPAY_REFRESH_TOKEN: 'legacy', NOVAPAY_PUBLIC_CERTIFICATE: 'legacy' }), null);
  assert.deepEqual(configuredNovaPayBootstrap({
    NOVAPAY_REFRESH_TOKEN_V2: ' token ',
    NOVAPAY_PUBLIC_CERTIFICATE_V2: ' certificate ',
    NOVAPAY_CREDENTIAL_EPOCH: ' rebinding-1 '
  }), {
    refreshToken: 'token',
    publicCertificate: 'certificate',
    credentialEpoch: 'rebinding-1'
  });
});

test('reports only boolean bootstrap configuration status', () => {
  assert.deepEqual(novaPayBootstrapConfigurationStatus({
    NOVAPAY_REFRESH_TOKEN_V2: ' token ',
    NOVAPAY_PUBLIC_CERTIFICATE_V2: '',
    NOVAPAY_CREDENTIAL_EPOCH: ' epoch '
  }), {
    refreshTokenConfigured: true,
    publicCertificateConfigured: false,
    credentialEpochConfigured: true,
    loginConfigured: false
  });
});

test('keeps the scheduled monitor within the dispatcher path', async () => {
  let receivedEnv = null;
  const handler = createNovaPayMonitorScheduledHandler({
    env: {
      NOVAPAY_LOGIN: 'api-user',
      NOVAPAY_REFRESH_TOKEN_V2: 'bootstrap-token',
      NOVAPAY_PUBLIC_CERTIFICATE_V2: 'bootstrap-certificate',
      NOVAPAY_CREDENTIAL_EPOCH: 'epoch-2026-10-22',
      TELEGRAM_BOT_TOKEN: 'bot-token',
      TELEGRAM_OPERATOR_CHAT_IDS: '123'
    },
    enqueueBackgroundRun: async ({ env }) => {
      receivedEnv = env;
      return { queued: true };
    }
  });

  const result = await handler();

  assert.equal(result.statusCode, 202);
  assert.deepEqual(JSON.parse(result.body), { ok: true, queued: true });
  assert.equal(receivedEnv.NOVAPAY_LOGIN, 'api-user');
});

test('uses a safe, actionable category for a NovaPay authentication failure', () => {
  assert.equal(
    classifyNovaPayAuthFailure(new Error('NovaPay UserAuthenticationJWT: public certificate is invalid')),
    'certificate_rejected'
  );
  assert.equal(
    classifyNovaPayAuthFailure(new Error('NovaPay UserAuthenticationJWT: access denied')),
    'user_authentication_rejected'
  );
  assert.equal(classifyNovaPayAuthFailure(new Error('NovaPay GetPaymentsList: HTTP 500')), null);
});

test('uses only a stored pair from the active epoch', () => {
  const stored = {
    refreshToken: 'rotated-token',
    publicCertificate: 'rotated-certificate',
    sourceVersion: 'jwt-rotation-v5-normalized-pem-20261102',
    credentialEpoch: bootstrap.credentialEpoch
  };
  assert.equal(selectNovaPayCredentials(stored, bootstrap).source, 'stored');
  assert.equal(
    selectNovaPayCredentials({ ...stored, sourceVersion: 'jwt-rotation-v4-recovery-20261030' }, bootstrap).source,
    'bootstrap'
  );
  assert.equal(selectNovaPayCredentials({ ...stored, sourceVersion: 'jwt-rotation-v3-serialized' }, bootstrap).source, 'bootstrap');
  assert.equal(selectNovaPayCredentials({ ...stored, credentialEpoch: 'old-epoch' }, bootstrap).source, 'bootstrap');
  assert.equal(selectNovaPayCredentials(null, null).kind, 'reconnect_required');
});

test('never retries a rejected stored pair with the configured bootstrap pair', async () => {
  const stored = {
    refreshToken: 'stored-token',
    publicCertificate: 'stored-certificate',
    sourceVersion: 'jwt-rotation-v5-normalized-pem-20261102',
    credentialEpoch: bootstrap.credentialEpoch
  };
  const seen = [];
  await assert.rejects(() => fetchNovaPayPaymentsWithCredentialLease({
    dateFrom: '2026-10-01',
    dateTo: '2026-10-22',
    bootstrap,
    loadCredentials: async () => stored,
    loadAuthAttempt: noPendingAuthAttempt,
    acquireLease: async () => ({ ownerId: 'one', etag: 'one' }),
    releaseLease: async () => true,
    fetchPayments: async ({ credentials }) => {
      seen.push(credentials.refreshToken);
      throw new Error('NovaPay UserAuthenticationJWT: access denied');
    }
  }), /UserAuthenticationJWT/);
  assert.deepEqual(seen, ['stored-token']);
});

test('retains the safe source marker when a credential pair is rejected', async () => {
  await assert.rejects(
    () => fetchNovaPayPaymentsWithCredentialLease({
      dateFrom: '2026-10-01',
      dateTo: '2026-10-22',
      bootstrap,
      loadCredentials: async () => null,
      loadAuthAttempt: noPendingAuthAttempt,
      acquireLease: async () => ({ ownerId: 'one', etag: 'one' }),
      releaseLease: async () => true,
      fetchPayments: async () => {
        throw new Error('NovaPay UserAuthenticationJWT: access denied');
      }
    }),
    (error) => error?.novaPayCredentialSource === 'bootstrap'
  );
});

test('defers a concurrent run instead of spending the same rotating pair twice', async () => {
  let acquired = false;
  let releaseFetch;
  const fetchGate = new Promise((resolve) => { releaseFetch = resolve; });
  let fetchCount = 0;
  const saved = [];
  const acquireLease = async () => {
    if (acquired) return null;
    acquired = true;
    return { ownerId: 'one', etag: 'one' };
  };
  const releaseLease = async () => { acquired = false; return true; };
  const fetchPayments = async ({ onCredentialsRotated }) => {
    fetchCount += 1;
    await fetchGate;
    await onCredentialsRotated({ refreshToken: 'next-token', publicCertificate: 'next-certificate' });
    return [];
  };

  const first = fetchNovaPayPaymentsWithCredentialLease({
    dateFrom: '2026-10-01', dateTo: '2026-10-22', bootstrap,
    loadCredentials: async () => null, loadAuthAttempt: noPendingAuthAttempt,
    acquireLease, releaseLease, fetchPayments,
    saveCredentials: async (value) => { saved.push(value); }
  });
  await new Promise((resolve) => setImmediate(resolve));
  const second = await fetchNovaPayPaymentsWithCredentialLease({
    dateFrom: '2026-10-01', dateTo: '2026-10-22', bootstrap,
    loadCredentials: async () => null, loadAuthAttempt: noPendingAuthAttempt,
    acquireLease, releaseLease, fetchPayments,
    saveCredentials: async (value) => { saved.push(value); }
  });
  releaseFetch();
  const firstResult = await first;

  assert.equal(second.kind, 'deferred');
  assert.equal(firstResult.kind, 'completed');
  assert.equal(fetchCount, 1);
  assert.deepEqual(saved, [{
    refreshToken: 'next-token',
    publicCertificate: 'next-certificate',
    sourceVersion: 'jwt-rotation-v5-normalized-pem-20261102',
    credentialEpoch: bootstrap.credentialEpoch
  }]);
});

test('does not reuse a pair after an indeterminate authentication outcome', async () => {
  let marker = null;
  let fetchCount = 0;
  const beginAuthAttempt = async ({ credentialEpoch, source }) => {
    marker = {
      state: 'pending',
      attemptId: 'attempt-1',
      credentialEpoch,
      source
    };
    return marker;
  };
  const resolveAuthAttempt = async (attempt) => {
    if (marker?.attemptId !== attempt?.attemptId) return false;
    marker = { ...marker, state: 'resolved' };
    return true;
  };
  const fetchPayments = async ({ onAuthenticationAttemptStart }) => {
    fetchCount += 1;
    await onAuthenticationAttemptStart();
    const error = new Error('NovaPay UserAuthenticationJWT: request outcome is unknown');
    Object.defineProperty(error, 'novaPayAuthAttemptOutcome', { value: 'indeterminate' });
    throw error;
  };
  const options = {
    dateFrom: '2026-10-01',
    dateTo: '2026-10-22',
    bootstrap,
    loadCredentials: async () => null,
    loadAuthAttempt: async () => marker,
    beginAuthAttempt,
    resolveAuthAttempt,
    acquireLease: async () => ({ ownerId: 'one', etag: 'one' }),
    releaseLease: async () => true,
    fetchPayments
  };

  await assert.rejects(() => fetchNovaPayPaymentsWithCredentialLease(options), /request outcome is unknown/);
  const blocked = await fetchNovaPayPaymentsWithCredentialLease(options);

  assert.equal(blocked.kind, 'auth_outcome_unknown');
  assert.equal(fetchCount, 1);
  assert.equal(marker.state, 'pending');
});

test('uses the saved successor on a safe retry after a downstream read failure', async () => {
  let saved = null;
  let marker = null;
  let attemptNumber = 0;
  const seenTokens = [];
  const beginAuthAttempt = async ({ credentialEpoch, source }) => {
    attemptNumber += 1;
    marker = {
      state: 'pending',
      attemptId: `attempt-${attemptNumber}`,
      credentialEpoch,
      source
    };
    return marker;
  };
  const resolveAuthAttempt = async (attempt) => {
    if (marker?.attemptId !== attempt?.attemptId) return false;
    marker = { ...marker, state: 'resolved' };
    return true;
  };
  const fetchPayments = async ({ credentials, onAuthenticationAttemptStart, onCredentialsRotated }) => {
    seenTokens.push(credentials.refreshToken);
    await onAuthenticationAttemptStart();
    await onCredentialsRotated({
      refreshToken: seenTokens.length === 1 ? 'saved-successor-token' : 'second-successor-token',
      publicCertificate: 'saved-successor-certificate'
    });
    if (seenTokens.length === 1) throw new Error('NovaPay GetClientsList: HTTP 500');
    return [];
  };
  const options = {
    dateFrom: '2026-10-01',
    dateTo: '2026-10-22',
    bootstrap,
    loadCredentials: async () => saved,
    loadAuthAttempt: async () => marker,
    beginAuthAttempt,
    resolveAuthAttempt,
    acquireLease: async () => ({ ownerId: 'one', etag: 'one' }),
    releaseLease: async () => true,
    fetchPayments,
    saveCredentials: async (credentials) => { saved = credentials; }
  };

  await assert.rejects(() => fetchNovaPayPaymentsWithCredentialLease(options), /GetClientsList/);
  const retried = await fetchNovaPayPaymentsWithCredentialLease(options);

  assert.equal(retried.kind, 'completed');
  assert.equal(retried.source, 'stored');
  assert.deepEqual(seenTokens, ['fresh-bootstrap-token', 'saved-successor-token']);
  assert.equal(marker.state, 'resolved');
});

test('blocks future reuse when the rotated pair cannot be saved', async () => {
  let marker = null;
  let fetchCount = 0;
  const options = {
    dateFrom: '2026-10-01',
    dateTo: '2026-10-22',
    bootstrap,
    loadCredentials: async () => null,
    loadAuthAttempt: async () => marker,
    beginAuthAttempt: async ({ credentialEpoch, source }) => {
      marker = { state: 'pending', attemptId: 'attempt-save-failure', credentialEpoch, source };
      return marker;
    },
    resolveAuthAttempt: async () => false,
    acquireLease: async () => ({ ownerId: 'one', etag: 'one' }),
    releaseLease: async () => true,
    fetchPayments: async ({ onAuthenticationAttemptStart, onCredentialsRotated }) => {
      fetchCount += 1;
      await onAuthenticationAttemptStart();
      await onCredentialsRotated({ refreshToken: 'next-token', publicCertificate: 'next-certificate' });
      return [];
    },
    saveCredentials: async () => { throw new Error('Blob write unavailable'); }
  };

  await assert.rejects(
    () => fetchNovaPayPaymentsWithCredentialLease(options),
    (error) => error?.novaPayAuthAttemptOutcome === 'indeterminate' && /Blob write unavailable/.test(error.message)
  );
  const blocked = await fetchNovaPayPaymentsWithCredentialLease(options);

  assert.equal(blocked.kind, 'auth_outcome_unknown');
  assert.equal(fetchCount, 1);
});
