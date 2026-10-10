import { createHash } from 'node:crypto';
import {
  cleanText,
  isValidCustomerOrderNumber,
  isValidEmail,
  normalizeUkrainianPhone,
  normalizeCustomerOrderNumber,
  parseAmount
} from './order-core.js';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_ORDER_TEXT_LENGTH = 8000;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    customerOrderNumber: {
      type: 'string',
      description: 'Merchant order number explicitly written near Замовлення №, Заказ №, # or order number, or empty string.'
    },
    customerName: { type: 'string', description: 'Customer name visible in the source, or empty string.' },
    instagramHandle: { type: 'string', description: 'Instagram username including @ when visible, or empty string.' },
    phone: { type: 'string', description: 'Customer phone number, or empty string.' },
    email: { type: 'string', description: 'Customer email, or empty string.' },
    city: { type: 'string', description: 'Delivery city, or empty string.' },
    branch: { type: 'string', description: 'Nova Poshta branch or locker, or empty string.' },
    itemsSummary: {
      type: 'string',
      description: 'Ordered products with size, quantity and unit price when visible, one product per line.'
    },
    totalAmount: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Full order value in UAH, not the COD balance.'
    },
    prepaymentAmount: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'IBAN prepayment in UAH only when explicitly visible.'
    },
    codAmount: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'NovaPay cash-on-delivery balance in UAH only when explicitly visible.'
    },
    ttn: { type: 'string', description: 'Nova Poshta tracking number when visible, or empty string.' },
    confidence: { type: 'number', minimum: 0, maximum: 1 }
  },
  required: [
    'customerOrderNumber',
    'customerName',
    'instagramHandle',
    'phone',
    'email',
    'city',
    'branch',
    'itemsSummary',
    'totalAmount',
    'prepaymentAmount',
    'codAmount',
    'ttn',
    'confidence'
  ]
};

const EXTRACTION_PROMPT = `
Extract an Instagram bedding order from the supplied screenshot or copied text for a Ukrainian business.
Return only facts that are explicitly present. Never invent missing customer or payment data.
Extract customerOrderNumber only when it is explicitly labelled like "Замовлення №1542", "Заказ №1542", "№ замовлення 1542" or "Order #1542".
Do not use the internal MIVA id as customerOrderNumber.
Do not confuse a phone number, order number, message time or price with a Nova Poshta TTN.
The full order value is the total price of all goods. The IBAN prepayment is commonly 200 UAH, but return it only if visible.
The COD amount is the remaining amount that the customer will pay through NovaPay; keep it separate from the full value.
Preserve product names, fabric, color, sizes, quantity and price in Ukrainian when visible.
For products, preserve one of these exact types when it is visible: комплект постільної білизни, підковдра, наволочки, простирадло, простирадло на резинці.
Always preserve the exact size (for example 50×70, 145×220 or 160×200×30) because it is used to select the CheckBox catalog article.
For bedding sets, preserve the exact set label when visible: півтораспальний, двоспальний, Євро, Євро двоспальний, сімейний or індивідуальний розмір.
Recognize Ukrainian phone numbers written as +380XXXXXXXXX, 380XXXXXXXXX or 0XXXXXXXXX. Preserve every visible digit and never invent missing digits.
Treat "наложка", "наложений платіж", "післяплата" and "NovaPay" as the COD balance.
Treat "без передоплати" or "передоплати немає" as an explicit prepaymentAmount of 0.
Recognize branches written as "НП 123", "Нова пошта номер 123", "123 відділення" and "123-тє відділення".
For settlements with duplicate names, preserve any visible settlement type, district and region in the city field.
If a field is unknown, use an empty string or null as required by the schema.
`.trim();

function responsesEndpoint(baseUrl) {
  const base = String(baseUrl || 'https://api.openai.com').replace(/\/$/, '');
  return base.endsWith('/v1') ? `${base}/responses` : `${base}/v1/responses`;
}

function outputText(data) {
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && content.text) return content.text;
    }
  }
  return '';
}

