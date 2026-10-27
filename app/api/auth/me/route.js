import { NextResponse } from 'next/server';
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');
const { getCustomerSessionUser } = require('../../../../src/utils/customer-session');
export async function GET(request) {
  try {
    await initSchema();
    if (db.isFallback) return NextResponse.json({ user: null }, { status: 200 });
    const user = await getCustomerSessionUser(request, db);
    return NextResponse.json({ user: user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null });
  } catch { return NextResponse.json({ error: 'Account data is unavailable.' }, { status: 503 }); }
}
