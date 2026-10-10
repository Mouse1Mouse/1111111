import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ORDER_STATUSES,
  attachTtn,
  calculateCodAmount,
  calculateNovaPaySettlement,
  createOrder,
  createOrderId,
  escapeHtml,
  formatOrderHtml,
  isValidCustomerOrderNumber,
  markNovaPayReceived,
  markOrderClosed,
  markPrepaymentReceived,
  markReceiptDone,
  normalizeCustomerOrderNumber,
  normalizeUkrainianPhone,
  parseAmount,
  parseTtnFromOrderCard,
  updateOrderDetails
} from '../netlify/lib/order-core.js';
import { deriveWebhookSecret, telegramClient } from '../netlify/lib/telegram-client.js';
import {
  applyPrepaymentChoice,
  applyOrderTextHints,
  extractOrderFromText,
  normalizeExtractedDraft
} from '../netlify/lib/order-extractor.js';
import { createPackingLabelDocument, wrapPackingLabelText } from '../netlify/lib/packing-label.js';
import {
  buildInternetDocumentPayload,
  createNovaPoshtaWaybill,
  downloadNovaPoshtaMarking,
  formatNovaPoshtaDate,
  normalizeNovaPoshtaPhone,
  novaPoshtaCall,
  parseSenderWarehouseSelection,
  parseShipmentPreviewOptions,
  recipientCityName,
  resolveNovaPoshtaSettlement,
  resolveNovaPoshtaWarehouse,
  STANDARD_PARCEL
} from '../netlify/lib/nova-poshta.js';
import {
  buildFiscalReceiptDraft,
  confirmFiscalReceiptCatalog,
  formatFiscalReceiptDraftHtml,
  isFiscalReceiptReady,
  prepareFiscalReceiptDraft
} from '../netlify/lib/fiscal-receipt.js';
import {
  FISCAL_SHIFT_STATUSES,
  cancelShiftClose,
  confirmShiftClose,
  confirmShiftOpen,
  createFiscalShiftState,
  fiscalShiftAgeHours,
  kyivDay,
  requestShiftClose,
  requestShiftOpen,
  shouldSendFiscalReminder,
  summarizeFiscalDay
} from '../netlify/lib/fiscal-shift.js';
import {
  SOTA_PRODUCT_CATALOG,
  getCatalogProduct,
  matchOrderSummaryToCatalog
} from '../netlify/lib/product-catalog.js';

const NOW = '2026-07-22T10:00:00.000Z';

function draft(overrides = {}) {
  return {
    id: 'MIVA-IG-260722-ABC123',
    customerOrderNumber: '1542',
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
  assert.deepEqual(calculateNovaPaySettlement(1500), {
    grossAmount: 1500,
    feeAmount: 7.5,
    netAmount: 1492.5,
    commissionRate: 0.005
  });
  assert.equal(parseAmount('-5'), null);
});

test('uses the MIVA standard parcel dimensions by default', () => {
  assert.deepEqual(STANDARD_PARCEL, {
    weight: 2,
    dimensions: { length: 44, width: 34, height: 5 }
  });
});

test('normalizes a merchant order number without confusing it with a TTN', () => {
  assert.equal(normalizeCustomerOrderNumber('Замовлення №1542'), '1542');
  assert.equal(normalizeCustomerOrderNumber('Заказ #M-1543'), 'M-1543');
  assert.equal(normalizeCustomerOrderNumber('Номер заказу 1544'), '1544');
  assert.equal(isValidCustomerOrderNumber('M-1543'), true);
  assert.equal(isValidCustomerOrderNumber('номер з пробілом'), false);
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

  const paid = markNovaPayReceived(shipped, {
    grossAmount: 1450,
    feeAmount: 7.25,
    netAmount: 1442.75,
    ttn: '20451234567890',
    registryNumber: 'BO011739177',
    settledAt: '2026-07-23T12:00:00.000Z'
  }, '2026-07-23T12:00:00.000Z');
  assert.equal(paid.status, ORDER_STATUSES.READY_FOR_RECEIPT);
  assert.equal(paid.novaPayGrossAmount, 1450);
  assert.equal(paid.novaPayFeeAmount, 7.25);
  assert.equal(paid.novaPayNetAmount, 1442.75);
  assert.equal(paid.novaPayRegistryNumber, 'BO011739177');

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

  const prepared = prepareFiscalReceiptDraft(shipped, '2026-07-23T12:00:00.000Z');
  assert.equal(prepared.fiscalReceipt.state, 'draft');
  const closed = markReceiptDone(prepared, 'ФН-98765/2026');
  assert.equal(closed.status, ORDER_STATUSES.RECEIPT_DONE);
});

test('archives a completed direct IBAN order without claiming a fiscal receipt exists', () => {
  const order = createOrder({
    customerName: 'Тестовий клієнт',
    phone: '+380671234567',
    itemsSummary: 'Комплект постільної білизни',
    totalAmount: 1750,
    prepaymentAmount: 1750,
    ttn: '20450000000000'
  }, { now: '2026-08-03T10:00:00.000Z' });
  const paid = markPrepaymentReceived(order, 1750, '2026-08-03T10:01:00.000Z');
  const closed = markOrderClosed(paid, 'direct_iban_completed', '2026-08-03T10:02:00.000Z');
  assert.equal(closed.status, ORDER_STATUSES.CLOSED);
  assert.equal(closed.receiptNumber, '');
  assert.equal(closed.closedReason, 'direct_iban_completed');
});

