import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseNovaPayApiCredentials,
  serializeNovaPayApiCredentials
} from '../netlify/lib/order-store.js';

test('serializes the NovaPay credential epoch with each rotated pair', () => {
  const value = serializeNovaPayApiCredentials({
    refreshToken: 'rotated-token',
    publicCertificate: 'rotated-certificate',
    sourceVersion: 'jwt-rotation-v3-serialized',
    credentialEpoch: 'epoch-2026-10-22'
  }, '2026-10-22T12:00:00.000Z');

  const expected = {
    refreshToken: 'rotated-token',
    publicCertificate: 'rotated-certificate',
    sourceVersion: 'jwt-rotation-v3-serialized',
    credentialEpoch: 'epoch-2026-10-22',
    rotatedAt: '2026-10-22T12:00:00.000Z'
  };

  assert.deepEqual(value, expected);
  assert.deepEqual(parseNovaPayApiCredentials(JSON.stringify(value)), expected);
});
