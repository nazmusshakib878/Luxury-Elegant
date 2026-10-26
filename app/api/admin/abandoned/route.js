import { NextResponse } from 'next/server';
const { isAdminRequest } = require('../../../../src/utils/route-auth');
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');

export async function GET(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await initSchema();
    const rows = await db.all('SELECT * FROM abandoned ORDER BY updated DESC LIMIT 50');
    const formatted = rows.map((r) => ({
      phone: r.phone,
      items: typeof r.items === 'string' ? JSON.parse(r.items || '[]') : r.items,
      updated: r.updated,
    }));
    return NextResponse.json(formatted);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
