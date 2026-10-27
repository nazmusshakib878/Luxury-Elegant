import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

test('production SQLite remains read-only until PostgreSQL is configured', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'luxury-prod-guard-'));
  process.env.DB = path.join(dir, 'readonly.db');
  process.env.NODE_ENV = 'production';
  process.env.DATABASE_URL = ''; process.env.POSTGRES_URL = ''; process.env.POSTGRES_PRISMA_URL = '';
  delete process.env.VERCEL; delete process.env.AWS_LAMBDA_FUNCTION_NAME;
  const require = createRequire(import.meta.url);
  const db = require('../src/database/connection.js');
  const { initSchema } = require('../src/database/schema.js');
  try {
    assert.equal(db.isFallback, true);
    await initSchema();
    await assert.rejects(db.run('CREATE TABLE blocked_write (id INTEGER)'), /PRODUCTION_WRITE_BLOCKED/);
    await assert.rejects(db.transaction(async () => true), /PRODUCTION_WRITE_BLOCKED/);
    assert.equal(db.sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='blocked_write'").get(), undefined);
  } finally { try { db.sqlite?.close(); } catch {} rmSync(dir, { recursive: true, force: true }); }
});