test('prepares an idempotent Checkbox fiscal draft only after all payments are confirmed', () => {
  const created = createOrder(draft(), { now: NOW, chatId: '123' });
  assert.equal(isFiscalReceiptReady(created), false);
  assert.throws(() => buildFiscalReceiptDraft(created), /not ready/);

  const paid = markNovaPayReceived(
    attachTtn(markPrepaymentReceived(created, 200), '20451234567890'),
    1450,
    '2026-07-23T12:00:00.000Z'
  );
  const prepared = prepareFiscalReceiptDraft(paid, '2026-07-23T12:05:00.000Z');
  assert.equal(prepared.fiscalReceipt.provider, 'checkbox');
  assert.equal(prepared.fiscalReceipt.idempotencyKey, `miva:${created.id}:sale:v4`);
  assert.equal(prepared.fiscalReceipt.totalAmount, 1650);
  assert.equal(prepared.fiscalReceipt.catalogStatus, 'matched');
  assert.equal(prepared.fiscalReceipt.items[0].sku, 'MIVA-BED-200');
  assert.deepEqual(
    prepared.fiscalReceipt.payments.map(({ source, amount }) => ({ source, amount })),
    [
      { source: 'monobank_prepayment', amount: 200 },
      { source: 'novapay_cod', amount: 1450 }
    ]
  );
  assert.equal(
    prepareFiscalReceiptDraft(prepared, '2026-07-23T13:00:00.000Z').fiscalReceipt.preparedAt,
    '2026-07-23T12:05:00.000Z'
  );
  assert.match(formatFiscalReceiptDraftHtml(prepared), /Чернетка фіскального чека CheckBox/);
  assert.match(formatFiscalReceiptDraftHtml(prepared), /MIVA-BED-200/);
});

test('contains the complete unique 23-item SOTA catalog', () => {
  assert.equal(SOTA_PRODUCT_CATALOG.length, 23);
  assert.equal(new Set(SOTA_PRODUCT_CATALOG.map((item) => item.sku)).size, 23);
  assert.equal(SOTA_PRODUCT_CATALOG.every((item) => item.unit === 'шт'), true);
  assert.equal(SOTA_PRODUCT_CATALOG.every((item) => item.group === 'Постіль'), true);
  assert.equal(getCatalogProduct('MIVA-PILLOWCASE-50X70').price, 350);
  assert.equal(getCatalogProduct('MIVA-SHEET-FITTED-180X200X30').price, 450);
});

test('matches every canonical SOTA catalog name back to its own article', () => {
  for (const item of SOTA_PRODUCT_CATALOG) {
    const total = item.sku === 'MIVA-BED-CUSTOM' ? 2100 : item.price;
    const result = matchOrderSummaryToCatalog(item.name, total);
    assert.equal(result.items[0].sku, item.sku, item.name);
  }
});

test('matches all standard bedding set labels to SOTA articles', () => {
  const cases = [
    ['Півтораспальний комплект, наволочки 50×70', 1550, 'MIVA-BED-150'],
    ['Двохспальний комплект, наволочки 70×70', 1650, 'MIVA-BED-200'],
    ['Комплект Євро, однотон', 1700, 'MIVA-BED-EURO'],
    ['Євро двоспальний комплект', 1750, 'MIVA-BED-EURO-2'],
    ['Сімейний комплект постільної білизни', 1850, 'MIVA-BED-FAMILY'],
    ['Комплект індивідуальний розмір', 2100, 'MIVA-BED-CUSTOM']
  ];
  for (const [summary, total, sku] of cases) {
    const result = matchOrderSummaryToCatalog(summary, total);
    assert.equal(result.items[0].sku, sku);
    assert.equal(result.status, 'matched');
    assert.equal(result.items[0].totalAmount, total);
  }
});

test('matches fitted sheets, duvets, pillowcases and flat sheets by exact size', () => {
  const cases = [
    ['Простирадло на резинці 80×200×20', 250, 'MIVA-SHEET-FITTED-80X200X20'],
    ['Простирадло на резинці 120/200/20', 250, 'MIVA-SHEET-FITTED-120X200X20'],
    ['Простирадло на гумці 160×200×30', 450, 'MIVA-SHEET-FITTED-160X200X30'],
    ['Резинка індивідуальний розмір 210×230×25', 450, 'MIVA-SHEET-FITTED-CUSTOM'],
    ['Підковдра 145×220', 800, 'MIVA-DUVET-145X220'],
    ['Підковдра 200×220', 1000, 'MIVA-DUVET-200X220'],
    ['Наволочки 50/70', 350, 'MIVA-PILLOWCASE-50X70'],
    ['Наволочки 70×70', 400, 'MIVA-PILLOWCASE-70X70'],
    ['Простирадло 145×220', 600, 'MIVA-SHEET-FLAT-145X220'],
    ['Простирадло 220×240', 750, 'MIVA-SHEET-FLAT-220X240']
  ];
  for (const [summary, total, sku] of cases) {
    const result = matchOrderSummaryToCatalog(summary, total);
    assert.equal(result.items[0].sku, sku, summary);
    assert.equal(result.status, 'matched', summary);
  }
});

test('creates separate fiscal lines for a bedding set and fitted sheet', () => {
  const result = matchOrderSummaryToCatalog(
    '«Смарагд» Євро двоспальний комплект; додатково простирадло на резинці 160×200×30',
    2200
  );
  assert.deepEqual(result.items.map((item) => item.sku), [
    'MIVA-BED-EURO-2',
    'MIVA-SHEET-FITTED-160X200X30'
  ]);
  assert.deepEqual(result.items.map((item) => item.totalAmount), [1750, 450]);
  assert.equal(result.status, 'matched');
});

