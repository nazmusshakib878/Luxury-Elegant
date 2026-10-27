import { createRequire } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const { hashOrderRequest, isValidIdempotencyKey } = require('../src/utils/order-idempotency.js');

test('order request keys must be UUIDs', () => {
  assert.equal(isValidIdempotencyKey('d9428888-122b-4a74-8b51-3f3e2a1c9052'), true);
  assert.equal(isValidIdempotencyKey('not-a-key'), false);
  assert.equal(isValidIdempotencyKey(''), false);
});

test('order request fingerprints ignore item order but change with checkout details', () => {
  const checkout = {
    name: '  Customer  ',
    phone: '01712345678',
    address: '  Road 1  ',
    area: 'dhaka',
    coupon: 'welcome10',
  };
  const first = hashOrderRequest({ ...checkout, items: [{ id: 2, qty: 1 }, { id: 1, qty: 2 }] });
  const same = hashOrderRequest({ ...checkout, name: 'Customer', address: 'Road 1', coupon: 'WELCOME10', items: [{ id: 1, qty: 2 }, { id: 2, qty: 1 }] });
  const changed = hashOrderRequest({ ...checkout, items: [{ id: 1, qty: 3 }, { id: 2, qty: 1 }] });

  assert.equal(first, same);
  assert.notEqual(first, changed);
});
