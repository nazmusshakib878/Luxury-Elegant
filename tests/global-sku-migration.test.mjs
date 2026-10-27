import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(os.tmpdir(), 'luxury-sku-migration-'));
process.env.DB = path.join(dir, 'legacy.db');
delete process.env.VERCEL;
delete process.env.AWS_LAMBDA_FUNCTION_NAME;
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const legacy = new Database(process.env.DB);
legacy.exec(`
  CREATE TABLE products (id INTEGER PRIMARY KEY, sku TEXT, name TEXT, cat_id INTEGER, price REAL, sale_price REAL, stock INTEGER DEFAULT 0, image TEXT, description TEXT, variants TEXT DEFAULT '{}', flash_end TEXT, active INTEGER DEFAULT 1);
  CREATE TABLE product_variants (id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL, size TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '', sku TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created TEXT DEFAULT CURRENT_TIMESTAMP);
  INSERT INTO products (id, sku, name, price, stock) VALUES (100001, 'Legacy-Race', 'Legacy one', 100, 7), (100002, 'legacy-race', 'Legacy two', 200, 8), (100003, 'LEGACY-RACE', 'Legacy three', 300, 9);
  INSERT INTO product_variants (id, product_id, size, color, sku, price, stock) VALUES (100011, 100001, 'M', 'Gold', 'LEGACY-RACE', 120, 3);
`);
legacy.close();

const db = require('../src/database/connection.js');
const { initSchema } = require('../src/database/schema.js');

after(() => { db.sqlite?.close(); rmSync(dir, { recursive: true, force: true }); });

test('migration retains and reports existing cross-table SKU conflicts, blocks new claims, and permits safe resolution', async () => {
  await initSchema();
  assert.equal(Number((await db.get("SELECT COUNT(*) AS count FROM products WHERE id IN (100001, 100002, 100003)")).count), 3);
  assert.equal(Number((await db.get('SELECT COUNT(*) AS count FROM product_variants WHERE id = 100011')).count), 1);
  assert.equal(Number((await db.get("SELECT COUNT(*) AS count FROM inventory_sku_conflicts WHERE sku_key = 'LEGACY-RACE'")).count), 3);
  assert.equal((await db.get("SELECT owner_type FROM inventory_skus WHERE sku_key = 'LEGACY-RACE'")).owner_type, 'legacy_conflict');

  await assert.rejects(db.run("INSERT INTO products (id, sku, name, price) VALUES (100004, 'legacy-Race', 'New duplicate', 100)"), /SKU already assigned globally|unique constraint/i);
  assert.equal(Number((await db.get('SELECT COUNT(*) AS count FROM products WHERE id IN (100001, 100002, 100003)')).count), 3);

  await db.run("UPDATE products SET sku = 'LEGACY-ONE' WHERE id = 100001");
  await db.run("UPDATE products SET sku = 'LEGACY-TWO' WHERE id = 100002");
  await db.run("UPDATE products SET sku = 'LEGACY-THREE' WHERE id = 100003");
  await db.run("UPDATE product_variants SET sku = 'LEGACY-VARIANT' WHERE id = 100011");
  assert.equal(await db.get("SELECT sku_key FROM inventory_skus WHERE sku_key = 'LEGACY-RACE'"), undefined);
  assert.equal(Number((await db.get('SELECT COUNT(*) AS count FROM products WHERE id IN (100001, 100002, 100003)')).count), 3);
  assert.equal(Number((await db.get('SELECT COUNT(*) AS count FROM product_variants WHERE id = 100011')).count), 1);
  await db.run("INSERT INTO product_variants (product_id, size, color, sku, price, stock) VALUES (100001, 'S', 'Black', 'LEGACY-RACE', 130, 1)");
});