test('requires review for unknown merchandise while preserving the receipt total', () => {
  const result = matchOrderSummaryToCatalog('Невідомий текстильний виріб', 777);
  assert.equal(result.status, 'needs_review');
  assert.equal(result.items[0].sku, 'MIVA-BED-CUSTOM');
  assert.equal(result.items[0].totalAmount, 777);
  assert.match(result.warnings[0], /не вдалося однозначно/);
});

test('records manager confirmation without changing the fiscal idempotency key', () => {
  const created = createOrder(draft(), { now: NOW, chatId: '123' });
  const paid = markNovaPayReceived(
    attachTtn(markPrepaymentReceived(created, 200), '20451234567890'),
    1450,
    '2026-07-23T12:00:00.000Z'
  );
  const prepared = prepareFiscalReceiptDraft(paid, '2026-07-23T12:05:00.000Z');
  const confirmed = confirmFiscalReceiptCatalog(prepared, '2026-07-23T12:06:00.000Z');
  assert.equal(confirmed.fiscalReceipt.state, 'catalog_confirmed');
  assert.equal(confirmed.fiscalReceipt.catalogConfirmedAt, '2026-07-23T12:06:00.000Z');
  assert.equal(confirmed.fiscalReceipt.idempotencyKey, prepared.fiscalReceipt.idempotencyKey);
  assert.equal(
    confirmFiscalReceiptCatalog(confirmed, '2026-07-23T12:07:00.000Z').fiscalReceipt.catalogConfirmedAt,
    '2026-07-23T12:06:00.000Z'
  );
});

test('runs an idempotent controlled CheckBox shift and Z-report lifecycle', () => {
  const initial = createFiscalShiftState('4001550296', '2026-07-28T08:00:00.000Z');
  assert.equal(initial.status, FISCAL_SHIFT_STATUSES.CLOSED);

  const opening = requestShiftOpen(initial, {
    chatId: '123',
    now: '2026-07-28T08:05:00.000Z'
  });
  assert.equal(opening.status, FISCAL_SHIFT_STATUSES.OPENING);
  assert.equal(requestShiftOpen(opening), opening);

  const opened = confirmShiftOpen(opening, {
    chatId: '123',
    now: '2026-07-28T08:06:00.000Z'
  });
  assert.equal(opened.status, FISCAL_SHIFT_STATUSES.OPEN);
  assert.equal(confirmShiftOpen(opened), opened);
  assert.equal(fiscalShiftAgeHours(opened, new Date('2026-07-28T10:06:00.000Z')), 2);

  const summary = {
    fiscalDay: '2026-07-28',
    receiptCount: 2,
    totalAmount: 3200,
    monobankAmount: 400,
    novaPayAmount: 2800,
    receiptNumbers: ['A-1', 'A-2']
  };
  const closing = requestShiftClose(opened, summary, '2026-07-28T20:30:00.000Z');
  assert.equal(closing.status, FISCAL_SHIFT_STATUSES.CLOSING);
  assert.equal(requestShiftClose(closing, summary), closing);
  assert.equal(cancelShiftClose(closing).status, FISCAL_SHIFT_STATUSES.OPEN);

  const closed = confirmShiftClose(closing, {
    zReportNumber: 'Z-000123',
    summary,
    chatId: '123',
    now: '2026-07-28T20:35:00.000Z'
  });
  assert.equal(closed.status, FISCAL_SHIFT_STATUSES.CLOSED);
  assert.equal(closed.lastZReport.number, 'Z-000123');
  assert.equal(closed.lastZReport.summary.totalAmount, 3200);
  assert.equal(confirmShiftClose(closed, { zReportNumber: 'Z-000123' }), closed);
});

test('summarizes fiscal receipts by Kyiv calendar day and sends one late reminder window', () => {
  const orders = [
    {
      totalAmount: 1700,
      receiptNumber: 'R-1',
      receiptCreatedAt: '2026-07-28T20:45:00.000Z',
      fiscalReceipt: {
        payments: [
          { source: 'monobank_prepayment', amount: 200 },
          { source: 'novapay_cod', amount: 1500 }
        ]
      }
    },
    {
      totalAmount: 1550,
      receiptNumber: 'R-2',
      receiptCreatedAt: '2026-07-28T21:05:00.000Z',
      fiscalReceipt: {
        payments: [{ source: 'monobank_prepayment', amount: 1550 }]
      }
    }
  ];
  assert.equal(kyivDay('2026-07-28T20:45:00.000Z'), '2026-07-28');
  assert.equal(kyivDay('2026-07-28T21:05:00.000Z'), '2026-07-29');

  assert.deepEqual(summarizeFiscalDay(orders, '2026-07-28'), {
    fiscalDay: '2026-07-28',
    receiptCount: 1,
    totalAmount: 1700,
    monobankAmount: 200,
    novaPayAmount: 1500,
    receiptNumbers: ['R-1']
  });

  const opened = confirmShiftOpen(requestShiftOpen(createFiscalShiftState()), {
    now: '2026-07-28T08:00:00.000Z'
  });
  assert.equal(shouldSendFiscalReminder(opened, new Date('2026-07-28T20:29:00.000Z')), false);
  assert.equal(shouldSendFiscalReminder(opened, new Date('2026-07-28T20:30:00.000Z')), true);
  assert.equal(shouldSendFiscalReminder(opened, new Date('2026-07-28T21:00:00.000Z')), false);
});

