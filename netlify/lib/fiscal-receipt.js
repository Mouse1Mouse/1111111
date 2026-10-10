import { createHash } from 'node:crypto';
import {
  calculateNovaPaySettlement,
  cleanText,
  escapeHtml,
  ORDER_STATUSES
} from './order-core.js';
import { matchOrderSummaryToCatalog } from './product-catalog.js';

export const FISCAL_DRAFT_VERSION = 4;

function moneyAmount(value) {
  return Math.round(Number(value) * 100) / 100;
}

function orderFingerprint(order) {
  return createHash('sha256')
    .update(JSON.stringify({
      itemsSummary: cleanText(order?.itemsSummary, 1200),
      totalAmount: moneyAmount(order?.totalAmount),
      prepaymentAmount: moneyAmount(order?.prepaymentAmount),
      codAmount: moneyAmount(order?.codAmount),
      novaPayFeeAmount: moneyAmount(order?.novaPayFeeAmount),
      novaPayNetAmount: moneyAmount(order?.novaPayNetAmount)
    }))
    .digest('hex')
    .slice(0, 20);
}

export function isFiscalReceiptReady(order) {
  if (!order || order.cancelledAt || order.receiptNumber) return false;
  if (order.status !== ORDER_STATUSES.READY_FOR_RECEIPT) return false;

  const prepaymentReady = Number(order.prepaymentAmount) === 0 || Boolean(order.prepaymentReceivedAt);
  const novaPayGrossAmount = Number(order.novaPayGrossAmount ?? order.novaPayReceivedAmount);
  const novaPayReady = Number(order.codAmount) === 0 || (
    Boolean(order.novaPayReceivedAt) &&
    Math.abs(novaPayGrossAmount - Number(order.codAmount)) <= 0.01
  );
  return prepaymentReady && novaPayReady;
}

export function buildFiscalReceiptDraft(order, now = new Date().toISOString()) {
  if (!isFiscalReceiptReady(order)) {
    throw new Error('Order payment is not ready for fiscal receipt');
  }

  const totalAmount = moneyAmount(order.totalAmount);
  const prepaymentAmount = moneyAmount(order.prepaymentAmount);
  const novaPayAmount = moneyAmount(order.codAmount);
  const novaPaySettlement = calculateNovaPaySettlement(novaPayAmount);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new Error('Invalid fiscal receipt total');
  }
  const catalogMatch = matchOrderSummaryToCatalog(order.itemsSummary, totalAmount);

  return {
    version: FISCAL_DRAFT_VERSION,
    provider: 'checkbox',
    state: 'draft',
    idempotencyKey: `miva:${order.id}:sale:v${FISCAL_DRAFT_VERSION}`,
    orderId: order.id,
    preparedAt: now,
    sourceFingerprint: orderFingerprint(order),
    totalAmount,
    customer: {
      name: cleanText(order.customerName, 120),
      phone: cleanText(order.phone, 40),
      email: cleanText(order.email, 160)
    },
    catalogVersion: catalogMatch.catalogVersion,
    catalogStatus: catalogMatch.status,
    catalogConfirmedAt: null,
    items: catalogMatch.items,
    payments: [
      ...(prepaymentAmount > 0 ? [{
        source: 'monobank_prepayment',
        amount: prepaymentAmount,
        receivedAt: order.prepaymentReceivedAt
      }] : []),
      ...(novaPayAmount > 0 ? [{
        source: 'novapay_cod',
        amount: novaPayAmount,
        receivedAt: order.novaPayReceivedAt,
        feeAmount: moneyAmount(order.novaPayFeeAmount ?? novaPaySettlement.feeAmount),
        settledAmount: moneyAmount(order.novaPayNetAmount ?? novaPaySettlement.netAmount),
        ttn: cleanText(order.ttn, 40)
      }] : [])
    ],
    warnings: [
      ...catalogMatch.warnings,
      'Жива фіскалізація CheckBox вимкнена, доки не налаштовано захищені змінні інтеграції та не пройдено тестовий чек.'
    ]
  };
}

export function prepareFiscalReceiptDraft(order, now = new Date().toISOString()) {
  if (!isFiscalReceiptReady(order)) return order;
  if (
    order.fiscalReceipt?.version === FISCAL_DRAFT_VERSION &&
    order.fiscalReceipt?.idempotencyKey === `miva:${order.id}:sale:v${FISCAL_DRAFT_VERSION}` &&
    order.fiscalReceipt?.sourceFingerprint === orderFingerprint(order)
  ) {
    return order;
  }

  return {
    ...order,
    fiscalReceipt: buildFiscalReceiptDraft(order, now),
    updatedAt: now
  };
}

export function confirmFiscalReceiptCatalog(order, now = new Date().toISOString()) {
  const prepared = prepareFiscalReceiptDraft(order, now);
  if (!prepared.fiscalReceipt) throw new Error('Fiscal receipt draft is not ready');
  if (prepared.fiscalReceipt.catalogConfirmedAt) return prepared;
  return {
    ...prepared,
    fiscalReceipt: {
      ...prepared.fiscalReceipt,
      catalogConfirmedAt: now,
      state: 'catalog_confirmed'
    },
    updatedAt: now
  };
}

export function formatFiscalReceiptDraftHtml(order) {
  const draft = order?.fiscalReceipt || buildFiscalReceiptDraft(order);
  const paymentLines = draft.payments.map((payment) => {
    const label = payment.source === 'monobank_prepayment' ? 'Передоплата Monobank' : 'Післяплата NovaPay';
    const settlement = payment.source === 'novapay_cod' && Number.isFinite(payment.settledAmount)
      ? ` (комісія ${payment.feeAmount.toFixed(2)} грн, зараховано ${payment.settledAmount.toFixed(2)} грн)`
      : '';
    return `• ${label}: <b>${payment.amount.toFixed(2)} грн</b>${settlement}`;
  });
  const itemLines = draft.items.flatMap((item, index) => [
    `<b>${index + 1}. ${escapeHtml(item.name)}</b>`,
    `Артикул: <code>${escapeHtml(item.sku || 'не визначено')}</code>`,
    `Кількість: ${item.quantity} ${escapeHtml(item.unit || 'шт')} × ${item.unitPrice.toFixed(2)} грн = <b>${item.totalAmount.toFixed(2)} грн</b>`
  ]);

  return [
    '<b>🧾 Чернетка фіскального чека CheckBox</b>',
    '',
    `Замовлення: <b>${escapeHtml(draft.orderId)}</b>`,
    `Каталог: <b>${escapeHtml(draft.catalogStatus === 'matched' ? 'товари зіставлено' : 'потрібна перевірка')}</b>`,
    '',
    '<b>Товари:</b>',
    ...itemLines,
    `Сума чека: <b>${draft.totalAmount.toFixed(2)} грн</b>`,
    '',
    '<b>Оплату отримано:</b>',
    ...paymentLines,
    '',
    `Ключ захисту від дубля: <code>${escapeHtml(draft.idempotencyKey)}</code>`,
    '',
    ...draft.warnings.map((warning) => `⚠️ ${escapeHtml(warning)}`),
    '',
    draft.catalogConfirmedAt
      ? `✅ Номенклатуру підтверджено: ${escapeHtml(draft.catalogConfirmedAt)}`
      : '⏳ Номенклатуру ще не підтверджено менеджером.',
    '',
    'Це лише чернетка: дані ще не відправлялися в CheckBox.'
  ].join('\n');
}
