const { Pool } = require('pg');
const { DB_FILE, DATABASE_URL } = require('../config/env');

let pgPool = null;
let sqliteDb = null;
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const usePostgres = Boolean(DATABASE_URL);

if (usePostgres) {
  // Production PostgreSQL mode (Neon, Supabase, Vercel Postgres, etc.)
  pgPool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pgPool.on('error', (err) => {
    console.error('PostgreSQL Pool Error:', err.message);
  });
} else if (!isVercel) {
  // Local development mode with SQLite
  try {
    const Database = require('better-sqlite3');
    sqliteDb = new Database(DB_FILE);
    sqliteDb.pragma('journal_mode = WAL');
  } catch (err) {
    console.error('Failed to initialize local SQLite database:', err.message);
  }
}

// Convert SQLite '?' parameters to PostgreSQL '$1, $2, ...' and adjust dialect
function toPgSql(sql) {
  let idx = 0;
  let converted = sql.replace(/\?/g, () => `$${++idx}`);

  converted = converted.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
  converted = converted.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO');

  if (/INSERT\s+INTO\s+settings/i.test(sql) && !/ON\s+CONFLICT/i.test(converted)) {
    converted += ' ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v';
  } else if (/INSERT\s+INTO\s+abandoned/i.test(sql) && !/ON\s+CONFLICT/i.test(converted)) {
    converted += ' ON CONFLICT (phone) DO UPDATE SET items = EXCLUDED.items, updated = CURRENT_TIMESTAMP';
  } else if (/INSERT\s+INTO\s+coupons/i.test(sql) && !/ON\s+CONFLICT/i.test(converted)) {
    converted += ' ON CONFLICT (code) DO UPDATE SET percent = EXCLUDED.percent, active = 1';
  } else if (/INSERT\s+INTO\s+categories/i.test(sql) && !/ON\s+CONFLICT/i.test(converted)) {
    converted += ' ON CONFLICT (name) DO NOTHING';
  } else if (/INSERT\s+INTO\s+users/i.test(sql) && !/ON\s+CONFLICT/i.test(converted)) {
    converted += ' ON CONFLICT (email) DO NOTHING';
  }

  // If INSERT into a table with an 'id' and RETURNING is not specified, add RETURNING id
  if (/^\s*INSERT\s+INTO\s+(orders|products|users|reviews|categories)\b/i.test(converted) && !/RETURNING/i.test(converted)) {
    converted += ' RETURNING id';
  }

  return converted;
}

const MemoryStore = require('./memory-store');
let memoryStore = null;
function getMemoryStore() {
  if (!memoryStore) {
    memoryStore = new MemoryStore();
  }
  return memoryStore;
}

const db = {
  isPostgres: usePostgres,
  isVercel,
  isFallback: !usePostgres && !sqliteDb,
  pool: pgPool,
  sqlite: sqliteDb,
  getMemoryStore,

  async all(sql, params = []) {
    if (usePostgres) {
      const res = await pgPool.query(toPgSql(sql), params);
      return res.rows;
    }
    if (sqliteDb) {
      return sqliteDb.prepare(sql).all(...params);
    }
    return getMemoryStore().all(sql, params);
  },

  async get(sql, params = []) {
    if (usePostgres) {
      const res = await pgPool.query(toPgSql(sql), params);
      return res.rows[0];
    }
    if (sqliteDb) {
      return sqliteDb.prepare(sql).get(...params);
    }
    return getMemoryStore().get(sql, params);
  },

  async run(sql, params = []) {
    if (usePostgres) {
      const res = await pgPool.query(toPgSql(sql), params);
      return {
        changes: res.rowCount,
        lastInsertRowid: res.rows[0]?.id || null,
      };
    }
    if (sqliteDb) {
      return sqliteDb.prepare(sql).run(...params);
    }
    throw new Error(
      'DATABASE_READ_ONLY: The store is currently running in showcase fallback mode. Orders, mutations, and database writes are disabled until a persistent PostgreSQL database is connected.'
    );
  },

  async exec(sql) {
    if (usePostgres) {
      return await pgPool.query(sql);
    }
    if (sqliteDb) {
      return sqliteDb.exec(sql);
    }
    throw new Error(
      'No persistent database configured. The app cannot run without a database. ' +
      'Set DATABASE_URL for PostgreSQL (Vercel Postgres, Neon, Supabase), or ' +
      'run locally with SQLite (npm install better-sqlite3).'
    );
  },

  prepare(sql) {
    return {
      all: (...params) => this.all(sql, params),
      get: (...params) => this.get(sql, params),
      run: (...params) => this.run(sql, params),
    };
  },
};

module.exports = db;
