import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';

const dir = mkdtempSync(path.join(os.tmpdir(), 'luxury-review-'));
process.env.DB = path.join(dir, 'shop.db');
delete process.env.VERCEL;
delete process.env.AWS_LAMBDA_FUNCTION_NAME;
const require = createRequire(import.meta.url);
function loadRoute() {
  const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../app/api/products/[id]/reviews/route.js');
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const source = require('node:fs').readFileSync(filename, 'utf8')
    .replace("import { NextResponse } from 'next/server';", "const { NextResponse } = require('next/server.js');")
    .replace(/export async function (GET|POST)\(/g, 'async function $1(');
  mod._compile(`${source}\nmodule.exports = { GET, POST };`, filename);
  return mod.exports;
}

const db = require('../src/database/connection.js');
const { initSchema } = require('../src/database/schema.js');
const reviews = loadRoute();
const context = (id) => ({ params: Promise.resolve({ id: String(id) }) });
const post = (body, id = 99101) => reviews.POST(new Request(`http://localhost/api/products/${id}/reviews`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}), context(id));

test('PostgreSQL reviews require a delivered matching order and remain duplicate protected', async () => {
  try {
    await initSchema();
    await db.run("INSERT INTO products (id,name,price,stock,active) VALUES (99101,'Review fixture',100,2,1)");
    const orderItems = JSON.stringify([{ id: 99101, qty: 1, price: 100 }]);
    await db.run("INSERT INTO orders (id,name,phone,address,area,items,subtotal,discount,shipping,total,method,status) VALUES (99101,'Review Buyer','01712345678','Fixture Road','dhaka',?,100,0,0,100,'cod','delivered')", [orderItems]);
    await db.run("INSERT INTO orders (id,name,phone,address,area,items,subtotal,discount,shipping,total,method,status) VALUES (99102,'Review Buyer','01712345678','Fixture Road','dhaka',?,100,0,0,100,'cod','confirmed')", [orderItems]);

    assert.equal((await post({ rating: 5, comment: 'Great', order_id: 99101, phone: '01700000000' })).status, 404, 'phone mismatch is rejected');
    assert.equal((await post({ rating: 5, comment: 'Great', order_id: 99102, phone: '01712345678' })).status, 409, 'undelivered orders cannot review');
    assert.equal((await post({ rating: 5, comment: 'Great', order_id: 99101, phone: '01712345678' }, 99102)).status, 403, 'order must contain the reviewed product');

    const created = await post({ rating: 5, comment: 'Great', order_id: 99101, phone: '01712345678' });
    assert.equal(created.status, 200);
    assert.equal((await post({ rating: 5, comment: 'Duplicate', order_id: 99101, phone: '01712345678' })).status, 409);
    const listed = await reviews.GET(new Request('http://localhost/api/products/99101/reviews'), context(99101));
    const result = await listed.json();
    assert.equal(listed.status, 200);
    assert.equal(result.length, 1);
    assert.equal(result[0].verified_purchase, 1);
  } finally {
    await db.pool?.end?.();
    try { db.sqlite?.close(); } catch {}
    rmSync(dir, { recursive: true, force: true });
  }
});
