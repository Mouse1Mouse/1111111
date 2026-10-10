import { cleanText, escapeHtml } from './order-core.js';

export const FISCAL_SHIFT_STATUSES = Object.freeze({
  CLOSED: 'closed',
  OPENING: 'opening',
  OPEN: 'open',
  CLOSING: 'closing',
  ERROR: 'error'
});

// The active CheckBox register. The workflow remains controlled until a
// production CheckBox shift integration is enabled separately.
export const DEFAULT_CHECKBOX_CASH_ID = '4001550296';

function moneyAmount(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function kyivDay(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid fiscal date');
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function kyivClock(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid fiscal date');
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Kyiv',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value),
    minute: Number(parts.find((part) => part.type === 'minute')?.value)
  };
}

export function createFiscalShiftState(cashId = DEFAULT_CHECKBOX_CASH_ID, now = new Date().toISOString()) {
  return {
    provider: 'checkbox',
    integrationMode: 'controlled',
    cashId: cleanText(cashId, 40) || DEFAULT_CHECKBOX_CASH_ID,
    status: FISCAL_SHIFT_STATUSES.CLOSED,
    openedAt: null,
    openedByChatId: '',
    openingRequestedAt: null,
    closingRequestedAt: null,
    lastClosedAt: null,
    lastZReport: null,
    lastError: null,
    updatedAt: now
  };
}

export function requestShiftOpen(state, { chatId = '', now = new Date().toISOString() } = {}) {
  const current = state || createFiscalShiftState(DEFAULT_CHECKBOX_CASH_ID, now);
  if ([FISCAL_SHIFT_STATUSES.OPENING, FISCAL_SHIFT_STATUSES.OPEN].includes(current.status)) {
    return current;
  }
  if (current.status === FISCAL_SHIFT_STATUSES.CLOSING) {
    throw new Error('Fiscal shift is being closed');
  }
  return {
    ...current,
    status: FISCAL_SHIFT_STATUSES.OPENING,
    openingRequestedAt: now,
    openedByChatId: String(chatId || ''),
    lastError: null,
    updatedAt: now
  };
}

export function confirmShiftOpen(state, { chatId = '', now = new Date().toISOString() } = {}) {
  if (!state) throw new Error('Fiscal shift state is missing');
  if (state.status === FISCAL_SHIFT_STATUSES.OPEN) return state;
  if (state.status !== FISCAL_SHIFT_STATUSES.OPENING) {
    throw new Error('Fiscal shift opening was not requested');
  }
  return {
    ...state,
    status: FISCAL_SHIFT_STATUSES.OPEN,
    openedAt: now,
    openedByChatId: String(chatId || state.openedByChatId || ''),
    openingRequestedAt: null,
    lastError: null,
    updatedAt: now
  };
}

export function cancelShiftOpen(state, now = new Date().toISOString()) {
  if (!state || state.status !== FISCAL_SHIFT_STATUSES.OPENING) return state;
  return {
    ...state,
    status: FISCAL_SHIFT_STATUSES.CLOSED,
    openingRequestedAt: null,
    openedByChatId: '',
    updatedAt: now
  };
}

export function requestShiftClose(state, summary, now = new Date().toISOString()) {
  if (!state) throw new Error('Fiscal shift state is missing');
  if ([FISCAL_SHIFT_STATUSES.CLOSING, FISCAL_SHIFT_STATUSES.CLOSED].includes(state.status)) {
    return state;
  }
  if (state.status !== FISCAL_SHIFT_STATUSES.OPEN) {
    throw new Error('Fiscal shift is not open');
  }
  return {
    ...state,
    status: FISCAL_SHIFT_STATUSES.CLOSING,
    closingRequestedAt: now,
    pendingSummary: summary,
    lastError: null,
    updatedAt: now
  };
}

export function cancelShiftClose(state, now = new Date().toISOString()) {
  if (!state || state.status !== FISCAL_SHIFT_STATUSES.CLOSING) return state;
  return {
    ...state,
    status: FISCAL_SHIFT_STATUSES.OPEN,
    closingRequestedAt: null,
    pendingSummary: null,
    updatedAt: now
  };
}

export function confirmShiftClose(
  state,
  { zReportNumber, summary, chatId = '', now = new Date().toISOString() } = {}
) {
  if (!state) throw new Error('Fiscal shift state is missing');
  if (state.status === FISCAL_SHIFT_STATUSES.CLOSED && state.lastZReport?.number === zReportNumber) {
    return state;
  }
  if (state.status !== FISCAL_SHIFT_STATUSES.CLOSING) {
    throw new Error('Fiscal shift closing was not requested');
  }
  const number = cleanText(zReportNumber, 100);
  if (!number || number.length < 3) throw new Error('Invalid Z report number');
  const finalSummary = summary || state.pendingSummary || emptyFiscalDaySummary(kyivDay(now));
  return {
    ...state,
    status: FISCAL_SHIFT_STATUSES.CLOSED,
    openedAt: null,
    openedByChatId: '',
    openingRequestedAt: null,
    closingRequestedAt: null,
    pendingSummary: null,
    lastClosedAt: now,
    lastZReport: {
      number,
      fiscalDay: finalSummary.fiscalDay,
      confirmedAt: now,
      confirmedByChatId: String(chatId || ''),
      summary: finalSummary
    },
    lastError: null,
    updatedAt: now
  };
}

export function emptyFiscalDaySummary(fiscalDay = kyivDay()) {
  return {
    fiscalDay,
    receiptCount: 0,
    totalAmount: 0,
    monobankAmount: 0,
    novaPayAmount: 0,
    receiptNumbers: []
  };
}

export function summarizeFiscalDay(orders, fiscalDay = kyivDay()) {
  const summary = emptyFiscalDaySummary(fiscalDay);
  for (const order of orders || []) {
    if (!order?.receiptNumber || !order.receiptCreatedAt) continue;
    if (kyivDay(order.receiptCreatedAt) !== fiscalDay) continue;
    const payments = order.fiscalReceipt?.payments || [];
    summary.receiptCount += 1;
    summary.totalAmount = moneyAmount(summary.totalAmount + moneyAmount(order.totalAmount));
    summary.monobankAmount = moneyAmount(summary.monobankAmount + payments
      .filter((payment) => payment.source === 'monobank_prepayment')
      .reduce((sum, payment) => sum + moneyAmount(payment.amount), 0));
    summary.novaPayAmount = moneyAmount(summary.novaPayAmount + payments
      .filter((payment) => payment.source === 'novapay_cod')
      .reduce((sum, payment) => sum + moneyAmount(payment.amount), 0));
    summary.receiptNumbers.push(cleanText(order.receiptNumber, 100));
  }
  return summary;
}

export function fiscalShiftAgeHours(state, now = new Date()) {
  if (!state?.openedAt) return 0;
  return Math.max(0, (new Date(now).getTime() - new Date(state.openedAt).getTime()) / 3_600_000);
}

export function shouldSendFiscalReminder(state, now = new Date()) {
  if (![FISCAL_SHIFT_STATUSES.OPEN, FISCAL_SHIFT_STATUSES.CLOSING].includes(state?.status)) {
    return false;
  }
  const { hour, minute } = kyivClock(now);
  return hour === 23 && minute >= 30;
}

export function formatFiscalShiftHtml(state, summary = emptyFiscalDaySummary()) {
  const labels = {
    [FISCAL_SHIFT_STATUSES.CLOSED]: 'закрита',
    [FISCAL_SHIFT_STATUSES.OPENING]: 'очікує підтвердження відкриття',
    [FISCAL_SHIFT_STATUSES.OPEN]: 'відкрита',
    [FISCAL_SHIFT_STATUSES.CLOSING]: 'очікує Z-звіт',
    [FISCAL_SHIFT_STATUSES.ERROR]: 'помилка'
  };
  return [
    '<b>🧾 CheckBox — зміна і Z-звіт</b>',
    '',
    `Каса: <b>${escapeHtml(state.cashId)}</b>`,
    `Режим: <b>контрольований</b>`,
    `Стан у боті: <b>${escapeHtml(labels[state.status] || state.status)}</b>`,
    state.openedAt ? `Відкрита: <b>${escapeHtml(state.openedAt)}</b>` : '',
    '',
    `<b>Підсумок за ${escapeHtml(summary.fiscalDay)}:</b>`,
    `Чеків: <b>${summary.receiptCount}</b>`,
    `Загальна сума: <b>${summary.totalAmount.toFixed(2)} грн</b>`,
    `Monobank: <b>${summary.monobankAmount.toFixed(2)} грн</b>`,
    `NovaPay: <b>${summary.novaPayAmount.toFixed(2)} грн</b>`,
    '',
    state.lastZReport
      ? `Останній Z-звіт: <b>${escapeHtml(state.lastZReport.number)}</b>`
      : 'Z-звітів, підтверджених ботом, ще немає.',
    '',
    '⚠️ Автоматичне відкриття та закриття зміни CheckBox ще вимкнене. Бот контролює послідовність, не дає дублювати дію та просить підтвердити результат із кабінету.'
  ].filter(Boolean).join('\n');
}

