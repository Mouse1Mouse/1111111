import { cleanText, normalizeUkrainianPhone, parseAmount } from './order-core.js';

const API_ENDPOINT = 'https://api.novaposhta.ua/v2.0/json/';
const MARKING_ENDPOINT = 'https://my.novaposhta.ua/orders';
export const STANDARD_PARCEL = Object.freeze({
  weight: 2,
  dimensions: Object.freeze({ length: 44, width: 34, height: 5 })
});
let apiQueue = Promise.resolve();

function apiKey(value = process.env.NOVA_POSHTA_API_KEY, allowAnonymous = false) {
  const key = cleanText(value, 120);
  if (!key && !allowAnonymous) throw new Error('nova_poshta_not_configured');
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
  const normalized = normalizeUkrainianPhone(value);
  if (!normalized.valid) throw new Error('invalid_recipient_phone');
  return normalized.phone.slice(1);
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

function isRateLimitResponse(result, data) {
  const messages = [...(data?.errors || []), ...(data?.warnings || [])].join(' ');
  return result.status === 429 || /to{1,2}\s+many\s+requests/i.test(messages);
}

async function novaPoshtaCallWithRetry(modelName, calledMethod, methodProperties = {}, options = {}) {
  const key = apiKey(options.apiKey, options.allowAnonymousApiKey === true);
  const retryBaseDelayMs = Number.isFinite(Number(options.retryBaseDelayMs))
    ? Math.max(0, Number(options.retryBaseDelayMs))
    : 1500;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ apiKey: key, modelName, calledMethod, methodProperties }),
      redirect: 'follow',
      signal: AbortSignal.timeout(25000)
    });
    const data = await result.json().catch(() => ({}));
    if (result.ok && data?.success === true) {
      return { data: Array.isArray(data.data) ? data.data : [], warnings: data.warnings || [] };
    }
    if (!isRateLimitResponse(result, data)) throw safeApiError(data, 'nova_poshta_api_failed');
    if (attempt === 3) throw safeApiError(data, 'nova_poshta_rate_limited');
    const delayMs = retryBaseDelayMs * (2 ** attempt);
    if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error('nova_poshta_api_failed');
}

export function novaPoshtaCall(modelName, calledMethod, methodProperties = {}, options = {}) {
  const request = apiQueue.then(() => novaPoshtaCallWithRetry(modelName, calledMethod, methodProperties, options));
  apiQueue = request.catch(() => {});
  return request;
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
      ? resolveNovaPoshtaWarehouse(senderWarehouseInput.city, senderWarehouseInput.branch, {
        ...options,
        settlementRef: options.senderSettlementRef
      })
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
    cityDescription: cleanText(address.SettlementDescription || address.CityDescription, 120),
    warehouseNumber: cleanText(address.Number, 20),
    addressDescription: cleanText(address.Description || address.ShortAddress, 160),
    contactDescription: cleanText(contact.Description, 120)
  };
}

export function recipientCityName(value) {
  return cleanText(value, 120)
    .split(',')[0]
    .replace(/^(?:(?:місто|село|селище)\s+|смт(?:\.\s*|\s+)|[мс](?:\.\s*|\s+))/iu, '')
    .trim();
}

