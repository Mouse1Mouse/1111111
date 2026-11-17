import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enqueueNovaPayMonitorBackgroundRun,
  isNovaPayMonitorDispatchAuthorized,
  NOVAPAY_MONITOR_BACKGROUND_PATH,
  signNovaPayMonitorDispatch
} from '../netlify/lib/novapay-monitor-dispatch.js';
import { createNovaPayMonitorBackgroundHandler } from '../netlify/functions/novapay-monitor-background.js';

const dispatchId = '2f8751ec-4b11-48d5-a3d4-3e1a20f5cf54';
const issuedAt = 1_763_500_000_000;
const env = {
  URL: 'https://miva.example',
  TELEGRAM_BOT_TOKEN: 'test-only-bot-token'
};

test('signs and queues the protected NovaPay background worker', async () => {
  const timeoutValues = [];
  let request;
  const result = await enqueueNovaPayMonitorBackgroundRun({
    env,
    now: () => issuedAt,
    dispatchId,
    timeoutFactory: (milliseconds) => {
      timeoutValues.push(milliseconds);
      return new AbortController().signal;
    },
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response('', { status: 202 });
    }
  });

  assert.deepEqual(result, { queued: true, dispatchId });
  assert.equal(request.url, `${env.URL}${NOVAPAY_MONITOR_BACKGROUND_PATH}`);
  assert.equal(request.init.method, 'POST');
  assert.equal(request.init.headers['x-miva-novapay-dispatch-id'], dispatchId);
  assert.equal(isNovaPayMonitorDispatchAuthorized(request.init.headers, { env, now: issuedAt }), true);
  assert.equal(JSON.stringify(request.init.headers).includes(env.TELEGRAM_BOT_TOKEN), false);
  assert.deepEqual(timeoutValues, [10000]);
});

test('rejects missing, stale, and tampered background dispatch signatures', () => {
  const validHeaders = {
    'x-miva-novapay-dispatch-id': dispatchId,
    'x-miva-novapay-dispatch-issued-at': String(issuedAt),
    'x-miva-novapay-dispatch-signature': signNovaPayMonitorDispatch(dispatchId, issuedAt, env)
  };

  assert.equal(isNovaPayMonitorDispatchAuthorized(validHeaders, { env, now: issuedAt }), true);
  assert.equal(isNovaPayMonitorDispatchAuthorized({ ...validHeaders, 'x-miva-novapay-dispatch-signature': 'tampered' }, { env, now: issuedAt }), false);
  assert.equal(isNovaPayMonitorDispatchAuthorized(validHeaders, { env, now: issuedAt + 600_001 }), false);
  assert.equal(isNovaPayMonitorDispatchAuthorized({
    'x-miva-novapay-dispatch-id': dispatchId,
    'x-miva-novapay-dispatch-issued-at': String(issuedAt),
    'x-miva-novapay-dispatch-signature': ''
  }, {
    env: { URL: env.URL },
    now: issuedAt
  }), false);
});

test('background handler refuses untrusted or duplicate dispatches before monitoring', async () => {
  const calls = [];
  const handler = createNovaPayMonitorBackgroundHandler({
    authorize: () => true,
    connectStore: () => { calls.push('connect'); },
    claimDispatch: async () => false,
    runMonitor: async () => {
      calls.push('run');
      return { statusCode: 200, body: '{}' };
    }
  });
  const result = await handler({
    httpMethod: 'POST',
    headers: { 'x-miva-novapay-dispatch-id': dispatchId }
  });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { ok: false, skipped: 'duplicate_or_in_progress' });
  assert.deepEqual(calls, ['connect']);
});

test('background handler does not connect or run for an unauthorized request', async () => {
  const handler = createNovaPayMonitorBackgroundHandler({
    authorize: () => false,
    connectStore: () => { throw new Error('should not connect'); },
    claimDispatch: async () => { throw new Error('should not claim'); },
    runMonitor: async () => { throw new Error('should not run'); }
  });
  const result = await handler({ httpMethod: 'POST', headers: {} });

  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { ok: false, skipped: 'unauthorized_dispatch' });
});
