import {
  DEFAULT_CHECKBOX_CASH_ID,
  createFiscalShiftState,
  fiscalShiftAgeHours,
  kyivDay,
  shouldSendFiscalReminder,
  summarizeFiscalDay
} from '../lib/fiscal-shift.js';
import {
  claimFiscalNotification,
  connectOrderStore,
  getFiscalShiftState,
  listOrders
} from '../lib/order-store.js';
import { parseChatIds, telegramClient } from '../lib/telegram-client.js';

function money(value) {
  return `${Number(value).toFixed(2)} грн`;
}

export const handler = async (event) => {
  connectOrderStore(event);
  const cashId = process.env.CHECKBOX_CASH_ID || DEFAULT_CHECKBOX_CASH_ID;
  const state = await getFiscalShiftState(cashId) || createFiscalShiftState(cashId);
  const now = new Date();
  if (!shouldSendFiscalReminder(state, now)) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, notified: false }) };
  }

  const fiscalDay = kyivDay(now);
  const notificationKey = `z-reminder-${cashId}-${fiscalDay}`;
  const claimed = await claimFiscalNotification(notificationKey, {
    cashId,
    fiscalDay,
    shiftStatus: state.status
  });
  if (!claimed) {
    return { statusCode: 200, body: JSON.stringify({ ok: true, notified: false, duplicate: true }) };
  }

  const orders = await listOrders({ includeClosed: true, limit: 100 });
  const summary = summarizeFiscalDay(orders, fiscalDay);
  const age = fiscalShiftAgeHours(state, now);
  const text = [
    '<b>⚠️ Час перевірити зміну CheckBox</b>',
    '',
    `Каса: <b>${cashId}</b>`,
    `Стан у боті: <b>${state.status}</b>`,
    `Вік зміни: <b>${age.toFixed(1)} год</b>`,
    `Чеків сьогодні: <b>${summary.receiptCount}</b>`,
    `Загальна сума: <b>${money(summary.totalAmount)}</b>`,
    '',
    'Відкрийте «🧾 Каса і Z-звіт», перевірте підсумок і закрийте зміну через Z-звіт.'
  ].join('\n');

  const chatIds = parseChatIds(process.env.TELEGRAM_OPERATOR_CHAT_IDS || process.env.TELEGRAM_CHAT_IDS);
  const bot = telegramClient(process.env.TELEGRAM_BOT_TOKEN);
  await Promise.all(chatIds.map((chatId) => bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [[{ text: '🧾 Каса і Z-звіт', callback_data: 'cash_panel:current' }]]
    }
  })));

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true, notified: true, recipients: chatIds.length })
  };
};
