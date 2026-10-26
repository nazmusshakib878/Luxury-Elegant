import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

test('schema initialization retries after a failed persistent database query', async () => {
  process.env.VERCEL = '1';
  process.env.DATABASE_URL = 'postgres://test.invalid/test';
  const require = createRequire(import.meta.url);
  const connectionPath = require.resolve('../src/database/connection.js');
  const schemaPath = require.resolve('../src/database/schema.js');
  const pgPath = require.resolve('pg');
  const originalPg = require.cache[pgPath];
  const originalConnection = require.cache[connectionPath];
  const originalSchema = require.cache[schemaPath];
  let shouldFail = true;
  let calls = 0;

  require.cache[pgPath] = {
    id: pgPath,
    filename: pgPath,
    loaded: true,
    exports: { Pool: class Pool {
      on() {}
      async query() {
        calls += 1;
        if (shouldFail) throw Object.assign(new Error('temporary schema query failure'), { code: '42601' });
        return { rows: [{ count: 0 }], rowCount: 0 };
      }
      async connect() { throw new Error('not used'); }
    } },
  };
  delete require.cache[connectionPath];
  delete require.cache[schemaPath];

  try {
    const { initSchema } = require('../src/database/schema.js');
    await assert.rejects(initSchema(), /temporary schema query failure/);
    assert.equal(calls, 1);

    shouldFail = false;
    await initSchema();
    assert.ok(calls > 1);
  } finally {
    if (originalPg) require.cache[pgPath] = originalPg;
    else delete require.cache[pgPath];
    if (originalConnection) require.cache[connectionPath] = originalConnection;
    else delete require.cache[connectionPath];
    if (originalSchema) require.cache[schemaPath] = originalSchema;
    else delete require.cache[schemaPath];
    delete process.env.DATABASE_URL;
    delete process.env.VERCEL;
  }
});
