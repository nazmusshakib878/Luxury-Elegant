import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';

const dir = mkdtempSync(path.join(os.tmpdir(), 'luxury-http-variant-'));
process.env.DB = path.join(dir, 'shop.db');
delete process.env.VERCEL;
delete process.env.AWS_LAMBDA_FUNCTION_NAME;
const require = createRequire(import.meta.url);

function loadRoute(relativePath, methods) {
  const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), relativePath);
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  let source = require('node:fs').readFileSync(filename, 'utf8')
    .replace("import { NextResponse } from 'next/server';", "const { NextResponse } = require('next/server.js');")
    .replace(/export async function (GET|POST|PUT|DELETE)\(/g, 'async function $1(');
  source += `\nmodule.exports = { ${methods.join(', ')} };\n`;
  mod._compile(source, filename);
  return mod.exports;
}

const db = require('../src/database/connection.js');
const { initSchema } = require('../src/database/schema.js');
const { generateToken } = require('../src/utils/security.js');
const checkout = loadRoute('../app/api/orders/route.js', ['POST']);
const orderStatus = loadRoute('../app/api/orders/[id]/route.js', ['PUT']);
const variantsAdmin = loadRoute('../app/api/admin/products/[id]/variants/route.js', ['POST', 'PUT', 'DELETE']);
const productsAdmin = loadRoute('../app/api/products/route.js', ['POST']);
const productCatalog = loadRoute('../app/api/products/route.js', ['GET']);
const adminStats = loadRoute('../app/api/admin/stats/route.js', ['GET']);
const admin = generateToken({ id: 1, role: 'admin', name: 'Test Admin' });
let keyIndex = 0;
const key = () => `d9428888-122b-4a74-8b51-${String(++keyIndex).padStart(12, '0')}`;
const cartBody = (items) => ({ name: 'Test Buyer', phone: '01712345678', address: 'Test Road', area: 'dhaka', items, method: 'cod' });
const http = async (handler, url, body, headers = {}, context = undefined) => handler(new Request(`http://localhost${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost', ...headers }, body: JSON.stringify(body) }), context);
const checkoutRequest = (items, idempotencyKey = key()) => http(checkout.POST, '/api/orders', cartBody(items), { 'Idempotency-Key': idempotencyKey });

test('HTTP variant checkout, SKU management, idempotency, stock restore, rollback, and legacy lines', async () => {
  try {
    await initSchema();
    await db.run("INSERT INTO products (id, name, price, stock, active) VALUES (9001, 'Coat', 100, 20, 1), (9002, 'Legacy item', 70, 5, 1)");
    await db.run("INSERT INTO product_variants (id, product_id, size, color, sku, price, stock) VALUES (9011, 9001, 'S', 'Ivory', 'COAT-S-I', 120, 2), (9012, 9001, 'M', 'Onyx', 'COAT-M-O', 200, 3), (9013, 9001, 'L', 'Ruby', 'COAT-L-R', 180, 0)");

    const valid = await checkoutRequest([{ id: 9001, variant_id: 9011, qty: 1, price: 0.01 }, { id: 9001, variant_id: 9012, qty: 1, price: 999999 }]);
    if (valid.status !== 200) assert.fail(JSON.stringify(await valid.clone().json()));
    assert.equal(valid.status, 200);
    const validBody = await valid.json();
    assert.equal(validBody.subtotal, 320, 'server price replaces all client-supplied prices');
    const stored = await db.get('SELECT items FROM orders WHERE id = ?', [validBody.order_id]);
    const storedLines = JSON.parse(stored.items);
    assert.deepEqual(storedLines.map((line) => line.price), [120, 200]);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = 9011')).stock, 1);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = 9012')).stock, 2);

    const soldOut = await checkoutRequest([{ id: 9001, variant_id: 9013, qty: 1 }]);
    assert.equal(soldOut.status, 409);
    const variantless = await checkoutRequest([{ id: 9001, qty: 1 }]);
    assert.equal(variantless.status, 409, 'variant products cannot bypass options on legacy/listing cart paths');
    const wrongProductVariant = await checkoutRequest([{ id: 9002, variant_id: 9011, qty: 1 }]);
    assert.equal(wrongProductVariant.status, 409);
    const missingProduct = await checkoutRequest([{ id: 999999, variant_id: 9011, qty: 1 }]);
    assert.equal(missingProduct.status, 400);

    const replayKey = key();
    const replayFirst = await checkoutRequest([{ id: 9001, variant_id: 9011, qty: 1 }], replayKey);
    const replayBody = await replayFirst.json();
    const replaySecond = await checkoutRequest([{ id: 9001, variant_id: 9011, qty: 1 }], replayKey);
    assert.equal(replaySecond.status, 200);
    assert.equal((await replaySecond.json()).order_id, replayBody.order_id);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = 9011')).stock, 0);
    const changedReplay = await checkoutRequest([{ id: 9001, variant_id: 9012, qty: 1 }], replayKey);
    assert.equal(changedReplay.status, 409);

    const concurrentReplayKey = key();
    const sameRequestRace = await Promise.all([
      checkoutRequest([{ id: 9001, variant_id: 9012, qty: 1 }], concurrentReplayKey),
      checkoutRequest([{ id: 9001, variant_id: 9012, qty: 1 }], concurrentReplayKey),
    ]);
    assert.deepEqual(sameRequestRace.map((response) => response.status), [200, 200]);
    assert.equal((await sameRequestRace[0].json()).order_id, (await sameRequestRace[1].json()).order_id);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = 9012')).stock, 1, 'racing duplicate idempotency keys reserve once');

    const race = await Promise.all([
      checkoutRequest([{ id: 9001, variant_id: 9012, qty: 2 }]),
      checkoutRequest([{ id: 9001, variant_id: 9012, qty: 1 }]),
    ]);
    assert.deepEqual(race.map((response) => response.status).sort(), [200, 409]);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = 9012')).stock, 0);

    await db.run('UPDATE product_variants SET stock = 5 WHERE id IN (9011, 9012)');

    const adminHeaders = { Authorization: `Bearer ${admin}` };
    const duplicateLines = await checkoutRequest([{ id: 9001, variant_id: 9011, qty: 1 }, { id: 9001, variant_id: 9011, qty: 1 }]);
    assert.equal(duplicateLines.status, 200, 'aggregated stock accepts a quantity within available stock');
    const duplicateLinesId = (await duplicateLines.json()).order_id;
    const cancelDuplicateLines = () => orderStatus.PUT(new Request(`http://localhost/api/orders/${duplicateLinesId}`, { method: 'PUT', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) }), { params: Promise.resolve({ id: String(duplicateLinesId) }) });
    assert.equal((await cancelDuplicateLines()).status, 200);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = 9011')).stock, 5, 'duplicate cart lines each restore once');

    const productContext = { params: Promise.resolve({ id: '9001' }) };
    const invalidSku = await http(variantsAdmin.POST, '/api/admin/products/9001/variants', { size: 'XL', color: 'Gold', sku: 'x', price: 250, stock: 1 }, adminHeaders, productContext);
    assert.equal(invalidSku.status, 400);
    const addVariant = await http(variantsAdmin.POST, '/api/admin/products/9001/variants', { size: 'XL', color: 'Gold', sku: 'COAT-XL-G', price: 250, stock: 4 }, adminHeaders, productContext);
    assert.equal(addVariant.status, 200);
    assert.ok(Number.isSafeInteger((await addVariant.json()).id), 'PostgreSQL returns the newly created variant ID');
    const duplicateAcrossTypes = await http(productsAdmin.POST, '/api/products', { name: 'Collision', sku: 'coat-xl-g', price: 400, stock: 1 }, adminHeaders);
    assert.equal(duplicateAcrossTypes.status, 409);
    const globalRace = await Promise.all([
      http(productsAdmin.POST, '/api/products', { name: 'SKU race product', sku: 'SHARED-RACE-SKU', price: 400, stock: 1 }, adminHeaders),
      http(variantsAdmin.POST, '/api/admin/products/9001/variants', { size: 'XXS', color: 'Silver', sku: 'shared-race-sku', price: 250, stock: 1 }, adminHeaders, productContext),
    ]);
    assert.deepEqual(globalRace.map((response) => response.status).sort(), [200, 409], 'global SKU registry is unique under concurrent product and variant creates');
    assert.equal(Number((await db.get("SELECT (SELECT COUNT(*) FROM products WHERE UPPER(sku) = 'SHARED-RACE-SKU') + (SELECT COUNT(*) FROM product_variants WHERE UPPER(sku) = 'SHARED-RACE-SKU') AS count")).count), 1);
    const variant = await db.get("SELECT id FROM product_variants WHERE sku = 'COAT-XL-G'");
    const edit = await http(variantsAdmin.PUT, `/api/admin/products/9001/variants?variantId=${variant.id}`, { size: 'XXL', color: 'Gold', sku: 'COAT-XXL-G', price: 260, stock: 6, active: true }, adminHeaders, productContext);
    assert.equal(edit.status, 200);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = ?', [variant.id])).stock, 6);
    const remove = await http(variantsAdmin.DELETE, `/api/admin/products/9001/variants?variantId=${variant.id}`, {}, adminHeaders, productContext);
    assert.equal(remove.status, 200);

    const mixedOrder = await checkoutRequest([{ id: 9001, variant_id: 9011, qty: 1 }, { id: 9001, variant_id: 9012, qty: 1 }]);
    const mixedBody = await mixedOrder.json();
    assert.equal(mixedOrder.status, 200);
    const cancel = () => orderStatus.PUT(new Request(`http://localhost/api/orders/${mixedBody.order_id}`, { method: 'PUT', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) }), { params: Promise.resolve({ id: String(mixedBody.order_id) }) });
    assert.equal((await cancel()).status, 200);
    assert.equal((await cancel()).status, 200);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = 9011')).stock, 5);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = 9012')).stock, 5);

    const legacyCheckout = await checkoutRequest([{ id: 9002, qty: 1 }]);
    assert.equal(legacyCheckout.status, 200, 'variantless products retain the old checkout contract');
    const legacyCheckoutId = (await legacyCheckout.json()).order_id;
    const cancelLegacyCheckout = await orderStatus.PUT(new Request(`http://localhost/api/orders/${legacyCheckoutId}`, { method: 'PUT', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) }), { params: Promise.resolve({ id: String(legacyCheckoutId) }) });
    assert.equal(cancelLegacyCheckout.status, 200);

    const catalogResponse = await productCatalog.GET(new Request('http://localhost/api/products'));
    assert.equal(catalogResponse.status, 200);
    const coat = (await catalogResponse.json()).find((product) => Number(product.id) === 9001);
    assert.equal(coat.has_variants, true);
    const variantStock = await db.get('SELECT COALESCE(SUM(stock), 0) AS stock FROM product_variants WHERE product_id = 9001 AND active = 1');
    assert.equal(coat.stock, Number(variantStock.stock), 'catalog availability reflects active variant stock aggregate');
    const statsResponse = await adminStats.GET(new Request('http://localhost/api/admin/stats', { headers: adminHeaders }));
    assert.equal(statsResponse.status, 200);
    assert.ok((await statsResponse.json()).lowStock.some((row) => row.type === 'variant' && Number(row.stock) === 0));

    const duplicateLinesOrder = await checkoutRequest([{ id: 9001, variant_id: 9012, qty: 1 }, { id: 9001, variant_id: 9012, qty: 1 }]);
    assert.equal(duplicateLinesOrder.status, 200);
    const duplicateOrderId = (await duplicateLinesOrder.json()).order_id;
    if (db.isPostgres) {
      await db.exec("CREATE OR REPLACE FUNCTION fail_restoration() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'restore failure'; END $$");
      await db.exec('CREATE TRIGGER fail_restoration BEFORE INSERT ON order_stock_restorations FOR EACH ROW EXECUTE FUNCTION fail_restoration()');
    } else {
      await db.run("CREATE TRIGGER fail_restoration BEFORE INSERT ON order_stock_restorations BEGIN SELECT RAISE(ABORT, 'restore failure'); END");
    }
    const failedRestore = await orderStatus.PUT(new Request(`http://localhost/api/orders/${duplicateOrderId}`, { method: 'PUT', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'returned' }) }), { params: Promise.resolve({ id: String(duplicateOrderId) }) });
    assert.equal(failedRestore.status, 500);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = 9012')).stock, 3, 'failed transaction restores no partial stock');
    assert.equal((await db.get('SELECT status FROM orders WHERE id = ?', [duplicateOrderId])).status, 'pending');
    if (db.isPostgres) {
      await db.exec('DROP TRIGGER fail_restoration ON order_stock_restorations');
      await db.exec('DROP FUNCTION fail_restoration()');
    } else {
      await db.exec('DROP TRIGGER fail_restoration');
    }
    const returned = () => orderStatus.PUT(new Request(`http://localhost/api/orders/${duplicateOrderId}`, { method: 'PUT', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'returned' }) }), { params: Promise.resolve({ id: String(duplicateOrderId) }) });
    assert.equal((await returned()).status, 200);
    assert.equal((await returned()).status, 200);
    const refunded = await orderStatus.PUT(new Request(`http://localhost/api/orders/${duplicateOrderId}`, { method: 'PUT', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'refunded' }) }), { params: Promise.resolve({ id: String(duplicateOrderId) }) });
    assert.equal(refunded.status, 200);
    assert.equal((await db.get('SELECT stock FROM product_variants WHERE id = 9012')).stock, 5, 'repeated terminal transitions restore all duplicate lines once');

    const legacy = await db.run("INSERT INTO orders (name, phone, address, area, items, subtotal, discount, shipping, total, method, status) VALUES ('Legacy', '01712345678', 'Test', 'dhaka', ?, 140, 0, 0, 140, 'cod', 'pending')", [JSON.stringify([{ id: 9002, qty: 2, price: 70 }])]);
    await db.run('UPDATE products SET stock = stock - 2 WHERE id = 9002');
    const legacyCancel = () => orderStatus.PUT(new Request(`http://localhost/api/orders/${legacy.lastInsertRowid}`, { method: 'PUT', headers: { ...adminHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) }), { params: Promise.resolve({ id: String(legacy.lastInsertRowid) }) });
    assert.equal((await legacyCancel()).status, 200);
    assert.equal((await legacyCancel()).status, 200);
    assert.equal((await db.get('SELECT stock FROM products WHERE id = 9002')).stock, 5);
  } finally {
    await db.pool?.end?.();
    db.sqlite?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
