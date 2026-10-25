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

module.exports = {
  PORT: parseInt(env.PORT || '3000', 10),
  BASE_URL: env.BASE_URL || `http://localhost:${env.PORT || 3000}`,
  SECRET: env.SECRET || 'dev-secret-change-me',
  DB_FILE: env.DB || 'shop.db',

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