test('does not accept a wrong payment or NovaPay confirmation without a TTN', () => {
  const created = createOrder(draft(), { now: NOW, chatId: '123' });
  assert.throws(() => markPrepaymentReceived(created, 199), /Expected prepayment/);
  const prepaid = markPrepaymentReceived(created, 200);
  assert.throws(() => markNovaPayReceived(prepaid, 1450), /TTN is not attached/);
  const shipped = attachTtn(prepaid, '20451234567890');
  assert.throws(() => markNovaPayReceived(shipped, 1449), /Expected NovaPay amount/);
  assert.throws(
    () => markNovaPayReceived(shipped, {
      grossAmount: 1450,
      feeAmount: 0,
      netAmount: 1450,
      ttn: '20451234567890'
    }),
    /Expected NovaPay fee/
  );
  assert.throws(
    () => markNovaPayReceived(shipped, {
      grossAmount: 1450,
      feeAmount: 7.25,
      netAmount: 1442.75,
      ttn: '20450000000000'
    }),
    /TTN does not match/
  );
});

test('keeps Monobank prepayment separate from NovaPay settlement and ignores repeats', () => {
  const created = createOrder(draft({
    totalAmount: 1700,
    prepaymentAmount: 200
  }), { now: NOW, chatId: '123' });
  const prepaid = markPrepaymentReceived(created, {
    amount: 200,
    transactionId: 'mono-prepay-1',
    receivedAt: '2026-07-22T10:05:00.000Z'
  });
  assert.equal(prepaid.prepaymentSource, 'monobank_iban');
  assert.equal(prepaid.prepaymentReceivedAmount, 200);
  assert.equal(prepaid.prepaymentTransactionId, 'mono-prepay-1');
  assert.equal(markPrepaymentReceived(prepaid, 200), prepaid);

  const shipped = attachTtn(prepaid, '20451234567890');
  const paid = markNovaPayReceived(shipped, {
    grossAmount: 1500,
    feeAmount: 7.5,
    netAmount: 1492.5,
    ttn: '20451234567890',
    transactionId: 'novapay-1',
    settledAt: '2026-07-24T03:00:00.000Z'
  });
  assert.equal(paid.totalAmount, 1700);
  assert.equal(paid.novaPayGrossAmount, 1500);
  assert.equal(paid.novaPayFeeAmount, 7.5);
  assert.equal(paid.novaPayNetAmount, 1492.5);
  assert.equal(markNovaPayReceived(paid, {
    grossAmount: 1500,
    feeAmount: 7.5,
    netAmount: 1492.5,
    ttn: '20451234567890'
  }), paid);

  const receipt = buildFiscalReceiptDraft(paid);
  assert.equal(receipt.totalAmount, 1700);
  assert.deepEqual(
    receipt.payments.map(({ source, amount }) => ({ source, amount })),
    [
      { source: 'monobank_prepayment', amount: 200 },
      { source: 'novapay_cod', amount: 1500 }
    ]
  );
  assert.equal(receipt.payments[1].feeAmount, 7.5);
  assert.equal(receipt.payments[1].settledAmount, 1492.5);
});

test('validates required customer and amount data', () => {
  assert.throws(() => createOrder(draft({ phone: '123' })), /Missing required/);
  assert.throws(() => createOrder(draft({ email: 'bad-email' })), /Invalid customer email/);
  assert.throws(() => createOrder(draft({ prepaymentAmount: '1700' })), /Invalid order amounts/);
});

test('normalizes common Ukrainian phone formats without inventing missing digits', () => {
  assert.deepEqual(
    normalizeUkrainianPhone('380671234567'),
    {
      input: '380671234567',
      digits: '380671234567',
      phone: '+380671234567',
      valid: true,
      corrected: true,
      correction: 'format',
      missingDigits: null
    }
  );
  assert.equal(normalizeUkrainianPhone('067 123 45 67').phone, '+380671234567');
  assert.equal(normalizeUkrainianPhone('+380 (67) 123-45-67').phone, '+380671234567');

  const incomplete = normalizeUkrainianPhone('0984657');
  assert.equal(incomplete.valid, false);
  assert.equal(incomplete.missingDigits, 3);
  assert.equal(incomplete.phone, '0984657');
  assert.equal(createOrder(draft({ phone: '0671234567' })).phone, '+380671234567');
});

test('reports phone correction and incomplete phone in an extracted draft', () => {
  const corrected = normalizeExtractedDraft(draft({ phone: '380671234567' }));
  assert.equal(corrected.draft.phone, '+380671234567');
  assert.match(corrected.warnings.join(' '), /Телефон автоматично виправлено/);
  assert.equal(corrected.missingFields.includes('phone'), false);

  const incomplete = normalizeExtractedDraft(draft({ phone: '0984657' }));
  assert.equal(incomplete.draft.phone, '0984657');
  assert.match(incomplete.warnings.join(' '), /Не вистачає 3 цифр/);
  assert.equal(incomplete.missingFields.includes('phone'), true);
});

test('safely edits a saved order and recalculates the NovaPay balance', () => {
  const original = markPrepaymentReceived(createOrder(draft(), { now: NOW }), 200, NOW);
  const updated = updateOrderDetails(original, {
    customerName: 'Нова Клієнтка',
    phone: '0631234567',
    totalAmount: 1850,
    city: 'Київ',
    branch: '123 відділення'
  }, '2026-07-27T12:00:00.000Z');
  assert.equal(updated.customerName, 'Нова Клієнтка');
  assert.equal(updated.phone, '+380631234567');
  assert.equal(updated.totalAmount, 1850);
  assert.equal(updated.prepaymentAmount, 200);
  assert.equal(updated.codAmount, 1650);
  assert.equal(updated.prepaymentReceivedAt, NOW);
  assert.equal(updated.status, ORDER_STATUSES.READY_TO_SHIP);

  const shipped = attachTtn(updated, '20451234567890');
  assert.throws(() => updateOrderDetails(shipped, { city: 'Львів' }), /already has TTN/);
});

