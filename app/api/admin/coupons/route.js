import { NextResponse } from 'next/server';
const { isAdminRequest } = require('../../../../src/utils/route-auth');
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');

export async function GET(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await initSchema();
    const coupons = await db.all('SELECT * FROM coupons ORDER BY code ASC');
    return NextResponse.json(coupons);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await initSchema();
    if (db.isFallback) {
      return NextResponse.json(
        { error: 'Coupon creation is disabled in read-only catalog mode. Production PostgreSQL database required.' },
        { status: 503 }
      );
    }
    const body = await request.json();
    const { code, percent } = body;

    if (!code || !percent) {
      return NextResponse.json({ error: 'Code and percent are required' }, { status: 400 });
    }

    const cleanCode = String(code).toUpperCase().trim();
    await db.run(
      `INSERT INTO coupons (code, percent, active) VALUES (?, ?, 1)
       ON CONFLICT (code) DO UPDATE SET percent = EXCLUDED.percent, active = 1`,
      [cleanCode, +percent]
    );

    return NextResponse.json({ success: true, code: cleanCode, percent: +percent });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await initSchema();
    if (db.isFallback) {
      return NextResponse.json(
        { error: 'Coupon deletion is disabled in read-only catalog mode. Production PostgreSQL database required.' },
        { status: 503 }
      );
    }
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }
    await db.run('DELETE FROM coupons WHERE code = ?', [String(code).toUpperCase().trim()]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
