import { NextResponse } from 'next/server';
const db = require('../../../../src/database/connection');
const { requireCustomer, sameOrigin } = require('../_shared');
const { verifyPassword, hashPassword } = require('../../../../src/utils/security');
const { setCustomerSessionCookie } = require('../../../../src/utils/customer-session');
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const body = await request.json();
    const current = await db.get('SELECT pass FROM users WHERE id = ? AND role = \'customer\'', [auth.user.id]);
    if (!verifyPassword(body.current_password, current?.pass)) return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    if (typeof body.new_password !== 'string' || body.new_password.length < 10 || body.new_password.length > 128) return NextResponse.json({ error: 'New password must be 10–128 characters.' }, { status: 400 });
    await db.run('UPDATE users SET pass = ?, session_version = COALESCE(session_version, 0) + 1 WHERE id = ?', [hashPassword(body.new_password), auth.user.id]);
    const updated = await db.get('SELECT id, name, email, phone, role, session_version FROM users WHERE id = ?', [auth.user.id]);
    return setCustomerSessionCookie(NextResponse.json({ success: true }), updated);
  } catch { return NextResponse.json({ error: 'Password could not be changed.' }, { status: 500 }); }
}
