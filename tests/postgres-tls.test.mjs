import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function loadPoolOptions(databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
  delete process.env.POSTGRES_URL;
  delete process.env.POSTGRES_PRISMA_URL;
  const pgPath = require.resolve('pg');
  const envPath = require.resolve('../src/config/env.js');
  const connectionPath = require.resolve('../src/database/connection.js');
  const previousPg = require.cache[pgPath];
  const previousEnv = require.cache[envPath];
  const previousConnection = require.cache[connectionPath];
  let options;
  require.cache[pgPath] = {
    id: pgPath,
    filename: pgPath,
    loaded: true,
    exports: { Pool: class Pool {
      constructor(config) { options = config; }
      on() {}
    } },
  };
  delete require.cache[envPath];
  delete require.cache[connectionPath];
  try {
    require('../src/database/connection.js');
    return options;
  } finally {
    if (previousPg) require.cache[pgPath] = previousPg;
    else delete require.cache[pgPath];
    if (previousEnv) require.cache[envPath] = previousEnv;
    else delete require.cache[envPath];
    if (previousConnection) require.cache[connectionPath] = previousConnection;
    else delete require.cache[connectionPath];
  }
}

test('remote PostgreSQL connections require certificate validation; only exact local hosts may disable TLS', () => {
  const previous = {
    databaseUrl: process.env.DATABASE_URL,
    postgresUrl: process.env.POSTGRES_URL,
    postgresPrismaUrl: process.env.POSTGRES_PRISMA_URL,
  };
  try {
    assert.deepEqual(loadPoolOptions('postgresql://user:password@db.example.test/shop').ssl, { rejectUnauthorized: true });
    assert.deepEqual(loadPoolOptions('postgresql://user:password@postgres.localhost.attacker.test/shop').ssl, { rejectUnauthorized: true });
    assert.equal(loadPoolOptions('postgresql://user:password@localhost/shop').ssl, false);
    assert.equal(loadPoolOptions('postgresql://user:password@127.0.0.1/shop').ssl, false);
    assert.equal(loadPoolOptions('postgresql://user:password@[::1]/shop').ssl, false);
    for (const options of ['sslmode=disable', 'sslmode=no-verify', 'ssl=0', 'ssl=false', 'ssl=no-verify', 'uselibpqcompat=true&sslmode=require']) {
      assert.throws(() => loadPoolOptions(`postgresql://user:password@db.example.test/shop?${options}`), /full certificate and hostname verification/);
    }
  } finally {
    if (previous.databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous.databaseUrl;
    if (previous.postgresUrl === undefined) delete process.env.POSTGRES_URL;
    else process.env.POSTGRES_URL = previous.postgresUrl;
    if (previous.postgresPrismaUrl === undefined) delete process.env.POSTGRES_PRISMA_URL;
    else process.env.POSTGRES_PRISMA_URL = previous.postgresPrismaUrl;
  }
});
