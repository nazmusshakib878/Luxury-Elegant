import { NextResponse } from 'next/server';
const db = require('../../../src/database/connection');
const { initSchema } = require('../../../src/database/schema');
const { COMMERCE_ENABLED } = require('../../../src/config/env');
const { isProductionOrderIntakeEnabled } = require('../../../src/utils/commerce-gate');

export async function GET() {
  let dbStatus = 'unavailable';
  let productCount = 0;
  let healthError = false;

  try {
    await initSchema();
    const p = await db.get('SELECT COUNT(*) as c FROM products');
    productCount = +(p?.c || p?.count || 0);
    dbStatus = db.isPostgres
      ? 'postgresql_connected'
      : (db.sqlite ? 'sqlite_local' : 'read_only_showcase');
  } catch {
    healthError = true;
    dbStatus = 'unavailable';
  }

  const isPostgres = Boolean(db.isPostgres);
  const isVercel = Boolean(db.isVercel);
  const isFallback = Boolean(db.isFallback);
  const ready = !healthError && (isPostgres || !isVercel);
  const orderIntakeEnabled = isProductionOrderIntakeEnabled(isVercel, process.env.VERCEL_ENV, COMMERCE_ENABLED);

  return NextResponse.json({
    framework: 'Next.js 16 (App Router)',
    status: healthError ? 'degraded' : (isPostgres || !isVercel ? 'ok' : 'showcase_fallback'),
    mode: isPostgres ? 'postgresql' : (isVercel ? 'vercel_showcase_fallback' : 'sqlite'),
    isVercel,
    database: {
      connected: isPostgres && !healthError,
      engine: isPostgres ? 'postgresql' : (db.sqlite ? 'sqlite_local' : 'read_only_showcase'),
      status: dbStatus,
      ordersAllowed: ready && orderIntakeEnabled && (isPostgres || (!isVercel && Boolean(db.sqlite))),
      mutationsAllowed: ready && (isPostgres || (!isVercel && Boolean(db.sqlite))),
      setupRequired: !isPostgres && isVercel
        ? 'DATABASE_URL (or POSTGRES_URL) is required in Vercel Project Settings to connect persistent PostgreSQL for orders, payments, and admin mutations.'
        : null,
    },
    catalog: {
      mode: isPostgres ? 'persistent' : (db.sqlite ? 'local_sqlite' : 'read_only_showcase'),
      productsAvailable: productCount || 16,
      readOnlyPreview: isFallback,
    },
    security: {
      inMemoryOrdersBlocked: isFallback,
      adminMutationsBlocked: isFallback,
      productionOrderIntakeDisabled: isVercel && process.env.VERCEL_ENV === 'production' && !COMMERCE_ENABLED,
    },
    timestamp: new Date().toISOString(),
  });
}
