#!/usr/bin/env node
const crypto = require('crypto');
const db = require('../src/database/connection');
const { initSchema } = require('../src/database/schema');
const { hashPassword } = require('../src/utils/security');
const { ADMIN_EMAIL } = require('../src/config/env');

async function main() {
  const args = process.argv.slice(2);
  let email = (process.env.ADMIN_EMAIL || ADMIN_EMAIL || 'admin@shop.com').toLowerCase().trim();
  let newPassword = args[0] || process.env.ADMIN_PASSWORD;

  if (!newPassword) {
    // Generate a strong temporary password if none provided
    newPassword = crypto.randomBytes(9).toString('base64url');
    console.log('\n🔒 Generated secure random password for admin account.');
  }

  if (newPassword.length < 8) {
    console.error('❌ Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  await initSchema();

  const existingAdmin = await db.get('SELECT id, email, role FROM users WHERE email = ?', [email]);
  const hashed = hashPassword(newPassword);

  if (existingAdmin) {
    await db.run('UPDATE users SET pass = ?, role = ? WHERE email = ?', [hashed, 'admin', email]);
    console.log(`\n✅ Password successfully updated for existing admin: ${email}`);
  } else {
    await db.run('INSERT INTO users (name, email, pass, role) VALUES (?, ?, ?, ?)', [
      'Admin',
      email,
      hashed,
      'admin',
    ]);
    console.log(`\n✅ New admin account created: ${email}`);
  }

  console.log(`\n======================================================`);
  console.log(`🔑 Admin Email:    ${email}`);
  console.log(`🔑 Admin Password: ${newPassword}`);
  console.log(`======================================================`);
  console.log(`\n⚠️  Keep this credential safe! Do not share it or commit it to GitHub.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to update admin credential:', err.message);
  process.exit(1);
});
