import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { formatNumber, formatPrice, getProductPricing, normalizeProduct, normalizeProducts } from '../app/utils/format.js';

test('missing or malformed prices remain unavailable instead of becoming zero', () => {
  for (const value of [null, undefined, '', 'not-a-price', NaN, Infinity, -Infinity]) {
    assert.equal(formatPrice(value), '—');
    assert.equal(normalizeProduct({ id: 1, price: value }).price, null);
    assert.equal(getProductPricing({ price: value }).priceNow, null);
  }
});

test('valid numbers and numeric strings format normally', () => {
  assert.equal(formatPrice(2490), '2,490');
  assert.equal(formatNumber('1200'), '1,200');
  assert.equal(getProductPricing({ price: '2490', sale_price: '1790' }).formattedCurrent, '1,790');
});

test('malformed product arrays are isolated and numeric metadata is bounded', () => {
  const normalized = normalizeProducts([
    null,
    'not a product',
    { id: 1, price: 100, rating: 8, reviews: -3, stock: 'NaN' },
    { id: 2, price: 150, rating: '4.5', reviews: '12', stock: '2' },
  ]);

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].rating, null);
  assert.equal(normalized[0].reviews, 0);
  assert.equal(normalized[0].stock, null);
  assert.equal(normalized[1].rating, 4.5);
  assert.equal(normalized[1].reviews, 12);
  assert.equal(normalized[1].stock, 2);
});

test('showcase fallback serves catalog data and refuses customer records and writes', async () => {
  process.env.VERCEL = '1';
  const require = createRequire(import.meta.url);
  const db = require('../src/database/connection.js');

  assert.equal(db.isFallback, true);
  const products = await db.all('SELECT * FROM products WHERE active = 1');
  assert.ok(products.length > 0);
  await assert.rejects(db.get("SELECT * FROM users WHERE role = 'admin' LIMIT 1"), /Persistent database required/);
  await assert.rejects(db.run('INSERT INTO orders (name) VALUES (?)', ['Customer']), /persistent PostgreSQL/);
});
