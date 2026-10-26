const path = require('path');
const fs = require('fs');
const db = require('./connection');
const { DEFAULT_SETTINGS } = require('../config/constants');
const { hashPassword } = require('../utils/security');

let schemaInitPromise = null;

async function initSchema() {
  if (schemaInitPromise) return schemaInitPromise;

  schemaInitPromise = (async () => {
    try {
      if (db.isPostgres) {
        // 1. PostgreSQL Schema
        await db.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            phone TEXT,
            pass TEXT,
            role TEXT DEFAULT 'customer',
            created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name TEXT UNIQUE
          );

          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT,
            cat_id INTEGER,
            price NUMERIC,
            sale_price NUMERIC,
            stock INTEGER DEFAULT 0,
            image TEXT,
            description TEXT,
            variants TEXT DEFAULT '{}',
            flash_end TEXT,
            active INTEGER DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            user_id INTEGER,
            name TEXT,
            phone TEXT,
            address TEXT,
            area TEXT,
            items TEXT,
            subtotal NUMERIC,
            discount NUMERIC,
            shipping NUMERIC,
            total NUMERIC,
            coupon TEXT,
            method TEXT,
            payment_status TEXT DEFAULT 'unpaid',
            status TEXT DEFAULT 'pending',
            return_status TEXT,
            return_reason TEXT,
            created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS coupons (
            code TEXT PRIMARY KEY,
            percent NUMERIC,
            active INTEGER DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            product_id INTEGER,
            user_name TEXT,
            rating INTEGER,
            comment TEXT,
            created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS abandoned (
            phone TEXT PRIMARY KEY,
            items TEXT,
            updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS settings (
            k TEXT PRIMARY KEY,
            v TEXT
          );
        `);

        // Safe Catalog Seeding (Categories, Products, Coupons, Settings - NO customer or order data)
        const existingCats = await db.get('SELECT COUNT(*) AS count FROM categories');
        if (+existingCats.count === 0) {
          console.log('📦 Seeding initial catalog data into PostgreSQL...');
          try {
            const seedPath = path.resolve(__dirname, 'seed-data.json');
            if (fs.existsSync(seedPath)) {
              const snapshot = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

              // Seed Categories
              for (const cat of (snapshot.categories || [])) {
                await db.run('INSERT INTO categories (id, name) VALUES (?, ?) ON CONFLICT (id) DO NOTHING', [cat.id, cat.name]);
              }
              await db.exec(`SELECT setval(pg_get_serial_sequence('categories', 'id'), COALESCE(MAX(id), 1)) FROM categories;`);

              // Seed Products
              for (const p of (snapshot.products || [])) {
                await db.run('INSERT INTO products (id, name, cat_id, price, sale_price, stock, image, description, variants, flash_end, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING', [
                  p.id, p.name, p.cat_id, p.price, p.sale_price, p.stock, p.image, p.description, p.variants, p.flash_end, p.active ?? 1
                ]);
              }
              await db.exec(`SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE(MAX(id), 1)) FROM products;`);

              // Seed Coupons
              for (const c of (snapshot.coupons || [])) {
                await db.run('INSERT INTO coupons (code, percent, active) VALUES (?, ?, ?) ON CONFLICT (code) DO NOTHING', [c.code, c.percent, c.active]);
              }

              // Seed Settings
              for (const s of (snapshot.settings || [])) {
                await db.run('INSERT INTO settings (k, v) VALUES (?, ?) ON CONFLICT (k) DO NOTHING', [s.k, s.v]);
              }

              console.log('✅ PostgreSQL catalog seeded successfully!');
            }
          } catch (seedErr) {
            console.error('Error importing catalog data:', seedErr.message);
          }
        }

        // Bootstrap Admin User safely if missing
        const adminCheck = await db.get("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1");
        const { ADMIN_EMAIL, ADMIN_PASSWORD, IS_PRODUCTION } = require('../config/env');
        if (!adminCheck) {
          if (ADMIN_PASSWORD && ADMIN_PASSWORD.trim().length >= 8) {
            await db.run('INSERT INTO users (name, email, pass, role) VALUES (?, ?, ?, ?) ON CONFLICT (email) DO NOTHING', [
              'Admin',
              ADMIN_EMAIL,
              hashPassword(ADMIN_PASSWORD.trim()),
              'admin',
            ]);
            console.log(`✅ Admin account initialized for: ${ADMIN_EMAIL}`);
          } else if (!IS_PRODUCTION) {
            const crypto = require('crypto');
            const devPass = crypto.randomBytes(6).toString('hex');
            await db.run('INSERT INTO users (name, email, pass, role) VALUES (?, ?, ?, ?) ON CONFLICT (email) DO NOTHING', [
              'Admin',
              ADMIN_EMAIL,
              hashPassword(devPass),
              'admin',
            ]);
            console.log(`🔑 [LOCAL DEV ONLY] Temporary Admin created: ${ADMIN_EMAIL} / ${devPass}`);
          } else {
            console.warn(`⚠️ [ACTION REQUIRED] No admin user found in database. Set ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars) in environment variables to bootstrap admin access.`);
          }
        }
      } else if (!db.isVercel && db.sqlite) {
        // 2. SQLite Schema (local mode)
        await db.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            name TEXT,
            email TEXT UNIQUE,
            phone TEXT,
            pass TEXT,
            role TEXT DEFAULT 'customer',
            created TEXT DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE
          );

          CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            name TEXT,
            cat_id INTEGER,
            price REAL,
            sale_price REAL,
            stock INTEGER DEFAULT 0,
            image TEXT,
            description TEXT,
            variants TEXT DEFAULT '{}',
            flash_end TEXT,
            active INTEGER DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            name TEXT,
            phone TEXT,
            address TEXT,
            area TEXT,
            items TEXT,
            subtotal REAL,
            discount REAL,
            shipping REAL,
            total REAL,
            coupon TEXT,
            method TEXT,
            payment_status TEXT DEFAULT 'unpaid',
            status TEXT DEFAULT 'pending',
            return_status TEXT,
            return_reason TEXT,
            created TEXT DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS coupons (
            code TEXT PRIMARY KEY,
            percent REAL,
            active INTEGER DEFAULT 1
          );

          CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY,
            product_id INTEGER,
            user_name TEXT,
            rating INTEGER,
            comment TEXT,
            created TEXT DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS abandoned (
            phone TEXT PRIMARY KEY,
            items TEXT,
            updated TEXT DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS settings (
            k TEXT PRIMARY KEY,
            v TEXT
          );
        `);

        // Insert default settings if missing
        for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
          await db.run('INSERT OR IGNORE INTO settings (k, v) VALUES (?, ?)', [key, value]);
        }

        // Seed initial catalog if fresh SQLite database
        const sqliteCats = await db.get('SELECT COUNT(*) AS count FROM categories');
        if (+sqliteCats.count === 0) {
          try {
            const seedPath = path.resolve(__dirname, 'seed-data.json');
            if (fs.existsSync(seedPath)) {
              const snapshot = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
              for (const cat of (snapshot.categories || [])) {
                await db.run('INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)', [cat.id, cat.name]);
              }
              for (const p of (snapshot.products || [])) {
                await db.run('INSERT OR IGNORE INTO products (id, name, cat_id, price, sale_price, stock, image, description, variants, flash_end, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
                  p.id, p.name, p.cat_id, p.price, p.sale_price, p.stock, p.image, p.description, p.variants, p.flash_end, p.active ?? 1
                ]);
              }
              for (const c of (snapshot.coupons || [])) {
                await db.run('INSERT OR IGNORE INTO coupons (code, percent, active) VALUES (?, ?, ?)', [c.code, c.percent, c.active]);
              }
              // Ensure default coupons
              const defCoupons = [
                ['WELCOME10', 10, 1],
                ['LUXURY10', 10, 1],
                ['VIP20', 20, 1],
                ['ELEGANT15', 15, 1],
              ];
              for (const [code, pct, act] of defCoupons) {
                await db.run('INSERT OR IGNORE INTO coupons (code, percent, active) VALUES (?, ?, ?)', [code, pct, act]);
              }
            }
          } catch (seedErr) {
            console.error('Error seeding SQLite catalog:', seedErr.message);
          }
        }

        // Bootstrap Admin in SQLite if missing
        const sqliteAdmin = await db.get("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1");
        const { ADMIN_EMAIL, ADMIN_PASSWORD } = require('../config/env');
        if (!sqliteAdmin && ADMIN_PASSWORD && ADMIN_PASSWORD.trim().length >= 8) {
          await db.run('INSERT OR IGNORE INTO users (name, email, pass, role) VALUES (?, ?, ?, ?)', [
            'Admin',
            ADMIN_EMAIL,
            hashPassword(ADMIN_PASSWORD.trim()),
            'admin',
          ]);
          console.log(`✅ SQLite Admin account created: ${ADMIN_EMAIL}`);
        }
      }
    } catch (err) {
      console.error('Database schema initialization error:', err.message);
    }
  })();

  return schemaInitPromise;
}

module.exports = { initSchema };
