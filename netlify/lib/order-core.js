import { randomUUID } from 'node:crypto';

const ORDER_PREFIX = 'MIVA-IG';

export const ORDER_STATUSES = Object.freeze({
  AWAITING_PREPAYMENT: 'awaiting_prepayment',
  READY_TO_SHIP: 'ready_to_ship',
  AWAITING_NOVAPAY: 'awaiting_novapay',
  READY_FOR_RECEIPT: 'ready_for_receipt',
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

export function isValidPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
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
  if (totalAmount === null || totalAmount <= 0 || prepaymentAmount === null) {
    throw new Error('Invalid order amounts');
  }

  const order = {
    id: cleanText(draft.id || createOrderId(), 40),
    source: 'instagram',
    customerOrderNumber: normalizeCustomerOrderNumber(draft.customerOrderNumber),
    customerName: cleanText(draft.customerName, 120),
    instagramHandle: cleanText(draft.instagramHandle, 80),
    phone: cleanText(draft.phone, 40),
    email: draft.email === '-' ? '' : cleanText(draft.email, 160),
    city: cleanText(draft.city, 120),
    branch: cleanText(draft.branch, 180),
    itemsSummary: cleanText(draft.itemsSummary, 1200),
    totalAmount,
    prepaymentAmount,
    codAmount: calculateCodAmount(totalAmount, prepaymentAmount),
    ttn: draft.ttn === '-' ? '' : cleanText(draft.ttn, 40),
    prepaymentReceivedAt: null,
    novaPayReceivedAt: null,
    novaPayReceivedAmount: null,
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

export function markPrepaymentReceived(order, amount, now = new Date().toISOString()) {
  if (order.cancelledAt) throw new Error('Order is cancelled');
  if (order.receiptNumber) throw new Error('Order is already closed');
  const received = parseAmount(amount);
  if (received === null || received !== order.prepaymentAmount) {
    throw new Error(`Expected prepayment ${order.prepaymentAmount.toFixed(2)}`);
  }
  const updated = { ...order, prepaymentReceivedAt: order.prepaymentReceivedAt || now, updatedAt: now };
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
  const received = parseAmount(amount);
  if (received === null || Math.abs(received - order.codAmount) > 0.01) {
    throw new Error(`Expected NovaPay amount ${order.codAmount.toFixed(2)}`);
  }
  if (order.prepaymentAmount > 0 && !order.prepaymentReceivedAt) {
    throw new Error('Prepayment is not confirmed');
  }
  const updated = {
    ...order,
    novaPayReceivedAmount: received,
    novaPayReceivedAt: order.novaPayReceivedAt || now,
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
  if (!order.novaPayReceivedAt) throw new Error('NovaPay payment is not confirmed');
  const updated = { ...order, receiptNumber: number, receiptCreatedAt: now, updatedAt: now };
  updated.status = deriveStatus(updated);
  return updated;
}

export function statusLabel(status) {
  const labels = {
    [ORDER_STATUSES.AWAITING_PREPAYMENT]: 'очікує передоплату',
    [ORDER_STATUSES.READY_TO_SHIP]: 'можна додати ТТН',
    [ORDER_STATUSES.AWAITING_NOVAPAY]: 'очікує NovaPay',
    [ORDER_STATUSES.READY_FOR_RECEIPT]: 'потрібно пробити чек',
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
    ...(order.customerOrderNumber ? [`🧾 Замовлення №<b>${escapeHtml(order.customerOrderNumber)}</b>`] : []),
    `👤 ${escapeHtml(order.customerName)}`,
    ...(order.instagramHandle ? [`📱 Instagram: ${escapeHtml(order.instagramHandle)}`] : []),
    `📞 ${escapeHtml(order.phone)}`,
    `📧 ${email}`,
    ...(order.city ? [`🏙 Місто: ${escapeHtml(order.city)}`] : []),
    ...(order.branch ? [`📦 Відділення: ${escapeHtml(order.branch)}`] : []),
    `🛏 ${escapeHtml(order.itemsSummary)}`,
    `💰 Повна сума: <b>${order.totalAmount.toFixed(2)} грн</b>`,
    `🏦 Передоплата IBAN: <b>${order.prepaymentAmount.toFixed(2)} грн</b> ${order.prepaymentReceivedAt ? '✅' : '⏳'}`,
    order.codAmount > 0
      ? `📦 Залишок NovaPay: <b>${order.codAmount.toFixed(2)} грн</b> ${order.novaPayReceivedAt ? '✅' : '⏳'}`
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
      `• Раніше отримано на IBAN: ${order.prepaymentAmount.toFixed(2)} грн`,
      `• Отримано через NovaPay: ${order.codAmount.toFixed(2)} грн`,
      '⚠️ Перед фіскалізацією перевірте номенклатуру та спосіб оплати в Сота Каса.'
    );
  }

  if (order.receiptNumber) lines.push(`🧾 Чек: <b>${escapeHtml(order.receiptNumber)}</b>`);
  return lines.join('\n');
}
