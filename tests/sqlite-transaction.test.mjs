import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(os.tmpdir(), 'luxury-elegant-test-'));
process.env.DB = path.join(dir, 'transaction-test.db');
delete process.env.VERCEL;
delete process.env.AWS_LAMBDA_FUNCTION_NAME;
const require = createRequire(import.meta.url);
const db = require('../src/database/connection.js');

after(() => {
  db.sqlite?.close();
  rmSync(dir, { recursive: true, force: true });
});

test('SQLite checkout transaction rolls back all writes on failure and commits successful writes', async () => {
  await db.exec('CREATE TABLE transaction_probe (value TEXT NOT NULL)');

  await assert.rejects(db.transaction(async (tx) => {
    await tx.run('INSERT INTO transaction_probe (value) VALUES (?)', ['rolled-back']);
    throw new Error('force rollback');
  }), /force rollback/);

  assert.equal((await db.get('SELECT COUNT(*) AS count FROM transaction_probe')).count, 0);

  await db.transaction(async (tx) => {
    await tx.run('INSERT INTO transaction_probe (value) VALUES (?)', ['committed']);
  });
  assert.equal((await db.get('SELECT value FROM transaction_probe')).value, 'committed');
});