test('uses explicit text hints for COD, no prepayment and branch spellings', () => {
  const base = {
    customerName: 'Олена',
    phone: '0671234567',
    itemsSummary: 'Комплект',
    totalAmount: null,
    prepaymentAmount: null,
    codAmount: null,
    branch: ''
  };
  const hinted = applyOrderTextHints(
    base,
    'Олена, без передоплати, наложка 1 750 грн, НП 123'
  );
  assert.equal(hinted.prepaymentAmount, 0);
  assert.equal(hinted.codAmount, 1750);
  assert.equal(hinted.branch, 'Відділення №123');

  const reversed = applyOrderTextHints(base, 'Київ, 123-тє відділення, післяплата 1550');
  assert.equal(reversed.branch, 'Відділення №123');
  assert.equal(reversed.codAmount, 1550);
});

test('escapes Telegram HTML', () => {
  assert.equal(escapeHtml('<MIVA & Co>'), '&lt;MIVA &amp; Co&gt;');
});

test('recovers a Nova Poshta TTN from a fresh Telegram order card', () => {
  assert.equal(parseTtnFromOrderCard('🚚 ТТН: 20451493965058\n📌 Статус: потрібно пробити чек'), '20451493965058');
  assert.equal(parseTtnFromOrderCard('🚚 ТТН: ще не додано'), '');
});

test('creates a printable 100x100 packing label without unsafe XML', () => {
  const document = createPackingLabelDocument(draft({
    id: 'MIVA-IG-260722-ABC123',
    customerOrderNumber: '1542',
    customerName: 'Олена & Петро',
    city: 'Київ',
    branch: '№25405',
    itemsSummary: 'Чорний <рожевий> комплект, наволочки 50×70'
  }), '20451493965058');
  const svg = new TextDecoder().decode(document.bytes);
  assert.equal(document.mimeType, 'image/svg+xml');
  assert.match(document.filename, /100x100\.svg$/);
  assert.match(svg, /Олена &amp; Петро/);
  assert.match(svg, /Чорний &lt;рожевий&gt;/);
  assert.match(svg, /20451493965058/);
  assert.match(svg, /ЗАМОВЛЕННЯ №1542/);
  assert.equal(wrapPackingLabelText('а '.repeat(100), 10, 3).length, 3);
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
    customerOrderNumber: '1542',
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
    customerOrderNumber: '1543',
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

test('warns about a missing order number without blocking the order', () => {
  const result = normalizeExtractedDraft({
    customerName: 'Олена',
    phone: '',
    itemsSummary: '',
    totalAmount: null,
    prepaymentAmount: null,
    confidence: 0.2
  });
  assert.deepEqual(result.missingFields, ['phone', 'itemsSummary', 'totalAmount', 'prepaymentAmount']);
  assert.match(result.warnings.join(' '), /Номер замовлення не вказано/);

  const order = createOrder(draft({ customerOrderNumber: '' }), { now: NOW });
  assert.match(formatOrderHtml(order), /⚠️ Номер замовлення не вказано/);
});

test('extracts a copied order as text without sending image input', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  let requestBody;
  process.env.OPENAI_API_KEY = 'test-key';
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({
        output: [{
          content: [{
            type: 'output_text',
            text: JSON.stringify({
              customerOrderNumber: '',
              customerName: 'Олена Коваль',
              instagramHandle: '@olena',
              phone: '+380671234567',
              email: '',
              city: 'Нетішин',
              branch: 'Відділення №2',
              itemsSummary: 'Комплект постільної білизни — 1 шт',
              totalAmount: 1650,
              prepaymentAmount: 200,
              codAmount: 1450,
              ttn: '',
              confidence: 0.95
            })
          }]
        }]
      })
    };
  };

  try {
    const result = await extractOrderFromText({
      text: 'Олена Коваль, +380671234567, Нетішин, відділення 2, комплект 1650 грн, передоплата 200 грн',
      operatorId: '123'
    });
    const content = requestBody.input[0].content;
    assert.deepEqual(content.map((item) => item.type), ['input_text']);
    assert.match(content[0].text, /Copied order text/);
    assert.equal(result.draft.customerName, 'Олена Коваль');
    assert.equal(result.missingFields.includes('customerOrderNumber'), false);
    assert.match(result.warnings.join(' '), /Номер замовлення не вказано/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
  }
});

test('retries order recognition once after a temporary service error', async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.OPENAI_API_KEY;
  let calls = 0;
  process.env.OPENAI_API_KEY = 'test-key';
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return { ok: false, status: 503, json: async () => ({}) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        output: [{
          content: [{
            type: 'output_text',
            text: JSON.stringify({
              customerOrderNumber: '1550',
              customerName: 'Олена',
              instagramHandle: '@olena',
              phone: '0671234567',
              email: '',
              city: 'Київ',
              branch: '1',
              itemsSummary: 'Комплект постільної білизни',
              totalAmount: 1750,
              prepaymentAmount: 200,
              codAmount: 1550,
              ttn: '',
              confidence: 0.9
            })
          }]
        }]
      })
    };
  };

  try {
    const result = await extractOrderFromText({
      text: 'Замовлення 1550, Олена, телефон 0671234567, Київ, відділення 1, комплект 1750 грн, передоплата 200 грн',
      operatorId: '123'
    });
    assert.equal(calls, 2);
    assert.equal(result.draft.phone, '+380671234567');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalApiKey;
  }
});

