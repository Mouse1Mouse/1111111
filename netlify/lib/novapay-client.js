import { randomUUID } from 'node:crypto';

const DEFAULT_ENDPOINT = 'https://business.novapay.ua/Services/ClientAPIService.svc';
const SOAP_NAMESPACE = 'http://tempuri.org/';

function xmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function decodeXml(value) {
  return String(value ?? '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&#xD;', '\r')
    .replaceAll('&#xA;', '\n')
    .replaceAll('&amp;', '&');
}

function extractTag(xml, tag) {
  const match = String(xml).match(new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, 'i'));
  return match ? decodeXml(match[1].trim()) : '';
}

function novaPayDate(value) {
  const iso = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? `${iso[3]}.${iso[2]}.${iso[1]}` : String(value || '');
}

function publicCertificate(env = process.env) {
  const value = String(env.NOVAPAY_PUBLIC_CERTIFICATE_V2 || env.NOVAPAY_PUBLIC_CERTIFICATE || '').trim();
  if (!value.startsWith('base64:')) return value;
  try {
    return Buffer.from(value.slice('base64:'.length), 'base64').toString('utf8').trim();
  } catch {
    return '';
  }
}

function novaPayLogin(env = process.env) {
  return String(env.NOVAPAY_LOGIN || '').trim();
}

function soapEnvelope(operation, fields) {
  const body = Object.entries(fields)
    .map(([key, value]) => `<tem:${key}>${xmlEscape(value)}</tem:${key}>`)
    .join('');
  return `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tem="${SOAP_NAMESPACE}">` +
    `<soap:Body><tem:${operation}><tem:request>${body}</tem:request></tem:${operation}></soap:Body>` +
    `</soap:Envelope>`;
}

async function soapCall(operation, fields, endpoint = DEFAULT_ENDPOINT) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      SOAPAction: `"${SOAP_NAMESPACE}IClientAPIService/${operation}"`
    },
    body: soapEnvelope(operation, fields),
    signal: AbortSignal.timeout(20000)
  });
  const xml = await response.text();
  const fault = extractTag(xml, 'Fault');
  if (!response.ok || fault) {
    const detail = extractTag(xml, 'description') || extractTag(xml, 'faultstring') || `HTTP ${response.status}`;
    throw new Error(`NovaPay ${operation}: ${detail.slice(0, 240)}`);
  }
  const result = extractTag(xml, `${operation}Result`);
  const errorTitle = extractTag(result, 'title');
  const operationResult = extractTag(result, 'result');
  if (errorTitle || (operationResult && !/^(?:0|ok|success)$/i.test(operationResult))) {
    throw new Error(`NovaPay ${operation}: ${(errorTitle || operationResult).slice(0, 240)}`);
  }
  return result;
}

function parseMoney(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100) / 100;
  const normalized = String(value ?? '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  if (!normalized || !/^-?\d+(?:\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
}

function normalizeKey(value) {
  return String(value).toLowerCase().replace(/[^a-zа-яіїє0-9]/giu, '');
}

function firstValue(record, names) {
  const wanted = new Set(names.map(normalizeKey));
  for (const [key, value] of Object.entries(record || {})) {
    if (wanted.has(normalizeKey(key)) && value !== null && value !== '') return value;
  }
  return null;
}

function collectObjects(value, target = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectObjects(item, target);
  } else if (value && typeof value === 'object') {
    target.push(value);
    for (const child of Object.values(value)) collectObjects(child, target);
  }
  return target;
}

function parseLooseXmlRows(raw) {
  const rows = [];
  const rowPattern = /<(row|payment|transaction|item|table|record|Docs)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(raw))) {
    const row = rowMatch[1].toLowerCase() === 'docs' ? { __novapayBankDocument: true } : {};
    const attributePattern = /([\w:.-]+)="([^"]*)"/g;
    let attributeMatch;
    while ((attributeMatch = attributePattern.exec(rowMatch[2] || ''))) {
      row[attributeMatch[1].split(':').pop()] = decodeXml(attributeMatch[2]);
    }
    const fieldPattern = /<([\w:.-]+)(?:\s[^>]*)?>([^<]*)<\/\1>/g;
    let fieldMatch;
    while ((fieldMatch = fieldPattern.exec(rowMatch[3]))) {
      row[fieldMatch[1].split(':').pop()] = decodeXml(fieldMatch[2].trim());
    }
    if (Object.keys(row).length) rows.push(row);
  }
  return rows;
}

