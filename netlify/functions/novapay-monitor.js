import { prepareFiscalReceiptDraft } from '../lib/fiscal-receipt.js';
import { markNovaPayReceived, ORDER_STATUSES, escapeHtml } from '../lib/order-core.js';
import {
  fetchNovaPayPayments,
  findNovaPayPaymentForOrder
} from '../lib/novapay-client.js';
import {
  claimNovaPayCredentialLease,
  claimAction,
  completeAction,
  connectOrderStore,
  getNovaPayApiCredentials,
  listOrders,
  releaseNovaPayCredentialLease,
  releaseAction,
  saveBotError,
  saveOrder,
  saveNovaPayApiCredentials
} from '../lib/order-store.js';
import { parseChatIds, telegramClient } from '../lib/telegram-client.js';

// NovaPay is used here only for reconciliation. CheckBox Delivery owns the
// final fiscalization of an ETTN project after the buyer receives the parcel.
// The schedule is declared once in netlify.toml. A single source avoids
// ambiguity about whether scheduled invocations can overlap.
// Bump this generation when a fresh configured pair must supersede a rotated
// pair already stored in Blobs. The old record remains intact but is ineligible
// until the new pair authenticates and saves its successor.
const NOVAPAY_CREDENTIAL_SOURCE_VERSION = 'jwt-rotation-v4-recovery-20261030';

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

function isCheckboxDeliveryManaged(order) {
  return Boolean(
    order?.checkboxDelivery &&
    ['created', 'settled'].includes(order.checkboxDelivery.state) &&
    order.checkboxDelivery.ttn === order.ttn
  );
}

function recordCheckboxDeliverySettlement(order, payment) {
  const updatedAt = new Date().toISOString();
  return {
    ...order,
    checkboxDelivery: {
      ...order.checkboxDelivery,
      // This is a reconciliation marker only. The CheckBox ETTN service
      // remains the sole creator of the final fiscal receipt and customer SMS.
      state: 'settled',
      novaPaySettledAt: order.novaPaySettledAt,
      transactionId: payment.transactionId || order.novaPayTransactionId || '',
      registryNumber: payment.registryNumber || order.novaPayRegistryNumber || '',
      updatedAt
    },
    updatedAt
  };
}

export function classifyNovaPayAuthFailure(error) {
  const message = String(error?.message || '');
  if (!/NovaPay UserAuthenticationJWT:|refresh token/iu.test(message)) return null;
  if (/certificate|public[ _-]?key|key format/iu.test(message)) return 'certificate_rejected';
  if (/refresh[ _-]?token|token.*(?:expired|invalid|reject)/iu.test(message)) return 'refresh_token_rejected';
  if (/HTTP 5\d\d/iu.test(message)) return 'upstream_http_5xx';
  if (/HTTP 4\d\d/iu.test(message)) return 'upstream_http_4xx';
  return 'user_authentication_rejected';
}

export function configuredNovaPayBootstrap(env = process.env) {
  const refreshToken = String(env.NOVAPAY_REFRESH_TOKEN_V2 || '').trim();
  const publicCertificate = String(env.NOVAPAY_PUBLIC_CERTIFICATE_V2 || '').trim();
  const credentialEpoch = String(env.NOVAPAY_CREDENTIAL_EPOCH || '').trim();
  if (!refreshToken || !publicCertificate || !credentialEpoch) return null;
  return { refreshToken, publicCertificate, credentialEpoch };
}

export function novaPayBootstrapConfigurationStatus(env = process.env) {
  return {
    refreshTokenConfigured: Boolean(String(env.NOVAPAY_REFRESH_TOKEN_V2 || '').trim()),
    publicCertificateConfigured: Boolean(String(env.NOVAPAY_PUBLIC_CERTIFICATE_V2 || '').trim()),
    credentialEpochConfigured: Boolean(String(env.NOVAPAY_CREDENTIAL_EPOCH || '').trim()),
    loginConfigured: Boolean(String(env.NOVAPAY_LOGIN || '').trim())
  };
}

export function selectNovaPayCredentials(savedCredentials, bootstrap) {
  if (!bootstrap) return { kind: 'reconnect_required', credentials: null, source: 'none' };
  const savedIsCurrent = (
    savedCredentials?.sourceVersion === NOVAPAY_CREDENTIAL_SOURCE_VERSION &&
    savedCredentials?.credentialEpoch === bootstrap.credentialEpoch &&
    savedCredentials?.refreshToken &&
    savedCredentials?.publicCertificate
  );
  return savedIsCurrent
    ? { kind: 'ready', credentials: savedCredentials, source: 'stored' }
    : { kind: 'ready', credentials: bootstrap, source: 'bootstrap' };
}

