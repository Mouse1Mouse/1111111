import assert from 'node:assert/strict';
import test from 'node:test';
import { handler } from '../netlify/functions/nova-poshta-directory.js';

test('Nova Poshta directory rejects unsupported requests', async () => {
  const getResponse = await handler({ httpMethod: 'GET', headers: {}, body: '' });
  assert.equal(getResponse.statusCode, 405);

  const invalidResponse = await handler({
    httpMethod: 'POST',
    headers: {},
    body: JSON.stringify({ action: 'warehouses', cityName: '' })
  });
  assert.equal(invalidResponse.statusCode, 400);
});

test('Nova Poshta directory searches cities without exposing the API key', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.NOVA_POSHTA_API_KEY;
  process.env.NOVA_POSHTA_API_KEY = 'server-test-key';
  let upstreamRequest;
  globalThis.fetch = async (_url, options) => {
    upstreamRequest = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [{
          Addresses: [{
            DeliveryCity: '11111111-1111-1111-1111-111111111111',
            Present: 'м. Київ, Київська обл.',
            Extra: 'hidden'
          }]
        }]
      })
    };
  };

  try {
    const result = await handler({
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({ action: 'cities', query: ' Київ ' })
    });
    const body = JSON.parse(result.body);
    assert.equal(result.statusCode, 200);
    assert.deepEqual(body, {
      ok: true,
      data: [{ Ref: '11111111-1111-1111-1111-111111111111', Description: 'м. Київ, Київська обл.' }]
    });
    assert.equal(upstreamRequest.apiKey, 'server-test-key');
    assert.equal(upstreamRequest.modelName, 'AddressGeneral');
    assert.equal(upstreamRequest.calledMethod, 'searchSettlements');
    assert.equal(upstreamRequest.methodProperties.CityName, 'Київ');
    assert.equal(result.body.includes('server-test-key'), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.NOVA_POSHTA_API_KEY;
    else process.env.NOVA_POSHTA_API_KEY = originalKey;
  }
});
