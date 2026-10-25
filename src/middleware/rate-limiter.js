/**
 * Lightweight in-memory sliding window rate limiter for security-sensitive routes.
 * Zero external dependencies required.
 */
function createRateLimiter({ windowMs = 60000, max = 30, message = 'Too many requests, please try again in a few moments.' } = {}) {
  const store = new Map();

  // Clean up expired buckets periodically every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of store.entries()) {
      const active = timestamps.filter(t => now - t < windowMs);
      if (active.length === 0) {
        store.delete(key);
      } else {
        store.set(key, active);
      }
    }
  }, 300000).unref(); // unref so it does not keep process alive

  return function rateLimiter(req, res, next) {
    const key = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const timestamps = store.get(key) || [];
    const recent = timestamps.filter(t => now - t < windowMs);

    if (recent.length >= max) {
      res.setHeader('Retry-After', Math.ceil(windowMs / 1000));
      return res.status(429).json({ error: message });
    }

    recent.push(now);
    store.set(key, recent);
    next();
  };
}

module.exports = { createRateLimiter };
