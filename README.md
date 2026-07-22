# MIVA website and order tools

## Telegram workflow for Instagram + NovaPay

The Telegram webhook stores operator-created Instagram orders in Netlify Blobs and moves them through these states:

1. Order created with customer, nomenclature, full value and IBAN prepayment.
2. Operator confirms that the IBAN prepayment was received.
3. Operator either creates the Nova Poshta TTN through the business API after preview/confirmation or enters it manually.
4. Operator confirms that the exact COD balance arrived through NovaPay.
5. The bot prepares the full data for a manual fiscal receipt in SOTA Kasa.
6. Operator records the SOTA fiscal receipt number and closes the order.

The bot does **not** create a SOTA Kasa receipt automatically. A real fiscal operation must be verified in SOTA before the order is marked as complete.

### Nova Poshta TTN and marking

When the Nova Poshta API is configured, a ready-to-ship order gets an automatic TTN button. The bot resolves the sender, recipient warehouse and contact data, then asks the operator to verify package weight, dimensions, delivery payer, declared value and NovaPay COD balance. A real waybill is created only after a separate confirmation click. The order receives the returned TTN and can download either an A4 marking PDF or a 100×100 Zebra PDF without exposing the API key in Telegram.

### Screenshot recognition

An operator can send one Instagram order screenshot directly to the bot. The function downloads the image from Telegram into memory, sends it through the Netlify AI Gateway for structured vision extraction, and does not save the original image. The bot displays the extracted fields for confirmation and allows individual corrections before an order is stored. If the screenshot does not show a prepayment, the operator chooses no prepayment, 200 UAH, or another amount before saving.

The default model is `gpt-5.6-luna`. It can be overridden with `ORDER_VISION_MODEL`. Netlify supplies AI Gateway credentials automatically on supported credit-based plans; an explicit OpenAI key is not required unless AI Gateway is disabled.
For this deployment, `OPENAI_API_KEY1` is also accepted as a compatibility alias for `OPENAI_API_KEY`.

### Netlify environment variables

- `TELEGRAM_BOT_TOKEN` — existing BotFather token.
- `TELEGRAM_CHAT_IDS` — existing operator chat ID list; JSON array or comma-separated values.
- `TELEGRAM_OPERATOR_CHAT_IDS` — optional dedicated operator allowlist; falls back to `TELEGRAM_CHAT_IDS`.
- `TELEGRAM_WEBHOOK_SECRET` — optional override; by default a stable secret is derived from the existing bot token without exposing it.
- `NOVA_POSHTA_API_KEY` — Nova Poshta business API key. Keep it secret and rotate any key that appeared in a screenshot or chat.
- `NOVA_POSHTA_SENDER_REF`, `NOVA_POSHTA_SENDER_CITY_REF`, `NOVA_POSHTA_SENDER_ADDRESS_REF`, `NOVA_POSHTA_SENDER_CONTACT_REF`, `NOVA_POSHTA_SENDER_PHONE` — optional sender overrides; the first sender profile, address and contact are used when omitted.
- `NOVA_POSHTA_DEFAULT_WEIGHT_KG` — optional default package weight. When omitted, the bot requires a 1–4 kg button choice or manual weight.
- `NOVA_POSHTA_DEFAULT_LENGTH_CM`, `NOVA_POSHTA_DEFAULT_WIDTH_CM`, `NOVA_POSHTA_DEFAULT_HEIGHT_CM` — optional package dimensions; defaults are 40×30×20 cm and are always shown before confirmation.
- `NOVA_POSHTA_CARGO_DESCRIPTION` — optional cargo description; defaults to `Постільна білизна`.

After deployment, send a `POST` request to `/.netlify/functions/telegram-register`. The endpoint can only register the fixed webhook URL belonging to the current Netlify site. It never accepts another URL and never returns the Telegram token or derived secret.

Run local checks with `npm test`, `npm run lint`, and `npm run build`.
