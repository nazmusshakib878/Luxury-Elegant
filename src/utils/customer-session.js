const { generateToken, verifyToken } = require('./security');
const CUSTOMER_SESSION_COOKIE = 'luxury_customer_session';

function getCookie(request, name = CUSTOMER_SESSION_COOKIE) {
  const raw = request.headers.get('cookie') || '';
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0 || part.slice(0, idx).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(idx + 1).trim()); } catch { return null; }
  }
  return null;
}

async function getCustomerSessionUser(request, db) {
  const payload = verifyToken(getCookie(request));
  if (!payload || payload.role !== 'customer' || !Number.isSafeInteger(Number(payload.id))) return null;
  const user = await db.get("SELECT id, name, email, phone, role, COALESCE(session_version, 0) AS session_version FROM users WHERE id = ? AND role = 'customer'", [Number(payload.id)]);
  if (!user || Number(payload.sv || 0) !== Number(user.session_version || 0)) return null;
  return user;
}

function setCustomerSessionCookie(response, user) {
  response.cookies.set(CUSTOMER_SESSION_COOKIE, generateToken({ id: Number(user.id), name: user.name, role: 'customer', sessionVersion: Number(user.session_version || 0) }), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL), sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

function clearCustomerSessionCookie(response) {
  response.cookies.set(CUSTOMER_SESSION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL), sameSite: 'lax', path: '/', maxAge: 0 });
  return response;
}

function sameOrigin(request) {
  const origin = request.headers.get('origin');
  return Boolean(origin) && origin === new URL(request.url).origin;
}

module.exports = { CUSTOMER_SESSION_COOKIE, getCookie, getCustomerSessionUser, setCustomerSessionCookie, clearCustomerSessionCookie, sameOrigin };
