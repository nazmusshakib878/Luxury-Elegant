import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';

const temp = mkdtempSync(path.join(os.tmpdir(), 'luxury-delivery-'));
process.env.DB = path.join(temp, 'delivery.db'); delete process.env.VERCEL; delete process.env.AWS_LAMBDA_FUNCTION_NAME;
for (const name of ['EMAIL_PROVIDER_URL','EMAIL_PROVIDER_TOKEN','SMS_PROVIDER_URL','SMS_PROVIDER_TOKEN','NOTIFY_WEBHOOK']) process.env[name] = '';
const require = createRequire(import.meta.url);
function load(relative, methods) {
  const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), relative), mod = new Module(filename);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const source = require('node:fs').readFileSync(filename, 'utf8').replace("import { NextResponse } from 'next/server';", "const { NextResponse } = require('next/server.js');").replace(/export async function (GET|POST|PUT|PATCH|DELETE)\(/g, 'async function $1(') + `\nmodule.exports = { ${methods.join(', ')} };`;
  mod._compile(source, filename); return mod.exports;
}
const db = require('../src/database/connection.js'), { initSchema } = require('../src/database/schema.js');
const { generateToken } = require('../src/utils/security.js');
const courier = load('../app/api/admin/courier/route.js', ['GET','POST','PATCH']);
const track = load('../app/api/track/route.js', ['GET']);
const admin = generateToken({ id: 1, role: 'admin', name: 'Test Admin' });
const request = (handler, url, method = 'GET', body = {}, headers = {}, context = undefined) => handler(new Request(`http://localhost${url}`, { method, headers: { 'Content-Type': 'application/json', ...headers }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) }), context);

test('courier booking is idempotent, tracking is private, and notification failures remain retryable', async () => {
  try {
    await initSchema();
    await db.run("INSERT INTO orders (id,user_id,name,phone,address,area,items,subtotal,discount,shipping,total,method,status) VALUES (8701,NULL,'Guest','01712345678','Private Road','dhaka','[]',500,0,0,500,'cod','confirmed')");
    const headers = { Authorization: `Bearer ${admin}`, Origin: 'http://localhost' };
    const first = await request(courier.POST, '/api/admin/courier', 'POST', { order_id: 8701, provider: 'steadfast', tracking_id: 'manual-ref-1' }, headers);
    assert.equal(first.status, 201);
    const firstData = await first.json();
    assert.equal(firstData.live_booking_enabled, false);
    assert.equal(firstData.shipment.status, 'manual_required');
    const duplicate = await request(courier.POST, '/api/admin/courier', 'POST', { order_id: 8701, provider: 'steadfast' }, headers);
    assert.equal((await duplicate.json()).shipment.id, firstData.shipment.id);
    assert.equal((await db.get('SELECT COUNT(*) AS count FROM courier_shipments WHERE order_id = 8701')).count, 1);

    const guestToken = crypto.randomBytes(32).toString('hex');
    await db.run("INSERT INTO orders (id,name,phone,address,area,items,subtotal,discount,shipping,total,method,status,guest_access_token_hash,guest_access_token_expires) VALUES (8702,'Guest','01712345678','Private Road','dhaka','[]',500,0,0,500,'cod','shipped',?,?)", [crypto.createHash('sha256').update(guestToken).digest('hex'), new Date(Date.now() + 60000).toISOString()]);
    const allowed = await request(track.GET, '/api/track?id=8702', 'GET', {}, { 'X-Guest-Order-Token': guestToken });
    assert.equal(allowed.status, 200);
    assert.equal((await request(track.GET, '/api/track?id=8702&phone=01712345678')).status, 404, 'phone alone never grants tracking access');
    assert.equal((await request(track.GET, '/api/track?id=8702', 'GET', {}, { 'X-Guest-Order-Token': '0'.repeat(64) })).status, 404);

    const completed = await request(courier.PATCH, '/api/admin/courier', 'PATCH', { id: firstData.shipment.id, status: 'delivered' }, headers);
    assert.equal(completed.status, 200);
    assert.equal((await db.get('SELECT status FROM orders WHERE id = 8701')).status, 'delivered');
    assert.ok(await db.get("SELECT id FROM notification_outbox WHERE event_key = 'order_delivered:8701:admin'"));

    await db.run("INSERT INTO notification_outbox (event_key,order_id,channel,event_type,payload,status,available_at) VALUES ('test-failed-email',8701,'email','order_delivered','{}','pending',CURRENT_TIMESTAMP)");
    const { deliverOutboxBatch } = require('../src/services/notification-outbox.js');
    const result = await deliverOutboxBatch();
    assert.ok(result.claimed >= 1);
    const failed = await db.get("SELECT status, attempts, last_error FROM notification_outbox WHERE event_key = 'test-failed-email'");
    assert.equal(failed.status, 'failed'); assert.equal(failed.attempts, 1); assert.match(failed.last_error, /HTTPS notification provider/i);

    const { enqueueOrderEvent } = require('../src/services/notification-outbox.js');
    await db.transaction(async tx => {
      await enqueueOrderEvent(tx, { order: { id: 8701, user_id: null, total: 500, status: 'delivered' }, eventType: 'order_delivered' });
      await enqueueOrderEvent(tx, { order: { id: 8701, user_id: null, total: 500, status: 'delivered' }, eventType: 'order_delivered' });
    });
    assert.equal((await db.get("SELECT COUNT(*) AS count FROM notification_outbox WHERE event_key = 'order_delivered:8701:admin'")).count, 1, 'event uniqueness prevents duplicates');

    process.env.EMAIL_PROVIDER_URL = 'https://mail-provider.invalid/send'; process.env.EMAIL_PROVIDER_TOKEN = 'test-only-token';
    delete require.cache[require.resolve('../src/config/env.js')];
    delete require.cache[require.resolve('../src/services/notification-outbox.js')];
    const oldFetch = globalThis.fetch;
    let sends = 0; globalThis.fetch = async (_url, options) => { sends++; assert.match(options.headers['Idempotency-Key'], /^test-failed-email$/); return { ok: true, status: 202 }; };
    try {
      await db.run("UPDATE notification_outbox SET status = 'pending', attempts = 0, available_at = CURRENT_TIMESTAMP WHERE event_key = 'test-failed-email'");
      const configuredSender = require('../src/services/notification-outbox.js');
      assert.equal((await configuredSender.deliverOutboxBatch()).delivered, 1);
      assert.equal((await db.get("SELECT status FROM notification_outbox WHERE event_key = 'test-failed-email'")).status, 'sent');
      assert.equal(sends, 1);
    } finally { globalThis.fetch = oldFetch; }
  } finally { await db.pool?.end?.(); try { db.sqlite?.close(); } catch {} rmSync(temp, { recursive: true, force: true }); }
});
