import test from 'node:test';
import assert from 'node:assert/strict';
import { findNovaPayPaymentForOrder, isNovaPayConfigured, normalizeNovaPayPayments } from '../netlify/lib/novapay-client.js';

test('accepts a NovaPay login with accidental outer whitespace', () => {
  assert.equal(isNovaPayConfigured({
    NOVAPAY_LOGIN: '  api-user  ',
    NOVAPAY_REFRESH_TOKEN: 'refresh-token',
    NOVAPAY_PUBLIC_CERTIFICATE: 'public-certificate'
  }), true);
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
