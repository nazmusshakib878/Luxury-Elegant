import { NextResponse } from 'next/server';
const crypto = require('crypto');
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');
const { hashPassword } = require('../../../../src/utils/security');
const { SECRET_CONFIGURED } = require('../../../../src/config/env');
const { checkRateLimit, requestIp } = require('../../../../src/utils/auth-rate-limit');
const { sameOrigin } = require('../../../../src/utils/customer-session');

function digest(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!SECRET_CONFIGURED) return NextResponse.json({ error: 'Password reset is unavailable.' }, { status: 503 });
  let allowed;
  try { allowed = await checkRateLimit('password-reset:' + requestIp(request), { limit: 5, windowMs: 15 * 60 * 1000 }); }
  catch { return NextResponse.json({ error: 'Password reset is temporarily unavailable.' }, { status: 503 }); }
  if (!allowed.allowed) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  const { PASSWORD_RESET_PROVIDER_URL, PASSWORD_RESET_PROVIDER_TOKEN } = require('../../../../src/config/env');
  if (!PASSWORD_RESET_PROVIDER_URL || !PASSWORD_RESET_PROVIDER_TOKEN) return NextResponse.json({ error: 'Password reset email provider is not configured.' }, { status: 503 });
  try { if (new URL(PASSWORD_RESET_PROVIDER_URL).protocol !== 'https:') return NextResponse.json({ error: 'Password reset provider must use HTTPS.' }, { status: 503 }); }
  catch { return NextResponse.json({ error: 'Password reset provider URL is invalid.' }, { status: 503 }); }
  try {
    await initSchema();
    if (db.isFallback) return NextResponse.json({ error: 'Password reset requires a persistent database.' }, { status: 503 });
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    const user = await db.get("SELECT id, email FROM users WHERE LOWER(email) = ? AND role = 'customer'", [email]);
    if (user) {
      const otp = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      const tokenHash = crypto.createHmac('sha256', require('../../../../src/config/env').SECRET).update(user.id + ':' + otp).digest('hex');
      await db.run('INSERT INTO password_reset_tokens (user_id, token_hash, expires, attempts) VALUES (?, ?, ?, 0) ON CONFLICT(user_id) DO UPDATE SET token_hash = excluded.token_hash, expires = excluded.expires, attempts = 0', [user.id, tokenHash, new Date(Date.now() + 10 * 60 * 1000).toISOString()]);
      const sent = await fetch(PASSWORD_RESET_PROVIDER_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${PASSWORD_RESET_PROVIDER_TOKEN}` }, body: JSON.stringify({ to: user.email, otp, expires_in_minutes: 10 }) });
      if (!sent.ok) return NextResponse.json({ error: 'Password reset provider could not send the code.' }, { status: 502 });
    }
    return NextResponse.json({ success: true, message: 'If the account exists, a verification code has been sent.' });
  } catch { return NextResponse.json({ error: 'Password reset is temporarily unavailable.' }, { status: 503 }); }
}

export async function PUT(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  let allowed;
  try { allowed = await checkRateLimit('password-reset-verify:' + requestIp(request), { limit: 8, windowMs: 15 * 60 * 1000 }); }
  catch { return NextResponse.json({ error: 'Password reset is temporarily unavailable.' }, { status: 503 }); }
  if (!allowed.allowed) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  try {
    await initSchema();
    if (db.isFallback) return NextResponse.json({ error: 'Password reset requires a persistent database.' }, { status: 503 });
    const { email, otp, new_password } = await request.json();
    if (typeof new_password !== 'string' || new_password.length < 10 || new_password.length > 128 || !/^\d{6}$/.test(String(otp || ''))) return NextResponse.json({ error: 'Valid code and new password are required.' }, { status: 400 });
    const user = await db.get("SELECT id FROM users WHERE LOWER(email) = ? AND role = 'customer'", [String(email || '').trim().toLowerCase()]);
    if (!user) return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 400 });
    await db.transaction(async (tx) => {
      const reset = await tx.get('SELECT * FROM password_reset_tokens WHERE user_id = ?' + (db.isPostgres ? ' FOR UPDATE' : ''), [user.id]);
      const expected = crypto.createHmac('sha256', require('../../../../src/config/env').SECRET).update(user.id + ':' + otp).digest('hex');
      const equal = reset && reset.expires && new Date(reset.expires).getTime() > Date.now() && reset.attempts < 8 && crypto.timingSafeEqual(Buffer.from(reset.token_hash), Buffer.from(expected));
      if (!equal) {
        if (reset) await tx.run('UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE user_id = ?', [user.id]);
        throw new Error('Invalid or expired verification code.');
      }
      await tx.run('UPDATE users SET pass = ?, session_version = COALESCE(session_version, 0) + 1 WHERE id = ?', [hashPassword(new_password), user.id]);
      await tx.run('DELETE FROM password_reset_tokens WHERE user_id = ?', [user.id]);
    });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: error.message === 'Invalid or expired verification code.' ? error.message : 'Password reset is temporarily unavailable.' }, { status: error.message === 'Invalid or expired verification code.' ? 400 : 503 }); }
}
