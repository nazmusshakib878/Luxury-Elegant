import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function loadPostRoute({ db, initSchema, commerceEnabled }) {
  const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../app/api/orders/route.js');
  const routeRequire = Module.createRequire(filename);
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  let source = readFileSync(filename, 'utf8')
    .replace("import { NextResponse } from 'next/server';", "const { NextResponse } = require('next/server.js');")
    .replace("const { isAdminRequest } = require('../../../src/utils/route-auth');", "const { isAdminRequest } = require('mock:route-auth');")
    .replace("const db = require('../../../src/database/connection');", "const db = require('mock:db');")
    .replace("const { initSchema } = require('../../../src/database/schema');", "const { initSchema } = require('mock:schema');")
    .replace("const { DEFAULT_SETTINGS } = require('../../../src/config/constants');", "const { DEFAULT_SETTINGS } = require('mock:constants');")
    .replace("const { notifyNewOrder } = require('../../../src/services/notification');", "const { notifyNewOrder } = require('mock:notification');")
    .replace("const { isValidIdempotencyKey, hashOrderRequest } = require('../../../src/utils/order-idempotency');", "const { isValidIdempotencyKey, hashOrderRequest } = require('mock:idempotency');")
    .replace("const { reserveVariantStock, reserveProductStock } = require('../../../src/services/inventory');", "const { reserveVariantStock, reserveProductStock } = require('mock:inventory');")
    .replace("const { getCustomerSessionUser } = require('../../../src/utils/customer-session');", "const { getCustomerSessionUser } = require('mock:customer-session');")
    .replace("const { sameOrigin } = require('../../../src/utils/customer-session');", "const { sameOrigin } = require('mock:customer-session');")
    .replace("const { enqueueOrderEvent } = require('../../../src/services/notification-outbox');", "const { enqueueOrderEvent } = require('mock:outbox');")
    .replace("const { COMMERCE_ENABLED } = require('../../../src/config/env');", "const { COMMERCE_ENABLED } = require('mock:config');")
    .replace(/export async function (GET|POST)\(/g, 'async function $1(');
  const mocks = new Map([
    ['mock:route-auth', { isAdminRequest: () => false }],
    ['mock:db', db],
    ['mock:schema', { initSchema }],
    ['mock:constants', { DEFAULT_SETTINGS: {} }],
    ['mock:notification', { notifyNewOrder: async () => {} }],
    ['mock:idempotency', { isValidIdempotencyKey: () => false, hashOrderRequest: () => '' }],
    ['mock:inventory', { reserveVariantStock: async () => {}, reserveProductStock: async () => {} }],
    ['mock:customer-session', { getCustomerSessionUser: async () => null, sameOrigin: () => true }],
    ['mock:outbox', { enqueueOrderEvent: async () => {} }],
    ['mock:config', { COMMERCE_ENABLED: commerceEnabled }],
  ]);
  mod.require = (id) => mocks.has(id) ? mocks.get(id) : routeRequire(id);
  mod._compile(`${source}\nmodule.exports = { POST };`, filename);
  return mod.exports.POST;
}

test('production checkout is rejected before schema or database access until explicitly enabled', async () => {
  const oldVercel = process.env.VERCEL;
  const oldVercelEnv = process.env.VERCEL_ENV;
  process.env.VERCEL = '1';
  process.env.VERCEL_ENV = 'production';
  let initCalls = 0;
  let queryCalls = 0;
  try {
    const POST = loadPostRoute({
      db: { isVercel: true, isFallback: false, isPostgres: true, async get() { queryCalls += 1; } },
      initSchema: async () => { initCalls += 1; },
      commerceEnabled: false,
    });
    const response = await POST(new Request('https://store.example/api/orders', { method: 'POST', body: '{}' }));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /Production order intake is disabled/);
    assert.equal(initCalls, 0);
    assert.equal(queryCalls, 0);
  } finally {
    if (oldVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = oldVercel;
    if (oldVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = oldVercelEnv;
  }
});
