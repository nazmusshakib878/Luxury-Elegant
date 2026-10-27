const crypto = require('crypto');
const db = require('../database/connection');
const { initSchema } = require('../database/schema');
const { SECRET } = require('../config/env');

// A database-backed fixed window is shared by every function instance using the same DB.
// If the persistent database cannot enforce the limit, callers must reject the request.
async function checkRateLimit(key, { limit = 8, windowMs = 15 * 60 * 1000 } = {}) {
  if (!db.isPostgres && !db.sqlite) throw new Error('Shared authentication rate limiting requires a persistent database.');
  await initSchema();
  if (db.isFallback) throw new Error('Shared authentication rate limiting is unavailable.');
  const keyHash = crypto.createHmac('sha256', SECRET).update(String(key)).digest('hex');
  const now = Date.now();
  const until = now + windowMs;
  const result = await db.transaction(async (tx) => tx.get(
    `INSERT INTO auth_rate_limits (key_hash, hits, window_ends) VALUES (?, 1, ?)
     ON CONFLICT(key_hash) DO UPDATE SET
       hits = CASE WHEN auth_rate_limits.window_ends <= ? THEN 1 ELSE auth_rate_limits.hits + 1 END,
       window_ends = CASE WHEN auth_rate_limits.window_ends <= ? THEN excluded.window_ends ELSE auth_rate_limits.window_ends END
     RETURNING hits, window_ends`,
    [keyHash, new Date(until).toISOString(), new Date(now).toISOString(), new Date(now).toISOString()]
  ));
  if (Math.random() < 0.01) await db.run('DELETE FROM auth_rate_limits WHERE window_ends < ?', [new Date(now - windowMs).toISOString()]);
  return { allowed: Number(result.hits) <= limit, retryAfter: Math.max(1, Math.ceil((new Date(result.window_ends).getTime() - now) / 1000)) };
}

function requestIp(request) {
  // Vercel sets x-forwarded-for at its edge. Do not accept arbitrary forwarded headers as identities.
  return request.headers.get('x-real-ip') || request.headers.get('x-vercel-forwarded-for') || (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}
module.exports = { checkRateLimit, requestIp };
