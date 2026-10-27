import { NextResponse } from 'next/server';
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');
const { verifyPassword, generateToken } = require('../../../../src/utils/security');
const { ADMIN_EMAIL, SECRET_CONFIGURED } = require('../../../../src/config/env');
const { checkRateLimit, requestIp } = require('../../../../src/utils/auth-rate-limit');
const { setCustomerSessionCookie, sameOrigin } = require('../../../../src/utils/customer-session');

export async function POST(request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    if (!SECRET_CONFIGURED) {
      return NextResponse.json({ error: 'Authentication is unavailable until a strong production SECRET is configured.' }, { status: 503 });
    }
    await initSchema();
    if (db.isFallback) return NextResponse.json({ error: 'Customer and admin sign-in require a persistent database.' }, { status: 503 });
    const body = await request.json();
    const email = (body.email || '').toLowerCase().trim();
    const pass = body.pass || body.password || '';
    const limiterKey = 'login:' + requestIp(request) + ':' + email;
    let limit;
    try { limit = await checkRateLimit(limiterKey, { limit: 8, windowMs: 15 * 60 * 1000 }); }
    catch { return NextResponse.json({ error: 'Sign-in is temporarily unavailable. Please try again shortly.' }, { status: 503 }); }
    if (!limit.allowed) return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429 });

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

    if (user.role === 'customer') {
      const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: 'customer' } });
      return setCustomerSessionCookie(response, user);
    }

    if (!['admin', 'staff'].includes(user.role)) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
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
