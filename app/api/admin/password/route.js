import { NextResponse } from 'next/server';
const { getRequestUser, isAdminRequest } = require('../../../../src/utils/route-auth');
const { verifyPassword, hashPassword } = require('../../../../src/utils/security');
const { sameOrigin } = require('../../../../src/utils/customer-session');
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');

export async function POST(request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  const admin = getRequestUser(request);
  if (!admin || admin.role !== 'admin') {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }

  try {
    await initSchema();
    if (db.isFallback) {
      return NextResponse.json({ error: 'Database modification is disabled in read-only mode.' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const currentPassword = String(body.current_password || '');
    const newPassword = String(body.new_password || '');

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current password and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 10 || newPassword.length > 128) {
      return NextResponse.json({ error: 'New password must be between 10 and 128 characters.' }, { status: 400 });
    }

    const user = await db.get('SELECT id, pass FROM users WHERE id = ? AND role = ?', [admin.id, 'admin']);
    if (!user || !verifyPassword(currentPassword, user.pass)) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    const hashed = hashPassword(newPassword);
    await db.run('UPDATE users SET pass = ?, session_version = COALESCE(session_version, 0) + 1 WHERE id = ?', [hashed, admin.id]);

    return NextResponse.json({ success: true, message: 'Admin password updated successfully. Please keep your new password safe.' });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to update password.' }, { status: 500 });
  }
}
