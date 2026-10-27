import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';

const temp = mkdtempSync(path.join(os.tmpdir(), 'luxury-account-'));
process.env.DB = path.join(temp, 'account.db'); delete process.env.VERCEL; delete process.env.AWS_LAMBDA_FUNCTION_NAME;
const require = createRequire(import.meta.url);
function load(relative, methods) {
  const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), relative), mod = new Module(filename);
  mod.filename = filename; mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const source = require('node:fs').readFileSync(filename, 'utf8').replace("import { NextResponse } from 'next/server';", "const { NextResponse } = require('next/server.js');").replace(/export async function (GET|POST|PUT|PATCH|DELETE)\(/g, 'async function $1(') + `\nmodule.exports = { ${methods.join(', ')} };`;
  mod._compile(source, filename); return mod.exports;
}
const db = require('../src/database/connection.js'), { initSchema } = require('../src/database/schema.js');
const { hashPassword } = require('../src/utils/security.js');
const login = load('../app/api/auth/login/route.js', ['POST']), register = load('../app/api/auth/register/route.js', ['POST']);
const me = load('../app/api/auth/me/route.js', ['GET']), logout = load('../app/api/auth/logout/route.js', ['POST']);
const adminStats = load('../app/api/admin/stats/route.js', ['GET']);
const customerOrders = load('../app/api/account/orders/route.js', ['GET']), addresses = load('../app/api/account/addresses/route.js', ['GET', 'POST']);
const customerOrder = load('../app/api/account/orders/[id]/route.js', ['GET']);
const request = (handler, url, method = 'GET', body = {}, headers = {}, context = undefined) => handler(new Request(`http://localhost${url}`, { method, headers: { 'Content-Type': 'application/json', Origin: 'http://localhost', ...headers }, ...(method === 'GET' ? {} : { body: JSON.stringify(body) }) }), context);

