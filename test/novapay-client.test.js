import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchNovaPayPayments,
  findNovaPayPaymentForOrder,
  isNovaPayConfigured,
  NOVAPAY_AUTH_TIMEOUT_MS,
  NOVAPAY_READ_TIMEOUT_MS,
  normalizeNovaPayPayments,
  normalizeNovaPayPublicCertificate
} from '../netlify/lib/novapay-client.js';

test('accepts a NovaPay login with accidental outer whitespace', () => {
  assert.equal(isNovaPayConfigured({
    NOVAPAY_LOGIN: '  api-user  ',
    NOVAPAY_REFRESH_TOKEN: 'refresh-token',
    NOVAPAY_PUBLIC_CERTIFICATE: 'public-certificate'
  }), true);
});

test('normalizes a base64-prefixed explicit NovaPay certificate', () => {
  const encoded = Buffer.from('certificate-content', 'utf8').toString('base64');
  assert.equal(normalizeNovaPayPublicCertificate(`base64:${encoded}`), 'certificate-content');
  assert.equal(normalizeNovaPayPublicCertificate(' plain-certificate '), 'plain-certificate');
});

test('normalizes JSON-escaped PEM line breaks before NovaPay authentication', () => {
  const pem = '-----BEGIN PUBLIC KEY-----\\nMIIBCgKCAQEA\\n-----END PUBLIC KEY-----';
  assert.equal(
    normalizeNovaPayPublicCertificate(pem),
    '-----BEGIN PUBLIC KEY-----\nMIIBCgKCAQEA\n-----END PUBLIC KEY-----'
  );
  assert.equal(
    normalizeNovaPayPublicCertificate(pem.replaceAll('\\n', '\\\\n')),
    '-----BEGIN PUBLIC KEY-----\nMIIBCgKCAQEA\n-----END PUBLIC KEY-----'
  );
});

test('normalizes JSON payments and matches by TTN and gross amount', () => {
  const payments = normalizeNovaPayPayments(JSON.stringify({ payments: [{
    transactionId: '2818799776',
    ttn: '20451497022920',
    amount: '1550.00',
    commission: '7.75',
    creditedAmount: '1542.25',
    paymentDate: '2026-07-31'
  }] }));
  assert.equal(payments.length, 1);
  assert.equal(payments[0].netAmount, 1542.25);
  assert.equal(findNovaPayPaymentForOrder(payments, { ttn: '20451497022920', codAmount: 1550 })?.transactionId, '2818799776');
});

test('matches by TTN and net amount when gross is absent', () => {
  const payments = normalizeNovaPayPayments([{ trackingNumber: '20451494533448', creditedAmount: 1442.75 }]);
  assert.ok(findNovaPayPaymentForOrder(payments, { ttn: '20451494533448', codAmount: 1450 }));
});

test('does not match an identical amount for another TTN', () => {
  const payments = normalizeNovaPayPayments([{ ttn: '20451497022920', amount: 1550 }]);
  assert.equal(findNovaPayPaymentForOrder(payments, { ttn: '20451497022921', codAmount: 1550 }), null);
});

test('normalizes a NovaPay bank registry document without inventing a TTN', () => {
  const payments = normalizeNovaPayPayments(`
    <Payments><Docs Amount="1343.25" CurrencyTag="UAH">
      <ID>2810000001</ID><PayDate>2026-07-25</PayDate>
      <Purpose>Переказ коштів згідно реєстру № 12345678</Purpose>
    </Docs></Payments>
  `);
  assert.equal(payments.length, 1);
  assert.equal(payments[0].source, 'bank_registry');
  assert.equal(payments[0].netAmount, 1343.25);
  assert.equal(payments[0].ttn, '');
  assert.equal(payments[0].registryNumber, '12345678');
});

test('allows a slow authentication response while retaining short read timeouts', async () => {
  const originalFetch = globalThis.fetch;
  const timeoutValues = [];
  const events = [];
  const envelope = (operation, content) => (
    `<soap:Envelope><soap:Body><${operation}Response><${operation}Result>${content}</${operation}Result></${operation}Response></soap:Body></soap:Envelope>`
  );
  try {
    globalThis.fetch = async (_url, init) => {
      const operation = String(init.headers.SOAPAction).match(/\/([^/"]+)"$/u)?.[1];
      events.push(operation);
      if (operation === 'UserAuthenticationJWT') {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return new Response(envelope(operation, '<jwt>test-jwt</jwt><refresh_token>next-token</refresh_token><public_certificate>next-certificate</public_certificate>'));
      }
      if (operation === 'GetClientsList') return new Response(envelope(operation, '<id>123</id>'));
      if (operation === 'GetAccountsList') return new Response(envelope(operation, '<id>account-1</id>'));
      if (operation === 'GetPaymentsList') return new Response(envelope(operation, '<payments>{&quot;payments&quot;:[]}</payments>'));
      throw new Error(`Unexpected operation: ${operation}`);
    };

    const payments = await fetchNovaPayPayments({
      dateFrom: '2026-11-01',
      dateTo: '2026-11-02',
      env: {
        NOVAPAY_LOGIN: 'api-user',
        NOVAPAY_REFRESH_TOKEN_V2: 'initial-token',
        NOVAPAY_PUBLIC_CERTIFICATE_V2: 'initial-certificate'
      },
      timeoutFactory: (milliseconds) => {
        timeoutValues.push(milliseconds);
        return new AbortController().signal;
      },
      onAuthenticationAttemptStart: async () => { events.push('attempt'); },
      onCredentialsRotated: async () => { events.push('rotated'); }
    });

    assert.deepEqual(payments, []);
    assert.deepEqual(timeoutValues, [
      NOVAPAY_AUTH_TIMEOUT_MS,
      NOVAPAY_READ_TIMEOUT_MS,
      NOVAPAY_READ_TIMEOUT_MS,
      NOVAPAY_READ_TIMEOUT_MS
    ]);
    assert.deepEqual(events, [
      'attempt',
      'UserAuthenticationJWT',
      'rotated',
      'GetClientsList',
      'GetAccountsList',
      'GetPaymentsList'
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('does not treat an authentication transport timeout as safe to retry', async () => {
  const originalFetch = globalThis.fetch;
  let started = 0;
  let rotated = 0;
  try {
    globalThis.fetch = async () => {
      const error = new Error('Timed out');
      error.name = 'TimeoutError';
      throw error;
    };

    await assert.rejects(
      () => fetchNovaPayPayments({
        env: {
          NOVAPAY_LOGIN: 'api-user',
          NOVAPAY_REFRESH_TOKEN_V2: 'initial-token',
          NOVAPAY_PUBLIC_CERTIFICATE_V2: 'initial-certificate'
        },
        onAuthenticationAttemptStart: async () => { started += 1; },
        onCredentialsRotated: async () => { rotated += 1; }
      }),
      (error) => error?.code === 'novapay_auth_outcome_unknown'
    );
    assert.equal(started, 1);
    assert.equal(rotated, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
