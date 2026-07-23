import { novaPoshtaCall } from '../lib/nova-poshta.js';
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
      const result = await novaPoshtaCall('Address', 'getCities', {
        FindByString: query,
        Limit: '20',
        Page: '1',
        Language: 'UA'
      });
      return response(200, { ok: true, data: publicDirectoryItems(result.data) });
    }

    if (body.action === 'warehouses') {
      const cityRef = cleanText(body.cityRef, 60);
      if (!/^[0-9a-f-]{36}$/i.test(cityRef)) return response(400, { ok: false });
      const result = await novaPoshtaCall('Address', 'getWarehouses', {
        CityRef: cityRef,
        Limit: '500',
        Page: '1',
        Language: 'UA'
      });
      return response(200, { ok: true, data: publicDirectoryItems(result.data) });
    }

    return response(400, { ok: false });
  } catch {
    return response(502, { ok: false });
  }
};
