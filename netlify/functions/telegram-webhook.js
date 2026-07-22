import { timingSafeEqual } from 'node:crypto';
import {
  ORDER_STATUSES,
  attachTtn,
  cleanText,
  createOrder,
  createOrderId,
  escapeHtml,
  formatOrderHtml,
  isValidEmail,
  isValidPhone,
  isValidTtn,
  markNovaPayReceived,
  markPrepaymentReceived,
  markReceiptDone,
  parseAmount,
  statusLabel
} from '../lib/order-core.js';
import {
  clearSession,
  claimUpdate,
  connectOrderStore,
  getOrder,
  getSession,
  listOrders,
  saveOrder,
  saveSession
} from '../lib/order-store.js';
import { deriveWebhookSecret, parseChatIds, telegramClient } from '../lib/telegram-client.js';

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
});

function safeEqual(actual, expected) {
  const left = Buffer.from(String(actual || ''));
  const right = Buffer.from(String(expected || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

function money(value) {
  return `${Number(value).toFixed(2)} грн`;
}

const MENU_BUTTONS = Object.freeze({
  NEW: '➕ Нове замовлення',
  ORDERS: '📋 Активні замовлення',
  HELP: 'ℹ️ Допомога',
  CANCEL: '❌ Скасувати'
});

const MAIN_KEYBOARD = Object.freeze({
  keyboard: [
    [{ text: MENU_BUTTONS.NEW }, { text: MENU_BUTTONS.ORDERS }],
    [{ text: MENU_BUTTONS.HELP }]
  ],
  resize_keyboard: true,
  is_persistent: true
});

const CANCEL_KEYBOARD = Object.freeze({
  keyboard: [[{ text: MENU_BUTTONS.CANCEL }]],
  resize_keyboard: true,
  is_persistent: true
});

async function sendMainMenu(bot, chatId, text = HELP_TEXT) {
  return bot.sendMessage(chatId, text, { reply_markup: MAIN_KEYBOARD });
}

function orderButtons(order) {
  const rows = [];
  if (order.status === ORDER_STATUSES.AWAITING_PREPAYMENT) {
    rows.push([{ text: `✅ Отримано ${money(order.prepaymentAmount)}`, callback_data: `prepaid:${order.id}` }]);
  }
  if ([ORDER_STATUSES.READY_TO_SHIP, ORDER_STATUSES.AWAITING_NOVAPAY].includes(order.status) && !order.ttn) {
    rows.push([{ text: '🚚 Додати ТТН', callback_data: `ttn:${order.id}` }]);
  }
  if (order.status === ORDER_STATUSES.AWAITING_NOVAPAY) {
    rows.push([{ text: `✅ NovaPay ${money(order.codAmount)}`, callback_data: `novapay:${order.id}` }]);
  }
  if (order.status === ORDER_STATUSES.READY_FOR_RECEIPT) {
    rows.push([{ text: '🧾 Чек пробито в СОТА', callback_data: `receipt:${order.id}` }]);
  }
  return rows.length ? { inline_keyboard: rows } : undefined;
}

async function sendOrder(bot, chatId, order, receiptInstructions = false) {
  return bot.sendMessage(chatId, formatOrderHtml(order, { receiptInstructions }), {
    reply_markup: orderButtons(order)
  });
}

const HELP_TEXT = [
  '<b>MIVA · Instagram + NovaPay</b>',
  '',
  '/new — створити замовлення',
  '/orders — активні замовлення',
  '/order НОМЕР — відкрити замовлення',
  '/cancel — скасувати поточне введення',
  '',
  'Бот веде замовлення та готує дані для чека. Сам чек у СОТА Каса поки не створює.'
].join('\n');

const STEPS = {
  customerName: {
    prompt: '1/7 Введіть ім’я клієнта:',
    validate: (value) => cleanText(value, 120).length >= 2,
    error: 'Введіть ім’я клієнта (щонайменше 2 символи).',
    next: 'phone'
  },
  phone: {
    prompt: '2/7 Введіть телефон клієнта:',
    validate: isValidPhone,
    error: 'Телефон не схожий на правильний. Наприклад: +380XXXXXXXXX',
    next: 'email'
  },
  email: {
    prompt: '3/7 Введіть email для чека або поставте - якщо його немає:',
    validate: (value) => value === '-' || isValidEmail(value),
    error: 'Введіть правильний email або один символ -',
    next: 'itemsSummary'
  },
  itemsSummary: {
    prompt: '4/7 Опишіть товари для чека: назва, розмір, кількість, ціна.',
    validate: (value) => cleanText(value, 1200).length >= 3,
    error: 'Додайте назву товару, розмір, кількість і ціну.',
    next: 'totalAmount'
  },
  totalAmount: {
    prompt: '5/7 Введіть повну суму замовлення у гривнях:',
    validate: (value) => (parseAmount(value) || 0) > 0,
    error: 'Введіть суму числом, наприклад 1650 або 1650,50.',
    next: 'prepaymentAmount'
  },
  prepaymentAmount: {
    prompt: '6/7 Введіть передоплату на IBAN. Зазвичай 200:',
    validate: (value, draft) => {
      const amount = parseAmount(value);
      return amount !== null && amount >= 0 && amount < parseAmount(draft.totalAmount);
    },
    error: 'Для схеми з NovaPay передоплата має бути від 0 грн і меншою за повну суму замовлення.',
    next: 'ttn'
  },
  ttn: {
    prompt: '7/7 Введіть ТТН Нової пошти або - якщо її ще немає:',
    validate: isValidTtn,
    error: 'Введіть коректну ТТН або один символ -',
    next: null
  }
};

async function startNewOrder(bot, chatId) {
  const session = {
    mode: 'new_order',
    step: 'customerName',
    draft: { id: createOrderId() },
    updatedAt: new Date().toISOString()
  };
  await saveSession(chatId, session);
  await bot.sendMessage(chatId, STEPS.customerName.prompt, { reply_markup: CANCEL_KEYBOARD });
}

async function handleNewOrderStep(bot, chatId, text, session) {
  const config = STEPS[session.step];
  if (!config) {
    await clearSession(chatId);
    await sendMainMenu(bot, chatId, 'Сценарій скинуто. Виберіть потрібну дію:');
    return;
  }

  const value = cleanText(text, session.step === 'itemsSummary' ? 1200 : 180);
  if (!config.validate(value, session.draft)) {
    await bot.sendMessage(chatId, `${config.error}\n\n${config.prompt}`);
    return;
  }

  const draft = { ...session.draft, [session.step]: value };
  if (config.next) {
    await saveSession(chatId, { ...session, step: config.next, draft, updatedAt: new Date().toISOString() });
    await bot.sendMessage(chatId, STEPS[config.next].prompt);
    return;
  }

  const order = createOrder(draft, { chatId });
  await saveSession(chatId, {
    mode: 'confirm_new_order',
    draft: order,
    updatedAt: new Date().toISOString()
  });
  await bot.sendMessage(chatId, `${formatOrderHtml(order)}\n\n<b>Зберегти це замовлення?</b>`, {
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Зберегти', callback_data: `save:${order.id}` },
        { text: '❌ Скасувати', callback_data: 'discard:new' }
      ]]
    }
  });
}