export function normalizeExtractedDraft(result) {
  const totalAmount = parseAmount(result?.totalAmount);
  const codAmount = parseAmount(result?.codAmount);
  let normalizedTotal = totalAmount;
  const prepaymentAmount = parseAmount(result?.prepaymentAmount);
  const warnings = [];
  const needsPrepaymentChoice = prepaymentAmount === null;

  if (needsPrepaymentChoice) {
    warnings.push('Передоплату не видно — оберіть, чи вона є.');
  }

  if (normalizedTotal === null && prepaymentAmount !== null && codAmount !== null) {
    normalizedTotal = Math.round((prepaymentAmount + codAmount) * 100) / 100;
    warnings.push('Повну суму пораховано як передоплата + залишок NovaPay.');
  }

  const customerName = cleanText(result?.customerName || result?.instagramHandle, 120);
  const normalizedPhone = normalizeUkrainianPhone(result?.phone);
  if (normalizedPhone.corrected) {
    warnings.push(
      normalizedPhone.correction === 'country_code'
        ? `Телефон автоматично доповнено кодом України: ${normalizedPhone.input} → ${normalizedPhone.phone}.`
        : `Телефон автоматично виправлено: ${normalizedPhone.input} → ${normalizedPhone.phone}.`
    );
  } else if (normalizedPhone.input && !normalizedPhone.valid) {
    warnings.push(
      normalizedPhone.missingDigits
        ? `Телефон неповний: ${normalizedPhone.input}. Не вистачає ${normalizedPhone.missingDigits} цифр.`
        : `Телефон має неправильний формат: ${normalizedPhone.input}.`
    );
  }
  const draft = {
    customerOrderNumber: normalizeCustomerOrderNumber(result?.customerOrderNumber),
    customerName,
    instagramHandle: cleanText(result?.instagramHandle, 80),
    phone: normalizedPhone.phone,
    email: isValidEmail(result?.email) ? cleanText(result.email, 160) : '-',
    city: cleanText(result?.city, 120),
    branch: cleanText(result?.branch, 180),
    itemsSummary: cleanText(result?.itemsSummary, 1200),
    totalAmount: normalizedTotal,
    prepaymentAmount,
    codAmount,
    ttn: cleanText(result?.ttn, 40) || '-'
  };

  const missingFields = [];
  if (!isValidCustomerOrderNumber(draft.customerOrderNumber)) {
    warnings.push('Номер замовлення не вказано — його можна додати пізніше.');
  }
  if (draft.customerName.length < 2) missingFields.push('customerName');
  if (!normalizedPhone.valid) missingFields.push('phone');
  if (draft.itemsSummary.length < 3) missingFields.push('itemsSummary');
  if (
    (draft.totalAmount === null || draft.totalAmount <= 0) &&
    !(needsPrepaymentChoice && codAmount !== null && codAmount > 0)
  ) {
    missingFields.push('totalAmount');
  }
  if (
    draft.prepaymentAmount === null ||
    draft.prepaymentAmount < 0 ||
    (draft.totalAmount !== null && draft.prepaymentAmount > draft.totalAmount)
  ) {
    missingFields.push('prepaymentAmount');
  }

  return {
    draft,
    warnings,
    missingFields,
    needsPrepaymentChoice,
    confidence: Number.isFinite(Number(result?.confidence)) ? Number(result.confidence) : 0
  };
}

export function applyPrepaymentChoice(draft, value) {
  const prepaymentAmount = parseAmount(value);
  if (prepaymentAmount === null || prepaymentAmount < 0) throw new Error('invalid_prepayment_choice');
  let totalAmount = parseAmount(draft?.totalAmount);
  const codAmount = parseAmount(draft?.codAmount);
  if (totalAmount === null && codAmount !== null) {
    totalAmount = Math.round((codAmount + prepaymentAmount) * 100) / 100;
  }
  if (totalAmount !== null && prepaymentAmount > totalAmount) throw new Error('invalid_prepayment_choice');
  return { ...draft, prepaymentAmount, totalAmount };
}

