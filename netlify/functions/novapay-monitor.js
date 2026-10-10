import { prepareFiscalReceiptDraft } from '../lib/fiscal-receipt.js';
import { markNovaPayReceived, ORDER_STATUSES, escapeHtml } from '../lib/order-core.js';
import {
  fetchNovaPayPayments,
  findNovaPayPaymentForOrder,
  isNovaPayConfigured
} from '../lib/novapay-client.js';
import {
  claimAction,
  completeAction,
  connectOrderStore,
  getNovaPayApiCredentials,
  listOrders,
  releaseAction,
  saveBotError,
  saveOrder,
  saveNovaPayApiCredentials
} from '../lib/order-store.js';
import { parseChatIds, telegramClient } from '../lib/telegram-client.js';

function kyivDate(daysAgo = 0) {
  const date = new Date(Date.now() - daysAgo * 86400000);
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function paymentKey(payment) {
  return String(payment.transactionId || `${payment.registryNumber}-${payment.settledAt}-${payment.netAmount}`)
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .slice(0, 100);
}

function expectedNet(order) {
  const gross = Number(order.codAmount);
  const fee = Math.round(gross * 0.005 * 100) / 100;
  return Math.round((gross - fee) * 100) / 100;
}

function matchPaymentsToOrders(payments, orders) {
  const available = new Map(orders.map((order) => [order.id, order]));
  const matches = [];

  for (const payment of payments.filter((item) => item.ttn)) {
    const matchedOrder = [...available.values()].find((item) => item.ttn === payment.ttn);
    if (!matchedOrder || !findNovaPayPaymentForOrder([payment], matchedOrder)) continue;
    matches.push({ order: matchedOrder, payment });
    available.delete(matchedOrder.id);
  }

  for (const payment of payments.filter((item) => item.source === 'bank_registry' && !item.ttn)) {
    const candidates = [...available.values()].filter((order) => (
      payment.netAmount !== null && Math.abs(expectedNet(order) - payment.netAmount) <= 0.01
    ));
    // NovaPay's account API exposes the registry and net amount, but not a TTN.
    // Amount-only matching is allowed only when exactly one open order fits.
    if (candidates.length !== 1) continue;
    matches.push({ order: candidates[0], payment });
    available.delete(candidates[0].id);
  }
  return matches;
}

async function notifyReceiptReady(bot, chatIds, order) {
  const claimed = await claimAction('novapay-receipt-prompt', order.id);
  if (!claimed) return false;
  try {
    const net = Number(order.novaPayNetAmount ?? order.novaPayReceivedAmount).toFixed(2);
    const text = [
      '💰 <b>NovaPay зарахував післяплату</b>',
      '',
      `Замовлення: <b>${escapeHtml(order.id)}</b>`,
      `Клієнт: ${escapeHtml(order.customerName)}`,
      `ТТН: <b>${escapeHtml(order.ttn)}</b>`,
      `Клієнт сплатив: <b>${Number(order.novaPayGrossAmount).toFixed(2)} грн</b>`,
      `На рахунок NovaPay надійшло: <b>${net} грн</b>`,
      '',
      '<b>Створити фіскальний чек?</b>'
    ].join('\n');
    for (const chatId of chatIds) {
      await bot.sendMessage(chatId, text, {
        reply_markup: {
          inline_keyboard: [[
            { text: '🧾 Перевірити чернетку чека', callback_data: `fiscal_preview:${order.id}` }
          ]]
        }
      });
    }
    await completeAction('novapay-receipt-prompt', order.id, {
      transactionId: order.novaPayTransactionId,
      notifiedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    await releaseAction('novapay-receipt-prompt', order.id);
    throw error;
  }
}

export const handler = async (event) => {
  connectOrderStore(event);
  if (!isNovaPayConfigured()) {
    console.warn('NovaPay monitor skipped: API is not configured');
    return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: 'not_configured' }) };
  }

  const chatIds = parseChatIds(process.env.TELEGRAM_OPERATOR_CHAT_IDS || process.env.TELEGRAM_CHAT_IDS);
  if (!process.env.TELEGRAM_BOT_TOKEN || chatIds.length === 0) {
    console.warn('NovaPay monitor skipped: Telegram is not configured');
    return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: 'telegram_not_configured' }) };
  }

  try {
    const orders = await listOrders({ includeClosed: false, limit: 100 });
    const awaiting = orders.filter((order) => order.status === ORDER_STATUSES.AWAITING_NOVAPAY && order.ttn);
    const savedCredentials = await getNovaPayApiCredentials();
    // Ignore credentials saved before the JWT rotation implementation. The first
    // successful run overwrites that stale record with the current token chain.
    const credentials = savedCredentials?.sourceVersion === 'jwt-rotation-v1' ? savedCredentials : null;
    console.info('NovaPay credential source', {
      saved: Boolean(savedCredentials),
      savedVersion: savedCredentials?.sourceVersion || null,
      usingStoredCredentials: Boolean(credentials)
    });
    const payments = awaiting.length
      ? await fetchNovaPayPayments({
        dateFrom: kyivDate(14),
        dateTo: kyivDate(0),
        credentials,
        onCredentialsRotated: (rotated) => saveNovaPayApiCredentials({ ...rotated, sourceVersion: 'jwt-rotation-v1' })
      })
      : [];
    const matched = [];
    for (const { order, payment } of matchPaymentsToOrders(payments, awaiting)) {
      const key = paymentKey(payment);
      if (!key || !await claimAction('novapay-settlement', key)) continue;
      try {
        const updated = prepareFiscalReceiptDraft(markNovaPayReceived(order, {
          grossAmount: payment.grossAmount ?? order.codAmount,
          feeAmount: payment.feeAmount,
          netAmount: payment.netAmount,
          ttn: payment.ttn,
          transactionId: payment.transactionId,
          registryNumber: payment.registryNumber,
          settledAt: payment.settledAt || new Date().toISOString()
        }));
        await saveOrder(updated);
        await completeAction('novapay-settlement', key, {
          orderId: updated.id,
          transactionId: payment.transactionId,
          registryNumber: payment.registryNumber
        });
        matched.push(updated);
      } catch (error) {
        await releaseAction('novapay-settlement', key);
        throw error;
      }
    }

    const ready = [
      ...orders.filter((order) => order.status === ORDER_STATUSES.READY_FOR_RECEIPT && order.novaPayReceivedAt && !order.receiptNumber),
      ...matched
    ];
    const uniqueReady = [...new Map(ready.map((order) => [order.id, order])).values()];
    const bot = telegramClient(process.env.TELEGRAM_BOT_TOKEN);
    let notified = 0;
    for (const order of uniqueReady) {
      if (await notifyReceiptReady(bot, chatIds, order)) notified += 1;
    }
    const summary = { ok: true, checked: awaiting.length, payments: payments.length, matched: matched.length, notified };
    console.info('NovaPay monitor completed', JSON.stringify(summary));
    return { statusCode: 200, body: JSON.stringify(summary) };
  } catch (error) {
    console.error('NovaPay monitor failed', String(error?.message || error).slice(0, 500));
    await saveBotError({
      category: 'novapay_monitor',
      message: String(error?.message || error).slice(0, 500),
      createdAt: new Date().toISOString()
    });
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'NovaPay monitoring failed' }) };
  }
};
