import { randomUUID } from 'node:crypto';

const ORDER_PREFIX = 'MIVA-IG';
export const NOVAPAY_COMMISSION_RATE = 0.005;

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function calculateNovaPaySettlement(grossAmount) {
  const gross = parseAmount(grossAmount);
  if (gross === null || gross < 0) throw new Error('Invalid NovaPay gross amount');
  const fee = roundMoney(gross * NOVAPAY_COMMISSION_RATE);
  return {
    grossAmount: gross,
    feeAmount: fee,
    netAmount: roundMoney(gross - fee),
    commissionRate: NOVAPAY_COMMISSION_RATE
  };
}

export const ORDER_STATUSES = Object.freeze({
  AWAITING_PREPAYMENT: 'awaiting_prepayment',
  READY_TO_SHIP: 'ready_to_ship',
  AWAITING_NOVAPAY: 'awaiting_novapay',
  READY_FOR_RECEIPT: 'ready_for_receipt',
  CLOSED: 'closed',
  RECEIPT_DONE: 'receipt_done',
  CANCELLED: 'cancelled'
});

export function cleanText(value, maxLength = 500) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function parseAmount(value) {
  const normalized = String(value ?? '')
    .replace(/грн/gi, '')
    .replace(/\s/g, '')
    .replace(',', '.');

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null;
}

