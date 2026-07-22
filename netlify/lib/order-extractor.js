import { createHash } from 'node:crypto';
import { cleanText, isValidEmail, isValidPhone, parseAmount } from './order-core.js';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    customerName: { type: 'string', description: 'Customer name visible in the screenshot, or empty string.' },
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
Extract an Instagram bedding order from this screenshot for a Ukrainian business.
Return only facts that are explicitly visible. Never invent missing customer or payment data.
Do not confuse a phone number, order number, message time or price with a Nova Poshta TTN.
The full order value is the total price of all goods. The IBAN prepayment is commonly 200 UAH, but return it only if visible.
The COD amount is the remaining amount that the customer will pay through NovaPay; keep it separate from the full value.
Preserve product names, fabric, color, sizes, quantity and price in Ukrainian when visible.
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
  const draft = {
    customerName,
    instagramHandle: cleanText(result?.instagramHandle, 80),
    phone: cleanText(result?.phone, 40),
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
  if (draft.customerName.length < 2) missingFields.push('customerName');
  if (!isValidPhone(draft.phone)) missingFields.push('phone');
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
    (draft.totalAmount !== null && draft.prepaymentAmount >= draft.totalAmount)
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
  if (totalAmount !== null && prepaymentAmount >= totalAmount) throw new Error('invalid_prepayment_choice');
  return { ...draft, prepaymentAmount, totalAmount };
}

export async function extractOrderFromImage({ bytes, mimeType, caption = '', operatorId = '' }) {
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) throw new Error('unsupported_image_type');
  if (!bytes?.byteLength || bytes.byteLength > MAX_IMAGE_BYTES) throw new Error('image_too_large');

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY1 || process.env.NETLIFY_AI_GATEWAY_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || process.env.NETLIFY_AI_GATEWAY_BASE_URL;
  if (!apiKey) throw new Error('ai_gateway_not_configured');

  const base64Image = Buffer.from(bytes).toString('base64');
  const safetyIdentifier = createHash('sha256')
    .update(`miva-order-operator:${operatorId}`)
    .digest('hex');
  const response = await fetch(responsesEndpoint(baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.ORDER_VISION_MODEL || 'gpt-5.6-luna',
      store: false,
      safety_identifier: safetyIdentifier,
      reasoning: { effort: 'none' },
      max_output_tokens: 1200,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: caption ? `${EXTRACTION_PROMPT}\n\nCaption: ${cleanText(caption, 500)}` : EXTRACTION_PROMPT },
          { type: 'input_image', image_url: `data:${mimeType};base64,${base64Image}`, detail: 'auto' }
        ]
      }],
      text: {
        format: {
          type: 'json_schema',
          name: 'miva_instagram_order',
          strict: true,
          schema: EXTRACTION_SCHEMA
        }
      }
    }),
    signal: AbortSignal.timeout(35000)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('ai_extraction_failed');
  const text = outputText(data);
  if (!text) throw new Error('ai_empty_result');

  try {
    return normalizeExtractedDraft(JSON.parse(text));
  } catch {
    throw new Error('ai_invalid_result');
  }
}
