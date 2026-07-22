import { createHash } from 'node:crypto';

export function deriveWebhookSecret(token) {
  if (!token) throw new Error('Telegram token is not configured');
  return createHash('sha256')
    .update(`miva-telegram-webhook:${token}`)
    .digest('base64url');
}

export function parseChatIds(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).map((item) => item.trim()).filter(Boolean);
  } catch {
    // Comma-separated values are supported too.
  }
  return value.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
}

export function telegramClient(token) {
  if (!token) throw new Error('Telegram token is not configured');
  const baseUrl = `https://api.telegram.org/bot${token}`;

  async function call(method, payload) {
    const result = await fetch(`${baseUrl}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await result.json().catch(() => ({}));
    if (!result.ok || !data.ok) throw new Error(`Telegram ${method} failed`);
    return data.result;
  }

  return {
    sendMessage(chatId, text, options = {}) {
      return call('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options
      });
    },
    answerCallbackQuery(callbackQueryId, text = '') {
      return call('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        text: text.slice(0, 180),
        show_alert: false
      });
    },
    getWebhookInfo() {
      return call('getWebhookInfo', {});
    },
    setWebhook(url, secretToken) {
      return call('setWebhook', {
        url,
        secret_token: secretToken,
        allowed_updates: ['message', 'callback_query'],
        drop_pending_updates: false
      });
    }
  };
}
