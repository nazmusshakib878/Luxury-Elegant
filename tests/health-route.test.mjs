import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function loadHealthRoute(db, initSchema) {
  const filename = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../app/api/health/route.js');
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const source = readFileSync(filename, 'utf8')
    .replace("import { NextResponse } from 'next/server';", "const { NextResponse } = require('next/server.js');")
    .replace("const db = require('../../../src/database/connection');", "const db = require('mock:db');")
    .replace("const { initSchema } = require('../../../src/database/schema');", "const { initSchema } = require('mock:schema');")
    .replace('export async function GET()', 'async function GET()');
  const routeRequire = Module.createRequire(filename);
  mod.require = (id) => id === 'mock:db' ? db : id === 'mock:schema' ? { initSchema } : routeRequire(id);
  mod._compile(`${source}\nmodule.exports = { GET };`, filename);
  return mod.exports;
}

test('public health response omits user counts and database exception details', async () => {
  const originalVercel = process.env.VERCEL;
  process.env.VERCEL = '1';
  try {
    const db = { isPostgres: false, isFallback: true, isVercel: true, sqlite: null, async get() { throw new Error('postgres://private-user:private-password@db.example/private-db'); } };
    const route = loadHealthRoute(db, async () => { throw new Error('private connection detail'); });
    const response = await route.GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);
    assert.equal(body.status, 'degraded');
    assert.equal(body.database.status, 'unavailable');
    assert.equal(body.database.ordersAllowed, false);
    assert.equal(body.database.mutationsAllowed, false);
    assert.equal('usersCount' in body.catalog, false);
    assert.doesNotMatch(serialized, /private-user|private-password|db\.example|private connection detail/);
  } finally {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  }
});
