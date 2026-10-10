import { randomUUID } from 'node:crypto';

const API_ORIGIN = 'https://api.checkbox.ua';
const CLIENT_NAME = 'MIVA Telegram';
const CLIENT_VERSION = '1.0.0';

function clean(value) {
  return String(value || '').trim();
}

function kopecks(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Checkbox amount must be positive');
  return Math.round(amount * 100);
}

export function getCheckboxConfig(env = process.env) {
  return {
    enabled: clean(env.CHECKBOX_LIVE_ENABLED).toLowerCase() === 'true',
    cashierPin: clean(env.CHECKBOX_CASHIER_PIN),
    licenseKey: clean(env.CHECKBOX_LICENSE_KEY),
    clientName: clean(env.CHECKBOX_CLIENT_NAME) || CLIENT_NAME,
    clientVersion: clean(env.CHECKBOX_CLIENT_VERSION) || CLIENT_VERSION
  };
}

export function isCheckboxConfigured(env = process.env) {
  const config = getCheckboxConfig(env);
  return Boolean(config.cashierPin && config.licenseKey);
}

export function assertCheckboxLiveConfig(env = process.env) {
  const config = getCheckboxConfig(env);
  if (!config.enabled) throw new Error('Checkbox live fiscalization is disabled');
  if (!config.cashierPin || !config.licenseKey) {
    throw new Error('Checkbox cashier PIN or cash-register license key is missing');
  }
  return config;
}

export function checkboxHeaders({ token = '', config = getCheckboxConfig() } = {}) {
  const headers = {
    accept: 'application/json',
    'content-type': 'application/json',
    'X-Client-Name': config.clientName,
    'X-Client-Version': config.clientVersion
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (config.licenseKey) headers['X-License-Key'] = config.licenseKey;
  return headers;
}

async function request(path, { method = 'GET', token = '', body, config = getCheckboxConfig(), fetchImpl = fetch } = {}) {
  const response = await fetchImpl(`${API_ORIGIN}${path}`, {
    method,
    headers: checkboxHeaders({ token, config }),
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Checkbox ${response.status}: ${payload.message || payload.detail || 'request failed'}`);
  }
  return payload;
}

export async function signInCheckbox(config = assertCheckboxLiveConfig(), fetchImpl = fetch) {
  const result = await request('/api/v1/cashier/signinPinCode', {
    method: 'POST',
    config,
    fetchImpl,
    body: { pin_code: config.cashierPin }
  });
  if (!clean(result.access_token)) throw new Error('Checkbox did not return an access token');
  return result.access_token;
}

export function buildCheckboxSalePayload({ receiptId = randomUUID(), orderId, items, paymentAmount, customer = {} } = {}) {
  if (!Array.isArray(items) || !items.length) throw new Error('Checkbox receipt must contain goods');
  const goods = items.map((item) => ({
    good: {
      code: clean(item.sku) || 'MIVA-ITEM',
      name: clean(item.name) || 'Постільна білизна',
      price: kopecks(item.unitPrice)
    },
    quantity: Math.round(Number(item.quantity || 1) * 1000),
    is_return: false
  }));
  const goodsTotal = goods.reduce((sum, item) => sum + item.good.price * item.quantity / 1000, 0);
  const payment = kopecks(paymentAmount);
  if (payment > goodsTotal) throw new Error('Checkbox payment exceeds goods total');

  const payload = {
    id: receiptId,
    goods,
    payments: [{ type: 'CASHLESS', value: payment, label: 'Безготівкова оплата' }],
    ...(clean(orderId) ? { order_id: clean(orderId) } : {}),
    delivery: {
      ...(clean(customer.phone) ? { phone: clean(customer.phone).replace(/^\+/, '') } : {}),
      ...(clean(customer.email) ? { email: clean(customer.email) } : {})
    }
  };

  // A partial payment must be explicitly visible rather than silently changing
  // the sold goods. The operator/accountant must approve this fiscal scheme
  // before CHECKBOX_LIVE_ENABLED is switched on.
  if (payment < goodsTotal) {
    payload.discounts = [{
      type: 'DISCOUNT',
      mode: 'VALUE',
      value: Math.round(goodsTotal - payment),
      name: 'Часткова оплата'
    }];
  }
  return payload;
}

export async function createCheckboxSale({ token, payload, config = assertCheckboxLiveConfig(), fetchImpl = fetch } = {}) {
  if (!clean(token)) throw new Error('Checkbox authorization token is missing');
  return request('/api/v1/receipts/sell', {
    method: 'POST', token, body: payload, config, fetchImpl
  });
}

export async function getCheckboxReceipt({ token, receiptId, config = assertCheckboxLiveConfig(), fetchImpl = fetch } = {}) {
  if (!clean(token) || !clean(receiptId)) throw new Error('Checkbox receipt lookup requires token and receipt ID');
  return request(`/api/v1/receipts/${encodeURIComponent(receiptId)}`, { token, config, fetchImpl });
}
