import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const NOVAPAY_MONITOR_BACKGROUND_PATH = '/.netlify/functions/novapay-monitor-background';
const DISPATCH_HEADER_ID = 'x-miva-novapay-dispatch-id';
const DISPATCH_HEADER_ISSUED_AT = 'x-miva-novapay-dispatch-issued-at';
const DISPATCH_HEADER_SIGNATURE = 'x-miva-novapay-dispatch-signature';
const DISPATCH_MAX_AGE_MS = 10 * 60 * 1000;

function dispatchSecret(env = process.env) {
  // A dedicated secret can be configured later without a code change. Until
  // then derive a purpose-scoped HMAC key from the already-required Telegram
  // bot token, rather than exposing an unauthenticated rotation endpoint.
  return String(env.NOVAPAY_MONITOR_DISPATCH_SECRET || env.TELEGRAM_BOT_TOKEN || '').trim();
}

function headerValue(headers, name) {
  const target = name.toLowerCase();
  const match = Object.entries(headers || {}).find(([key]) => key.toLowerCase() === target);
  return String(match?.[1] || '').trim();
}

function safeEqual(actual, expected) {
  const left = Buffer.from(String(actual || ''));
  const right = Buffer.from(String(expected || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function signNovaPayMonitorDispatch(dispatchId, issuedAt, env = process.env) {
  const secret = dispatchSecret(env);
  if (!secret) return '';
  return createHmac('sha256', secret)
    .update(`miva-novapay-monitor-background-v1:${dispatchId}:${issuedAt}`)
    .digest('base64url');
}

export function isNovaPayMonitorDispatchAuthorized(headers, { env = process.env, now = Date.now() } = {}) {
  const dispatchId = headerValue(headers, DISPATCH_HEADER_ID);
  const issuedAt = Number(headerValue(headers, DISPATCH_HEADER_ISSUED_AT));
  const signature = headerValue(headers, DISPATCH_HEADER_SIGNATURE);
  if (!/^[\da-f-]{36}$/iu.test(dispatchId) || !Number.isSafeInteger(issuedAt)) return false;
  if (Math.abs(now - issuedAt) > DISPATCH_MAX_AGE_MS) return false;
  const expected = signNovaPayMonitorDispatch(dispatchId, issuedAt, env);
  // An absent dispatcher secret must never make an empty supplied signature
  // look valid. Keep the worker closed until a real function-scoped secret is
  // present (currently derived from the required bot token by default).
  if (!expected) return false;
  return safeEqual(signature, expected);
}

export async function enqueueNovaPayMonitorBackgroundRun({
  env = process.env,
  fetchImpl = fetch,
  now = () => Date.now(),
  timeoutFactory = AbortSignal.timeout,
  dispatchId = randomUUID()
} = {}) {
  const origin = String(env.URL || '').replace(/\/$/u, '');
  if (!origin.startsWith('https://')) throw new Error('NovaPay monitor dispatcher requires a site URL');
  if (!dispatchSecret(env)) throw new Error('NovaPay monitor dispatcher is not configured');

  const issuedAt = Number(now());
  const response = await fetchImpl(`${origin}${NOVAPAY_MONITOR_BACKGROUND_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [DISPATCH_HEADER_ID]: dispatchId,
      [DISPATCH_HEADER_ISSUED_AT]: String(issuedAt),
      [DISPATCH_HEADER_SIGNATURE]: signNovaPayMonitorDispatch(dispatchId, issuedAt, env)
    },
    body: JSON.stringify({ dispatchId, issuedAt }),
    signal: timeoutFactory(10000)
  });
  if (response.status !== 202) throw new Error(`NovaPay monitor background dispatch failed: HTTP ${response.status}`);
  return { queued: true, dispatchId };
}
