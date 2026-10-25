const crypto = require('crypto');
const { SECRET } = require('../config/env');

/**
 * Hash password with scrypt and a salt.
 * Compatible with existing database passwords in format 'salt:scryptHash'.
 */
function hashPassword(password, salt = crypto.randomBytes(8).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify plaintext password against stored 'salt:hash'.
 */
function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt] = storedHash.split(':');
  return safeCompare(hashPassword(password, salt), storedHash);
}

/**
 * Generate a signed base64url token valid for 7 days (604800000 ms).
 */
function generateToken(user) {
  const payload = {
    id: user.id,
    role: user.role,
    name: user.name,
    exp: Date.now() + 6048e5,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(encodedPayload).digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify and decode token. Returns payload or null.
 */
function verifyToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
    if (!safeCompare(signature, expectedSig)) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
};
