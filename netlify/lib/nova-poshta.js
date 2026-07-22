import { cleanText, parseAmount } from './order-core.js';

const API_ENDPOINT = 'https://api.novaposhta.ua/v2.0/json/';
const MARKING_ENDPOINT = 'https://my.novaposhta.ua/orders';

function apiKey(value = process.env.NOVA_POSHTA_API_KEY) {
  const key = cleanText(value, 120);
  if (!key) throw new Error('nova_poshta_not_configured');
  return key;
}

function positiveNumber(value, fallback = null) {
  const number = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function safeApiError(data, fallback) {
  const first = [...(data?.errors || []), ...(data?.warnings || [])]
    .map((item) => cleanText(item, 180))
    .find(Boolean);
  const error = new Error(fallback);
  error.publicMessage = first || '';
  return error;
}

export function isNovaPoshtaConfigured(value = process.env.NOVA_POSHTA_API_KEY) {
  return Boolean(cleanText(value, 120));
}

export function normalizeNovaPoshtaPhone(value) {
  let digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('0')) digits = `38${digits}`;
  if (digits.length !== 12 || !digits.startsWith('380')) throw new Error('invalid_recipient_phone');
  return digits;
}

export function formatNovaPoshtaDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.day}.${values.month}.${values.year}`;
}

export async function novaPoshtaCall(modelName, calledMethod, methodProperties = {}, options = {}) {
  const key = apiKey(options.apiKey);
  const result = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: key, modelName, calledMethod, methodProperties }),
    redirect: 'follow',
    signal: AbortSignal.timeout(25000)
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok || data?.success !== true) throw safeApiError(data, 'nova_poshta_api_failed');
  return { data: Array.isArray(data.data) ? data.data : [], warnings: data.warnings || [] };
}

function selectedByRef(items, configuredRef) {
  const ref = cleanText(configuredRef, 60);
  if (ref) return items.find((item) => item?.Ref === ref) || null;
  return items[0] || null;
}

async function resolveSender(options = {}) {
  const counterparties = await novaPoshtaCall('CounterpartyGeneral', 'getCounterparties', {
    CounterpartyProperty: 'Sender',
    Page: '1'
  }, options);
  const sender = selectedByRef(counterparties.data, options.senderRef || process.env.NOVA_POSHTA_SENDER_REF);
  if (!sender?.Ref || !sender?.City) throw new Error('nova_poshta_sender_missing');

  const senderWarehouseInput = options.senderWarehouse;
  const [addresses, contacts, senderWarehouse] = await Promise.all([
    senderWarehouseInput
      ? Promise.resolve({ data: [] })
      : novaPoshtaCall('CounterpartyGeneral', 'getCounterpartyAddresses', {
        Ref: sender.Ref,
        CounterpartyProperty: 'Sender'
      }, options),
    novaPoshtaCall('CounterpartyGeneral', 'getCounterpartyContactPersons', {
      Ref: sender.Ref,
      Page: '1'
    }, options),
    senderWarehouseInput
      ? resolveWarehouse(senderWarehouseInput.city, senderWarehouseInput.branch, options)
      : Promise.resolve(null)
  ]);
  const address = senderWarehouse || selectedByRef(addresses.data, options.senderAddressRef || process.env.NOVA_POSHTA_SENDER_ADDRESS_REF);
  const contact = selectedByRef(contacts.data, options.senderContactRef || process.env.NOVA_POSHTA_SENDER_CONTACT_REF);
  if (!address?.Ref || !contact?.Ref) throw new Error('nova_poshta_sender_details_missing');

  return {
    ref: sender.Ref,
    cityRef: options.senderCityRef || process.env.NOVA_POSHTA_SENDER_CITY_REF || address.CityRef || address.SettlementRef || sender.City,
    addressRef: address.Ref,
    contactRef: contact.Ref,
    phone: normalizeNovaPoshtaPhone(options.senderPhone || process.env.NOVA_POSHTA_SENDER_PHONE || contact.Phones),
    description: cleanText(sender.Description || [sender.LastName, sender.FirstName, sender.MiddleName].filter(Boolean).join(' '), 120),
    addressDescription: cleanText(address.Description || address.ShortAddress, 160),
    contactDescription: cleanText(contact.Description, 120)
  };
}

function recipientCityName(value) {
  return cleanText(value, 120)
    .split(',')[0]
    .replace(/^(?:м\.?|місто)\s*/i, '')
    .trim();
}

function requestedWarehouseNumber(value) {
  const text = cleanText(value, 180);
  const contextual = text.match(/(?:відділення|поштомат|№)\s*№?\s*(\d+)/i);
  if (contextual) return String(Number(contextual[1]));
  const onlyNumber = text.match(/^#?\s*(\d+)\s*$/);
  return onlyNumber ? String(Number(onlyNumber[1])) : '';
}

export function parseSenderWarehouseSelection(value) {
  const text = cleanText(value, 180);
  const match = text.match(/(?:,?\s*(?:(?:відділення|відд\.?)\s*(?:№|#)?|№|#)\s*)?(\d+)\s*$/iu);
  if (!match) return null;
  const number = String(Number(match[1]));
  const city = text.slice(0, match.index).replace(/[\s,;:-]+$/u, '').trim();
  if (city.length < 2 || number === '0') return null;
  return { city, branch: `Відділення №${number}`, number };
}

function warehouseScore(warehouse, query, number) {
  const haystack = cleanText(`${warehouse.Description || ''} ${warehouse.ShortAddress || ''}`, 300).toLocaleLowerCase('uk-UA');
  const needle = cleanText(query, 180).toLocaleLowerCase('uk-UA');
  let score = 0;
  if (number && String(Number(warehouse.Number)) === number) score += 100;
  if (needle && haystack.includes(needle)) score += 20;
  for (const token of needle.split(/[^\p{L}\p{N}]+/u).filter((item) => item.length >= 3)) {
    if (haystack.includes(token)) score += 1;
  }
  if (warehouse.WarehouseStatus === 'Working') score += 2;
  if (warehouse.DenyToSelect !== '1') score += 2;
  return score;
}

async function resolveWarehouse(cityValue, queryValue, options = {}) {
  const city = recipientCityName(cityValue);
  const query = cleanText(queryValue, 180);
  if (!city || !query) throw new Error('nova_poshta_destination_missing');
  const number = requestedWarehouseNumber(query);
  const properties = {
    CityName: city,
    FindByString: query,
    Page: '1',
    Limit: '20',
    Language: 'UA'
  };
  if (number) properties.WarehouseId = number;
  const response = await novaPoshtaCall('AddressGeneral', 'getWarehouses', properties, options);
  const candidates = response.data
    .filter((warehouse) => warehouse?.Ref && warehouse.DenyToSelect !== '1')
    .map((warehouse) => ({ warehouse, score: warehouseScore(warehouse, query, number) }))
    .sort((left, right) => right.score - left.score);
  const best = candidates[0];
  if (!best || (candidates.length > 1 && best.score === candidates[1].score)) {
    throw new Error(candidates.length ? 'nova_poshta_warehouse_ambiguous' : 'nova_poshta_warehouse_not_found');
  }
  return best.warehouse;
}

async function resolveRecipientWarehouse(order, options = {}) {
  return resolveWarehouse(order.city, order.branch, options);
}

function configuredDimensions(options = {}) {
  return {
    length: positiveNumber(options.length || process.env.NOVA_POSHTA_DEFAULT_LENGTH_CM, 40),
    width: positiveNumber(options.width || process.env.NOVA_POSHTA_DEFAULT_WIDTH_CM, 30),
    height: positiveNumber(options.height || process.env.NOVA_POSHTA_DEFAULT_HEIGHT_CM, 20)
  };
}

export async function prepareNovaPoshtaShipment(order, options = {}) {
  const totalAmount = parseAmount(order?.totalAmount);
  const codAmount = parseAmount(order?.codAmount);
  if (totalAmount === null || codAmount === null || totalAmount <= 0) throw new Error('invalid_order_amounts');
  const [sender, warehouse] = await Promise.all([
    resolveSender(options),
    resolveRecipientWarehouse(order, options)
  ]);
  return {
    orderId: cleanText(order.id, 40),
    recipientName: cleanText(order.customerName, 120),
    recipientPhone: normalizeNovaPoshtaPhone(order.phone),
    recipientCityName: cleanText(warehouse.SettlementDescription || warehouse.CityDescription, 120),
    recipientArea: cleanText(warehouse.SettlementAreaDescription, 120),
    recipientRegion: cleanText(warehouse.SettlementRegionsDescription, 120),
    recipientSettlementType: cleanText(warehouse.SettlementTypeDescription, 60),
    warehouseNumber: cleanText(warehouse.Number, 20),
    warehouseRef: cleanText(warehouse.Ref, 60),
    warehouseDescription: cleanText(warehouse.Description || warehouse.ShortAddress, 180),
    totalAmount,
    codAmount,
    weight: positiveNumber(options.weight || process.env.NOVA_POSHTA_DEFAULT_WEIGHT_KG),
    dimensions: configuredDimensions(options),
    seatsAmount: 1,
    description: cleanText(options.description || process.env.NOVA_POSHTA_CARGO_DESCRIPTION || 'Постільна білизна', 36),
    deliveryPayer: options.deliveryPayer === 'Sender' ? 'Sender' : 'Recipient',
    sender
  };
}

export function buildInternetDocumentPayload(shipment, date = new Date()) {
  const weight = positiveNumber(shipment?.weight);
  if (!weight || weight > 1000) throw new Error('invalid_shipment_weight');
  const dimensions = shipment?.dimensions || {};
  const length = positiveNumber(dimensions.length);
  const width = positiveNumber(dimensions.width);
  const height = positiveNumber(dimensions.height);
  if (![length, width, height].every((value) => value && value <= 300)) throw new Error('invalid_shipment_dimensions');
  const payerType = shipment.deliveryPayer === 'Sender' ? 'Sender' : 'Recipient';
  const methodProperties = {
    PayerType: payerType,
    PaymentMethod: payerType === 'Sender' ? 'NonCash' : 'Cash',
    DateTime: formatNovaPoshtaDate(date),
    CargoType: 'Cargo',
    Weight: String(weight),
    ServiceType: 'WarehouseWarehouse',
    SeatsAmount: String(shipment.seatsAmount || 1),
    Description: cleanText(shipment.description || 'Постільна білизна', 36),
    Cost: String(Math.ceil(Number(shipment.totalAmount))),
    CitySender: shipment.sender.cityRef,
    Sender: shipment.sender.ref,
    SenderAddress: shipment.sender.addressRef,
    ContactSender: shipment.sender.contactRef,
    SendersPhone: shipment.sender.phone,
    RecipientsPhone: shipment.recipientPhone,
    NewAddress: '1',
    RecipientCityName: shipment.recipientCityName,
    RecipientArea: shipment.recipientArea || '',
    RecipientAreaRegions: shipment.recipientRegion || '',
    RecipientAddressName: shipment.warehouseNumber,
    RecipientHouse: '',
    RecipientFlat: '',
    RecipientName: shipment.recipientName,
    RecipientType: 'PrivatePerson',
    SettlementType: shipment.recipientSettlementType || '',
    RecipientContactName: shipment.recipientName,
    OptionsSeat: [{
      volumetricWidth: String(width),
      volumetricLength: String(length),
      volumetricHeight: String(height),
      weight: String(weight)
    }]
  };
  if (Number(shipment.codAmount) > 0) {
    methodProperties.BackwardDeliveryData = [{
      PayerType: 'Recipient',
      CargoType: 'Money',
      RedeliveryString: String(Number(shipment.codAmount).toFixed(2))
    }];
  }
  return methodProperties;
}

export async function createNovaPoshtaWaybill(shipment, options = {}) {
  const response = await novaPoshtaCall('InternetDocumentGeneral', 'save', buildInternetDocumentPayload(shipment), options);
  const document = response.data[0];
  if (!document?.IntDocNumber || !document?.Ref) throw new Error('nova_poshta_waybill_missing');
  return {
    ttn: cleanText(document.IntDocNumber, 40),
    ref: cleanText(document.Ref, 60),
    deliveryCost: positiveNumber(document.CostOnSite, 0),
    estimatedDeliveryDate: cleanText(document.EstimatedDeliveryDate, 40),
    warnings: response.warnings.map((warning) => cleanText(warning, 180)).filter(Boolean)
  };
}

export async function downloadNovaPoshtaMarking(ttn, format = 'a4', options = {}) {
  const key = apiKey(options.apiKey);
  const number = cleanText(ttn, 40);
  if (!/^\d{12,20}$/.test(number)) throw new Error('invalid_ttn_for_marking');
  const zebra = format === 'zebra';
  const path = zebra
    ? `printMarking100x100/orders/${encodeURIComponent(number)}/type/pdf/apiKey/${encodeURIComponent(key)}/zebra`
    : `printMarking85x85/orders/${encodeURIComponent(number)}/type/pdf8/apiKey/${encodeURIComponent(key)}`;
  const response = await fetch(`${MARKING_ENDPOINT}/${path}`, {
    redirect: 'follow',
    signal: AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error('nova_poshta_marking_failed');
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 20 * 1024 * 1024) throw new Error('nova_poshta_marking_invalid');
  return {
    bytes,
    mimeType: response.headers.get('content-type')?.split(';')[0] || 'application/pdf',
    filename: `NovaPoshta-${number}-${zebra ? '100x100' : 'A4'}.pdf`
  };
}