test('retries safe Telegram callback acknowledgements but not message sends', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return {
        ok: false,
        status: 503,
        json: async () => ({ ok: false, description: 'temporary failure' })
      };
    }
    return { ok: true, status: 200, json: async () => ({ ok: true, result: true }) };
  };

  try {
    await telegramClient('test-token').answerCallbackQuery('callback-id');
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('normalizes Nova Poshta phone numbers and Kyiv shipment dates', () => {
  assert.equal(normalizeNovaPoshtaPhone('+38 (067) 123-45-67'), '380671234567');
  assert.equal(normalizeNovaPoshtaPhone('380671234567'), '380671234567');
  assert.equal(normalizeNovaPoshtaPhone('0671234567'), '380671234567');
  assert.equal(formatNovaPoshtaDate(new Date('2026-07-22T10:00:00.000Z')), '22.07.2026');
  assert.throws(() => normalizeNovaPoshtaPhone('12345'), /invalid_recipient_phone/);
});

test('normalizes full Ukrainian settlement type words before searching', () => {
  assert.equal(recipientCityName('село Тріскині'), 'Тріскині');
  assert.equal(recipientCityName('місто Київ, Київська обл.'), 'Київ');
  assert.equal(recipientCityName('смт. Коцюбинське'), 'Коцюбинське');
  assert.equal(recipientCityName('Мала Павлівка'), 'Мала Павлівка');
  assert.equal(recipientCityName('Суми'), 'Суми');
  assert.equal(recipientCityName('м.Миргород'), 'Миргород');
  assert.equal(recipientCityName('с. Мала Павлівка'), 'Мала Павлівка');
});

test('requires a choice for duplicate settlement names and honors district context', async () => {
  const originalFetch = globalThis.fetch;
  const settlements = [{
    DeliveryCity: 'sarny-ref',
    MainDescription: 'Березівка',
    Present: 'с. Березівка, Сарненський р-н, Рівненська обл.'
  }, {
    DeliveryCity: 'rivne-ref',
    MainDescription: 'Березівка',
    Present: 'с. Березівка, Рівненський р-н, Рівненська обл.'
  }];
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      data: [{ Addresses: settlements }],
      errors: [],
      warnings: []
    })
  });

  try {
    await assert.rejects(
      () => resolveNovaPoshtaSettlement('село Березівка', {
        apiKey: 'test-key',
        retryBaseDelayMs: 0
      }),
      (error) => {
        assert.equal(error.message, 'nova_poshta_city_ambiguous');
        assert.equal(error.settlements.length, 2);
        assert.match(error.settlements[0].Description, /Сарненський/);
        return true;
      }
    );

    const byDistrict = await resolveNovaPoshtaSettlement(
      'село Березівка, Сарненський район, Рівненська область',
      { apiKey: 'test-key', retryBaseDelayMs: 0 }
    );
    assert.equal(byDistrict.DeliveryCity, 'sarny-ref');

    const byChoice = await resolveNovaPoshtaSettlement('село Березівка', {
      apiKey: 'test-key',
      retryBaseDelayMs: 0,
      settlementRef: 'rivne-ref'
    });
    assert.equal(byChoice.DeliveryCity, 'rivne-ref');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uses an oblast written with the settlement when Nova Poshta returns Area fields', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      data: [{
        Addresses: [{
          DeliveryCity: 'poltava-tereshky',
          Ref: 'poltava-tereshky-settlement',
          MainDescription: 'Терешки',
          Present: 'с. Терешки, Полтавський р-н, Полтавська обл.',
          Area: 'Полтавська',
          Region: 'Полтавський'
        }, {
          DeliveryCity: 'vinnytsia-tereshky',
          Ref: 'vinnytsia-tereshky-settlement',
          MainDescription: 'Терешки',
          Present: 'с. Терешки, Барський р-н, Вінницька обл.',
          Area: 'Вінницька',
          Region: 'Барський'
        }]
      }],
      errors: [],
      warnings: []
    })
  });

  try {
    const settlement = await resolveNovaPoshtaSettlement(
      'Терешки, Полтавська область',
      { apiKey: 'test-key', retryBaseDelayMs: 0 }
    );
    assert.equal(settlement.DeliveryCity, 'poltava-tereshky');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('prefers the only city over a village with the same bare name', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      data: [{
        Addresses: [{
          DeliveryCity: 'kyiv-city-ref',
          MainDescription: 'Київ',
          Present: 'м. Київ, Київська обл.'
        }, {
          DeliveryCity: 'kyiv-village-ref',
          MainDescription: 'Київ',
          Present: 'с. Київ, Вознесенський р-н, Миколаївська обл.'
        }]
      }],
      errors: [],
      warnings: []
    })
  });

  try {
    const settlement = await resolveNovaPoshtaSettlement('Київ', {
      apiKey: 'test-key',
      retryBaseDelayMs: 0
    });
    assert.equal(settlement.DeliveryCity, 'kyiv-city-ref');
  } finally {
    globalThis.fetch = originalFetch;
  }
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
  assert.deepEqual(parseSenderWarehouseSelection('Нетішин 2'), {
    city: 'Нетішин',
    branch: 'Відділення №2',
    number: '2'
  });
  assert.equal(parseSenderWarehouseSelection('відділення'), null);
});