async function handleSessionInput(bot, chatId, text, session) {
  if (session.mode === 'new_order') return handleNewOrderStep(bot, chatId, text, session);

  if (session.mode === 'await_ttn') {
    if (!isValidTtn(text) || text === '-') {
      await bot.sendMessage(chatId, 'Введіть коректний номер ТТН.');
      return;
    }
    const order = await getOrder(session.orderId);
    if (!order) throw new Error('Order not found');
    const updated = attachTtn(order, text);
    await saveOrder(updated);
    await clearSession(chatId);
    await sendMainMenu(bot, chatId, '✅ ТТН додано.');
    await sendOrder(bot, chatId, updated);
    return;
  }

  if (session.mode === 'await_receipt') {
    const order = await getOrder(session.orderId);
    if (!order) throw new Error('Order not found');
    const updated = markReceiptDone(order, text);
    await saveOrder(updated);
    await clearSession(chatId);
    await sendMainMenu(bot, chatId, `✅ Замовлення закрито. Записано чек <b>${escapeHtml(updated.receiptNumber)}</b>.`);
    return;
  }

  await clearSession(chatId);
  await sendMainMenu(bot, chatId, 'Попередню дію скинуто. Виберіть потрібну дію:');
}

async function showOrders(bot, chatId) {
  const orders = await listOrders({ limit: 20 });
  if (!orders.length) {
    await sendMainMenu(bot, chatId, 'Активних замовлень немає. Можна створити нове:');
    return;
  }
  const lines = orders.map((order) => [
    `<b>${order.id}</b> · ${order.customerName}`,
    `${money(order.totalAmount)} · ${statusLabel(order.status)}`,
    `/order_${order.id}`
  ].join('\n'));
  await bot.sendMessage(chatId, `<b>Активні замовлення</b>\n\n${lines.join('\n\n')}`, {
    reply_markup: MAIN_KEYBOARD
  });
}

function extractOrderId(text) {
  const normalized = cleanText(text, 120).replace(/^\/order(?:@\w+)?[ _]+/i, '');
  return normalized.toUpperCase();
}

async function showOrder(bot, chatId, id) {
  const order = await getOrder(id);
  if (!order) {
    await bot.sendMessage(chatId, `Замовлення <b>${escapeHtml(cleanText(id, 40))}</b> не знайдено.`);
    return;
  }
  await sendOrder(bot, chatId, order, order.status === ORDER_STATUSES.READY_FOR_RECEIPT);
}

