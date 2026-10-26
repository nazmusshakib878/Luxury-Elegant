import { NextResponse } from 'next/server';
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');
const { verifyPassword, generateToken } = require('../../../../src/utils/security');
const { ADMIN_EMAIL, SECRET_CONFIGURED } = require('../../../../src/config/env');

export async function POST(request) {
  try {
    if (!SECRET_CONFIGURED) {
      return NextResponse.json({ error: 'Authentication is unavailable until a strong production SECRET is configured.' }, { status: 503 });
    }
    await initSchema();
    const body = await request.json();
    const email = (body.email || '').toLowerCase().trim();
    const pass = body.pass || body.password || '';

    if (!email || !pass) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await db.get('SELECT * FROM users WHERE LOWER(email) = ?', [email]);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = verifyPassword(pass, user.pass);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.role === 'admin' || user.email === ADMIN_EMAIL,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
