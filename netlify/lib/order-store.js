import { connectLambda, getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';

const STORE_NAME = 'miva-instagram-orders';
const NOVAPAY_CREDENTIAL_LEASE_KEY = 'locks/novapay-credential-rotation.json';
const NOVAPAY_CREDENTIAL_LEASE_MS = 3 * 60 * 1000;

export function connectOrderStore(event) {
  connectLambda(event);
}

function store() {
  return getStore(STORE_NAME);
}

export async function getOrder(id) {
  return store().get(`orders/${id}.json`, { type: 'json' });
}

export async function saveOrder(order) {
  await store().setJSON(`orders/${order.id}.json`, order);
  return order;
}

export async function listOrders({ includeClosed = false, limit = 20 } = {}) {
  const result = await store().list({ prefix: 'orders/' });
  const keys = result.blobs.map((blob) => blob.key).slice(-100);
  const orders = (await Promise.all(keys.map((key) => store().get(key, { type: 'json' }))))
    .filter(Boolean)
    .filter((order) => includeClosed || !['closed', 'receipt_done', 'cancelled'].includes(order.status))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return orders.slice(0, limit);
}

export async function getSession(chatId) {
  return store().get(`sessions/${chatId}.json`, { type: 'json' });
}

export async function saveSession(chatId, session) {
  await store().setJSON(`sessions/${chatId}.json`, session);
}

export async function clearSession(chatId) {
  await store().delete(`sessions/${chatId}.json`);
}

export async function claimUpdate(updateId) {
  const result = await store().set(`updates/${updateId}`, new Date().toISOString(), { onlyIfNew: true });
  return result.modified;
}

export async function claimAction(action, orderId) {
  const key = `actions/${action}/${orderId}.json`;
  const value = { state: 'processing', startedAt: new Date().toISOString() };
  const result = await store().set(key, JSON.stringify(value), {
    onlyIfNew: true,
    metadata: { contentType: 'application/json' }
  });
  return result.modified;
}

export async function completeAction(action, orderId, result = {}) {
  await store().setJSON(`actions/${action}/${orderId}.json`, {
    state: 'completed',
    completedAt: new Date().toISOString(),
    ...result
  });
}

export async function releaseAction(action, orderId) {
  await store().delete(`actions/${action}/${orderId}.json`);
}

export async function getAction(action, orderId) {
  return store().get(`actions/${action}/${orderId}.json`, { type: 'json' });
}

export async function saveBotError(entry) {
  const createdAt = entry.createdAt || new Date().toISOString();
  const suffix = Math.random().toString(36).slice(2, 8);
  const key = `errors/${createdAt.replace(/[^\d]/g, '')}-${suffix}.json`;
  await store().setJSON(key, { ...entry, createdAt });
}

export async function listBotErrors({ limit = 10 } = {}) {
  const result = await store().list({ prefix: 'errors/' });
  const keys = result.blobs.map((blob) => blob.key).slice(-Math.max(limit, 30));
  const entries = (await Promise.all(keys.map((key) => store().get(key, { type: 'json' }))))
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return entries.slice(0, limit);
}

export async function getFiscalShiftState(cashId) {
  return store().get(`fiscal/shifts/${cashId}.json`, { type: 'json' });
}

export async function saveFiscalShiftState(state) {
  await store().setJSON(`fiscal/shifts/${state.cashId}.json`, state);
  return state;
}

export async function getNovaPayApiCredentials() {
  const raw = await store().get('integrations/novapay-api-credentials.json', { type: 'text' });
  return parseNovaPayApiCredentials(raw);
}

export function parseNovaPayApiCredentials(raw) {
  if (!raw) return null;
  try {
    const json = String(raw).startsWith('base64:')
      ? Buffer.from(String(raw).slice('base64:'.length), 'base64').toString('utf8')
      : raw;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function serializeNovaPayApiCredentials(credentials, rotatedAt = new Date().toISOString()) {
  return {
    refreshToken: String(credentials.refreshToken || ''),
    publicCertificate: String(credentials.publicCertificate || ''),
    sourceVersion: String(credentials.sourceVersion || ''),
    credentialEpoch: String(credentials.credentialEpoch || ''),
    rotatedAt
  };
}

export async function saveNovaPayApiCredentials(credentials) {
  const value = serializeNovaPayApiCredentials(credentials);
  if (!value.refreshToken || !value.publicCertificate || !value.credentialEpoch) {
    throw new Error('NovaPay rotated credentials are incomplete');
  }
  await store().setJSON('integrations/novapay-api-credentials.json', value);
  return value;
}

// NovaPay refresh tokens rotate after every successful authorization. This
// short lease ensures two monitor invocations cannot spend the same pair.
// It stores no credential material and self-expires if an invocation dies.
export async function claimNovaPayCredentialLease({ durationMs = NOVAPAY_CREDENTIAL_LEASE_MS } = {}) {
  const now = Date.now();
  const lease = {
    ownerId: randomUUID(),
    acquiredAt: new Date(now).toISOString(),
    expiresAt: new Date(now + durationMs).toISOString()
  };

  const created = await store().setJSON(NOVAPAY_CREDENTIAL_LEASE_KEY, lease, { onlyIfNew: true });
  if (created.modified) return { ...lease, etag: created.etag };

  const current = await store().getWithMetadata(NOVAPAY_CREDENTIAL_LEASE_KEY, { type: 'json' });
  if (!current) {
    const retried = await store().setJSON(NOVAPAY_CREDENTIAL_LEASE_KEY, lease, { onlyIfNew: true });
    return retried.modified ? { ...lease, etag: retried.etag } : null;
  }

  const expiresAt = Date.parse(String(current.data?.expiresAt || ''));
  if (Number.isFinite(expiresAt) && expiresAt > now) return null;

  const takenOver = await store().setJSON(NOVAPAY_CREDENTIAL_LEASE_KEY, lease, {
    onlyIfMatch: current.etag
  });
  return takenOver.modified ? { ...lease, etag: takenOver.etag } : null;
}

export async function releaseNovaPayCredentialLease(lease) {
  if (!lease?.ownerId || !lease?.etag) return false;
  const current = await store().getWithMetadata(NOVAPAY_CREDENTIAL_LEASE_KEY, { type: 'json' });
  if (!current || current.data?.ownerId !== lease.ownerId) return false;

  const released = await store().setJSON(NOVAPAY_CREDENTIAL_LEASE_KEY, {
    ...current.data,
    releasedAt: new Date().toISOString(),
    expiresAt: new Date(0).toISOString()
  }, { onlyIfMatch: lease.etag });
  return Boolean(released.modified);
}

export async function claimFiscalNotification(key, details = {}) {
  const result = await store().set(
    `fiscal/notifications/${key}.json`,
    JSON.stringify({ ...details, createdAt: new Date().toISOString() }),
    {
      onlyIfNew: true,
      metadata: { contentType: 'application/json' }
    }
  );
  return result.modified;
}
