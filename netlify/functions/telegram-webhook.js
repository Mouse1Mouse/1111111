import { timingSafeEqual } from 'node:crypto';
import {
  ORDER_STATUSES,
  attachTtn,
  cleanText,
  createOrder,
  createOrderId,
  escapeHtml,
  formatOrderHtml,
  isValidCustomerOrderNumber,
  isValidEmail,
  isValidPhone,
  isValidTtn,
  markNovaPayReceived,
  markPrepaymentReceived,
  markReceiptDone,
  normalizeCustomerOrderNumber,
  parseAmount,
  parseTtnFromOrderCard,
  statusLabel
} from '../lib/order-core.js';
import {
  applyPrepaymentChoice,
  extractOrderFromImage,
  extractOrderFromText,
  normalizeExtractedDraft
} from '../lib/order-extractor.js';
import { createPackingLabelDocument } from '../lib/packing-label.js';
import {
  createNovaPoshtaWaybill,
  downloadNovaPoshtaMarking,
  isNovaPoshtaConfigured,
  parseSenderWarehouseSelection,
  parseShipmentPreviewOptions,
  prepareNovaPoshtaShipment
} from '../lib/nova-poshta.js';
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
  ADD: '📥 Додати замовлення',
  ORDERS: '📋 Активні замовлення',
  HELP: 'ℹ️ Допомога',
  CANCEL: '❌ Скасувати'
});

