import { NextResponse } from 'next/server';
const db = require('../../../src/database/connection');
const { initSchema } = require('../../../src/database/schema');

export async function GET() {
  let dbStatus = 'disconnected';
  let userCount = 0;
  let productCount = 0;
  let initError = null;

  try {
    await initSchema();
    const u = await db.get('SELECT COUNT(*) as c FROM users');
    const p = await db.get('SELECT COUNT(*) as c FROM products');
    userCount = +(u?.c || u?.count || 0);
    productCount = +(p?.c || p?.count || 0);
    dbStatus = db.isPostgres
      ? 'postgresql_connected'
      : (db.sqlite ? 'sqlite_connected' : 'disconnected (showcase_read_only_fallback)');
  } catch (err) {
    initError = err.message;
    dbStatus = 'error: ' + err.message;
  }

  const isPostgres = Boolean(db.isPostgres);
  const isVercel = Boolean(process.env.VERCEL);
  const isFallback = Boolean(db.isFallback);

  return NextResponse.json({
    framework: 'Next.js 16 (App Router)',
    status: isPostgres || !isVercel ? 'ok' : 'showcase_fallback',
    mode: isPostgres ? 'postgresql' : (isVercel ? 'vercel_showcase_fallback' : 'sqlite'),
    isVercel,
    database: {
      connected: isPostgres,
      engine: isPostgres ? 'PostgreSQL (Persistent)' : (db.sqlite ? 'SQLite (Local)' : 'None (In-Memory Showcase Preview)'),
      status: dbStatus,
      ordersAllowed: isPostgres || (!isVercel && Boolean(db.sqlite)),
      mutationsAllowed: isPostgres || (!isVercel && Boolean(db.sqlite)),
      setupRequired: !isPostgres && isVercel
        ? 'DATABASE_URL (or POSTGRES_URL) is required in Vercel Project Settings to connect persistent PostgreSQL for orders, payments, and admin mutations.'
        : null,
    },
    catalog: {
      mode: isPostgres ? 'persistent' : (db.sqlite ? 'local_sqlite' : 'read_only_showcase'),
      productsAvailable: productCount || 16,
      usersCount: userCount,
      readOnlyPreview: isFallback,
    },
    security: {
      inMemoryOrdersBlocked: isFallback,
      adminMutationsBlocked: isFallback,
    },
    timestamp: new Date().toISOString(),
  });
}
