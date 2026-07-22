# MIVA website and order tools

## Telegram workflow for Instagram + NovaPay

The Telegram webhook stores operator-created Instagram orders in Netlify Blobs and moves them through these states:

1. Order created with customer, nomenclature, full value and IBAN prepayment.
2. Operator confirms that the IBAN prepayment was received.
3. Operator adds the Nova Poshta TTN.
4. Operator confirms that the exact COD balance arrived through NovaPay.
5. The bot prepares the full data for a manual fiscal receipt in SOTA Kasa.
6. Operator records the SOTA fiscal receipt number and closes the order.

The bot does **not** create a SOTA Kasa receipt automatically. A real fiscal operation must be verified in SOTA before the order is marked as complete.

### Netlify environment variables

- `TELEGRAM_BOT_TOKEN` — existing BotFather token.
- `TELEGRAM_CHAT_IDS` — existing operator chat ID list; JSON array or comma-separated values.
- `TELEGRAM_OPERATOR_CHAT_IDS` — optional dedicated operator allowlist; falls back to `TELEGRAM_CHAT_IDS`.
- `TELEGRAM_WEBHOOK_SECRET` — a random value containing only letters, numbers, `_` and `-`.
- `TELEGRAM_SETUP_SECRET` — a separate random value used once to register the webhook.

After deployment, send a protected `POST` request to `/.netlify/functions/telegram-register` with the `x-setup-secret` header. The setup endpoint never returns the Telegram token or either secret.

Run local checks with `npm test`, `npm run lint`, and `npm run build`.
