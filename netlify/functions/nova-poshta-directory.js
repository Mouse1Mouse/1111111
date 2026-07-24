import {
  listNovaPoshtaWarehouses,
  resolveNovaPoshtaWarehouse,
  searchNovaPoshtaSettlements
} from '../lib/nova-poshta.js';
import { cleanText } from '../lib/order-core.js';

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify(body)
});

function publicDirectoryItems(items) {
  return items
    .filter((item) => item?.Ref && item?.Description)
    .map((item) => ({
      Ref: cleanText(item.Ref, 60),
      Description: cleanText(item.Description, 240)
    }));
}

function publicSettlementItems(items) {
  const seen = new Set();
  return items
    .map((item) => ({
      Ref: cleanText(item?.DeliveryCity, 60),
      Description: cleanText(item?.Present || item?.MainDescription, 240)
    }))
    .filter((item) => {
      const key = `${item.Ref}:${item.Description}`;
      if (!item.Ref || !item.Description || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return response(405, { ok: false });
  if (Number(event.headers?.['content-length'] || 0) > 2048) {
    return response(413, { ok: false });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { ok: false });
  }

  try {
    if (body.action === 'cities') {
      const query = cleanText(body.query, 80);
      if (query.length < 2) return response(400, { ok: false });
      const settlements = await searchNovaPoshtaSettlements(query);
      return response(200, { ok: true, data: publicSettlementItems(settlements) });
    }

    if (body.action === 'warehouses') {
      const cityName = cleanText(body.cityName, 120);
      if (cityName.length < 2) return response(400, { ok: false });
      const warehouses = await listNovaPoshtaWarehouses(cityName);
      return response(200, { ok: true, data: publicDirectoryItems(warehouses) });
    }

    if (body.action === 'warehouse') {
      const cityName = cleanText(body.cityName, 120);
      const query = cleanText(body.query, 180);
      if (cityName.length < 2 || query.length < 1) return response(400, { ok: false });
      const warehouse = await resolveNovaPoshtaWarehouse(cityName, query);
      return response(200, { ok: true, data: publicDirectoryItems([warehouse]) });
    }

    return response(400, { ok: false });
  } catch (error) {
    const reason = cleanText(error?.publicMessage || error?.message, 160);
    return response(reason === 'nova_poshta_not_configured' ? 503 : 502, {
      ok: false,
      reason: reason || 'nova_poshta_directory_failed'
    });
  }
};
