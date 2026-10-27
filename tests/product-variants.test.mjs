import { createRequire } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { sameCartLine } from '../src/utils/cart-identity.mjs';

const require = createRequire(import.meta.url);
const { hashOrderRequest } = require('../src/utils/order-idempotency.js');

test('variant selections remain distinct in duplicate checkout fingerprints', () => {
  const input = { name: 'A', phone: '01712345678', address: 'Road', area: 'dhaka' };
  assert.notEqual(
    hashOrderRequest({ ...input, items: [{ id: 9, qty: 1, variant_id: 101 }] }),
    hashOrderRequest({ ...input, items: [{ id: 9, qty: 1, variant_id: 102 }] }),
  );
});

test('legacy cart lines without a variant keep the same fingerprint shape', () => {
  const input = { name: 'A', phone: '01712345678', address: 'Road', items: [{ id: 9, qty: 1 }] };
  assert.equal(hashOrderRequest(input), hashOrderRequest({ ...input, items: [{ id: 9, qty: 1, variant_id: null }] }));
});

test('cart identity isolates product variants and keeps legacy product lines compatible', () => {
  assert.equal(sameCartLine({ id: 7, variant_id: 12 }, 7, 12), true);
  assert.equal(sameCartLine({ id: 7, variant: { id: 13 } }, 7, 13), true);
  assert.equal(sameCartLine({ id: 7, variant_id: 12 }, 7, 13), false);
  assert.equal(sameCartLine({ id: 7 }, 7, null), true);
  assert.equal(sameCartLine({ id: 8 }, 7, null), false);
});

test('variant reservations are atomic under concurrent checkout and restoration applies once', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'luxury-inventory-test-'));
  process.env.DB = path.join(dir, 'inventory.db');
  delete process.env.VERCEL;
  delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  const db = require('../src/database/connection.js');
  const { reserveVariantStock, restoreOrderLine } = require('../src/services/inventory.js');
  try {
    await db.exec('CREATE TABLE products (id INTEGER PRIMARY KEY, stock INTEGER NOT NULL)');
    await db.exec('CREATE TABLE product_variants (id INTEGER PRIMARY KEY, stock INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1)');
    await db.exec('CREATE TABLE order_stock_restorations (order_id INTEGER NOT NULL, line_key TEXT NOT NULL, PRIMARY KEY(order_id, line_key))');
    await db.exec('INSERT INTO products VALUES (1, 5)');
    await db.exec('INSERT INTO product_variants VALUES (11, 1, 1)');
    const attempts = await Promise.allSettled([1, 2].map(() => db.transaction((tx) => reserveVariantStock(tx, 11, 1))));
    assert.equal(attempts.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = 11')).stock, 0);
    const details = { orderId: 9, lineKey: 'variant:11', variantId: 11, productId: 1, quantity: 1 };
    assert.equal(await db.transaction((tx) => restoreOrderLine(tx, details)), true);
    assert.equal(await db.transaction((tx) => restoreOrderLine(tx, details)), false);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = 11')).stock, 1);
  } finally {
    db.sqlite?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