export function applyOrderTextHints(result, sourceText) {
  const text = cleanOrderSourceText(sourceText);
  const hinted = { ...result };
  if (/(?:без\s+передоплат[и]|передоплат[аи]\s+(?:немає|відсутня)|без\s+авансу)/iu.test(text)) {
    hinted.prepaymentAmount = 0;
  }
  const codMatch = text.match(
    /(?:наложк[аиу]?|наложен(?:ий|ого)\s+платіж|післяплат[аиу]?|novapay)\D{0,24}(\d[\d\s]*(?:[.,]\d{1,2})?)/iu
  );
  if (codMatch && parseAmount(codMatch[1]) !== null) hinted.codAmount = parseAmount(codMatch[1]);

  const branchBefore = text.match(
    /(?:нп|нова\s+пошта|відділення|відд\.?|поштомат)\s*(?:номер|№|#)?\s*(\d+)/iu
  );
  const branchAfter = text.match(/(\d+)\s*(?:[-–—]?\s*(?:е|є|те|тє|ше))?\s*(?:відділення|відд\.?|поштомат)/iu);
  const branchNumber = branchBefore?.[1] || branchAfter?.[1];
  if (branchNumber) hinted.branch = `Відділення №${Number(branchNumber)}`;
  return hinted;
}

function cleanOrderSourceText(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_ORDER_TEXT_LENGTH);
}

async function extractOrder(content, operatorId, sourceText = '') {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY1 || process.env.NETLIFY_AI_GATEWAY_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || process.env.NETLIFY_AI_GATEWAY_BASE_URL;
  if (!apiKey) throw new Error('ai_gateway_not_configured');

  const safetyIdentifier = createHash('sha256')
    .update(`miva-order-operator:${operatorId}`)
    .digest('hex');
  const requestBody = JSON.stringify({
      model: process.env.ORDER_VISION_MODEL || 'gpt-5.6-luna',
      store: false,
      safety_identifier: safetyIdentifier,
      reasoning: { effort: 'none' },
      max_output_tokens: 1200,
      input: [{
        role: 'user',
        content
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'miva_instagram_order',
          strict: true,
          schema: EXTRACTION_SCHEMA
        }
      }
  });

  let finalError = new Error('ai_extraction_failed');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(responsesEndpoint(baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: requestBody,
        signal: AbortSignal.timeout(30000)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error('ai_extraction_failed');
        error.retryable = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500;
        throw error;
      }
      const text = outputText(data);
      if (!text) {
        const error = new Error('ai_empty_result');
        error.retryable = true;
        throw error;
      }
      try {
        const parsed = JSON.parse(text);
        return normalizeExtractedDraft(sourceText ? applyOrderTextHints(parsed, sourceText) : parsed);
      } catch {
        const error = new Error('ai_invalid_result');
        error.retryable = true;
        throw error;
      }
    } catch (error) {
      finalError = error;
      const retryable = error?.retryable || error?.name === 'AbortError' || error?.name === 'TimeoutError' || error instanceof TypeError;
      if (!retryable || attempt === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw finalError;
}

export async function extractOrderFromImage({ bytes, mimeType, caption = '', operatorId = '' }) {
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) throw new Error('unsupported_image_type');
  if (!bytes?.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('image_too_large');
  const base64Image = Buffer.from(bytes).toString('base64');
  return extractOrder([
    { type: 'input_text', text: caption ? `${EXTRACTION_PROMPT}\n\nCaption: ${cleanText(caption, 500)}` : EXTRACTION_PROMPT },
    { type: 'input_image', image_url: `data:${mimeType};base64,${base64Image}`, detail: 'auto' }
  ], operatorId);
}

export async function extractOrderFromText({ text, operatorId = '' }) {
  const sourceText = cleanOrderSourceText(text);
  if (sourceText.length < 20) throw new Error('order_text_too_short');
  return extractOrder([{
    type: 'input_text',
    text: `${EXTRACTION_PROMPT}\n\nCopied order text:\n${sourceText}`
  }], operatorId, sourceText);
}
