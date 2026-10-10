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
  const retryableMethods = new Set([
    'answerCallbackQuery',
    'editMessageReplyMarkup',
    'editMessageText',
    'getFile',
    'getWebhookInfo',
    'setWebhook'
  ]);

  async function call(method, payload) {
    const maxAttempts = retryableMethods.has(method) ? 2 : 1;
    let finalError = new Error(`Telegram ${method} failed`);
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        const result = await fetch(`${baseUrl}/${method}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });
        const data = await result.json().catch(() => ({}));
        if (!result.ok || !data.ok) {
          const error = new Error(`Telegram ${method} failed: ${String(data?.description || result.status).slice(0, 160)}`);
          error.retryable = result.status === 408 || result.status === 429 || result.status >= 500;
          error.retryAfter = Number(data?.parameters?.retry_after) || 0;
          throw error;
        }
        return data.result;
      } catch (error) {
        finalError = error;
        const retryable = error?.retryable || error?.name === 'AbortError' || error?.name === 'TimeoutError' || error instanceof TypeError;
        if (!retryable || attempt === maxAttempts - 1) break;
        const delay = Math.min(Math.max(error?.retryAfter * 1000 || 250, 250), 3000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw finalError;
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
    async sendDocument(chatId, document, options = {}) {
      const form = new FormData();
      form.append('chat_id', String(chatId));
      if (options.caption) form.append('caption', String(options.caption).slice(0, 1024));
      if (options.parse_mode) form.append('parse_mode', options.parse_mode);
      form.append('document', new Blob([document.bytes], {
        type: document.mimeType || 'application/pdf'
      }), document.filename || 'document.pdf');
      const result = await fetch(`${baseUrl}/sendDocument`, { method: 'POST', body: form });
      const data = await result.json().catch(() => ({}));
      if (!result.ok || !data.ok) throw new Error('Telegram sendDocument failed');
      return data.result;
    },
    answerCallbackQuery(callbackQueryId, text = '') {
      return call('answerCallbackQuery', {
        callback_query_id: callbackQueryId,
        text: text.slice(0, 180),
        show_alert: false
      });
    },
    editMessageReplyMarkup(chatId, messageId, replyMarkup = { inline_keyboard: [] }) {
      return call('editMessageReplyMarkup', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: replyMarkup
      });
    },
    editMessageText(chatId, messageId, text, options = {}) {
      return call('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options
      });
    },
    getWebhookInfo() {
      return call('getWebhookInfo', {});
    },
    async downloadImage(fileId) {
      const file = await call('getFile', { file_id: fileId });
      if (!file?.file_path) throw new Error('Telegram file is unavailable');
      const result = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
      if (!result.ok) throw new Error('Telegram file download failed');
      const extension = file.file_path.split('.').pop()?.toLowerCase();
      const mimeType = extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg';
      return { bytes: await result.arrayBuffer(), mimeType };
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
