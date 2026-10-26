import { NextResponse } from 'next/server';
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');
const { DEFAULT_SETTINGS } = require('../../../../src/config/constants');

export async function GET() {
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
  try {
    await initSchema();
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
