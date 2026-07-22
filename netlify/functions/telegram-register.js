import { deriveWebhookSecret, parseChatIds, telegramClient } from '../lib/telegram-client.js';

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
    const webhookUrl = `${siteUrl}/.netlify/functions/telegram-webhook`;
    await bot.setWebhook(webhookUrl, webhookSecret);
    const operatorIds = parseChatIds(process.env.TELEGRAM_OPERATOR_CHAT_IDS || process.env.TELEGRAM_CHAT_IDS);
    let selfTestStatus = null;

    if (operatorIds.length) {
      const testResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': webhookSecret
        },
        body: JSON.stringify({
          update_id: `self-test-${process.env.COMMIT_REF || 'v1'}`,
          message: {
            message_id: 0,
            date: Math.floor(Date.now() / 1000),
            chat: { id: operatorIds[0], type: 'private' },
            text: '/help'
          }
        })
      });
      selfTestStatus = testResponse.status;
    }

    const info = await bot.getWebhookInfo();
    return response(200, {
      ok: true,
      webhook: info.url,
      pendingUpdates: info.pending_update_count || 0,
      lastErrorAt: info.last_error_date || null,
      lastError: info.last_error_message || null,
      operatorCount: operatorIds.length,
      selfTestStatus,
      aiGatewayConfigured: Boolean(process.env.OPENAI_API_KEY || process.env.NETLIFY_AI_GATEWAY_KEY),
      visionModel: process.env.ORDER_VISION_MODEL || 'gpt-5.6-luna'
    });
  } catch {
    return response(502, { ok: false, error: 'Telegram registration failed' });
  }
};
