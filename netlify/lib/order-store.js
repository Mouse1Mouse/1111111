import { connectLambda, getStore } from '@netlify/blobs';

const STORE_NAME = 'miva-instagram-orders';

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
    .filter((order) => includeClosed || !['receipt_done', 'cancelled'].includes(order.status))
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
