import test from 'node:test';
import assert from 'node:assert/strict';
import {
  configuredNovaPayBootstrap,
  fetchNovaPayPaymentsWithCredentialLease,
  selectNovaPayCredentials
} from '../netlify/functions/novapay-monitor.js';

const bootstrap = {
  refreshToken: 'fresh-bootstrap-token',
  publicCertificate: 'fresh-bootstrap-certificate',
  credentialEpoch: 'epoch-2026-10-22'
};

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

test('uses only a stored pair from the active epoch', () => {
  const stored = {
    refreshToken: 'rotated-token',
    publicCertificate: 'rotated-certificate',
    sourceVersion: 'jwt-rotation-v3-serialized',
    credentialEpoch: bootstrap.credentialEpoch
  };
  assert.equal(selectNovaPayCredentials(stored, bootstrap).source, 'stored');
  assert.equal(selectNovaPayCredentials({ ...stored, credentialEpoch: 'old-epoch' }, bootstrap).source, 'bootstrap');
  assert.equal(selectNovaPayCredentials(null, null).kind, 'reconnect_required');
});

test('never retries a rejected stored pair with the configured bootstrap pair', async () => {
  const stored = {
    refreshToken: 'stored-token',
    publicCertificate: 'stored-certificate',
    sourceVersion: 'jwt-rotation-v3-serialized',
    credentialEpoch: bootstrap.credentialEpoch
  };
  const seen = [];
  await assert.rejects(() => fetchNovaPayPaymentsWithCredentialLease({
    dateFrom: '2026-10-01',
    dateTo: '2026-10-22',
    bootstrap,
    loadCredentials: async () => stored,
    acquireLease: async () => ({ ownerId: 'one', etag: 'one' }),
    releaseLease: async () => true,
    fetchPayments: async ({ credentials }) => {
      seen.push(credentials.refreshToken);
      throw new Error('NovaPay UserAuthenticationJWT: access denied');
    }
  }), /UserAuthenticationJWT/);
  assert.deepEqual(seen, ['stored-token']);
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
    loadCredentials: async () => null, acquireLease, releaseLease, fetchPayments,
    saveCredentials: async (value) => { saved.push(value); }
  });
  await new Promise((resolve) => setImmediate(resolve));
  const second = await fetchNovaPayPaymentsWithCredentialLease({
    dateFrom: '2026-10-01', dateTo: '2026-10-22', bootstrap,
    loadCredentials: async () => null, acquireLease, releaseLease, fetchPayments,
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
    sourceVersion: 'jwt-rotation-v3-serialized',
    credentialEpoch: bootstrap.credentialEpoch
  }]);
});
