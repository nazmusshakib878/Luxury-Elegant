#!/usr/bin/env node
const db = require('../src/database/connection');
const { initSchema } = require('../src/database/schema');
const { DATABASE_URL, ADMIN_EMAIL } = require('../src/config/env');

async function main() {
  console.log('🚀 Running Production Database Migration & Verification...');

  if (!DATABASE_URL) {
    console.log('ℹ️  No DATABASE_URL set. Running in local SQLite mode.');
  } else {
    console.log(`📡 Connecting to PostgreSQL: ${DATABASE_URL.replace(/:[^:@]+@/, ':***@')}`);
  }

  await initSchema();

  const categories = await db.all('SELECT COUNT(*) AS c FROM categories');
  const products = await db.all('SELECT COUNT(*) AS c FROM products');
  const coupons = await db.all('SELECT COUNT(*) AS c FROM coupons');
  const settings = await db.all('SELECT COUNT(*) AS c FROM settings');
  const users = await db.all("SELECT id, name, email, role FROM users WHERE role = 'admin'");

  console.log('\n📊 Migration Status & Table Counts:');
  console.log(`- Categories: ${categories[0]?.c || 0}`);
  console.log(`- Products:   ${products[0]?.c || 0}`);
  console.log(`- Coupons:    ${coupons[0]?.c || 0}`);
  console.log(`- Settings:   ${settings[0]?.c || 0}`);
  console.log(`- Admin Users: ${users.length} (${users.map(u => u.email).join(', ') || 'None - configure ADMIN_PASSWORD'})`);

  if (users.length === 0) {
    console.warn('\n⚠️  ACTION REQUIRED: Set ADMIN_PASSWORD in environment variables to bootstrap admin.');
  } else {
    console.log('\n✅ Database schema and catalog are fully prepared for production launch!');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