test('customer registration/login creates cookie sessions distinct from admin bearer credentials', async () => {
  try {
    await initSchema();
    const testAdminEmail = `admin-${crypto.randomUUID()}@example.test`;
    const testAdminPassword = crypto.randomBytes(24).toString('base64url');
    await db.run("INSERT INTO users (name,email,pass,role) VALUES ('Disposable Test Admin',?,?, 'admin')", [testAdminEmail, hashPassword(testAdminPassword)]);
    const adminLogin = await request(login.POST, '/api/auth/login', 'POST', { email: testAdminEmail, password: testAdminPassword });
    assert.equal(adminLogin.status, 200, 'admin can authenticate with the stored password hash');
    const adminSession = await adminLogin.json();
    assert.equal(adminSession.user.isAdmin, true);
    const adminToken = adminSession.token;
    assert.equal((await request(adminStats.GET, '/api/admin/stats', 'GET', {}, { Authorization: `Bearer ${adminToken}` })).status, 200, 'admin token authorizes admin operations');
    const registered = await request(register.POST, '/api/auth/register', 'POST', { name: 'Customer One', email: 'one@example.test', phone: '01712345678', password: 'long-password-123' });
    assert.equal(registered.status, 200);
    const cookie = registered.headers.get('set-cookie');
    assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=lax/i);
    assert.match(cookie, /Max-Age=604800/i);
    assert.equal((await (await request(register.POST, '/api/auth/register', 'POST', { name: 'Duplicate', email: 'ONE@example.test', phone: '01712345678', password: 'long-password-123' })).json()).error.includes('already exists'), true);
    const customer = await db.get("SELECT id, pass FROM users WHERE email = 'one@example.test'");
    assert.ok(customer.pass.includes(':'));
    const sessionHeaders = { cookie: cookie.split(';')[0] };
    assert.equal((await (await request(me.GET, '/api/auth/me', 'GET', {}, sessionHeaders)).json()).user.id, customer.id);
    assert.equal((await request(customerOrders.GET, '/api/account/orders', 'GET', {}, { Authorization: `Bearer ${adminToken}` })).status, 401);
    assert.equal((await request(logout.POST, '/api/auth/logout', 'POST', {}, sessionHeaders)).status, 200);
    assert.match((await request(logout.POST, '/api/auth/logout', 'POST', {}, sessionHeaders)).headers.get('set-cookie'), /Max-Age=0/i);
    assert.equal((await (await request(me.GET, '/api/auth/me', 'GET', {}, sessionHeaders)).json()).user, null, 'logout revokes the server-side session version');
    assert.equal((await request(login.POST, '/api/auth/login', 'POST', { email: 'one@example.test', password: 'wrong-password' })).status, 401);
    const loggedIn = await request(login.POST, '/api/auth/login', 'POST', { email: 'one@example.test', password: 'long-password-123' });
    assert.equal(loggedIn.status, 200); assert.doesNotMatch(loggedIn.headers.get('set-cookie'), /luxury_customer_session=.*token/i);
    const loggedInHeaders = { cookie: loggedIn.headers.get('set-cookie').split(';')[0] };

    await db.run("INSERT INTO users (name,email,pass,role) VALUES ('Other','other@example.test',?,'customer')", [hashPassword('another-long-password')]);
    await db.run("INSERT INTO orders (user_id,name,phone,address,area,items,subtotal,discount,shipping,total,method,status) VALUES (?, 'One','01712345678','Street','dhaka','[]',1,0,0,1,'cod','pending')", [customer.id]);
    await db.run("INSERT INTO orders (user_id,name,phone,address,area,items,subtotal,discount,shipping,total,method,status) VALUES (?, 'Other','01712345678','Street','dhaka','[]',1,0,0,1,'cod','pending')", [customer.id + 1]);
    const visible = await (await request(customerOrders.GET, '/api/account/orders', 'GET', {}, loggedInHeaders)).json();
    assert.equal(visible.length, 1, 'only owner order is listed');
    assert.equal((await request(customerOrder.GET, '/api/account/orders/2', 'GET', {}, loggedInHeaders, { params: Promise.resolve({ id: '2' }) })).status, 404, 'another customer order is not addressable by ID');
    const savedAddress = await request(addresses.POST, '/api/account/addresses', 'POST', { label: 'Home', recipient_name: 'One', phone: '01712345678', address: 'Private Street 12', area: 'dhaka', is_default: true }, loggedInHeaders);
    assert.equal(savedAddress.status, 201);
    assert.ok(Number.isSafeInteger((await savedAddress.json()).address.id), 'PostgreSQL returns the newly saved address ID');
    assert.equal((await request(addresses.GET, '/api/account/addresses', 'GET', {}, { Authorization: `Bearer ${adminToken}` })).status, 401);
    assert.equal((await request(addresses.GET, '/api/account/addresses', 'GET', {}, loggedInHeaders)).status, 200);

    const limiterPath = require.resolve('../src/utils/auth-rate-limit.js');
    const limiterA = require(limiterPath); delete require.cache[limiterPath]; const limiterB = require(limiterPath);
    const sharedKey = 'multi-instance-test:' + crypto.randomUUID();
    assert.equal((await limiterA.checkRateLimit(sharedKey, { limit: 2, windowMs: 60000 })).allowed, true);
    const otherInstance = spawnSync(process.execPath, ['-e', "require('./src/utils/auth-rate-limit').checkRateLimit(process.env.RATE_KEY,{limit:2,windowMs:60000}).then(value=>process.stdout.write(JSON.stringify(value))).catch(()=>process.exit(2))"], { cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, RATE_KEY: sharedKey } });
    assert.equal(otherInstance.status, 0, otherInstance.stderr);
    assert.equal(JSON.parse(otherInstance.stdout).allowed, true, 'a separate Node process uses the same database window');
    assert.equal((await limiterB.checkRateLimit(sharedKey, { limit: 2, windowMs: 60000 })).allowed, false);
    await db.run('UPDATE users SET session_version = session_version + 1 WHERE id = ?', [customer.id]);
    assert.equal((await (await request(me.GET, '/api/auth/me', 'GET', {}, loggedInHeaders)).json()).user, null, 'session version revokes prior cookie after password change');
  } finally { await db.pool?.end?.(); try { db.sqlite?.close(); } catch {} rmSync(temp, { recursive: true, force: true }); }
});