test('recovers confirmed shipment options from a Telegram preview', () => {
  assert.deepEqual(parseShipmentPreviewOptions([
    '🚚 Перевірка перед створенням ТТН',
    '📦 Вага: 2.0 кг',
    '📐 Розмір: 40×30×20 см',
    '🚛 Доставку оплачує: клієнт',
    '📤 Звідки: Нетішин, відділення №2'
  ].join('\n')), {
    senderWarehouse: { city: 'Нетішин', branch: 'Відділення №2', number: '2' },
    weight: 2,
    length: 40,
    width: 30,
    height: 20,
    deliveryPayer: 'Recipient'
  });
  assert.equal(parseShipmentPreviewOptions('Вага: 2 кг'), null);
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

test('resolves a bot warehouse through the current settlement directory', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.headers['Content-Type'], 'application/json; charset=utf-8');
    const request = JSON.parse(options.body);
    requests.push(request);
    return {
      ok: true,
      status: 200,
      json: async () => request.calledMethod === 'searchSettlements'
        ? {
            success: true,
            data: [{
              Addresses: [{
                Ref: '33333333-3333-3333-3333-333333333333',
                DeliveryCity: '11111111-1111-1111-1111-111111111111',
                MainDescription: 'Київ',
                Present: 'м. Київ, Київська обл.'
              }]
            }]
          }
        : {
            success: true,
            data: [{
              Ref: '22222222-2222-2222-2222-222222222222',
              Number: '25405',
              Description: 'Поштомат №25405: просп. Академіка Палладіна, 20',
              ShortAddress: 'просп. Академіка Палладіна, 20',
              WarehouseStatus: 'Working',
              DenyToSelect: '0'
            }]
          }
    };
  };

  try {
    const warehouse = await resolveNovaPoshtaWarehouse('Київ', 'НП 25405', {
      apiKey: 'test-key',
      retryBaseDelayMs: 0
    });
    assert.equal(warehouse.Number, '25405');
    assert.equal(requests.length, 2);
    assert.equal(requests[0].calledMethod, 'searchSettlements');
    assert.equal(requests[1].calledMethod, 'getWarehouses');
    assert.equal(requests[1].methodProperties.CityRef, '11111111-1111-1111-1111-111111111111');
    assert.equal(requests[1].methodProperties.SettlementRef, '33333333-3333-3333-3333-333333333333');
    assert.equal(requests[1].methodProperties.WarehouseId, '25405');
    assert.equal(requests[1].methodProperties.FindByString, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('falls back to the public settlement directory and uses the village SettlementRef', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    if (request.calledMethod === 'searchSettlements') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: request.apiKey
            ? [{ Addresses: [] }]
            : [{
                Addresses: [{
                  Ref: 'mala-pavlivka-settlement-ref',
                  DeliveryCity: 'mala-pavlivka-delivery-city-ref',
                  MainDescription: 'Мала Павлівка',
                  Present: 'с. Мала Павлівка, Охтирський р-н, Сумська обл.'
                }]
              }],
          errors: [],
          warnings: []
        })
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: request.methodProperties.SettlementRef === 'mala-pavlivka-settlement-ref'
          ? [{
              Ref: 'mala-pavlivka-warehouse-ref',
              Number: '1',
              Description: 'Пункт приймання-видачі №1',
              WarehouseStatus: 'Working',
              DenyToSelect: '0'
            }]
          : [],
        errors: [],
        warnings: []
      })
    };
  };

  try {
    const warehouse = await resolveNovaPoshtaWarehouse('Мала Павлівка', '1', {
      apiKey: 'business-key',
      retryBaseDelayMs: 0
    });
    assert.equal(warehouse.Number, '1');
    assert.equal(requests.length, 3);
    assert.equal(requests[0].apiKey, 'business-key');
    assert.equal(requests[1].apiKey, '');
    assert.equal(requests[2].methodProperties.CityRef, 'mala-pavlivka-delivery-city-ref');
    assert.equal(requests[2].methodProperties.SettlementRef, 'mala-pavlivka-settlement-ref');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('uses getSettlements when searchSettlements omits a valid village', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    if (request.calledMethod === 'searchSettlements') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [{ Addresses: [] }], errors: [], warnings: [] })
      };
    }
    if (request.calledMethod === 'getSettlements') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [{
            Ref: 'mala-pavlivka-settlement-ref',
            Description: 'Мала Павлівка',
            SettlementTypeDescription: 'село',
            RegionsDescription: 'Охтирський',
            AreaDescription: 'Сумська'
          }],
          errors: [],
          warnings: []
        })
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [{
          Ref: 'mala-pavlivka-warehouse-ref',
          Number: '1',
          Description: 'Пункт приймання-видачі №1',
          WarehouseStatus: 'Working',
          DenyToSelect: '0'
        }],
        errors: [],
        warnings: []
      })
    };
  };

  try {
    const warehouse = await resolveNovaPoshtaWarehouse('Мала Павлівка', '1', {
      apiKey: 'business-key',
      retryBaseDelayMs: 0
    });
    assert.equal(warehouse.Number, '1');
    assert.deepEqual(requests.map((item) => item.calledMethod), [
      'searchSettlements',
      'searchSettlements',
      'getSettlements',
      'getWarehouses'
    ]);
    assert.equal(requests[3].methodProperties.SettlementRef, 'mala-pavlivka-settlement-ref');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('understands a warehouse written as Nova Poshta number 1', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    const data = request.calledMethod === 'searchSettlements'
      ? [{
          Addresses: [{
            DeliveryCity: 'triskyni-ref',
            MainDescription: 'Тріскині',
            Present: 'с. Тріскині, Сарненський р-н, Рівненська обл.'
          }]
        }]
      : [{
          Ref: 'branch-1-ref',
          Number: '1',
          Description: 'Відділення №1: вул. Центральна, 1',
          WarehouseStatus: 'Working',
          DenyToSelect: '0'
        }];
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data, errors: [], warnings: [] })
    };
  };

  try {
    const warehouse = await resolveNovaPoshtaWarehouse('Тріскині', 'Нова пошта номер 1', {
      apiKey: 'test-key',
      retryBaseDelayMs: 0
    });
    assert.equal(warehouse.Number, '1');
    assert.equal(requests.length, 2);
    assert.equal(requests[1].methodProperties.CityRef, 'triskyni-ref');
    assert.equal(requests[1].methodProperties.WarehouseId, '1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('understands a warehouse number written before the word branch', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    const data = request.calledMethod === 'searchSettlements'
      ? [{
          Addresses: [{
            DeliveryCity: 'kyiv-ref',
            MainDescription: 'Київ',
            Present: 'м. Київ, Київська обл.'
          }]
        }]
      : [{
          Ref: 'branch-123-ref',
          Number: '123',
          Description: 'Відділення №123: вул. Тестова, 1',
          WarehouseStatus: 'Working',
          DenyToSelect: '0'
        }];
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data, errors: [], warnings: [] })
    };
  };

  try {
    for (const query of ['123 відділення', '123-тє відділення']) {
      requests.length = 0;
      const warehouse = await resolveNovaPoshtaWarehouse('Київ', query, {
        apiKey: 'test-key',
        retryBaseDelayMs: 0
      });
      assert.equal(warehouse.Number, '123');
      assert.equal(requests[1].methodProperties.WarehouseId, '123');
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('retries a numbered post locker lookup by number when the exact filter is empty', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    requests.push(request);
    let data = [];
    if (request.calledMethod === 'searchSettlements') {
      data = [{
        Addresses: [{
          DeliveryCity: 'kyiv-city-ref',
          MainDescription: 'Київ',
          Present: 'м. Київ, Київська обл.'
        }]
      }];
    } else if (request.methodProperties.FindByString === '26693') {
      data = [{
        Ref: 'locker-ref',
        Number: '26693',
        Description: 'Поштомат №26693: вул. Тестова, 1',
        WarehouseStatus: 'Working',
        DenyToSelect: '0'
      }];
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data, errors: [], warnings: [] })
    };
  };

  try {
    const warehouse = await resolveNovaPoshtaWarehouse('Київ', 'Поштомат 26693', {
      apiKey: 'test-key',
      retryBaseDelayMs: 0
    });
    assert.equal(warehouse.Number, '26693');
    assert.equal(requests.length, 3);
    assert.equal(requests[1].methodProperties.WarehouseId, '26693');
    assert.equal(requests[1].methodProperties.FindByString, undefined);
    assert.equal(requests[2].methodProperties.FindByString, '26693');
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
  assert.equal(payload.AfterpaymentOnGoodsCost, '1450.00');
  assert.equal('BackwardDeliveryData' in payload, false);
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
  assert.equal('AfterpaymentOnGoodsCost' in fullyPaidPayload, false);
});

