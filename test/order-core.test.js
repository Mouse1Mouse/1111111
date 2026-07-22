import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ORDER_STATUSES,
  attachTtn,
  calculateCodAmount,
  createOrder,
  createOrderId,
  escapeHtml,
  markNovaPayReceived,
  markPrepaymentReceived,
  markReceiptDone,
  parseAmount
} from '../netlify/lib/order-core.js';
import { deriveWebhookSecret } from '../netlify/lib/telegram-client.js';
import { normalizeExtractedDraft } from '../netlify/lib/order-extractor.js';

const NOW = '2026-07-22T10:00:00.000Z';

function draft(overrides = {}) {
  return {
    id: 'MIVA-IG-260722-ABC123',
    customerName: 'Тестовий клієнт',
    phone: '+380671234567',
    email: 'client@example.com',
    itemsSummary: 'Комплект постільної білизни 1 шт × 1450 грн',
    totalAmount: '1650',
    prepaymentAmount: '200',
    ttn: '-',
    ...overrides
  };
}

test('parses Ukrainian money formats and calculates the NovaPay balance', () => {
  assert.equal(parseAmount('1 650,50 грн'), 1650.5);
  assert.equal(calculateCodAmount('1650', '200'), 1450);
  assert.equal(parseAmount('-5'), null);
});

test('creates a stable safe order identifier', () => {
  const id = createOrderId(new Date(NOW), '12345678-abcd-ef00-1111-222233334444');
  assert.equal(id, 'MIVA-IG-260722-123456');
});

test('runs the expected prepayment, TTN, NovaPay and receipt lifecycle', () => {
  const created = createOrder(draft(), { now: NOW, chatId: '123' });
  assert.equal(created.status, ORDER_STATUSES.AWAITING_PREPAYMENT);
  assert.equal(created.codAmount, 1450);

  const prepaid = markPrepaymentReceived(created, '200,00', '2026-07-22T10:05:00.000Z');
  assert.equal(prepaid.status, ORDER_STATUSES.READY_TO_SHIP);

  const shipped = attachTtn(prepaid, '20451234567890', '2026-07-22T11:00:00.000Z');
  assert.equal(shipped.status, ORDER_STATUSES.AWAITING_NOVAPAY);

  const paid = markNovaPayReceived(shipped, 1450, '2026-07-23T12:00:00.000Z');
  assert.equal(paid.status, ORDER_STATUSES.READY_FOR_RECEIPT);

  const closed = markReceiptDone(paid, 'ФН-12345/2026', '2026-07-23T12:05:00.000Z');
  assert.equal(closed.status, ORDER_STATUSES.RECEIPT_DONE);
});

test('does not accept a wrong payment or NovaPay confirmation without a TTN', () => {
  const created = createOrder(draft(), { now: NOW, chatId: '123' });
  assert.throws(() => markPrepaymentReceived(created, 199), /Expected prepayment/);
  const prepaid = markPrepaymentReceived(created, 200);
  assert.throws(() => markNovaPayReceived(prepaid, 1450), /TTN is not attached/);
  const shipped = attachTtn(prepaid, '20451234567890');
  assert.throws(() => markNovaPayReceived(shipped, 1449), /Expected NovaPay amount/);
});

test('validates required customer and amount data', () => {
  assert.throws(() => createOrder(draft({ phone: '123' })), /Missing required/);
  assert.throws(() => createOrder(draft({ email: 'bad-email' })), /Invalid customer email/);
  assert.throws(() => createOrder(draft({ prepaymentAmount: '1700' })), /Invalid order amounts/);
});

test('escapes Telegram HTML', () => {
  assert.equal(escapeHtml('<MIVA & Co>'), '&lt;MIVA &amp; Co&gt;');
});

test('derives a stable Telegram webhook secret without exposing the token', () => {
  const token = '123456:TEST_TOKEN_VALUE';
  const secret = deriveWebhookSecret(token);
  assert.match(secret, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(secret, deriveWebhookSecret(token));
  assert.equal(secret.includes(token), false);
});

test('normalizes a screenshot extraction and applies the standard 200 UAH prepayment', () => {
  const result = normalizeExtractedDraft({
    customerName: 'Олена',
    instagramHandle: '@olena',
    phone: '+380671234567',
    email: '',
    city: 'Київ',
    branch: 'Відділення 12',
    itemsSummary: 'Комплект постільної білизни — 1 шт × 1450 грн',
    totalAmount: 1650,
    prepaymentAmount: null,
    codAmount: 1450,
    ttn: '',
    confidence: 0.91
  });
  assert.equal(result.draft.prepaymentAmount, 200);
  assert.deepEqual(result.missingFields, []);
  assert.equal(result.warnings.length, 1);
});

test('calculates the full order value when a screenshot only shows the NovaPay balance', () => {
  const result = normalizeExtractedDraft({
    customerName: 'Олена',
    phone: '+380671234567',
    itemsSummary: 'Комплект постільної білизни',
    totalAmount: null,
    prepaymentAmount: null,
    codAmount: 1450,
    confidence: 0.85
  });
  assert.equal(result.draft.prepaymentAmount, 200);
  assert.equal(result.draft.totalAmount, 1650);
  assert.deepEqual(result.missingFields, []);
  assert.equal(result.warnings.length, 2);
});

test('keeps uncertain screenshot fields blocked until corrected', () => {
  const result = normalizeExtractedDraft({
    customerName: 'Олена',
    phone: '',
    itemsSummary: '',
    totalAmount: null,
    prepaymentAmount: null,
    confidence: 0.2
  });
  assert.deepEqual(result.missingFields, ['phone', 'itemsSummary', 'totalAmount', 'prepaymentAmount']);
});
