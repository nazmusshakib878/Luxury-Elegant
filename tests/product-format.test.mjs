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
  assert.equal(products.length, 16);
  const categories = await db.all('SELECT * FROM categories ORDER BY id ASC');
  assert.equal(categories.length, 4);
  const beautyById = await db.all(
    'SELECT p.*, c.name AS cat FROM products p LEFT JOIN categories c ON c.id = p.cat_id WHERE p.active = 1 AND p.cat_id = ? ORDER BY p.id DESC',
    [4]
  );
  assert.equal(beautyById.length, 3);
  assert.equal(beautyById.every((product) => Number(product.cat_id) === 4), true);
  const storefrontQuery = await db.all(`
    SELECT p.*, c.name AS cat,
      (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = p.id) AS rating,
      (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS reviews
    FROM products p LEFT JOIN categories c ON c.id = p.cat_id WHERE p.active = 1
  `);
  assert.equal(storefrontQuery.length, 16);
  assert.deepEqual(await db.all('SELECT id, product_id, size, color, sku, price, stock, active FROM product_variants WHERE product_id = ?', [storefrontQuery[0].id]), []);
  await assert.rejects(db.get("SELECT * FROM users WHERE role = 'admin' LIMIT 1"), /Persistent database required/);
  await assert.rejects(db.run('INSERT INTO orders (name) VALUES (?)', ['Customer']), /persistent PostgreSQL/);
});
