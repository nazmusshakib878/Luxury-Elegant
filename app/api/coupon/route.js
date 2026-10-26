import { NextResponse } from 'next/server';
const db = require('../../../src/database/connection');
const { initSchema } = require('../../../src/database/schema');

export async function GET(request) {
  try {
    await initSchema();
    const { searchParams } = new URL(request.url);
    const code = (searchParams.get('code') || '').toUpperCase().trim();

    if (!code) {
      return NextResponse.json({ error: 'Coupon code required' }, { status: 400 });
    }

    const coupon = await db.get(
      'SELECT code, percent FROM coupons WHERE code = ? AND active = 1',
      [code]
    );

    if (!coupon) {
      return NextResponse.json({ error: 'Invalid or expired coupon' }, { status: 404 });
    }

    return NextResponse.json({
      code: coupon.code,
      percent: +coupon.percent,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
