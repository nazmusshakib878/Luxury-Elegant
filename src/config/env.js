const fs = require('fs');
const path = require('path');

// Manually load .env if present (without requiring external dotenv dependency)
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)?$/);
      if (match) {
        const key = match[1];
        let val = (match[2] || '').trim();
        // Remove surrounding quotes if any
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!(key in process.env)) {
          process.env[key] = val;
        }
      }
    });
  }
} catch (err) {
  console.warn('Notice: .env file could not be read:', err.message);
}

const env = process.env;
const isVercel = Boolean(env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME);
const isProduction = env.NODE_ENV === 'production' || isVercel;

// Insecure placeholder secrets that must never be used in production
const INSECURE_SECRETS = new Set([
  'dev-secret-change-me',
  'change-this-long-random-string',
  'replace_with_a_secure_random_64_character_hex_secret',
  '',
]);

let secret = env.SECRET || 'dev-secret-change-me';
const isStrongProductionSecret = /^[a-fA-F0-9]{64,}$/.test(secret) && !INSECURE_SECRETS.has(secret);
if (isProduction && !isStrongProductionSecret) {
  // Fail closed: weak or default secrets must never sign production sessions.
  secret = require('crypto').randomBytes(32).toString('hex');
  console.error('SECURITY: invalid production SECRET. Using an ephemeral random secret; configure a stable cryptographically random 64-character hex SECRET to enable durable sessions.');
}

module.exports = {
  IS_PRODUCTION: isProduction,
  PORT: parseInt(env.PORT || '3000', 10),
  BASE_URL: env.BASE_URL || `http://localhost:${env.PORT || 3000}`,
  SECRET: secret,
  SECRET_CONFIGURED: !isProduction || isStrongProductionSecret,
  DB_FILE: env.DB || 'shop.db',
  DATABASE_URL: env.DATABASE_URL || env.POSTGRES_URL || env.POSTGRES_PRISMA_URL || '',

  // Admin Bootstrap & Rotation
  ADMIN_EMAIL: (env.ADMIN_EMAIL || 'admin@shop.com').toLowerCase().trim(),
  ADMIN_PASSWORD: env.ADMIN_PASSWORD || '',

  // Payment Gateways
  SSL_LIVE: env.SSL_LIVE === '1' || env.SSL_LIVE === 'true',
  SSL_STORE_ID: env.SSL_STORE_ID || '',
  SSL_STORE_PASS: env.SSL_STORE_PASS || '',

  AAMARPAY_LIVE: env.AAMARPAY_LIVE === '1' || env.AAMARPAY_LIVE === 'true',
  AAMARPAY_STORE_ID: env.AAMARPAY_STORE_ID || '',
  AAMARPAY_SIGNATURE: env.AAMARPAY_SIGNATURE || '',

  // Webhooks
  NOTIFY_WEBHOOK: env.NOTIFY_WEBHOOK || '',
};