function requestedWarehouseNumber(value) {
  const text = cleanText(value, 180);
  const contextual = text.match(
    /(?:відділення|відд\.?|поштомат|нп|нова\s+пошта|номер|ном\.?|№|#)\s*(?:номер|ном\.?)?\s*[№#]?\s*(\d+)/iu
  );
  if (contextual) return String(Number(contextual[1]));
  const reversed = text.match(
    /(?:№|#)?\s*(\d+)\s*(?:[-–—]?\s*(?:е|є|те|тє|ше))?\s*(?:відділення|відд\.?|поштомат|нп|нова\s+пошта)/iu
  );
  if (reversed) return String(Number(reversed[1]));
  const onlyNumber = text.match(/^#?\s*(\d+)\s*$/);
  return onlyNumber ? String(Number(onlyNumber[1])) : '';
}

export async function searchNovaPoshtaSettlements(cityValue, options = {}) {
  const city = recipientCityName(cityValue);
  if (!city) throw new Error('nova_poshta_destination_missing');
  const methodProperties = {
    CityName: city,
    Limit: '20',
    Page: '1'
  };
  const addresses = (response) => response.data
    .flatMap((item) => Array.isArray(item?.Addresses) ? item.Addresses : [])
    .filter((item) => item?.DeliveryCity && (item?.Present || item?.MainDescription));
  const response = await novaPoshtaCall('AddressGeneral', 'searchSettlements', methodProperties, options);
  const authenticatedResults = addresses(response);
  if (authenticatedResults.length || options.allowAnonymousDirectoryFallback === false) {
    return authenticatedResults;
  }

  // Nova Poshta can occasionally return an empty settlement list for a valid
  // business API key while the same public directory request contains the
  // village. Directory lookups are public, so retry only this read-only call
  // without the key before reporting that the settlement does not exist.
  const publicResponse = await novaPoshtaCall('AddressGeneral', 'searchSettlements', methodProperties, {
    ...options,
    apiKey: '',
    allowAnonymousApiKey: true,
    allowAnonymousDirectoryFallback: false
  });
  const publicResults = addresses(publicResponse);
  if (publicResults.length) return publicResults;

  // A second Nova Poshta directory method is required for a small number of
  // villages that searchSettlements omits on some server/IP combinations.
  const settlementsResponse = await novaPoshtaCall('AddressGeneral', 'getSettlements', {
    FindByString: city,
    Limit: '50',
    Page: '1'
  }, {
    ...options,
    apiKey: '',
    allowAnonymousApiKey: true,
    allowAnonymousDirectoryFallback: false
  });
  return settlementsResponse.data
    .filter((item) => item?.Ref && item?.Description)
    .map((item) => ({
      ...item,
      DeliveryCity: item.DeliveryCity || item.Ref,
      MainDescription: item.MainDescription || item.Description,
      Present: item.Present || [
        item.SettlementTypeDescription,
        item.Description,
        item.RegionsDescription ? `${item.RegionsDescription} р-н` : '',
        item.AreaDescription ? `${item.AreaDescription} обл.` : ''
      ].filter(Boolean).join(', ')
    }));
}

function settlementTypePrefix(value) {
  const match = cleanText(value, 120).match(
    /^(місто(?=\s)|м(?=\.|\s)|село(?=\s)|с(?=\.|\s)|селище(?=\s)|смт(?=\.|\s))/iu
  );
  if (!match) return '';
  const type = match[1].toLocaleLowerCase('uk-UA').replace('.', '');
  if (type === 'місто') return 'м';
  if (type === 'село') return 'с';
  if (type === 'селище') return 'смт';
  return type;
}

function normalizedSettlementText(value) {
  return cleanText(value, 300)
    .toLocaleLowerCase('uk-UA')
    .replace(/[.’'`]/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function settlementContextScore(item, cityValue) {
  const city = recipientCityName(cityValue);
  const context = normalizedSettlementText(cityValue)
    .replace(normalizedSettlementText(city), '')
    .split(' ')
    .filter((token) => token.length >= 3 && ![
      'місто', 'село', 'селище', 'область', 'обл', 'район', 'рн'
    ].includes(token));
  if (!context.length) return 0;
  const present = normalizedSettlementText([
    item.Present,
    item.Description,
    item.Area,
    item.AreaDescription,
    item.Region,
    item.RegionsDescription,
    item.ParentRegionTypes,
    item.ParentRegionCode,
    item.SettlementTypeDescription
  ].filter(Boolean).join(' '));
  const presentTokens = present.split(' ').filter(Boolean);
  return context.reduce((score, token) => {
    const matched = presentTokens.some((candidate) => (
      candidate === token ||
      (candidate.length >= 6 && token.length >= 6 && candidate.slice(0, 6) === token.slice(0, 6))
    ));
    return score + (matched ? 1 : 0);
  }, 0);
}

function settlementChoice(item) {
  return {
    Ref: cleanText(item?.Ref || item?.DeliveryCity, 60),
    Description: cleanText(item?.Present || item?.MainDescription, 180)
  };
}

export async function resolveNovaPoshtaSettlement(cityValue, options = {}) {
  const city = recipientCityName(cityValue).toLocaleLowerCase('uk-UA');
  const settlements = await searchNovaPoshtaSettlements(cityValue, options);
  const configuredRef = cleanText(options.settlementRef, 60);
  if (configuredRef) {
    const configured = settlements.find(
      (item) => item.Ref === configuredRef || item.DeliveryCity === configuredRef
    );
    if (configured) return configured;
    throw new Error('nova_poshta_city_not_found');
  }
  const exact = settlements.filter(
    (item) => cleanText(item.MainDescription, 120).toLocaleLowerCase('uk-UA') === city
  );
  let candidates = exact.length ? exact : settlements;
  const requestedType = settlementTypePrefix(cityValue);
  if (requestedType) {
    const sameType = candidates.filter((item) => settlementTypePrefix(item.Present) === requestedType);
    if (sameType.length) candidates = sameType;
  } else {
    const cities = candidates.filter((item) => settlementTypePrefix(item.Present) === 'м');
    if (cities.length === 1) return cities[0];
  }
  if (!candidates.length) throw new Error('nova_poshta_city_not_found');
  if (candidates.length === 1) return candidates[0];

  const ranked = candidates
    .map((item) => ({ item, score: settlementContextScore(item, cityValue) }))
    .sort((left, right) => right.score - left.score);
  if (ranked[0].score > 0 && ranked[0].score > ranked[1].score) return ranked[0].item;

  const error = new Error('nova_poshta_city_ambiguous');
  error.settlements = candidates.slice(0, 10).map(settlementChoice);
  throw error;
}

export async function listNovaPoshtaWarehouses(cityValue, options = {}) {
  const city = recipientCityName(cityValue);
  const settlement = await resolveNovaPoshtaSettlement(cityValue, options);
  const response = await novaPoshtaCall('AddressGeneral', 'getWarehouses', {
    CityRef: settlement.DeliveryCity,
    SettlementRef: settlement.Ref,
    CityName: city,
    Page: '1',
    Limit: '500',
    Language: 'UA'
  }, options);
  return response.data.filter((warehouse) => warehouse?.Ref && warehouse.DenyToSelect !== '1');
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

export function parseShipmentPreviewOptions(value) {
  const text = cleanText(value, 4000);
  const senderMatch = text.match(/Звідки:\s*(.+?),\s*відділення\s*№\s*(\d+)/iu);
  const weightMatch = text.match(/Вага:\s*(\d+(?:[.,]\d+)?)\s*кг/iu);
  const dimensionsMatch = text.match(/Розмір:\s*(\d+(?:[.,]\d+)?)\s*[×xх]\s*(\d+(?:[.,]\d+)?)\s*[×xх]\s*(\d+(?:[.,]\d+)?)\s*см/iu);
  const payerMatch = text.match(/Доставку\s+оплачує:\s*(MIVA|клієнт)/iu);
  if (!senderMatch || !weightMatch || !dimensionsMatch || !payerMatch) return null;

  const number = String(Number(senderMatch[2]));
  const values = [weightMatch[1], dimensionsMatch[1], dimensionsMatch[2], dimensionsMatch[3]]
    .map((item) => Number(item.replace(',', '.')));
  if (number === '0' || values.some((item) => !Number.isFinite(item) || item <= 0)) return null;

  return {
    senderWarehouse: {
      city: cleanText(senderMatch[1], 120),
      branch: `Відділення №${number}`,
      number
    },
    weight: values[0],
    length: values[1],
    width: values[2],
    height: values[3],
    deliveryPayer: payerMatch[1].toLocaleUpperCase('uk-UA') === 'MIVA' ? 'Sender' : 'Recipient'
  };
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

function rankedWarehouses(items, query, number) {
  return items
    .filter((warehouse) => warehouse?.Ref && warehouse.DenyToSelect !== '1')
    .map((warehouse) => ({ warehouse, score: warehouseScore(warehouse, query, number) }))
    .sort((left, right) => right.score - left.score);
}

function bestWarehouse(candidates) {
  const best = candidates[0];
  if (!best || (candidates.length > 1 && best.score === candidates[1].score)) return null;
  return best.warehouse;
}

export async function resolveNovaPoshtaWarehouse(cityValue, queryValue, options = {}) {
  const city = recipientCityName(cityValue);
  const query = cleanText(queryValue, 180);
  if (!city || !query) throw new Error('nova_poshta_destination_missing');
  const settlement = await resolveNovaPoshtaSettlement(cityValue, options);
  const number = requestedWarehouseNumber(query);
  const baseProperties = {
    CityRef: settlement.DeliveryCity,
    SettlementRef: settlement.Ref,
    CityName: city,
    Page: '1',
    Limit: '50',
    Language: 'UA'
  };

  if (number) {
    const exactResponse = await novaPoshtaCall('AddressGeneral', 'getWarehouses', {
      ...baseProperties,
      WarehouseId: number
    }, options);
    const exactCandidates = rankedWarehouses(exactResponse.data, query, number)
      .filter(({ warehouse }) => String(Number(warehouse.Number)) === number);
    const exact = exactCandidates[0]?.warehouse;
    if (exact) return exact;

    const numberSearchResponse = await novaPoshtaCall('AddressGeneral', 'getWarehouses', {
      ...baseProperties,
      FindByString: number
    }, options);
    const numberCandidates = rankedWarehouses(numberSearchResponse.data, query, number)
      .filter(({ warehouse }) => String(Number(warehouse.Number)) === number);
    const numberMatch = numberCandidates[0]?.warehouse;
    if (numberMatch) return numberMatch;
  }

  const response = await novaPoshtaCall('AddressGeneral', 'getWarehouses', {
    ...baseProperties,
    FindByString: query
  }, options);
  const candidates = rankedWarehouses(response.data, query, number);
  const best = bestWarehouse(candidates);
  if (!best) {
    throw new Error(candidates.length ? 'nova_poshta_warehouse_ambiguous' : 'nova_poshta_warehouse_not_found');
  }
  return best;
}

async function resolveRecipientWarehouse(order, options = {}) {
  return resolveNovaPoshtaWarehouse(order.city, order.branch, {
    ...options,
    settlementRef: options.recipientSettlementRef
  });
}

function configuredDimensions(options = {}) {
  return {
    length: positiveNumber(options.length, STANDARD_PARCEL.dimensions.length),
    width: positiveNumber(options.width, STANDARD_PARCEL.dimensions.width),
    height: positiveNumber(options.height, STANDARD_PARCEL.dimensions.height)
  };
}

export async function prepareNovaPoshtaShipment(order, options = {}) {
  const totalAmount = parseAmount(order?.totalAmount);
  const codAmount = parseAmount(order?.codAmount);
  if (totalAmount === null || codAmount === null || totalAmount <= 0) throw new Error('invalid_order_amounts');
  const [sender, warehouse] = await Promise.all([
    resolveSender(options).catch((error) => {
      if (error?.message === 'nova_poshta_city_ambiguous') error.settlementRole = 'sender';
      throw error;
    }),
    resolveRecipientWarehouse(order, options).catch((error) => {
      if (error?.message === 'nova_poshta_city_ambiguous') error.settlementRole = 'recipient';
      throw error;
    })
  ]);
  return {
    orderId: cleanText(order.id, 40),
    customerOrderNumber: cleanText(order.customerOrderNumber, 40),
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
    // MIVA's standard parcel. The Telegram preview still lets the operator
    // override this value and the dimensions before the TTN is created.
    weight: positiveNumber(options.weight, STANDARD_PARCEL.weight),
    dimensions: configuredDimensions(options),
    seatsAmount: 1,
    description: cleanText(
      options.description || [order.customerOrderNumber ? `№${order.customerOrderNumber}` : '', order.itemsSummary].filter(Boolean).join(' ') ||
      process.env.NOVA_POSHTA_CARGO_DESCRIPTION || 'Постільна білизна',
      36
    ),
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
    methodProperties.AfterpaymentOnGoodsCost = String(Number(shipment.codAmount).toFixed(2));
  }
  return methodProperties;
}

export async function createNovaPoshtaWaybill(shipment, options = {}) {
  const payload = buildInternetDocumentPayload(shipment);
  let response;
  try {
    response = await novaPoshtaCall('InternetDocumentGeneral', 'save', payload, options);
  } catch (error) {
    // Nova Poshta occasionally rejects a perfectly ordinary dynamic cargo
    // description with only the generic "Description is not valid" reply.
    // A single retry with our registered generic product category lets the
    // operator continue without re-entering the whole order. This happens
    // only after a rejected response, so it cannot create a second TTN.
    if (cleanText(error?.publicMessage, 180).toLowerCase() !== 'description is not valid') throw error;
    const orderNumber = cleanText(shipment?.customerOrderNumber || shipment?.orderId, 40)
      .replace(/\D/gu, '')
      .slice(0, 12);
    const fallbackPayload = {
      ...payload,
      Description: cleanText(`Постільна білизна${orderNumber ? ` ${orderNumber}` : ''}`, 36)
    };
    console.warn('nova_poshta_description_fallback', JSON.stringify({
      attemptedDescription: payload.Description,
      fallbackDescription: fallbackPayload.Description
    }));
    response = await novaPoshtaCall('InternetDocumentGeneral', 'save', fallbackPayload, options);
  }
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

function markingDocument(number, zebra, response) {
  if (!response.ok) throw new Error('nova_poshta_marking_failed');
  return response.arrayBuffer().then((bytes) => {
    if (!bytes.byteLength || bytes.byteLength > 20 * 1024 * 1024) {
      throw new Error('nova_poshta_marking_invalid');
    }
    return {
      bytes,
      mimeType: response.headers.get('content-type')?.split(';')[0] || 'application/pdf',
      filename: `NovaPoshta-${number}-${zebra ? '100x100' : 'A4'}.pdf`
    };
  });
}

async function downloadMarkingViaApi(number, key, zebra) {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/pdf, application/json'
    },
    body: JSON.stringify({
      apiKey: key,
      modelName: 'InternetDocument',
      calledMethod: 'printMarkings',
      methodProperties: {
        DocumentRefs: [number],
        // `pdf` is the broadly supported format in the public API. The
        // legacy endpoint below still keeps the dedicated 100x100 layout.
        Type: 'pdf'
      }
    }),
    signal: AbortSignal.timeout(15000)
  });
  const contentType = response.headers.get('content-type') || '';
  if (/application\/pdf/i.test(contentType)) return markingDocument(number, zebra, response);
  throw new Error('nova_poshta_marking_failed');
}

export async function downloadNovaPoshtaMarking(ttn, format = 'a4', options = {}) {
  const key = apiKey(options.apiKey);
  const number = cleanText(ttn, 40);
  if (!/^\d{12,20}$/.test(number)) throw new Error('invalid_ttn_for_marking');
  const zebra = format === 'zebra';
  const path = zebra
    ? `printMarking100x100/orders/${encodeURIComponent(number)}/type/pdf/apiKey/${encodeURIComponent(key)}/zebra`
    : `printMarking85x85/orders/${encodeURIComponent(number)}/type/pdf8/apiKey/${encodeURIComponent(key)}`;
  try {
    const response = await fetch(`${MARKING_ENDPOINT}/${path}`, {
      redirect: 'follow',
      signal: AbortSignal.timeout(12000)
    });
    return await markingDocument(number, zebra, response);
  } catch (error) {
    // The legacy marking host occasionally drops the connection from cloud
    // functions. Its JSON API equivalent avoids that host and returns the
    // same PDF without exposing the API key to Telegram users.
    if (error?.message === 'nova_poshta_marking_failed' || error?.message === 'nova_poshta_marking_invalid') {
      throw error;
    }
    try {
      return await downloadMarkingViaApi(number, key, zebra);
    } catch (fallbackError) {
      if (fallbackError?.message === 'nova_poshta_marking_failed' || fallbackError?.message === 'nova_poshta_marking_invalid') {
        throw fallbackError;
      }
      const markingError = new Error('nova_poshta_marking_failed');
      markingError.publicMessage = 'Сервіс друку Нової пошти тимчасово недоступний. Спробуйте ще раз за кілька хвилин.';
      throw markingError;
    }
  }
}
