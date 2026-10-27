import { NextResponse } from 'next/server';
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');
const { hashPassword } = require('../../../../src/utils/security');
const { SECRET_CONFIGURED } = require('../../../../src/config/env');
const { checkRateLimit, requestIp } = require('../../../../src/utils/auth-rate-limit');
const { setCustomerSessionCookie, sameOrigin } = require('../../../../src/utils/customer-session');

export async function POST(request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    if (!SECRET_CONFIGURED) return NextResponse.json({ error: 'Authentication is unavailable until a strong production SECRET is configured.' }, { status: 503 });
    let limit;
    try { limit = await checkRateLimit('register:' + requestIp(request), { limit: 5, windowMs: 60 * 60 * 1000 }); }
    catch { return NextResponse.json({ error: 'Registration is temporarily unavailable.' }, { status: 503 }); }
    if (!limit.allowed) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    await initSchema();
    if (db.isFallback) return NextResponse.json({ error: 'Customer accounts require a persistent database.' }, { status: 503 });
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^01[3-9]\d{8}$/.test(phone) || password.length < 10 || password.length > 128) {
      return NextResponse.json({ error: 'Enter a valid name, email, Bangladeshi phone, and password (10–128 characters).' }, { status: 400 });
    }
    const user = await db.transaction(async (tx) => {
      if (db.isPostgres) await tx.get("SELECT pg_advisory_xact_lock(hashtext(?))", ['customer-email:' + email]);
      if (await tx.get('SELECT id FROM users WHERE LOWER(email) = ?', [email])) throw Object.assign(new Error('An account with this email already exists.'), { status: 409 });
      const result = await tx.run("INSERT INTO users (name, email, phone, pass, role) VALUES (?, ?, ?, ?, 'customer')", [name, email, phone, hashPassword(password)]);
      return { id: result.lastInsertRowid, name, email, phone, role: 'customer', session_version: 0 };
    });
    return setCustomerSessionCookie(NextResponse.json({ success: true, user }), user);
  } catch (error) {
    const status = error.status || (/unique|duplicate/i.test(error.message || '') ? 409 : db.isFallback ? 503 : 500);
    return NextResponse.json({ error: status === 409 ? 'An account with this email already exists.' : status === 500 ? 'Registration could not be completed.' : error.message }, { status });
  }
}