test('retries a rejected Nova Poshta cargo description with the safe category', async () => {
  const originalFetch = globalThis.fetch;
  const descriptions = [];
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    descriptions.push(request.methodProperties.Description);
    const rejected = descriptions.length === 1;
    return {
      ok: true,
      status: 200,
      json: async () => rejected
        ? { success: false, data: [], errors: ['Description is not valid'], warnings: [] }
        : { success: true, data: [{ IntDocNumber: '20450000000001', Ref: 'ttn-ref', CostOnSite: '120', EstimatedDeliveryDate: '11.08.2026' }], errors: [], warnings: [] }
    };
  };
  try {
    const waybill = await createNovaPoshtaWaybill({
      recipientName: 'Ірина Мелентьєва', recipientPhone: '380991318125', recipientCityName: 'Кривий Ріг', customerOrderNumber: '633',
      warehouseNumber: '26184', totalAmount: 5050, codAmount: 0, weight: 2,
      dimensions: { length: 44, width: 34, height: 5 }, seatsAmount: 1,
      description: '№633 Простирадло на резинці 5шт', deliveryPayer: 'Recipient',
      sender: { cityRef: 'city-ref', ref: 'sender-ref', addressRef: 'address-ref', contactRef: 'contact-ref', phone: '380501234567' }
    }, { apiKey: 'test-key', retryBaseDelayMs: 0 });
    assert.equal(waybill.ttn, '20450000000001');
    assert.deepEqual(descriptions, ['№633 Простирадло на резинці 5шт', 'Постільна білизна 633']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('falls back to the main Nova Poshta API when the legacy marking host drops the connection', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), body: options.body ? JSON.parse(options.body) : null });
    if (String(url).startsWith('https://my.novaposhta.ua/')) throw new TypeError('fetch failed');
    return new Response(new Uint8Array([37, 80, 68, 70]), {
      status: 200,
      headers: { 'content-type': 'application/pdf' }
    });
  };
  try {
    const document = await downloadNovaPoshtaMarking('20451556100638', 'a4', { apiKey: 'test-key' });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].url, 'https://api.novaposhta.ua/v2.0/json/');
    assert.deepEqual(calls[1].body.methodProperties, {
      DocumentRefs: ['20451556100638'],
      Type: 'pdf'
    });
    assert.equal(document.mimeType, 'application/pdf');
    assert.equal(document.filename, 'NovaPoshta-20451556100638-A4.pdf');
    assert.equal(document.bytes.byteLength, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