const MAIN_KEYBOARD = Object.freeze({
  keyboard: [
    [{ text: MENU_BUTTONS.ADD }],
    [{ text: MENU_BUTTONS.ORDERS }, { text: MENU_BUTTONS.HELP }]
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

const INPUT_SESSION_MODES = new Set([
  'await_order_input',
  'new_order',
  'await_np_sender_warehouse',
  'await_np_weight',
  'await_np_dimensions',
  'await_ai_edit',
  'await_ttn',
  'await_receipt'
]);

async function getSessionForModes(chatId, expectedModes) {
  const modes = new Set(expectedModes);
  let session = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    session = await getSession(chatId);
    if (session && modes.has(session.mode)) return session;
    if (attempt < 4) await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return session;
}

async function getSessionForInput(chatId) {
  return getSessionForModes(chatId, INPUT_SESSION_MODES);
}

function orderButtons(order) {
  const rows = [];
  if (order.status === ORDER_STATUSES.AWAITING_PREPAYMENT) {
    rows.push([{ text: `✅ Отримано ${money(order.prepaymentAmount)}`, callback_data: `prepaid:${order.id}` }]);
  }
  if ([ORDER_STATUSES.READY_TO_SHIP, ORDER_STATUSES.AWAITING_NOVAPAY].includes(order.status) && !order.ttn) {
    if (isNovaPoshtaConfigured()) {
      rows.push([{ text: '🚚 Створити ТТН автоматично', callback_data: `np_prepare:${order.id}` }]);
    }
    rows.push([{ text: '✍️ Ввести ТТН вручну', callback_data: `ttn:${order.id}` }]);
  }
  if (order.ttn && isNovaPoshtaConfigured()) {
    rows.push([
      { text: '🖨 A4 + опис', callback_data: `np_label:a4:${order.id}` },
      { text: '🏷 100×100 + опис', callback_data: `np_label:zebra:${order.id}` }
    ]);
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

async function replaceOrSendMessage(bot, chatId, messageId, text, options = {}) {
  if (messageId) {
    try {
      return await bot.editMessageText(chatId, messageId, text, options);
    } catch {
      // A fresh message is a safe fallback for old or non-editable Telegram messages.
    }
  }
  return bot.sendMessage(chatId, text, options);
}

function defaultSenderWarehouse() {
  return parseSenderWarehouseSelection(
    process.env.NOVA_POSHTA_DEFAULT_SENDER_WAREHOUSE || 'Нетішин, №2'
  ) || { city: 'Нетішин', branch: 'Відділення №2', number: '2' };
}

function shipmentErrorText(error) {
  const messages = {
    nova_poshta_not_configured: 'API Нової пошти ще не підключено в Netlify.',
    nova_poshta_sender_missing: 'У бізнес-акаунті не знайдено відправника.',
    nova_poshta_sender_details_missing: 'У відправника не знайдено адресу або контактну особу.',
    nova_poshta_destination_missing: 'У замовленні немає міста або відділення.',
    nova_poshta_city_not_found: 'Не вдалося знайти це місто в довіднику Нової пошти. Виправте назву міста в замовленні.',
    nova_poshta_warehouse_not_found: 'Не вдалося знайти це відділення Нової пошти. Виправте місто або відділення в замовленні.',
    nova_poshta_warehouse_ambiguous: 'Знайдено кілька схожих відділень. Уточніть номер або адресу відділення в замовленні.',
    nova_poshta_rate_limited: 'Нова пошта тимчасово обмежила кількість API-запитів. Бот уже виконав автоматичні повтори.',
    invalid_recipient_phone: 'Телефон клієнта не підходить для створення ТТН.',
    nova_poshta_api_failed: 'Нова пошта відхилила запит. Перевірте API-ключ і дані бізнес-акаунта.',
    invalid_shipment_weight: 'Оберіть правильну вагу відправлення.',
    invalid_shipment_dimensions: 'Перевірте розміри пакунка.',
    nova_poshta_waybill_missing: 'Нова пошта не повернула номер ТТН.',
    nova_poshta_marking_failed: 'Не вдалося отримати етикетку Нової пошти.'
  };
  const base = messages[error?.message] || 'Не вдалося виконати операцію з Новою поштою.';
  return error?.publicMessage ? `${base}\n\n${cleanText(error.publicMessage, 180)}` : base;
}

function shipmentPreviewHtml(shipment) {
  const weight = shipment.weight ? `${Number(shipment.weight).toFixed(1)} кг` : 'потрібно обрати';
  const dimensions = shipment.dimensions || {};
  return [
    '<b>🚚 Перевірка перед створенням ТТН</b>',
    '',
    `👤 ${escapeHtml(shipment.recipientName)}`,
    `📞 ${escapeHtml(shipment.recipientPhone)}`,
    `📍 ${escapeHtml(shipment.recipientCityName)}, ${escapeHtml(shipment.warehouseDescription)}`,
    `📦 Вага: <b>${escapeHtml(weight)}</b>`,
    `📐 Розмір: <b>${Number(dimensions.length)}×${Number(dimensions.width)}×${Number(dimensions.height)} см</b>`,
    `💰 Оголошена вартість: <b>${money(shipment.totalAmount)}</b>`,
    `💵 Післяплата NovaPay: <b>${money(shipment.codAmount)}</b>`,
    `🚛 Доставку оплачує: <b>${shipment.deliveryPayer === 'Sender' ? 'MIVA' : 'клієнт'}</b>`,
    shipment.sender.cityDescription && shipment.sender.warehouseNumber
      ? `📤 Звідки: <b>${escapeHtml(shipment.sender.cityDescription)}, відділення №${escapeHtml(shipment.sender.warehouseNumber)}</b>`
      : null,
    `🏠 Відправник: ${escapeHtml(shipment.sender.description)}, ${escapeHtml(shipment.sender.addressDescription)}`,
    '',
    shipment.weight
      ? '⚠️ Після підтвердження буде створено справжню ТТН у бізнес-кабінеті Нової пошти.'
      : '❗ Спочатку оберіть фактичну вагу запакованого замовлення.'
  ].filter((line) => line !== null).join('\n');
}

function shipmentPreviewKeyboard(shipment) {
  const rows = [];
  if (!shipment.weight) {
    rows.push([
      { text: '1 кг', callback_data: `np_weight:1:${shipment.orderId}` },
      { text: '2 кг', callback_data: `np_weight:2:${shipment.orderId}` }
    ]);
    rows.push([
      { text: '3 кг', callback_data: `np_weight:3:${shipment.orderId}` },
      { text: '4 кг', callback_data: `np_weight:4:${shipment.orderId}` }
    ]);
    rows.push([{ text: '✏️ Інша вага', callback_data: `np_weight:other:${shipment.orderId}` }]);
  } else {
    rows.push([{ text: `⚖️ Змінити вагу (${shipment.weight} кг)`, callback_data: `np_weight:other:${shipment.orderId}` }]);
  }
  rows.push([{ text: '📐 Змінити розмір пакунка', callback_data: `np_dims:${shipment.orderId}` }]);
  const nextPayer = shipment.deliveryPayer === 'Sender' ? 'Recipient' : 'Sender';
  rows.push([{
    text: shipment.deliveryPayer === 'Sender' ? '💳 Платитиме клієнт' : '💳 Платитиме MIVA',
    callback_data: `np_payer:${nextPayer}:${shipment.orderId}`
  }]);
  if (shipment.weight) {
    rows.push([{ text: '✅ Підтвердити й створити ТТН', callback_data: `np_create:${shipment.orderId}` }]);
  }
  rows.push([{ text: '📤 Змінити відділення відправки', callback_data: `np_sender:${shipment.orderId}` }]);
  rows.push([{ text: '❌ Скасувати', callback_data: `np_cancel:${shipment.orderId}` }]);
  return { inline_keyboard: rows };
}

async function sendShipmentPreview(bot, chatId, shipment, messageId = null) {
  return replaceOrSendMessage(bot, chatId, messageId, shipmentPreviewHtml(shipment), {
    reply_markup: shipmentPreviewKeyboard(shipment)
  });
}

const HELP_TEXT = [
  '<b>MIVA · Instagram + NovaPay</b>',
  '',
  '📋 Скопіюйте текст замовлення з Instagram і вставте сюди — це найшвидший та найдешевший варіант.',
  '📸 Якщо текст скопіювати не можна, надішліть скрін.',
  'Номер замовлення бажаний, але без нього бот також дозволить зберегти замовлення.',
  '',
  '/new — ввести замовлення вручну по полях',
  '/orders — активні замовлення',
  '/order НОМЕР — відкрити замовлення',
  '/cancel — скасувати поточне введення',
  '',
  'Бот веде замовлення та готує дані для чека. Сам чек у СОТА Каса поки не створює.'
].join('\n');

const STEPS = {
  customerOrderNumber: {
    prompt: '1/8 Введіть номер замовлення або поставте - щоб пропустити. Наприклад: 1542',
    validate: (value) => value === '-' || isValidCustomerOrderNumber(value),
    error: 'Введіть номер на зразок 1542 або M-1542, чи один символ - щоб пропустити.',
    next: 'customerName'
  },
  customerName: {
    prompt: '2/8 Введіть ім’я клієнта:',
    validate: (value) => cleanText(value, 120).length >= 2,
    error: 'Введіть ім’я клієнта (щонайменше 2 символи).',
    next: 'phone'
  },
  phone: {
    prompt: '3/8 Введіть телефон клієнта:',
    validate: isValidPhone,
    error: 'Телефон не схожий на правильний. Наприклад: +380XXXXXXXXX',
    next: 'email'
  },
  email: {
    prompt: '4/8 Введіть email для чека або поставте - якщо його немає:',
    validate: (value) => value === '-' || isValidEmail(value),
    error: 'Введіть правильний email або один символ -',
    next: 'itemsSummary'
  },
  itemsSummary: {
    prompt: '5/8 Опишіть товари для чека: назва, розмір, кількість, ціна.',
    validate: (value) => cleanText(value, 1200).length >= 3,
    error: 'Додайте назву товару, розмір, кількість і ціну.',
    next: 'totalAmount'
  },
  totalAmount: {
    prompt: '6/8 Введіть повну суму замовлення у гривнях:',
    validate: (value) => (parseAmount(value) || 0) > 0,
    error: 'Введіть суму числом, наприклад 1650 або 1650,50.',
    next: 'prepaymentAmount'
  },
  prepaymentAmount: {
    prompt: '7/8 Введіть передоплату на IBAN. Зазвичай 200:',
    validate: (value, draft) => {
      const amount = parseAmount(value);
      return amount !== null && amount >= 0 && amount <= parseAmount(draft.totalAmount);
    },
    error: 'Передоплата має бути від 0 грн до повної суми замовлення включно.',
    next: 'ttn'
  },
  ttn: {
    prompt: '8/8 Введіть ТТН Нової пошти або - якщо її ще немає:',
    validate: isValidTtn,
    error: 'Введіть коректну ТТН або один символ -',
    next: null
  }
};

const AI_EDIT_FIELDS = Object.freeze({
  order: {
    key: 'customerOrderNumber',
    label: 'Номер замовлення',
    prompt: 'Введіть номер замовлення або - щоб залишити без номера. Наприклад: 1542',
    validate: (value) => value === '-' || isValidCustomerOrderNumber(value)
  },
  name: { key: 'customerName', label: 'Ім’я', prompt: 'Введіть ім’я клієнта:', validate: STEPS.customerName.validate },
  instagram: {
    key: 'instagramHandle',
    label: 'Instagram',
    prompt: 'Введіть Instagram клієнта або -:',
    validate: (value) => value === '-' || cleanText(value, 80).length >= 2
  },
  phone: { key: 'phone', label: 'Телефон', prompt: 'Введіть телефон клієнта:', validate: STEPS.phone.validate },
  email: { key: 'email', label: 'Email', prompt: 'Введіть email або -:', validate: STEPS.email.validate },
  city: {
    key: 'city',
    label: 'Місто',
    prompt: 'Введіть місто доставки або -:',
    validate: (value) => value === '-' || cleanText(value, 120).length >= 2
  },
  branch: {
    key: 'branch',
    label: 'Відділення',
    prompt: 'Введіть відділення/поштомат або -:',
    validate: (value) => value === '-' || cleanText(value, 180).length >= 1
  },
  items: { key: 'itemsSummary', label: 'Товари', prompt: STEPS.itemsSummary.prompt, validate: STEPS.itemsSummary.validate },
  total: { key: 'totalAmount', label: 'Повна сума', prompt: STEPS.totalAmount.prompt, validate: STEPS.totalAmount.validate },
  prepay: {
    key: 'prepaymentAmount',
    label: 'Передоплата',
    prompt: STEPS.prepaymentAmount.prompt,
    validate: (value, draft) => {
      const amount = parseAmount(value);
      const total = parseAmount(draft?.totalAmount);
      const cod = parseAmount(draft?.codAmount);
      return amount !== null && amount >= 0 && (
        (total !== null && amount <= total) ||
        (total === null && cod !== null && cod > 0)
      );
    }
  },
  ttn: { key: 'ttn', label: 'ТТН', prompt: STEPS.ttn.prompt, validate: STEPS.ttn.validate }
});

const REQUIRED_FIELD_LABELS = Object.freeze({
  customerName: 'ім’я',
  phone: 'телефон',
  itemsSummary: 'товари',
  totalAmount: 'повна сума',
  prepaymentAmount: 'передоплата'
});

function selectedImage(message) {
  if (Array.isArray(message.photo) && message.photo.length) {
    const photo = [...message.photo].sort((a, b) => (a.file_size || 0) - (b.file_size || 0)).at(-1);
    return { fileId: photo.file_id, fileSize: photo.file_size || 0 };
  }
  if (message.document?.mime_type?.startsWith('image/')) {
    return { fileId: message.document.file_id, fileSize: message.document.file_size || 0 };
  }
  return null;
}

function looksLikeCopiedOrder(text) {
  if (text.length < 30) return false;
  const signals = [
    /замовлен|заказ/iu,
    /телефон|(?:\+?38)?0\d{9}/iu,
    /місто|населен/iu,
    /відділен|поштомат|\bнп\b/iu,
    /сума|грн|передоплат|налож/iu,
    /розмір|комплект|наволоч|простирад|підковдр/iu
  ];
  return signals.filter((pattern) => pattern.test(text)).length >= 2;
}

function aiDraftState(session) {
  const normalized = normalizeExtractedDraft({ ...session.draft, confidence: session.confidence });
  let warnings = [...new Set([...(session.warnings || []), ...normalized.warnings])];
  if (isValidCustomerOrderNumber(normalized.draft.customerOrderNumber)) {
    warnings = warnings.filter((warning) => !warning.startsWith('Номер замовлення не вказано'));
  }
  return {
    draft: { ...session.draft, ...normalized.draft },
    missingFields: normalized.missingFields,
    warnings,
    needsPrepaymentChoice: normalized.needsPrepaymentChoice
  };
}

function warningsAfterPrepaymentChoice(warnings = []) {
  return warnings.filter((warning) => warning !== 'Передоплату не видно — оберіть, чи вона є.');
}

function formatAiDraftHtml(session) {
  const { draft, missingFields, warnings, needsPrepaymentChoice } = aiDraftState(session);
  const amount = (value) => value === null || value === undefined ? 'не розпізнано' : `${Number(value).toFixed(2)} грн`;
  const novaPayAmount = draft.totalAmount !== null && draft.prepaymentAmount !== null
    ? Math.round((Number(draft.totalAmount) - Number(draft.prepaymentAmount)) * 100) / 100
    : null;
  const lines = [
    '<b>📋 Розпізнане замовлення</b>',
    '',
    `🧾 Замовлення №<b>${escapeHtml(draft.customerOrderNumber || 'не вказано')}</b>`,
    `👤 ${escapeHtml(draft.customerName || 'не розпізнано')}`,
    `📱 Instagram: ${escapeHtml(draft.instagramHandle || 'не розпізнано')}`,
    `📞 ${escapeHtml(draft.phone || 'не розпізнано')}`,
    `📧 ${escapeHtml(draft.email === '-' ? 'не вказано' : draft.email)}`,
    `🏙 Місто: ${escapeHtml(draft.city || 'не розпізнано')}`,
    `📦 Відділення: ${escapeHtml(draft.branch || 'не розпізнано')}`,
    '',
    `<b>Товари:</b> ${escapeHtml(draft.itemsSummary || 'не розпізнано')}`,
    `💰 Повна сума: <b>${amount(draft.totalAmount)}</b>`,
    `🏦 Передоплата IBAN: <b>${needsPrepaymentChoice ? 'потрібно обрати' : amount(draft.prepaymentAmount)}</b>`,
    `📮 Залишок NovaPay: <b>${novaPayAmount === null ? 'буде пораховано після вибору' : amount(novaPayAmount)}</b>`,
    `🚚 ТТН: ${escapeHtml(draft.ttn === '-' ? 'ще немає' : draft.ttn)}`
  ];

  for (const warning of warnings) lines.push(`⚠️ ${escapeHtml(warning)}`);
  if (missingFields.length) {
    lines.push('', `❗ Треба доповнити: <b>${missingFields.map((field) => REQUIRED_FIELD_LABELS[field]).join(', ')}</b>`);
  } else {
    lines.push('', '<b>Перевірте дані та збережіть замовлення.</b>');
  }
  return lines.join('\n');
}

function aiConfirmationKeyboard(session) {
  const { missingFields, needsPrepaymentChoice } = aiDraftState(session);
  const rows = [];
  if (needsPrepaymentChoice) {
    rows.push([{ text: '🚫 Передоплати немає', callback_data: `ai_prepay:none:${session.draft.id}` }]);
    rows.push([{ text: '💵 Передоплата 200 грн', callback_data: `ai_prepay:200:${session.draft.id}` }]);
    rows.push([{ text: '✅ Оплачено повністю', callback_data: `ai_prepay:full:${session.draft.id}` }]);
    rows.push([{ text: '✏️ Інша сума', callback_data: `ai_prepay:other:${session.draft.id}` }]);
  }
  if (!missingFields.length) {
    rows.push([{ text: '✅ Все правильно — зберегти', callback_data: `ai_save:${session.draft.id}` }]);
  }
  rows.push([{ text: '✏️ Виправити поле', callback_data: `ai_edit:${session.draft.id}` }]);
  rows.push([{ text: '❌ Скасувати', callback_data: 'discard:ai' }]);
  return { inline_keyboard: rows };
}

async function sendAiDraftPreview(bot, chatId, session, messageId = session.previewMessageId) {
  return replaceOrSendMessage(bot, chatId, messageId, formatAiDraftHtml(session), {
    reply_markup: aiConfirmationKeyboard(session)
  });
}

async function handleImageOrder(bot, chatId, message, image) {
  if (image.fileSize > 8 * 1024 * 1024) {
    await sendMainMenu(bot, chatId, 'Скрін завеликий. Надішліть зображення до 8 МБ.');
    return;
  }

  const importSession = await getSessionForModes(chatId, ['await_order_input']);
  await clearSession(chatId);
  const requestId = createOrderId();
  await saveSession(chatId, { mode: 'ai_processing', requestId, updatedAt: new Date().toISOString() });
  const statusMessage = await replaceOrSendMessage(
    bot,
    chatId,
    importSession?.previewMessageId,
    '⏳ Розпізнаю замовлення зі скріну…',
    { reply_markup: { inline_keyboard: [] } }
  );

  try {
    const downloaded = await bot.downloadImage(image.fileId);
    const extracted = await extractOrderFromImage({
      ...downloaded,
      caption: message.caption || '',
      operatorId: chatId
    });
    const session = {
      mode: 'confirm_ai_order',
      draft: { id: requestId, ...extracted.draft },
      warnings: extracted.warnings,
      confidence: extracted.confidence,
      previewMessageId: statusMessage.message_id,
      updatedAt: new Date().toISOString()
    };
    await saveSession(chatId, session);
    await sendAiDraftPreview(bot, chatId, session, statusMessage.message_id);
  } catch (error) {
    await clearSession(chatId);
    const messageText = error?.message === 'ai_gateway_not_configured'
      ? 'AI-розпізнавання ще не активоване в Netlify.'
      : 'Не вдалося розпізнати цей скрін. Спробуйте обрізати його до переписки та надіслати ще раз.';
    await replaceOrSendMessage(bot, chatId, statusMessage.message_id, messageText);
  }
}

async function handleTextOrder(bot, chatId, text, messageId = null) {
  await clearSession(chatId);
  const requestId = createOrderId();
  await saveSession(chatId, { mode: 'ai_processing', requestId, updatedAt: new Date().toISOString() });
  const statusMessage = await replaceOrSendMessage(
    bot,
    chatId,
    messageId,
    '⏳ Читаю текст замовлення…',
    { reply_markup: { inline_keyboard: [] } }
  );

  try {
    const extracted = await extractOrderFromText({ text, operatorId: chatId });
    const session = {
      mode: 'confirm_ai_order',
      source: 'text',
      draft: { id: requestId, ...extracted.draft },
      warnings: extracted.warnings,
      confidence: extracted.confidence,
      previewMessageId: statusMessage.message_id,
      updatedAt: new Date().toISOString()
    };
    await saveSession(chatId, session);
    await sendAiDraftPreview(bot, chatId, session, statusMessage.message_id);
  } catch (error) {
    await clearSession(chatId);
    const messageText = error?.message === 'ai_gateway_not_configured'
      ? 'AI-розпізнавання ще не активоване в Netlify.'
      : 'Не вдалося прочитати цей текст. Скопіюйте повідомлення з даними замовлення повністю або скористайтеся /new.';
    await replaceOrSendMessage(bot, chatId, statusMessage.message_id, messageText);
  }
}

async function startOrderImport(bot, chatId) {
  const promptMessage = await bot.sendMessage(chatId, [
    '<b>Додайте замовлення одним повідомленням</b>',
    '',
    'Найкраще — скопіюйте текст із даними клієнта, товаром, сумою, містом і відділенням.',
    'Або надішліть один скрін. Номер замовлення можна не вказувати.'
  ].join('\n'), { reply_markup: CANCEL_KEYBOARD });
  await saveSession(chatId, {
    mode: 'await_order_input',
    previewMessageId: promptMessage.message_id,
    updatedAt: new Date().toISOString()
  });
}

async function startNewOrder(bot, chatId) {
  const session = {
    mode: 'new_order',
    step: 'customerOrderNumber',
    draft: { id: createOrderId() },
    updatedAt: new Date().toISOString()
  };
  await saveSession(chatId, session);
  await bot.sendMessage(chatId, STEPS.customerOrderNumber.prompt, { reply_markup: CANCEL_KEYBOARD });
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

  const storedValue = session.step === 'customerOrderNumber' && value === '-' ? '' : value;
  const draft = { ...session.draft, [session.step]: storedValue };
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
  if (session.mode === 'await_order_input') {
    return handleTextOrder(bot, chatId, text, session.previewMessageId);
  }
  if (session.mode === 'new_order') return handleNewOrderStep(bot, chatId, text, session);

  if (session.mode === 'await_np_sender_warehouse') {
    const senderWarehouse = parseSenderWarehouseSelection(text);
    if (!senderWarehouse) {
      await replaceOrSendMessage(
        bot,
        chatId,
        session.previewMessageId,
        'Введіть місто та номер відділення відправника. Наприклад: Нетішин 2'
      );
      return;
    }
    const order = await getOrder(session.orderId);
    if (!order || order.status !== ORDER_STATUSES.READY_TO_SHIP || order.ttn) {
      await clearSession(chatId);
      await bot.sendMessage(chatId, 'Замовлення вже не готове до створення нової ТТН. Відкрийте його ще раз.');
      return;
    }
    await replaceOrSendMessage(
      bot,
      chatId,
      session.previewMessageId,
      '⏳ Перевіряю відправника, обидва відділення та контактні дані в Новій пошті…'
    );
    try {
      const shipment = await prepareNovaPoshtaShipment(order, { senderWarehouse });
      const updatedSession = {
        ...session,
        mode: 'confirm_nova_poshta_ttn',
        senderWarehouse,
        shipment,
        updatedAt: new Date().toISOString()
      };
      await saveSession(chatId, updatedSession);
      await sendShipmentPreview(bot, chatId, shipment, session.previewMessageId);
    } catch (error) {
      const retryText = error?.message === 'nova_poshta_rate_limited'
        ? 'Зачекайте 30 секунд і введіть те саме відділення ще раз.'
        : 'Спробуйте інше місто або номер відділення.';
      await replaceOrSendMessage(
        bot,
        chatId,
        session.previewMessageId,
        `❌ ${escapeHtml(shipmentErrorText(error))}\n\n${retryText}`
      );
    }
    return;
  }

  if (session.mode === 'await_np_weight') {
    const weight = Number(String(text).replace(',', '.'));
    if (!Number.isFinite(weight) || weight < 0.1 || weight > 30) {
      await bot.sendMessage(chatId, 'Введіть фактичну вагу від 0,1 до 30 кг. Наприклад: 2,5');
      return;
    }
    const updatedSession = {
      ...session,
      mode: 'confirm_nova_poshta_ttn',
      shipment: { ...session.shipment, weight: Math.round(weight * 100) / 100 },
      updatedAt: new Date().toISOString()
    };
    await saveSession(chatId, updatedSession);
    await sendShipmentPreview(bot, chatId, updatedSession.shipment, session.previewMessageId);
    return;
  }

  if (session.mode === 'await_np_dimensions') {
    const values = String(text).replaceAll(',', '.').match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
    if (values.length !== 3 || values.some((value) => value < 1 || value > 300)) {
      await bot.sendMessage(chatId, 'Введіть три розміри в сантиметрах: довжина ширина висота. Наприклад: 40 30 20');
      return;
    }
    const [length, width, height] = values;
    const updatedSession = {
      ...session,
      mode: 'confirm_nova_poshta_ttn',
      shipment: { ...session.shipment, dimensions: { length, width, height } },
      updatedAt: new Date().toISOString()
    };
    await saveSession(chatId, updatedSession);
    await sendShipmentPreview(bot, chatId, updatedSession.shipment, session.previewMessageId);
    return;
  }

  if (session.mode === 'await_ai_edit') {
    const config = AI_EDIT_FIELDS[session.field];
    const value = cleanText(text, config?.key === 'itemsSummary' ? 1200 : 180);
    if (!config || !config.validate(value, session.draft)) {
      await bot.sendMessage(chatId, `Значення не підходить.\n\n${config?.prompt || 'Спробуйте ще раз:'}`);
      return;
    }

    let storedValue = value;
    if (config.key === 'customerOrderNumber') {
      storedValue = value === '-' ? '' : normalizeCustomerOrderNumber(value);
    }
    if (['instagramHandle', 'city', 'branch'].includes(config.key) && value === '-') storedValue = '';
    if (['totalAmount', 'prepaymentAmount'].includes(config.key)) storedValue = parseAmount(value);
    const updatedDraft = config.key === 'prepaymentAmount'
      ? applyPrepaymentChoice(session.draft, storedValue)
      : { ...session.draft, [config.key]: storedValue };
    const updatedSession = {
      ...session,
      mode: 'confirm_ai_order',
      field: null,
      draft: updatedDraft,
      warnings: config.key === 'prepaymentAmount'
        ? warningsAfterPrepaymentChoice(session.warnings)
        : session.warnings,
      updatedAt: new Date().toISOString()
    };
    await saveSession(chatId, updatedSession);
    await sendAiDraftPreview(bot, chatId, updatedSession, session.previewMessageId);
    return;
  }

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

  await sendMainMenu(bot, chatId, 'Не вдалося зчитати поточний крок. Дані не видалено — повторіть останню дію кнопкою.');
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
  const image = selectedImage(message);
  if (image) {
    await handleImageOrder(bot, chatId, message, image);
    return;
  }
  const rawText = String(message.text ?? '').trim().slice(0, 8000);
  const text = cleanText(rawText, 1500);
  if (!text) return;

  if (/^\/start(?:@\w+)?$/i.test(text) || /^\/help(?:@\w+)?$/i.test(text) || text === MENU_BUTTONS.HELP) {
    await sendMainMenu(bot, chatId);
    return;
  }
  if (text === MENU_BUTTONS.ADD || text === '📸 Замовлення зі скріну') {
    await startOrderImport(bot, chatId);
    return;
  }
  if (/^\/new(?:@\w+)?$/i.test(text) || text === '➕ Нове замовлення') {
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

  const session = await getSessionForInput(chatId);
  if (session) {
    await handleSessionInput(bot, chatId, session.mode === 'await_order_input' ? rawText : text, session);
    return;
  }
  if (looksLikeCopiedOrder(rawText)) {
    await handleTextOrder(bot, chatId, rawText);
    return;
  }
  await sendMainMenu(bot, chatId, 'Не розумію повідомлення. Виберіть дію кнопкою:');
}

async function handleCallback(bot, callback) {
  const chatId = String(callback.message?.chat?.id || '');
  const callbackParts = String(callback.data || '').split(':');
  const action = callbackParts[0];
  const id = callbackParts.at(-1);
  await bot.answerCallbackQuery(callback.id);

  if (action === 'discard') {
    await clearSession(chatId);
    await replaceOrSendMessage(
      bot,
      chatId,
      callback.message?.message_id,
      'Замовлення не збережено.',
      { reply_markup: { inline_keyboard: [] } }
    );
    return;
  }

  if (action === 'np_weight') {
    const choice = callbackParts[1];
    const session = await getSessionForModes(chatId, ['confirm_nova_poshta_ttn']);
    if (session?.mode !== 'confirm_nova_poshta_ttn' || session.orderId !== id) {
      await bot.sendMessage(chatId, 'Ця підготовка ТТН уже неактуальна. Відкрийте замовлення ще раз.');
      return;
    }
    if (choice === 'other') {
      await saveSession(chatId, {
        ...session,
        mode: 'await_np_weight',
        previewMessageId: callback.message?.message_id,
        updatedAt: new Date().toISOString()
      });
      await replaceOrSendMessage(
        bot,
        chatId,
        callback.message?.message_id,
        'Введіть фактичну вагу пакунка у кілограмах. Наприклад: 2,5',
        { reply_markup: { inline_keyboard: [] } }
      );
      return;
    }
    const weight = Number(choice);
    if (![1, 2, 3, 4].includes(weight)) {
      await bot.sendMessage(chatId, 'Не вдалося прочитати вагу. Оберіть її ще раз.');
      return;
    }
    const updatedSession = {
      ...session,
      mode: 'confirm_nova_poshta_ttn',
      previewMessageId: callback.message?.message_id,
      shipment: { ...session.shipment, weight },
      updatedAt: new Date().toISOString()
    };
    await saveSession(chatId, updatedSession);
    await sendShipmentPreview(bot, chatId, updatedSession.shipment, callback.message?.message_id);
    return;
  }

  if (action === 'np_dims') {
    const session = await getSessionForModes(chatId, ['confirm_nova_poshta_ttn']);
    if (session?.mode !== 'confirm_nova_poshta_ttn' || session.orderId !== id) {
      await bot.sendMessage(chatId, 'Ця підготовка ТТН уже неактуальна.');
      return;
    }
    await saveSession(chatId, {
      ...session,
      mode: 'await_np_dimensions',
      previewMessageId: callback.message?.message_id,
      updatedAt: new Date().toISOString()
    });
    await replaceOrSendMessage(
      bot,
      chatId,
      callback.message?.message_id,
      'Введіть розміри запакованого замовлення у сантиметрах: довжина ширина висота. Наприклад: 40 30 20',
      { reply_markup: { inline_keyboard: [] } }
    );
    return;
  }

  if (action === 'np_payer') {
    const payer = callbackParts[1];
    const session = await getSessionForModes(chatId, ['confirm_nova_poshta_ttn']);
    if (!['Sender', 'Recipient'].includes(payer) || session?.mode !== 'confirm_nova_poshta_ttn' || session.orderId !== id) {
      await bot.sendMessage(chatId, 'Ця підготовка ТТН уже неактуальна.');
      return;
    }
    const updatedSession = {
      ...session,
      previewMessageId: callback.message?.message_id,
      shipment: { ...session.shipment, deliveryPayer: payer },
      updatedAt: new Date().toISOString()
    };
    await saveSession(chatId, updatedSession);
    await sendShipmentPreview(bot, chatId, updatedSession.shipment, callback.message?.message_id);
    return;
  }

  if (action === 'np_cancel') {
    await clearSession(chatId);
    const cancelledOrder = await getOrder(id);
    await replaceOrSendMessage(
      bot,
      chatId,
      callback.message?.message_id,
      cancelledOrder
        ? `${formatOrderHtml(cancelledOrder)}\n\nСтворення ТТН скасовано.`
        : 'Створення ТТН скасовано.',
      { reply_markup: cancelledOrder ? orderButtons(cancelledOrder) : { inline_keyboard: [] } }
    );
    return;
  }

  if (action === 'ai_prepay') {
    const choice = callbackParts[1];
    const session = await getSessionForModes(chatId, ['confirm_ai_order']);
    if (session?.mode !== 'confirm_ai_order' || session.draft?.id !== id) {
      await bot.sendMessage(chatId, 'Це розпізнане замовлення вже неактуальне. Надішліть текст або скрін ще раз.');
      return;
    }
    if (choice === 'other') {
      await saveSession(chatId, {
        ...session,
        mode: 'await_ai_edit',
        field: 'prepay',
        previewMessageId: callback.message?.message_id,
        updatedAt: new Date().toISOString()
      });
      await replaceOrSendMessage(
        bot,
        chatId,
        callback.message?.message_id,
        AI_EDIT_FIELDS.prepay.prompt,
        { reply_markup: { inline_keyboard: [] } }
      );
      return;
    }
    const selectedAmount = choice === 'none'
      ? 0
      : choice === '200'
        ? 200
        : choice === 'full'
          ? parseAmount(session.draft.totalAmount)
          : null;
    if (selectedAmount === null) {
      await bot.sendMessage(chatId, 'Не вдалося прочитати вибір. Натисніть одну з кнопок ще раз.');
      return;
    }
    try {
      const updatedSession = {
        ...session,
        mode: 'confirm_ai_order',
        field: null,
        previewMessageId: callback.message?.message_id,
        draft: applyPrepaymentChoice(session.draft, selectedAmount),
        warnings: warningsAfterPrepaymentChoice(session.warnings),
        updatedAt: new Date().toISOString()
      };
      await saveSession(chatId, updatedSession);
      await sendAiDraftPreview(bot, chatId, updatedSession, callback.message?.message_id);
    } catch {
      await bot.sendMessage(chatId, 'Передоплата має бути від 0 грн до повної суми замовлення включно. Оберіть потрібний варіант ще раз.');
    }
    return;
  }

  if (action === 'ai_edit') {
    const session = await getSessionForModes(chatId, ['confirm_ai_order']);
    if (session?.mode !== 'confirm_ai_order' || session.draft?.id !== id) {
      await bot.sendMessage(chatId, 'Це розпізнане замовлення вже неактуальне. Надішліть текст або скрін ще раз.');
      return;
    }
    const entries = Object.entries(AI_EDIT_FIELDS);
    const rows = [];
    for (let index = 0; index < entries.length; index += 2) {
      rows.push(entries.slice(index, index + 2).map(([code, field]) => ({
        text: `✏️ ${field.label}`,
        callback_data: `ai_field:${code}:${id}`
      })));
    }
    await replaceOrSendMessage(
      bot,
      chatId,
      callback.message?.message_id,
      'Що потрібно виправити?',
      { reply_markup: { inline_keyboard: rows } }
    );
    return;
  }

  if (action === 'ai_field') {
    const fieldCode = callbackParts[1];
    const field = AI_EDIT_FIELDS[fieldCode];
    const session = await getSessionForModes(chatId, ['confirm_ai_order']);
    if (!field || session?.mode !== 'confirm_ai_order' || session.draft?.id !== id) {
      await bot.sendMessage(chatId, 'Ця дія вже неактуальна.');
      return;
    }
    await saveSession(chatId, {
      ...session,
      mode: 'await_ai_edit',
      field: fieldCode,
      previewMessageId: callback.message?.message_id,
      updatedAt: new Date().toISOString()
    });
    await replaceOrSendMessage(
      bot,
      chatId,
      callback.message?.message_id,
      field.prompt,
      { reply_markup: { inline_keyboard: [] } }
    );
    return;
  }

  if (action === 'ai_save') {
    const session = await getSessionForModes(chatId, ['confirm_ai_order']);
    if (session?.mode !== 'confirm_ai_order' || session.draft?.id !== id) {
      await bot.sendMessage(chatId, 'Це підтвердження вже неактуальне. Перевірте активні замовлення.');
      return;
    }
    const state = aiDraftState(session);
    if (state.missingFields.length) {
      await sendAiDraftPreview(bot, chatId, session);
      return;
    }
    const order = createOrder(state.draft, { chatId });
    await saveOrder(order);
    await clearSession(chatId);
    await replaceOrSendMessage(
      bot,
      chatId,
      callback.message?.message_id,
      formatOrderHtml(order),
      { reply_markup: orderButtons(order) }
    );
    return;
  }

  if (action === 'save') {
    const session = await getSessionForModes(chatId, ['confirm_new_order']);
    if (session?.mode !== 'confirm_new_order' || session.draft?.id !== id) {
      await bot.sendMessage(chatId, 'Це підтвердження вже неактуальне. Перевірте /orders.');
      return;
    }
    const existing = await getOrder(id);
    const order = existing || await saveOrder(session.draft);
    await clearSession(chatId);
    await replaceOrSendMessage(
      bot,
      chatId,
      callback.message?.message_id,
      formatOrderHtml(order),
      { reply_markup: orderButtons(order) }
    );
    return;
  }

  const order = await getOrder(id);
  if (!order) {
    await bot.sendMessage(chatId, 'Замовлення не знайдено.');
    return;
  }

  if (action === 'np_prepare') {
    if (!isNovaPoshtaConfigured()) {
      await bot.sendMessage(chatId, 'API Нової пошти ще не підключено. Спочатку додайте новий ключ у Netlify.');
      return;
    }
    if (order.status !== ORDER_STATUSES.READY_TO_SHIP || order.ttn) {
      await bot.sendMessage(chatId, 'Для цього замовлення зараз не можна створити нову ТТН. Перевірте передоплату та наявну ТТН.');
      return;
    }
    const senderWarehouse = defaultSenderWarehouse();
    await replaceOrSendMessage(
      bot,
      chatId,
      callback.message?.message_id,
      '⏳ Перевіряю отримувача та відділення Нової пошти…',
      { reply_markup: { inline_keyboard: [] } }
    );
    try {
      const shipment = await prepareNovaPoshtaShipment(order, { senderWarehouse });
      const session = {
        mode: 'confirm_nova_poshta_ttn',
        orderId: id,
        senderWarehouse,
        shipment,
        previewMessageId: callback.message?.message_id,
        updatedAt: new Date().toISOString()
      };
      await saveSession(chatId, session);
      await sendShipmentPreview(bot, chatId, shipment, callback.message?.message_id);
    } catch (error) {
      await clearSession(chatId);
      await replaceOrSendMessage(
        bot,
        chatId,
        callback.message?.message_id,
        `${formatOrderHtml(order)}\n\n❌ ${escapeHtml(shipmentErrorText(error))}`,
        { reply_markup: orderButtons(order) }
      );
    }
    return;
  }

  if (action === 'np_sender') {
    const session = await getSessionForModes(chatId, ['confirm_nova_poshta_ttn']);
    if (session?.mode !== 'confirm_nova_poshta_ttn' || session.orderId !== id) {
      await bot.sendMessage(chatId, 'Ця підготовка ТТН уже неактуальна. Відкрийте замовлення ще раз.');
      return;
    }
    await saveSession(chatId, {
      ...session,
      mode: 'await_np_sender_warehouse',
      previewMessageId: callback.message?.message_id,
      updatedAt: new Date().toISOString()
    });
    await replaceOrSendMessage(
      bot,
      chatId,
      callback.message?.message_id,
      [
        '<b>Звідки відправляємо?</b>',
        '',
        'Введіть місто та номер відділення одним рядком.',
        'Наприклад: <code>Нетішин 1</code>'
      ].join('\n'),
      { reply_markup: { inline_keyboard: [] } }
    );
    return;
  }

  if (action === 'np_create') {
    const session = await getSessionForModes(chatId, ['confirm_nova_poshta_ttn']);
    const messageId = callback.message?.message_id;
    if (order.ttn) {
      await clearSession(chatId);
      await replaceOrSendMessage(
        bot,
        chatId,
        messageId,
        `${formatOrderHtml(order)}\n\nУ замовленні вже є ТТН <b>${escapeHtml(order.ttn)}</b>. Нову ТТН не створено.`,
        { reply_markup: orderButtons(order) }
      );
      return;
    }
    let shipment = session?.mode === 'confirm_nova_poshta_ttn' && session.orderId === id
      ? session.shipment
      : null;
    if (!shipment?.weight) {
      const recoveredOptions = parseShipmentPreviewOptions(callback.message?.text);
      if (!recoveredOptions) {
        await replaceOrSendMessage(
          bot,
          chatId,
          messageId,
          `${formatOrderHtml(order)}\n\nПідготовка ТТН уже неактуальна. Натисніть «Створити ТТН автоматично» ще раз.`,
          { reply_markup: orderButtons(order) }
        );
        return;
      }
      await replaceOrSendMessage(
        bot,
        chatId,
        messageId,
        '⏳ Відновлюю параметри з картки та ще раз перевіряю їх у Новій пошті…',
        { reply_markup: { inline_keyboard: [] } }
      );
      try {
        shipment = await prepareNovaPoshtaShipment(order, recoveredOptions);
      } catch (error) {
        await replaceOrSendMessage(
          bot,
          chatId,
          messageId,
          `${formatOrderHtml(order)}\n\n❌ ${escapeHtml(shipmentErrorText(error))}`,
          { reply_markup: orderButtons(order) }
        );
        return;
      }
    }
    const activeSession = {
      ...(session || {}),
      orderId: id,
      shipment,
      mode: 'creating_nova_poshta_ttn',
      updatedAt: new Date().toISOString()
    };
    await saveSession(chatId, activeSession);
    await replaceOrSendMessage(
      bot,
      chatId,
      messageId,
      '⏳ Створюю ТТН у бізнес-кабінеті Нової пошти…',
      { reply_markup: { inline_keyboard: [] } }
    );
    try {
      const waybill = await createNovaPoshtaWaybill(shipment);
      const attached = attachTtn(order, waybill.ttn);
      const updated = {
        ...attached,
        novaPoshtaRef: waybill.ref,
        novaPoshtaDeliveryCost: waybill.deliveryCost,
        novaPoshtaEstimatedDeliveryDate: waybill.estimatedDeliveryDate,
        novaPoshtaCreatedAt: new Date().toISOString()
      };
      await saveOrder(updated);
      await clearSession(chatId);
      await replaceOrSendMessage(bot, chatId, messageId, [
        `✅ ТТН створено: <b>${escapeHtml(waybill.ttn)}</b>`,
        `Вартість доставки за розрахунком Нової пошти: <b>${money(waybill.deliveryCost)}</b>`,
        waybill.estimatedDeliveryDate ? `Орієнтовна доставка: <b>${escapeHtml(waybill.estimatedDeliveryDate)}</b>` : '',
        'Натисніть кнопку етикетки нижче, щоб отримати PDF зі штрихкодом.',
        '',
        formatOrderHtml(updated)
      ].filter(Boolean).join('\n'), { reply_markup: orderButtons(updated) });
    } catch (error) {
      await saveSession(chatId, { ...activeSession, mode: 'confirm_nova_poshta_ttn', updatedAt: new Date().toISOString() });
      await replaceOrSendMessage(
        bot,
        chatId,
        messageId,
        `${shipmentPreviewHtml(shipment)}\n\n❌ ${escapeHtml(shipmentErrorText(error))}`,
        { reply_markup: shipmentPreviewKeyboard(shipment) }
      );
    }
    return;
  }

  if (action === 'np_label') {
    const format = callbackParts[1] === 'zebra' ? 'zebra' : 'a4';
    const ttn = order.ttn || parseTtnFromOrderCard(callback.message?.text);
    if (!ttn || !isNovaPoshtaConfigured()) {
      await bot.sendMessage(chatId, 'Для етикетки потрібна ТТН та підключений API Нової пошти.');
      return;
    }
    const orderNumber = cleanText(order.customerOrderNumber || order.id, 40);
    const safeFileNumber = orderNumber.replace(/[^\p{L}\p{N}._-]+/gu, '-');
    await bot.sendMessage(chatId, `⏳ Готую пару етикеток для замовлення №${escapeHtml(orderNumber)}…`);
    let officialSent = false;
    try {
      const document = await downloadNovaPoshtaMarking(ttn, format);
      document.filename = `NovaPoshta-order-${safeFileNumber}-TTN-${ttn}-${format === 'zebra' ? '100x100' : 'A4'}.pdf`;
      await bot.sendDocument(chatId, document, {
        caption: `Оригінальна етикетка Нової пошти · Замовлення №${escapeHtml(orderNumber)} · ТТН ${ttn}`,
        parse_mode: 'HTML'
      });
      officialSent = true;
      const packingLabel = createPackingLabelDocument(order, ttn);
      await bot.sendDocument(chatId, packingLabel, {
        caption: `Етикетка MIVA · Замовлення №${escapeHtml(orderNumber)} · ТТН ${ttn} · друкуйте разом з оригінальною.`,
        parse_mode: 'HTML'
      });
    } catch (error) {
      const message = officialSent
        ? 'Оригінальну етикетку надіслано, але службову етикетку MIVA не вдалося надіслати. Спробуйте кнопку ще раз.'
        : shipmentErrorText(error);
      await bot.sendMessage(chatId, `❌ ${escapeHtml(message)}`);
    }
    return;
  }

  if (action === 'packing_label') {
    const ttn = order.ttn || parseTtnFromOrderCard(callback.message?.text);
    if (!ttn) {
      await bot.sendMessage(chatId, 'Для службової етикетки потрібна ТТН. Відкрийте актуальну картку замовлення ще раз.');
      return;
    }
    await bot.sendMessage(chatId, '⏳ Готую опис комплекту 100×100…');
    const document = createPackingLabelDocument(order, ttn);
    await bot.sendDocument(chatId, document, {
      caption: `Опис комплекту · ${escapeHtml(order.id)} · приклейте поруч із транспортною етикеткою Нової пошти.`,
      parse_mode: 'HTML'
    });
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
