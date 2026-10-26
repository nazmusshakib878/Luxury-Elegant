import { NextResponse } from 'next/server';
const { isAdminRequest } = require('../../../../src/utils/route-auth');
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');
const { DEFAULT_SETTINGS } = require('../../../../src/config/constants');

export async function GET(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await initSchema();
    const rows = await db.all('SELECT * FROM settings');
    const s = Object.fromEntries(rows.map((row) => [row.k, row.v]));
    return NextResponse.json({ ...DEFAULT_SETTINGS, ...s });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await initSchema();
    if (db.isFallback) {
      return NextResponse.json(
        { error: 'Admin settings modification is disabled in read-only catalog mode. Production PostgreSQL database (DATABASE_URL) required.' },
        { status: 503 }
      );
    }
    const body = await request.json();

    for (const [key, val] of Object.entries(body)) {
      if (val !== undefined && val !== null) {
        await db.run(
          `INSERT INTO settings (k, v) VALUES (?, ?)
           ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`,
          [key, String(val)]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
