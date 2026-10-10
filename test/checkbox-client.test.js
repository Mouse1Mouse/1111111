import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertCheckboxLiveConfig,
  buildCheckboxSalePayload,
  getCheckboxConfig,
  isCheckboxConfigured
} from '../netlify/lib/checkbox-client.js';

test('Checkbox stays disabled until explicitly enabled and configured', () => {
  const env = {
    CHECKBOX_CASHIER_PIN: '1234567890',
    CHECKBOX_LICENSE_KEY: 'license-key'
  };
  const config = getCheckboxConfig(env);
  assert.equal(config.enabled, false);
  assert.equal(isCheckboxConfigured(env), true);
  assert.throws(() => assertCheckboxLiveConfig(env), /disabled/);
});

test('builds a cashless Checkbox receipt with an explicit partial-payment discount', () => {
  const receipt = buildCheckboxSalePayload({
    receiptId: 'f8b67e1e-54d7-4b0d-9e99-0de3de7c3cec',
    orderId: 'MIVA-TEST-1',
    paymentAmount: 1450,
    customer: { phone: '+380671234567' },
    items: [{ sku: 'MIVA-BED-200', name: 'Комплект постільної білизни', quantity: 1, unitPrice: 1650 }]
  });
  assert.equal(receipt.payments[0].value, 145000);
  assert.equal(receipt.goods[0].good.price, 165000);
  assert.deepEqual(receipt.discounts, [{
    type: 'DISCOUNT', mode: 'VALUE', value: 20000, name: 'Часткова оплата'
  }]);
});