export function normalizeCustomerOrderNumber(value) {
  return cleanText(value, 80)
    .replace(/^(?:(?:замовлення|заказ|order)\s*(?:номер|number|№|#)?|(?:номер\s+(?:замовлення|заказу|заказа)))\s*/iu, '')
    .replace(/^(?:№|#)\s*/u, '')
    .trim()
    .slice(0, 40);
}

export function isValidCustomerOrderNumber(value) {
  return /^[\p{L}\p{N}][\p{L}\p{N}._/-]{0,39}$/u.test(normalizeCustomerOrderNumber(value));
}

export function parseTtnFromOrderCard(value) {
  const match = String(value || '').match(/ТТН:\s*(\d{12,20})/iu);
  return match?.[1] || '';
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(value, 160));
}

export function normalizeUkrainianPhone(value) {
  const input = cleanText(value, 60);
  const digits = input.replace(/\D/g, '');
  let normalizedDigits = digits;
  let correction = '';

  if (digits.length === 10 && digits.startsWith('0')) {
    normalizedDigits = `38${digits}`;
    correction = 'country_code';
  } else if (digits.length === 12 && digits.startsWith('380')) {
    correction = input === `+${digits}` ? '' : 'format';
  }

  const valid = normalizedDigits.length === 12 && normalizedDigits.startsWith('380');
  const phone = valid ? `+${normalizedDigits}` : input;
  const missingDigits = digits.startsWith('0') && digits.length < 10
    ? 10 - digits.length
    : digits.startsWith('380') && digits.length < 12
      ? 12 - digits.length
      : null;

  return {
    input,
    digits,
    phone,
    valid,
    corrected: valid && phone !== input,
    correction,
    missingDigits
  };
}

export function isValidPhone(value) {
  return normalizeUkrainianPhone(value).valid;
}

export function isValidTtn(value) {
  const text = cleanText(value, 40);
  return text === '-' || /^[A-Za-zА-Яа-яІіЇїЄє0-9-]{8,40}$/.test(text);
}

export function createOrderId(now = new Date(), randomPart = randomUUID()) {
  const date = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Kyiv',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit'
  }).format(now).replaceAll('-', '');
  const suffix = randomPart.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
  return `${ORDER_PREFIX}-${date}-${suffix}`;
}

export function calculateCodAmount(totalAmount, prepaymentAmount) {
  const total = parseAmount(totalAmount);
  const prepayment = parseAmount(prepaymentAmount);
  if (total === null || prepayment === null || total <= 0 || prepayment < 0 || prepayment > total) {
    throw new Error('Invalid order amounts');
  }
  return Math.round((total - prepayment) * 100) / 100;
}

export function deriveStatus(order) {
  if (order.cancelledAt) return ORDER_STATUSES.CANCELLED;
  if (order.receiptNumber) return ORDER_STATUSES.RECEIPT_DONE;
  if (order.closedAt) return ORDER_STATUSES.CLOSED;
  if (order.novaPayReceivedAt) return ORDER_STATUSES.READY_FOR_RECEIPT;
  if (order.prepaymentAmount > 0 && !order.prepaymentReceivedAt) {
    return ORDER_STATUSES.AWAITING_PREPAYMENT;
  }
  if (!order.ttn) return ORDER_STATUSES.READY_TO_SHIP;
  if (order.codAmount === 0) return ORDER_STATUSES.READY_FOR_RECEIPT;
  return ORDER_STATUSES.AWAITING_NOVAPAY;
}

export function createOrder(draft, context = {}) {
  const totalAmount = parseAmount(draft.totalAmount);
  const prepaymentAmount = parseAmount(draft.prepaymentAmount);
  const normalizedPhone = normalizeUkrainianPhone(draft.phone);
  if (totalAmount === null || totalAmount <= 0 || prepaymentAmount === null) {
    throw new Error('Invalid order amounts');
  }

  const order = {
    id: cleanText(draft.id || createOrderId(), 40),
    source: 'instagram',
    customerOrderNumber: normalizeCustomerOrderNumber(draft.customerOrderNumber),
    customerName: cleanText(draft.customerName, 120),
    instagramHandle: cleanText(draft.instagramHandle, 80),
    phone: normalizedPhone.phone,
    email: draft.email === '-' ? '' : cleanText(draft.email, 160),
    city: cleanText(draft.city, 120),
    branch: cleanText(draft.branch, 180),
    itemsSummary: cleanText(draft.itemsSummary, 1200),
    totalAmount,
    prepaymentAmount,
    codAmount: calculateCodAmount(totalAmount, prepaymentAmount),
    ttn: draft.ttn === '-' ? '' : cleanText(draft.ttn, 40),
    prepaymentSource: 'monobank_iban',
    prepaymentReceivedAt: null,
    prepaymentReceivedAmount: null,
    prepaymentTransactionId: '',
    novaPayReceivedAt: null,
    novaPayReceivedAmount: null,
    novaPayGrossAmount: null,
    novaPayFeeAmount: null,
    novaPayNetAmount: null,
    novaPayCommissionRate: NOVAPAY_COMMISSION_RATE,
    novaPayRegistryNumber: '',
    novaPayTransactionId: '',
    novaPaySettledAt: null,
    receiptNumber: '',
    receiptCreatedAt: null,
    cancelledAt: null,
    createdAt: context.now || new Date().toISOString(),
    updatedAt: context.now || new Date().toISOString(),
    createdByChatId: String(context.chatId || ''),
    status: ''
  };

  if (!order.customerName || !isValidPhone(order.phone) || !order.itemsSummary) {
    throw new Error('Missing required order data');
  }
  if (order.email && !isValidEmail(order.email)) {
    throw new Error('Invalid customer email');
  }

  order.status = deriveStatus(order);
  return order;
}

export function updateOrderDetails(order, changes, now = new Date().toISOString()) {
  if (order.cancelledAt || order.receiptNumber) throw new Error('Order is closed');
  if (order.ttn) throw new Error('Order already has TTN');

  const validated = createOrder({ ...order, ...changes }, {
    now: order.createdAt || now,
    chatId: order.createdByChatId
  });
  const prepaymentChanged = validated.prepaymentAmount !== order.prepaymentAmount;
  const updated = {
    ...order,
    customerName: validated.customerName,
    instagramHandle: validated.instagramHandle,
    phone: validated.phone,
    email: validated.email,
    city: validated.city,
    branch: validated.branch,
    itemsSummary: validated.itemsSummary,
    totalAmount: validated.totalAmount,
    prepaymentAmount: validated.prepaymentAmount,
    codAmount: validated.codAmount,
    prepaymentReceivedAt: prepaymentChanged ? null : order.prepaymentReceivedAt,
    prepaymentReceivedAmount: prepaymentChanged ? null : order.prepaymentReceivedAmount,
    prepaymentTransactionId: prepaymentChanged ? '' : order.prepaymentTransactionId,
    novaPayReceivedAt: null,
    novaPayReceivedAmount: null,
    novaPayGrossAmount: null,
    novaPayFeeAmount: null,
    novaPayNetAmount: null,
    novaPayRegistryNumber: '',
    novaPayTransactionId: '',
    novaPaySettledAt: null,
    updatedAt: now
  };
  updated.status = deriveStatus(updated);
  return updated;
}

export function markPrepaymentReceived(order, amount, now = new Date().toISOString()) {
  if (order.cancelledAt) throw new Error('Order is cancelled');
  if (order.receiptNumber) throw new Error('Order is already closed');
  const payment = typeof amount === 'object' && amount !== null ? amount : { amount };
  const received = parseAmount(payment.amount);
  if (received === null || received !== order.prepaymentAmount) {
    throw new Error(`Expected prepayment ${order.prepaymentAmount.toFixed(2)}`);
  }
  if (
    order.prepaymentReceivedAt &&
    Math.abs(Number(order.prepaymentReceivedAmount ?? order.prepaymentAmount) - received) <= 0.01
  ) {
    return order;
  }
  const updated = {
    ...order,
    prepaymentSource: 'monobank_iban',
    prepaymentReceivedAmount: received,
    prepaymentTransactionId: cleanText(payment.transactionId, 120),
    prepaymentReceivedAt: order.prepaymentReceivedAt || payment.receivedAt || now,
    updatedAt: now
  };
  updated.status = deriveStatus(updated);
  return updated;
}

export function attachTtn(order, ttn, now = new Date().toISOString()) {
  if (order.cancelledAt) throw new Error('Order is cancelled');
  if (order.receiptNumber) throw new Error('Order is already closed');
  if (!isValidTtn(ttn) || ttn === '-') throw new Error('Invalid TTN');
  const updated = { ...order, ttn: cleanText(ttn, 40), updatedAt: now };
  updated.status = deriveStatus(updated);
  return updated;
}

export function markNovaPayReceived(order, amount, now = new Date().toISOString()) {
  if (order.cancelledAt) throw new Error('Order is cancelled');
  if (order.receiptNumber) throw new Error('Order is already closed');
  if (!order.ttn) throw new Error('TTN is not attached');
  const payment = typeof amount === 'object' && amount !== null
    ? amount
    : { grossAmount: amount };
  const gross = parseAmount(payment.grossAmount ?? payment.amount);
  if (gross === null || Math.abs(gross - order.codAmount) > 0.01) {
    throw new Error(`Expected NovaPay amount ${order.codAmount.toFixed(2)}`);
  }
  const expected = calculateNovaPaySettlement(gross);
  const fee = parseAmount(payment.feeAmount ?? expected.feeAmount);
  const net = parseAmount(payment.netAmount ?? expected.netAmount);
  if (fee === null || Math.abs(fee - expected.feeAmount) > 0.01) {
    throw new Error(`Expected NovaPay fee ${expected.feeAmount.toFixed(2)}`);
  }
  if (net === null || Math.abs(net - expected.netAmount) > 0.01) {
    throw new Error(`Expected NovaPay net amount ${expected.netAmount.toFixed(2)}`);
  }
  const paymentTtn = cleanText(payment.ttn, 40);
  if (paymentTtn && paymentTtn !== order.ttn) throw new Error('NovaPay TTN does not match order');
  if (order.prepaymentAmount > 0 && !order.prepaymentReceivedAt) {
    throw new Error('Prepayment is not confirmed');
  }
  if (order.novaPayReceivedAt) {
    const existingGross = Number(order.novaPayGrossAmount ?? order.novaPayReceivedAmount);
    const existingNet = Number(order.novaPayNetAmount ?? expected.netAmount);
    const existingFee = Number(order.novaPayFeeAmount ?? expected.feeAmount);
    if (
      Math.abs(existingGross - gross) <= 0.01 &&
      Math.abs(existingNet - net) <= 0.01 &&
      Math.abs(existingFee - fee) <= 0.01
    ) {
      return order;
    }
    throw new Error('NovaPay payment is already confirmed with different amounts');
  }
  const updated = {
    ...order,
    // Kept as the gross customer payment for backward compatibility.
    novaPayReceivedAmount: gross,
    novaPayGrossAmount: gross,
    novaPayFeeAmount: fee,
    novaPayNetAmount: net,
    novaPayCommissionRate: NOVAPAY_COMMISSION_RATE,
    novaPayRegistryNumber: cleanText(payment.registryNumber, 120),
    novaPayTransactionId: cleanText(payment.transactionId, 120),
    novaPaySettledAt: payment.settledAt || now,
    novaPayReceivedAt: payment.receivedAt || payment.settledAt || now,
    updatedAt: now
  };
  updated.status = deriveStatus(updated);
  return updated;
}

export function markReceiptDone(order, receiptNumber, now = new Date().toISOString()) {
  if (order.cancelledAt) throw new Error('Order is cancelled');
  const number = cleanText(receiptNumber, 80);
  if (!number || !/^[A-Za-zА-Яа-яІіЇїЄє0-9/_-]{4,80}$/.test(number)) {
    throw new Error('Invalid receipt number');
  }
  if (deriveStatus(order) !== ORDER_STATUSES.READY_FOR_RECEIPT) {
    throw new Error('Order payment is not ready for receipt');
  }
  const updated = {
    ...order,
    receiptNumber: number,
    receiptCreatedAt: now,
    fiscalReceipt: order.fiscalReceipt ? {
      ...order.fiscalReceipt,
      state: 'recorded_manually',
      receiptNumber: number,
      recordedAt: now
    } : order.fiscalReceipt,
    updatedAt: now
  };
  updated.status = deriveStatus(updated);
  return updated;
}

export function markOrderClosed(order, reason = 'completed', now = new Date().toISOString()) {
  if (order.cancelledAt) throw new Error('Order is cancelled');
  if (order.receiptNumber) throw new Error('Order already has a receipt');
  const closedReason = cleanText(reason, 120);
  if (!closedReason) throw new Error('Order close reason is missing');
  const updated = {
    ...order,
    closedAt: order.closedAt || now,
    closedReason,
    updatedAt: now
  };
  updated.status = deriveStatus(updated);
  return updated;
}

export function statusLabel(status) {
  const labels = {
    [ORDER_STATUSES.AWAITING_PREPAYMENT]: 'очікує передоплату',
    [ORDER_STATUSES.READY_TO_SHIP]: 'можна додати ТТН',
    [ORDER_STATUSES.AWAITING_NOVAPAY]: 'очікує NovaPay',
    [ORDER_STATUSES.READY_FOR_RECEIPT]: 'потрібно пробити чек',
    [ORDER_STATUSES.CLOSED]: 'виконано без фіскального чека',
    [ORDER_STATUSES.RECEIPT_DONE]: 'чек готовий',
    [ORDER_STATUSES.CANCELLED]: 'скасовано'
  };
  return labels[status] || status;
}

export function formatOrderHtml(order, { receiptInstructions = false } = {}) {
  const email = order.email ? escapeHtml(order.email) : 'не вказано';
  const ttn = order.ttn ? escapeHtml(order.ttn) : 'ще не додано';
  const lines = [
    `<b>${escapeHtml(order.id)}</b> · Instagram`,
    order.customerOrderNumber
      ? `🧾 Замовлення №<b>${escapeHtml(order.customerOrderNumber)}</b>`
      : '⚠️ Номер замовлення не вказано',
    `👤 ${escapeHtml(order.customerName)}`,
    ...(order.instagramHandle ? [`📱 Instagram: ${escapeHtml(order.instagramHandle)}`] : []),
    `📞 ${escapeHtml(order.phone)}`,
    `📧 ${email}`,
    ...(order.city ? [`🏙 Місто: ${escapeHtml(order.city)}`] : []),
    ...(order.branch ? [`📦 Відділення: ${escapeHtml(order.branch)}`] : []),
    `🛏 ${escapeHtml(order.itemsSummary)}`,
    `💰 Повна сума: <b>${order.totalAmount.toFixed(2)} грн</b>`,
    `🏦 Передоплата Monobank: <b>${order.prepaymentAmount.toFixed(2)} грн</b> ${order.prepaymentReceivedAt ? '✅' : '⏳'}`,
    order.codAmount > 0
      ? `📦 Післяплата NovaPay: <b>${order.codAmount.toFixed(2)} грн</b> ${order.novaPayReceivedAt ? `✅ (зараховано ${Number(order.novaPayNetAmount ?? order.codAmount).toFixed(2)} грн)` : '⏳'}`
      : '📦 Післяплата NovaPay: <b>немає</b> ✅',
    `🚚 ТТН: ${ttn}`,
    `📌 Статус: <b>${escapeHtml(statusLabel(order.status))}</b>`
  ];

  if (receiptInstructions) {
    lines.push(
      '',
      '<b>Дані для фіскального чека:</b>',
      `• Товар: ${escapeHtml(order.itemsSummary)}`,
      `• Повна вартість: ${order.totalAmount.toFixed(2)} грн`,
      `• Передоплата на Monobank: ${order.prepaymentAmount.toFixed(2)} грн`,
      `• Клієнт сплатив через NovaPay: ${order.codAmount.toFixed(2)} грн`,
      `• Комісія NovaPay: ${Number(order.novaPayFeeAmount ?? 0).toFixed(2)} грн`,
      `• На рахунок NovaPay зараховано: ${Number(order.novaPayNetAmount ?? order.codAmount).toFixed(2)} грн`,
      '• Переказ NovaPay → власний Monobank не є повторною оплатою клієнта.',
      '⚠️ Перед фіскалізацією перевірте номенклатуру та спосіб оплати в CheckBox.'
    );
  }

  if (order.receiptNumber) lines.push(`🧾 Чек: <b>${escapeHtml(order.receiptNumber)}</b>`);
  if (order.closedAt && !order.receiptNumber) {
    lines.push('✅ Замовлення виконано та перенесено в архів без позначки про фіскальний чек.');
  }
  return lines.join('\n');
}
