const MAX_TELEGRAM_MESSAGE_LENGTH = 4096;

function getAllowedOrigin(event) {
  const origin = event.headers?.origin || '';
  const configuredSite = process.env.URL || 'https://miva.com.ua';
  const allowed = new Set([
    configuredSite,
    'https://miva.com.ua',
    'https://www.miva.com.ua',
    'http://localhost:5173'
  ]);

  return allowed.has(origin) ? origin : configuredSite;
}

function response(event, statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': getAllowedOrigin(event),
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function parseChatIds(value) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    }
  } catch {
    // A comma-separated value is supported as a simpler Netlify setting.
  }

  return value.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
}

function safeText(value, fallback = '', maxLength = 500) {
  const text = String(value ?? '').trim();
  return (text || fallback).slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildMessage(order) {
  const fullName = escapeHtml(safeText(order.fullName, 'Не вказано', 120));
  const phone = escapeHtml(safeText(order.phone, 'Не вказано', 40));
  const contact = escapeHtml(safeText(order.contact, 'Не вказано', 160));
  const city = escapeHtml(safeText(order.city, 'Не вказано', 120));
  const branch = escapeHtml(safeText(order.branch, 'Не вказано', 180));
  const orderSummary = escapeHtml(safeText(order.orderSummary, 'Деталі замовлення відсутні', 1800));
  const comments = escapeHtml(safeText(order.comments, '', 600));
  const paymentMethod = escapeHtml(safeText(order.paymentMethod, 'Не вказано', 120));
  const orderId = escapeHtml(safeText(order.orderId, '', 80));
  const total = Number(order.totalSum);

  if (!Number.isFinite(total) || total <= 0) {
    throw new Error('Invalid order total');
  }

  const message = `🔔 <b>НОВЕ ЗАМОВЛЕННЯ MIVA!</b>

👤 <b>Клієнт:</b> ${fullName}
📞 <b>Телефон:</b> ${phone}
📧 <b>Контакт:</b> ${contact}

📍 <b>Доставка:</b>
🏙️ <b>Місто:</b> ${city}
📦 <b>Відділення:</b> ${branch}

🛏️ <b>Замовлення:</b>
${orderSummary}

💰 <b>Загальна сума:</b> ${total.toFixed(2)} грн
💳 <b>Спосіб оплати:</b> ${paymentMethod}
${orderId ? `🆔 <b>ID замовлення:</b> ${orderId}\n` : ''}${comments ? `💬 <b>Коментар:</b> ${comments}\n` : ''}
⏰ <b>Час:</b> ${new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' })}`;

  return message.slice(0, MAX_TELEGRAM_MESSAGE_LENGTH);
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return response(event, 200, { ok: true });
  }

  if (event.httpMethod !== 'POST') {
    return response(event, 405, { error: 'Method not allowed' });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = parseChatIds(process.env.TELEGRAM_CHAT_IDS);

  if (!botToken || chatIds.length === 0) {
    console.error('Telegram environment variables are not configured');
    return response(event, 500, { error: 'Telegram integration is not configured' });
  }

  try {
    const order = JSON.parse(event.body || '{}');
    const message = buildMessage(order);

    const results = await Promise.all(chatIds.map(async (chatId) => {
      const telegramResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
        }
      );

      if (!telegramResponse.ok) {
        const errorBody = await telegramResponse.json().catch(() => ({}));
        return { success: false, status: telegramResponse.status, error: errorBody.description };
      }

      return { success: true };
    }));

    const sent = results.filter((item) => item.success).length;
    const failed = results.length - sent;

    if (sent === 0) {
      console.error('Telegram delivery failed for all configured chats');
      return response(event, 502, { error: 'Telegram delivery failed', sent, failed });
    }

    return response(event, 200, { success: true, sent, failed });
  } catch (error) {
    console.error('Telegram notification failed:', error.message);
    return response(event, 400, { error: 'Invalid order data' });
  }
};