export function normalizeNovaPayPayments(payload) {
  if (!payload) return [];
  let parsed = payload;
  if (typeof payload === 'string') {
    const decoded = decodeXml(payload).trim();
    try {
      parsed = JSON.parse(decoded);
    } catch {
      parsed = parseLooseXmlRows(decoded);
    }
  }

  const candidates = collectObjects(parsed);
  const payments = [];
  const seen = new Set();
  for (const record of candidates) {
    const allText = Object.values(record)
      .filter((value) => ['string', 'number'].includes(typeof value))
      .join(' ');
    const explicitTtn = firstValue(record, [
      'ttn', 'en', 'expressWaybill', 'expressWaybillNumber', 'trackingNumber',
      'documentNumber', 'docNumber', 'cargoNumber', 'additionalInfo'
    ]);
    const ttn = String(explicitTtn ?? allText).match(/(?:^|\D)(\d{14})(?:\D|$)/)?.[1] || '';
    const purpose = String(firstValue(record, ['purpose', 'description', 'paymentPurpose']) ?? '');
    const isBankRegistry = record.__novapayBankDocument === true && /реєстр|registry/iu.test(purpose);
    if (!ttn && !isBankRegistry) continue;

    let grossAmount = isBankRegistry ? null : parseMoney(firstValue(record, [
      'grossAmount', 'paymentAmount', 'transferAmount', 'amount', 'sum', 'amountDoc', 'debitAmount'
    ]));
    let feeAmount = parseMoney(firstValue(record, [
      'feeAmount', 'commissionAmount', 'commission', 'fee', 'tariffAmount'
    ]));
    let netAmount = parseMoney(firstValue(record, isBankRegistry ? ['amount'] : [
      'netAmount', 'creditedAmount', 'creditAmount', 'amountCredit', 'accountAmount', 'incomeAmount'
    ]));
    if (grossAmount === null && netAmount !== null && feeAmount !== null) grossAmount = Math.round((netAmount + feeAmount) * 100) / 100;
    if (netAmount === null && grossAmount !== null && feeAmount !== null) netAmount = Math.round((grossAmount - feeAmount) * 100) / 100;
    if (grossAmount === null && netAmount === null) continue;

    const transactionId = String(firstValue(record, [
      'transactionId', 'paymentId', 'transferId', 'id', 'reference', 'ref', 'documentId'
    ]) ?? '').trim();
    const registryNumber = String(firstValue(record, [
      'registryNumber', 'registerNumber', 'registry', 'register', 'registryId'
    ]) ?? purpose.match(/(?:реєстр(?:у)?|registry)\s*№?\s*([\p{L}\p{N}-]+)/iu)?.[1] ?? '').trim();
    const settledAt = String(firstValue(record, [
      'settledAt', 'paymentDate', 'payDate', 'dayDate', 'orgDate', 'operationDate', 'date', 'createdAt', 'documentDate'
    ]) ?? '').trim();
    const key = `${ttn}|${transactionId}|${grossAmount}|${netAmount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    payments.push({
      ttn,
      grossAmount,
      feeAmount,
      netAmount,
      transactionId,
      registryNumber,
      settledAt,
      source: isBankRegistry ? 'bank_registry' : 'itemized',
      raw: record
    });
  }
  return payments;
}

export function findNovaPayPaymentForOrder(payments, order, tolerance = 0.01) {
  const expectedGross = Number(order.codAmount);
  const expectedFee = Math.round(expectedGross * 0.005 * 100) / 100;
  const expectedNet = Math.round((expectedGross - expectedFee) * 100) / 100;
  return payments.find((payment) => {
    if (!payment.ttn || String(payment.ttn) !== String(order.ttn)) return false;
    const grossMatches = payment.grossAmount !== null && Math.abs(payment.grossAmount - expectedGross) <= tolerance;
    const netMatches = payment.netAmount !== null && Math.abs(payment.netAmount - expectedNet) <= tolerance;
    return grossMatches || netMatches;
  }) || null;
}

export function isNovaPayConfigured(env = process.env) {
  return Boolean(
    (env.NOVAPAY_REFRESH_TOKEN_V2 || env.NOVAPAY_REFRESH_TOKEN) &&
    novaPayLogin(env) &&
    (env.NOVAPAY_PUBLIC_CERTIFICATE_V2 || env.NOVAPAY_PUBLIC_CERTIFICATE)
  );
}

export async function fetchNovaPayPayments({ dateFrom, dateTo, env = process.env, credentials = null, onCredentialsRotated = null } = {}) {
  if (!isNovaPayConfigured(env)) throw new Error('NovaPay API is not configured');
  const endpoint = env.NOVAPAY_API_ENDPOINT || DEFAULT_ENDPOINT;
  const authResult = await soapCall('UserAuthenticationJWT', {
    request_ref: randomUUID(),
    refresh_token: credentials?.refreshToken || env.NOVAPAY_REFRESH_TOKEN_V2 || env.NOVAPAY_REFRESH_TOKEN,
    login: novaPayLogin(env),
    public_certificate: credentials?.publicCertificate || publicCertificate(env)
  }, endpoint);
  const jwt = extractTag(authResult, 'jwt');
  if (!jwt) throw new Error('NovaPay authentication did not return JWT');
  const refreshToken = extractTag(authResult, 'refresh_token');
  const rotatedPublicCertificate = extractTag(authResult, 'public_certificate');
  if (!refreshToken || !rotatedPublicCertificate) throw new Error('NovaPay authentication did not return rotated credentials');
  if (onCredentialsRotated) await onCredentialsRotated({ refreshToken, publicCertificate: rotatedPublicCertificate });
  // JWT authorization replaces `principal`; sending an empty principal makes
  // some NovaPay methods reject an otherwise valid JWT session.
  const auth = { request_ref: randomUUID(), jwt };

  const clientsResult = await soapCall('GetClientsList', auth, endpoint);
  const clientId = Number(extractTag(clientsResult, 'id'));
  if (!Number.isInteger(clientId) || clientId <= 0) throw new Error('NovaPay client account was not found');

  const accountsResult = await soapCall('GetAccountsList', {
    ...auth,
    request_ref: randomUUID(),
    client_id: clientId
  }, endpoint);
  const accountId = extractTag(accountsResult, 'id');
  if (!accountId) throw new Error('NovaPay settlement account was not found');

  const paymentsResult = await soapCall('GetPaymentsList', {
    ...auth,
    request_ref: randomUUID(),
    account_id: accountId,
    date_from: novaPayDate(dateFrom),
    date_to: novaPayDate(dateTo),
    date_type: 1
  }, endpoint);
  const payload = extractTag(paymentsResult, 'payments');
  return normalizeNovaPayPayments(payload);
}
