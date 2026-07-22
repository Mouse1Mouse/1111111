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
import { applyPrepaymentChoice, normalizeExtractedDraft } from '../netlify/lib/order-extractor.js';
import {
  buildInternetDocumentPayload,
  formatNovaPoshtaDate,
  normalizeNovaPoshtaPhone,
  novaPoshtaCall,
  parseSenderWarehouseSelection
} from '../netlify/lib/nova-poshta.js';

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

test('supports a fully paid order without a NovaPay balance', () => {
  const normalized = normalizeExtractedDraft(draft({
    totalAmount: 2150,
    prepaymentAmount: 2150,
    codAmount: 0
  }));
  assert.equal(normalized.needsPrepaymentChoice, false);
  assert.equal(normalized.missingFields.includes('prepaymentAmount'), false);

  const selected = applyPrepaymentChoice({ totalAmount: 2150, codAmount: 0 }, 2150);
  assert.equal(selected.prepaymentAmount, 2150);

  const created = createOrder(draft({ totalAmount: '2150', prepaymentAmount: '2150' }), {
    now: NOW,
    chatId: '123'
  });
  assert.equal(created.codAmount, 0);
  assert.equal(created.status, ORDER_STATUSES.AWAITING_PREPAYMENT);

  const prepaid = markPrepaymentReceived(created, 2150);
  assert.equal(prepaid.status, ORDER_STATUSES.READY_TO_SHIP);

  const shipped = attachTtn(prepaid, '20451234567890');
  assert.equal(shipped.status, ORDER_STATUSES.READY_FOR_RECEIPT);
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

test('asks for a prepayment choice when it is absent from the screenshot', () => {
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
  assert.equal(result.draft.prepaymentAmount, null);
  assert.equal(result.needsPrepaymentChoice, true);
  assert.deepEqual(result.missingFields, ['prepaymentAmount']);
  assert.equal(result.warnings.length, 1);
});

test('calculates the full order value after choosing a prepayment for a visible NovaPay balance', () => {
  const result = normalizeExtractedDraft({
    customerName: 'Олена',
    phone: '+380671234567',
    itemsSummary: 'Комплект постільної білизни',
    totalAmount: null,
    prepaymentAmount: null,
    codAmount: 1450,
    confidence: 0.85
  });
  assert.equal(result.draft.prepaymentAmount, null);
  assert.equal(result.draft.totalAmount, null);
  assert.equal(result.needsPrepaymentChoice, true);
  assert.deepEqual(result.missingFields, ['prepaymentAmount']);

  const updated = applyPrepaymentChoice(result.draft, 200);
  assert.equal(updated.prepaymentAmount, 200);
  assert.equal(updated.totalAmount, 1650);
});

test('supports an order without a prepayment and uses the visible NovaPay balance as its total', () => {
  const updated = applyPrepaymentChoice({ totalAmount: null, codAmount: 1700 }, 0);
  assert.equal(updated.prepaymentAmount, 0);
  assert.equal(updated.totalAmount, 1700);
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

test('normalizes Nova Poshta phone numbers and Kyiv shipment dates', () => {
  assert.equal(normalizeNovaPoshtaPhone('+38 (067) 123-45-67'), '380671234567');
  assert.equal(formatNovaPoshtaDate(new Date('2026-07-22T10:00:00.000Z')), '22.07.2026');
  assert.throws(() => normalizeNovaPoshtaPhone('12345'), /invalid_recipient_phone/);
});

test('parses a sender warehouse selected for the current shipment', () => {
  assert.deepEqual(parseSenderWarehouseSelection('Нетішин, відділення №1'), {
    city: 'Нетішин',
    branch: 'Відділення №1',
    number: '1'
  });
  assert.deepEqual(parseSenderWarehouseSelection('Хмельницький 12'), {
    city: 'Хмельницький',
    branch: 'Відділення №12',
    number: '12'
  });
  assert.equal(parseSenderWarehouseSelection('відділення'), null);
});

test('retries a temporary Nova Poshta API rate limit', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return {
      ok: true,
      status: 200,
      json: async () => requests === 1
        ? { success: false, data: [], errors: ['To many requests'], warnings: [] }
        : { success: true, data: [{ Ref: 'warehouse-ref' }], errors: [], warnings: [] }
    };
  };
  try {
    const result = await novaPoshtaCall('AddressGeneral', 'getWarehouses', {}, {
      apiKey: 'test-key',
      retryBaseDelayMs: 0
    });
    assert.equal(requests, 2);
    assert.equal(result.data[0].Ref, 'warehouse-ref');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('builds a Nova Poshta waybill with the exact NovaPay COD balance', () => {
  const payload = buildInternetDocumentPayload({
    recipientName: 'Олена Коваль',
    recipientPhone: '380671234567',
    recipientCityName: 'Київ',
    recipientArea: 'Київська область',
    recipientRegion: '',
    recipientSettlementType: 'місто',
    warehouseNumber: '12',
    totalAmount: 1650,
    codAmount: 1450,
    weight: 2,
    dimensions: { length: 40, width: 30, height: 20 },
    seatsAmount: 1,
    description: 'Постільна білизна',
    deliveryPayer: 'Recipient',
    sender: {
      cityRef: 'city-ref',
      ref: 'sender-ref',
      addressRef: 'address-ref',
      contactRef: 'contact-ref',
      phone: '380501234567'
    }
  }, new Date('2026-07-22T10:00:00.000Z'));

  assert.equal(payload.DateTime, '22.07.2026');
  assert.equal(payload.ServiceType, 'WarehouseWarehouse');
  assert.equal(payload.RecipientAddressName, '12');
  assert.equal(payload.PaymentMethod, 'Cash');
  assert.deepEqual(payload.BackwardDeliveryData, [{
    PayerType: 'Recipient',
    CargoType: 'Money',
    RedeliveryString: '1450.00'
  }]);
  assert.deepEqual(payload.OptionsSeat, [{
    volumetricWidth: '30',
    volumetricLength: '40',
    volumetricHeight: '20',
    weight: '2'
  }]);

  const fullyPaidPayload = buildInternetDocumentPayload({
    recipientName: 'Олена Коваль',
    recipientPhone: '380671234567',
    recipientCityName: 'Київ',
    recipientArea: 'Київська область',
    recipientRegion: '',
    recipientSettlementType: 'місто',
    warehouseNumber: '12',
    totalAmount: 2150,
    codAmount: 0,
    weight: 2,
    dimensions: { length: 40, width: 30, height: 20 },
    seatsAmount: 1,
    description: 'Постільна білизна',
    deliveryPayer: 'Recipient',
    sender: {
      cityRef: 'city-ref',
      ref: 'sender-ref',
      addressRef: 'address-ref',
      contactRef: 'contact-ref',
      phone: '380501234567'
    }
  }, new Date('2026-07-22T10:00:00.000Z'));
  assert.equal('BackwardDeliveryData' in fullyPaidPayload, false);
});