async function handleMessage(bot, message) {
  const chatId = String(message.chat.id);
  const text = cleanText(message.text, 1500);
  if (!text) return;

  if (/^\/start(?:@\w+)?$/i.test(text) || /^\/help(?:@\w+)?$/i.test(text) || text === MENU_BUTTONS.HELP) {
    await sendMainMenu(bot, chatId);
    return;
  }
  if (/^\/new(?:@\w+)?$/i.test(text) || text === MENU_BUTTONS.NEW) {
    await startNewOrder(bot, chatId);
    return;
  }
  if (/^\/orders(?:@\w+)?$/i.test(text) || text === MENU_BUTTONS.ORDERS) {
    await showOrders(bot, chatId);
    return;
  }
  if (/^\/cancel(?:@\w+)?$/i.test(text) || text === MENU_BUTTONS.CANCEL) {
    await clearSession(chatId);
    await sendMainMenu(bot, chatId, 'Поточне введення скасовано.');
    return;
  }
  if (/^\/order(?:@\w+)?[ _]+/i.test(text)) {
    await showOrder(bot, chatId, extractOrderId(text));
    return;
  }

  const session = await getSession(chatId);
  if (session) {
    await handleSessionInput(bot, chatId, text, session);
    return;
  }
  await sendMainMenu(bot, chatId, 'Не розумію повідомлення. Виберіть дію кнопкою:');
}

async function handleCallback(bot, callback) {
  const chatId = String(callback.message?.chat?.id || '');
  const [action, id] = String(callback.data || '').split(':', 2);
  await bot.answerCallbackQuery(callback.id);

  if (action === 'discard') {
    await clearSession(chatId);
    await sendMainMenu(bot, chatId, 'Замовлення не збережено.');
    return;
  }

  if (action === 'save') {
    const session = await getSession(chatId);
    if (session?.mode !== 'confirm_new_order' || session.draft?.id !== id) {
      await bot.sendMessage(chatId, 'Це підтвердження вже неактуальне. Перевірте /orders.');
      return;
    }
    const existing = await getOrder(id);
    const order = existing || await saveOrder(session.draft);
    await clearSession(chatId);
    await sendMainMenu(bot, chatId, '✅ Замовлення збережено.');
    await sendOrder(bot, chatId, order);
    return;
  }

  const order = await getOrder(id);
  if (!order) {
    await bot.sendMessage(chatId, 'Замовлення не знайдено.');
    return;
  }

  if (action === 'prepaid') {
    const updated = markPrepaymentReceived(order, order.prepaymentAmount);
    await saveOrder(updated);
    await bot.sendMessage(chatId, `✅ Передоплату ${money(updated.prepaymentAmount)} підтверджено.`);
    await sendOrder(bot, chatId, updated);
    return;
  }
  if (action === 'ttn') {
    await saveSession(chatId, { mode: 'await_ttn', orderId: id, updatedAt: new Date().toISOString() });
    await bot.sendMessage(chatId, `Введіть ТТН для <b>${id}</b>:`, { reply_markup: CANCEL_KEYBOARD });
    return;
  }
  if (action === 'novapay') {
    const updated = markNovaPayReceived(order, order.codAmount);
    await saveOrder(updated);
    await bot.sendMessage(chatId, '✅ Оплату NovaPay підтверджено. Тепер перевірте дані та вручну пробийте чек у СОТА Каса:');
    await sendOrder(bot, chatId, updated, true);
    return;
  }
  if (action === 'receipt') {
    await saveSession(chatId, { mode: 'await_receipt', orderId: id, updatedAt: new Date().toISOString() });
    await bot.sendMessage(chatId, `Введіть фіскальний номер чека СОТА для <b>${id}</b>:`, {
      reply_markup: CANCEL_KEYBOARD
    });
  }
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { ok: false });

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET || deriveWebhookSecret(process.env.TELEGRAM_BOT_TOKEN);
  const receivedSecret = event.headers?.['x-telegram-bot-api-secret-token'] || event.headers?.['X-Telegram-Bot-Api-Secret-Token'];
  if (!secret || !safeEqual(receivedSecret, secret)) return jsonResponse(401, { ok: false });

  let update;
  try {
    update = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { ok: false });
  }

  const chatId = String(update.message?.chat?.id || update.callback_query?.message?.chat?.id || '');
  const allowedChatIds = parseChatIds(process.env.TELEGRAM_OPERATOR_CHAT_IDS || process.env.TELEGRAM_CHAT_IDS);
  if (!chatId || !allowedChatIds.includes(chatId)) return jsonResponse(200, { ok: true });

  connectOrderStore(event);
  const updateId = String(update.update_id ?? '');
  if (updateId && !await claimUpdate(updateId)) return jsonResponse(200, { ok: true });

  try {
    const bot = telegramClient(process.env.TELEGRAM_BOT_TOKEN);
    if (update.message) await handleMessage(bot, update.message);
    if (update.callback_query) await handleCallback(bot, update.callback_query);
    return jsonResponse(200, { ok: true });
  } catch {
    return jsonResponse(500, { ok: false });
  }
};
