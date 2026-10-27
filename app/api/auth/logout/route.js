import { NextResponse } from 'next/server';
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');
const { clearCustomerSessionCookie, sameOrigin, getCustomerSessionUser } = require('../../../../src/utils/customer-session');
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    await initSchema();
    if (db.isFallback) return clearCustomerSessionCookie(NextResponse.json({ error: 'Session revocation requires persistent storage.' }, { status: 503 }));
    const user = await getCustomerSessionUser(request, db);
    if (user) await db.run('UPDATE users SET session_version = COALESCE(session_version, 0) + 1 WHERE id = ? AND role = \'customer\'', [user.id]);
    return clearCustomerSessionCookie(NextResponse.json({ success: true }));
  } catch { return clearCustomerSessionCookie(NextResponse.json({ error: 'Session revocation could not be confirmed.' }, { status: 503 })); }
}
