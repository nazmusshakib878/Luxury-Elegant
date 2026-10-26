import { NextResponse } from 'next/server';
const db = require('../../../src/database/connection');
const { initSchema } = require('../../../src/database/schema');

export async function GET() {
  let dbStatus = 'disconnected';
  let dbError = null;
  let userCount = 0;
  let productCount = 0;

  try {
    await initSchema();
    const u = await db.get('SELECT COUNT(*) as c FROM users');
    const p = await db.get('SELECT COUNT(*) as c FROM products');
    dbStatus = db.isPostgres ? 'postgresql_connected' : 'sqlite_connected';
    userCount = +(u?.c || u?.count || 0);
    productCount = +(p?.c || p?.count || 0);
  } catch (err) {
    dbError = err.message;
  }

  return NextResponse.json({
    framework: 'Next.js 16 (App Router)',
    status: dbError ? 'warning' : 'ok',
    mode: db.isPostgres ? 'postgresql' : (db.isVercel ? 'vercel_no_db' : 'sqlite'),
    isVercel: Boolean(process.env.VERCEL),
    dbStatus,
    dbError,
    records: {
      users: userCount,
      products: productCount,
    },
    timestamp: new Date().toISOString(),
  });
}