export async function fetchNovaPayPaymentsWithCredentialLease({
  dateFrom,
  dateTo,
  bootstrap,
  loadCredentials = getNovaPayApiCredentials,
  acquireLease = claimNovaPayCredentialLease,
  releaseLease = releaseNovaPayCredentialLease,
  fetchPayments = fetchNovaPayPayments,
  saveCredentials = saveNovaPayApiCredentials
}) {
  const lease = await acquireLease();
  if (!lease) return { kind: 'deferred', payments: [] };

  try {
    // Read only after acquiring the lease: a prior invocation may have already
    // rotated and saved the next pair while this one was waiting.
    const selected = selectNovaPayCredentials(await loadCredentials(), bootstrap);
    if (selected.kind !== 'ready') return { ...selected, payments: [] };

    try {
      const payments = await fetchPayments({
        dateFrom,
        dateTo,
        credentials: selected.credentials,
        onCredentialsRotated: (rotated) => saveCredentials({
          ...rotated,
          sourceVersion: NOVAPAY_CREDENTIAL_SOURCE_VERSION,
          credentialEpoch: bootstrap.credentialEpoch
        })
      });
      return { kind: 'completed', payments, source: selected.source };
    } catch (error) {
      if (error && typeof error === 'object') {
        Object.defineProperty(error, 'novaPayCredentialSource', {
          value: selected.source,
          enumerable: false,
          configurable: true
        });
      }
      throw error;
    }
  } finally {
    await releaseLease(lease);
  }
}

export const handler = async (event) => {
  connectOrderStore(event);
  const bootstrap = configuredNovaPayBootstrap();
  const configurationStatus = novaPayBootstrapConfigurationStatus();
  if (!bootstrap || !configurationStatus.loginConfigured) {
    console.warn(`NovaPay monitor paused: API credentials must be reconnected ${JSON.stringify(configurationStatus)}`);
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
    const paymentResult = awaiting.length
      ? await fetchNovaPayPaymentsWithCredentialLease({
        dateFrom: kyivDate(14), dateTo: kyivDate(0), bootstrap
      })
      : { kind: 'completed', payments: [], source: 'not_needed' };
    if (paymentResult.kind === 'deferred') {
      console.info('NovaPay monitor deferred: credential rotation is already in progress');
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: 'credential_rotation_in_progress' }) };
    }
    if (paymentResult.kind === 'reconnect_required') {
      console.warn('NovaPay monitor paused: API credentials must be reconnected');
      return { statusCode: 200, body: JSON.stringify({ ok: false, skipped: 'reauthorization_required' }) };
    }
    console.info('NovaPay credential source', { source: paymentResult.source });
    const payments = paymentResult.payments;
    const matched = [];
    for (const { order, payment } of matchPaymentsToOrders(payments, awaiting)) {
      const key = paymentKey(payment);
      if (!key || !await claimAction('novapay-settlement', key)) continue;
      try {
        let updated = markNovaPayReceived(order, {
          grossAmount: payment.grossAmount ?? order.codAmount,
          feeAmount: payment.feeAmount,
          netAmount: payment.netAmount,
          ttn: payment.ttn,
          transactionId: payment.transactionId,
          registryNumber: payment.registryNumber,
          settledAt: payment.settledAt || new Date().toISOString()
        });
        // A linked ETTN project is fiscalized by CheckBox Delivery itself. Do
        // not prepare or request a manual receipt here: that used to invite a
        // duplicate cheque after the automatic final receipt.
        if (isCheckboxDeliveryManaged(updated)) {
          updated = recordCheckboxDeliverySettlement(updated, payment);
        } else {
          updated = prepareFiscalReceiptDraft(updated);
        }
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
      ...orders.filter((order) => (
        order.status === ORDER_STATUSES.READY_FOR_RECEIPT &&
        order.novaPayReceivedAt &&
        !order.receiptNumber &&
        !isCheckboxDeliveryManaged(order)
      )),
      ...matched.filter((order) => !isCheckboxDeliveryManaged(order))
    ];
    const uniqueReady = [...new Map(ready.map((order) => [order.id, order])).values()];
    const bot = telegramClient(process.env.TELEGRAM_BOT_TOKEN);
    let notified = 0;
    for (const order of uniqueReady) {
      if (await notifyReceiptReady(bot, chatIds, order)) notified += 1;
    }
    const summary = {
      ok: true,
      checked: awaiting.length,
      payments: payments.length,
      matched: matched.length,
      checkboxDeliverySettlements: matched.filter(isCheckboxDeliveryManaged).length,
      notified
    };
    console.info('NovaPay monitor completed', JSON.stringify(summary));
    return { statusCode: 200, body: JSON.stringify(summary) };
  } catch (error) {
    // Credentials for this legacy NovaPay SOAP API rotate outside the bot.
    // Keep the scheduled reconciliation quiet until they are reconnected; the
    // CheckBox Delivery ETTN flow keeps working independently of this ledger.
    const authFailure = classifyNovaPayAuthFailure(error);
    if (authFailure) {
      const source = error?.novaPayCredentialSource || 'unknown';
      console.warn(`NovaPay monitor paused: NovaPay API authentication failed source=${source} reason=${authFailure}`);
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: false, skipped: 'reauthorization_required', reason: authFailure })
      };
    }
    console.error('NovaPay monitor failed', String(error?.message || error).slice(0, 500));
    await saveBotError({
      category: 'novapay_monitor',
      message: String(error?.message || error).slice(0, 500),
      createdAt: new Date().toISOString()
    });
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: 'NovaPay monitoring failed' }) };
  }
};
