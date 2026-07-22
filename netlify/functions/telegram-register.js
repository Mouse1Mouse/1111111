import { deriveWebhookSecret, telegramClient } from '../lib/telegram-client.js';

const response = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body)
});

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { ok: false });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || deriveWebhookSecret(token);
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(webhookSecret)) {
    return response(500, { ok: false, error: 'Invalid webhook configuration' });
  }

  const siteUrl = String(process.env.URL || '').replace(/\/$/, '');
  if (!siteUrl.startsWith('https://')) return response(500, { ok: false, error: 'Site URL is unavailable' });

  try {
    const bot = telegramClient(token);
    await bot.setWebhook(`${siteUrl}/.netlify/functions/telegram-webhook`, webhookSecret);
    return response(200, { ok: true, webhook: `${siteUrl}/.netlify/functions/telegram-webhook` });
  } catch {
    return response(502, { ok: false, error: 'Telegram registration failed' });
  }
};
