import { NextResponse } from 'next/server';
const db = require('../../../src/database/connection');
const { initSchema } = require('../../../src/database/schema');

export async function GET() {
  try {
    await initSchema();
    const categories = await db.all('SELECT * FROM categories ORDER BY id ASC');
    return NextResponse.json(categories);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
