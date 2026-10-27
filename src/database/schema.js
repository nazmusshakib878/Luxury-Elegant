const path = require('path');
const fs = require('fs');
const db = require('./connection');
const { DEFAULT_SETTINGS } = require('../config/constants');
const { hashPassword } = require('../utils/security');

let schemaInitPromise = null;

async function initSchema() {
  if (schemaInitPromise) return schemaInitPromise;

  // Production must stay read-only without persistent PostgreSQL; do not run SQLite migrations/seeds.
  if (db.isProduction && !db.isPostgres) {
    schemaInitPromise = Promise.resolve();
    return schemaInitPromise;
  }

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
            sku TEXT UNIQUE,
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

          CREATE TABLE IF NOT EXISTS order_idempotency (
            idempotency_key TEXT PRIMARY KEY,
            request_hash TEXT NOT NULL,
            order_id INTEGER NOT NULL UNIQUE,
            created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS product_variants (
            id SERIAL PRIMARY KEY,
            product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
            size TEXT NOT NULL DEFAULT '',
            color TEXT NOT NULL DEFAULT '',
            sku TEXT NOT NULL UNIQUE,
            price NUMERIC NOT NULL CHECK (price > 0),
            stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
            active INTEGER NOT NULL DEFAULT 1,
            created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
          );
          CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants(product_id);
          CREATE TABLE IF NOT EXISTS order_stock_restorations (
            order_id INTEGER NOT NULL,
            line_key TEXT NOT NULL,
            restored TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(order_id, line_key)
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

          CREATE TABLE IF NOT EXISTS review_verifications (
            review_id INTEGER PRIMARY KEY,
            product_id INTEGER NOT NULL,
            order_id INTEGER NOT NULL,
            UNIQUE(product_id, order_id)
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

        await db.exec('ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT');
        await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0');
        await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified INTEGER NOT NULL DEFAULT 0');
        await db.exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_access_token_hash TEXT');
        await db.exec(`CREATE TABLE IF NOT EXISTS customer_addresses (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, label TEXT NOT NULL DEFAULT 'Home', recipient_name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL, area TEXT NOT NULL DEFAULT 'outside', is_default INTEGER NOT NULL DEFAULT 0, created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`);
        await db.exec('CREATE INDEX IF NOT EXISTS customer_addresses_user_idx ON customer_addresses(user_id)');
        await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_single_default ON customer_addresses(user_id) WHERE is_default = 1');
        await db.exec(`CREATE TABLE IF NOT EXISTS customer_wishlist (user_id INTEGER NOT NULL, product_id INTEGER NOT NULL, created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id, product_id))`);
        await db.exec(`CREATE TABLE IF NOT EXISTS password_reset_tokens (user_id INTEGER PRIMARY KEY, token_hash TEXT NOT NULL, expires TIMESTAMP WITH TIME ZONE NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`);
        await db.exec(`CREATE TABLE IF NOT EXISTS auth_rate_limits (key_hash TEXT PRIMARY KEY, hits INTEGER NOT NULL, window_ends TIMESTAMP WITH TIME ZONE NOT NULL)`);
        await db.exec('ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_access_token_expires TIMESTAMP WITH TIME ZONE');
        await db.exec(`UPDATE orders SET guest_access_token_expires = CURRENT_TIMESTAMP + INTERVAL '30 days' WHERE guest_access_token_hash IS NOT NULL AND guest_access_token_expires IS NULL`);
        await db.exec(`CREATE TABLE IF NOT EXISTS courier_shipments (id SERIAL PRIMARY KEY, order_id INTEGER NOT NULL UNIQUE, provider TEXT NOT NULL, tracking_id TEXT, consignment_id TEXT, status TEXT NOT NULL DEFAULT 'pending', delivery_charge NUMERIC, request_json TEXT, response_json TEXT, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`);
        await db.exec(`CREATE TABLE IF NOT EXISTS courier_activity (id SERIAL PRIMARY KEY, shipment_id INTEGER NOT NULL, event TEXT NOT NULL, details TEXT, created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP)`);
        await db.exec(`CREATE TABLE IF NOT EXISTS notification_outbox (id SERIAL PRIMARY KEY, event_key TEXT NOT NULL UNIQUE, order_id INTEGER, recipient_user_id INTEGER, recipient_email TEXT, recipient_phone TEXT, channel TEXT NOT NULL, event_type TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, available_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, last_error TEXT, created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, sent_at TIMESTAMP WITH TIME ZONE)`);
        await db.exec('CREATE INDEX IF NOT EXISTS notification_outbox_delivery_idx ON notification_outbox(status, available_at)');
        try { await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products(sku) WHERE sku IS NOT NULL AND sku <> ''"); }
        catch (err) { if (err.code !== '23505' && !/unique constraint|duplicate key/i.test(err.message || '')) throw err; console.warn('Existing duplicate product SKUs retained; the global inventory SKU registry will block new conflicts.'); }
        await db.exec(`CREATE TABLE IF NOT EXISTS product_variants (
          id SERIAL PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          size TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '', sku TEXT NOT NULL UNIQUE,
          price NUMERIC NOT NULL CHECK (price > 0), stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
          active INTEGER NOT NULL DEFAULT 1, created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )`);
        await db.exec('CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants(product_id)');
        await db.exec(`CREATE TABLE IF NOT EXISTS order_stock_restorations (
          order_id INTEGER NOT NULL, line_key TEXT NOT NULL, restored TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(order_id, line_key)
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS inventory_skus (
          sku_key TEXT PRIMARY KEY, sku TEXT NOT NULL, owner_type TEXT NOT NULL, owner_id INTEGER NOT NULL
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS inventory_sku_conflicts (
          sku_key TEXT NOT NULL, sku TEXT NOT NULL, owner_type TEXT NOT NULL, owner_id INTEGER NOT NULL,
          registered_owner_type TEXT NOT NULL, registered_owner_id INTEGER NOT NULL,
          PRIMARY KEY(sku_key, owner_type, owner_id)
        )`);
        // Existing conflicts are recorded and retained. Conflict sentinel keys prevent new writes
        // from reusing a SKU until the legacy duplicate rows are edited or removed.
        await db.exec("INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) SELECT UPPER(BTRIM(sku)), sku, 'product', id FROM products WHERE sku IS NOT NULL AND BTRIM(sku) <> '' ORDER BY id ON CONFLICT(sku_key) DO NOTHING");
        await db.exec("INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) SELECT UPPER(BTRIM(sku)), sku, 'variant', id FROM product_variants WHERE sku IS NOT NULL AND BTRIM(sku) <> '' ORDER BY id ON CONFLICT(sku_key) DO NOTHING");
        await db.exec(`INSERT INTO inventory_sku_conflicts(sku_key, sku, owner_type, owner_id, registered_owner_type, registered_owner_id)
          SELECT UPPER(BTRIM(p.sku)), p.sku, 'product', p.id, r.owner_type, r.owner_id FROM products p JOIN inventory_skus r ON r.sku_key = UPPER(BTRIM(p.sku)) WHERE p.sku IS NOT NULL AND (r.owner_type <> 'product' OR r.owner_id <> p.id) ON CONFLICT DO NOTHING`);
        await db.exec(`INSERT INTO inventory_sku_conflicts(sku_key, sku, owner_type, owner_id, registered_owner_type, registered_owner_id)
          SELECT UPPER(BTRIM(v.sku)), v.sku, 'variant', v.id, r.owner_type, r.owner_id FROM product_variants v JOIN inventory_skus r ON r.sku_key = UPPER(BTRIM(v.sku)) WHERE v.sku IS NOT NULL AND (r.owner_type <> 'variant' OR r.owner_id <> v.id) ON CONFLICT DO NOTHING`);
        await db.exec("UPDATE inventory_skus SET owner_type = 'legacy_conflict', owner_id = 0 WHERE sku_key IN (SELECT sku_key FROM (SELECT UPPER(BTRIM(sku)) AS sku_key FROM products WHERE sku IS NOT NULL AND BTRIM(sku) <> '' UNION ALL SELECT UPPER(BTRIM(sku)) AS sku_key FROM product_variants WHERE sku IS NOT NULL AND BTRIM(sku) <> '') live_skus GROUP BY sku_key HAVING COUNT(*) > 1)");
        await db.exec(`CREATE OR REPLACE FUNCTION claim_global_inventory_sku() RETURNS trigger AS $$
          DECLARE affected INTEGER; key_value TEXT; old_key TEXT; occupied BOOLEAN;
          BEGIN
            key_value := UPPER(BTRIM(NEW.sku));
            IF TG_OP = 'UPDATE' THEN
              old_key := UPPER(BTRIM(OLD.sku));
              IF old_key IS NOT DISTINCT FROM key_value THEN RETURN NEW; END IF;
              DELETE FROM inventory_skus WHERE sku_key = old_key AND owner_type = TG_ARGV[0] AND owner_id = OLD.id;
              IF old_key IS NOT NULL AND old_key <> '' THEN
                IF TG_ARGV[0] = 'product' THEN
                  SELECT EXISTS(SELECT 1 FROM products WHERE UPPER(BTRIM(sku)) = old_key AND id <> OLD.id) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(BTRIM(sku)) = old_key) INTO occupied;
                ELSE
                  SELECT EXISTS(SELECT 1 FROM products WHERE UPPER(BTRIM(sku)) = old_key) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(BTRIM(sku)) = old_key AND id <> OLD.id) INTO occupied;
                END IF;
                IF occupied THEN INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) VALUES(old_key, old_key, 'legacy_conflict', 0) ON CONFLICT(sku_key) DO UPDATE SET owner_type = 'legacy_conflict', owner_id = 0;
                ELSE DELETE FROM inventory_skus WHERE sku_key = old_key AND owner_type = 'legacy_conflict'; END IF;
              END IF;
              IF old_key IS NOT NULL AND old_key <> '' THEN
                IF TG_ARGV[0] = 'product' THEN
                  SELECT EXISTS(SELECT 1 FROM products WHERE UPPER(BTRIM(sku)) = old_key AND id <> OLD.id) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(BTRIM(sku)) = old_key) INTO occupied;
                ELSE
                  SELECT EXISTS(SELECT 1 FROM products WHERE UPPER(BTRIM(sku)) = old_key) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(BTRIM(sku)) = old_key AND id <> OLD.id) INTO occupied;
                END IF;
                IF occupied THEN
                  INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) VALUES(old_key, old_key, 'legacy_conflict', 0)
                  ON CONFLICT(sku_key) DO UPDATE SET sku = EXCLUDED.sku, owner_type = 'legacy_conflict', owner_id = 0;
                ELSE DELETE FROM inventory_skus WHERE sku_key = old_key AND owner_type = 'legacy_conflict'; END IF;
              END IF;
            END IF;
            IF NEW.sku IS NULL OR BTRIM(NEW.sku) = '' THEN RETURN NEW; END IF;
            IF TG_ARGV[0] = 'product' THEN
              SELECT EXISTS(SELECT 1 FROM products WHERE UPPER(BTRIM(sku)) = key_value AND id <> NEW.id) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(BTRIM(sku)) = key_value) INTO occupied;
            ELSE
              SELECT EXISTS(SELECT 1 FROM products WHERE UPPER(BTRIM(sku)) = key_value) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(BTRIM(sku)) = key_value AND id <> NEW.id) INTO occupied;
            END IF;
            IF occupied THEN RAISE EXCEPTION 'SKU already assigned globally: %', NEW.sku USING ERRCODE = '23505'; END IF;
            DELETE FROM inventory_skus WHERE sku_key = key_value AND owner_type = 'legacy_conflict';
            INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) VALUES(key_value, NEW.sku, TG_ARGV[0], NEW.id)
            ON CONFLICT(sku_key) DO UPDATE SET sku = EXCLUDED.sku
            WHERE inventory_skus.owner_type = EXCLUDED.owner_type AND inventory_skus.owner_id = EXCLUDED.owner_id;
            GET DIAGNOSTICS affected = ROW_COUNT;
            IF affected = 0 THEN RAISE EXCEPTION 'SKU already assigned globally: %', NEW.sku USING ERRCODE = '23505'; END IF;
            RETURN NEW;
          END; $$ LANGUAGE plpgsql`);
        await db.exec(`CREATE OR REPLACE FUNCTION release_global_inventory_sku() RETURNS trigger AS $$
          DECLARE key_value TEXT; occupied BOOLEAN;
          BEGIN
            key_value := UPPER(BTRIM(OLD.sku));
            DELETE FROM inventory_skus WHERE sku_key = key_value AND owner_type = TG_ARGV[0] AND owner_id = OLD.id;
            IF TG_ARGV[0] = 'product' THEN
              SELECT EXISTS(SELECT 1 FROM products WHERE UPPER(BTRIM(sku)) = key_value) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(BTRIM(sku)) = key_value) INTO occupied;
            ELSE
              SELECT EXISTS(SELECT 1 FROM products WHERE UPPER(BTRIM(sku)) = key_value) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(BTRIM(sku)) = key_value) INTO occupied;
            END IF;
            IF occupied THEN INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) VALUES(key_value, key_value, 'legacy_conflict', 0) ON CONFLICT(sku_key) DO UPDATE SET owner_type = 'legacy_conflict', owner_id = 0;
            ELSE DELETE FROM inventory_skus WHERE sku_key = key_value; END IF;
            RETURN OLD;
          END; $$ LANGUAGE plpgsql`);
        for (const [table, kind] of [['products', 'product'], ['product_variants', 'variant']]) {
          const trigger = table + '_global_sku';
          await db.exec(`DROP TRIGGER IF EXISTS ${trigger}_claim ON ${table}`);
          await db.exec(`CREATE TRIGGER ${trigger}_claim AFTER INSERT OR UPDATE OF sku ON ${table} FOR EACH ROW EXECUTE FUNCTION claim_global_inventory_sku('${kind}')`);
          await db.exec(`DROP TRIGGER IF EXISTS ${trigger}_release ON ${table}`);
          await db.exec(`CREATE TRIGGER ${trigger}_release AFTER DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION release_global_inventory_sku('${kind}')`);
        }

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
            sku TEXT UNIQUE,
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

          CREATE TABLE IF NOT EXISTS order_idempotency (
            idempotency_key TEXT PRIMARY KEY,
            request_hash TEXT NOT NULL,
            order_id INTEGER NOT NULL UNIQUE,
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

          CREATE TABLE IF NOT EXISTS review_verifications (
            review_id INTEGER PRIMARY KEY,
            product_id INTEGER NOT NULL,
            order_id INTEGER NOT NULL,
            UNIQUE(product_id, order_id)
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

        try { await db.exec('ALTER TABLE products ADD COLUMN sku TEXT'); }
        catch (err) { if (!/duplicate column name/i.test(err.message || '')) throw err; }
        for (const sql of ['ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0', 'ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0', 'ALTER TABLE orders ADD COLUMN guest_access_token_hash TEXT']) {
          try { await db.exec(sql); } catch (err) { if (!/duplicate column name/i.test(err.message || '')) throw err; }
        }
        await db.exec(`CREATE TABLE IF NOT EXISTS customer_addresses (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, label TEXT NOT NULL DEFAULT 'Home', recipient_name TEXT NOT NULL, phone TEXT NOT NULL, address TEXT NOT NULL, area TEXT NOT NULL DEFAULT 'outside', is_default INTEGER NOT NULL DEFAULT 0, created TEXT DEFAULT CURRENT_TIMESTAMP)`);
        await db.exec('CREATE INDEX IF NOT EXISTS customer_addresses_user_idx ON customer_addresses(user_id)');
        await db.exec('CREATE UNIQUE INDEX IF NOT EXISTS customer_addresses_single_default ON customer_addresses(user_id) WHERE is_default = 1');
        await db.exec(`CREATE TABLE IF NOT EXISTS customer_wishlist (user_id INTEGER NOT NULL, product_id INTEGER NOT NULL, created TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id, product_id))`);
        await db.exec(`CREATE TABLE IF NOT EXISTS password_reset_tokens (user_id INTEGER PRIMARY KEY, token_hash TEXT NOT NULL, expires TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created TEXT DEFAULT CURRENT_TIMESTAMP)`);
        await db.exec(`CREATE TABLE IF NOT EXISTS auth_rate_limits (key_hash TEXT PRIMARY KEY, hits INTEGER NOT NULL, window_ends TEXT NOT NULL)`);
        try { await db.exec('ALTER TABLE orders ADD COLUMN guest_access_token_expires TEXT'); } catch (err) { if (!/duplicate column name/i.test(err.message || '')) throw err; }
        await db.exec("UPDATE orders SET guest_access_token_expires = datetime('now', '+30 days') WHERE guest_access_token_hash IS NOT NULL AND guest_access_token_expires IS NULL");
        await db.exec(`CREATE TABLE IF NOT EXISTS courier_shipments (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL UNIQUE, provider TEXT NOT NULL, tracking_id TEXT, consignment_id TEXT, status TEXT NOT NULL DEFAULT 'pending', delivery_charge REAL, request_json TEXT, response_json TEXT, attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP, updated TEXT DEFAULT CURRENT_TIMESTAMP)`);
        await db.exec(`CREATE TABLE IF NOT EXISTS courier_activity (id INTEGER PRIMARY KEY AUTOINCREMENT, shipment_id INTEGER NOT NULL, event TEXT NOT NULL, details TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP)`);
        await db.exec(`CREATE TABLE IF NOT EXISTS notification_outbox (id INTEGER PRIMARY KEY AUTOINCREMENT, event_key TEXT NOT NULL UNIQUE, order_id INTEGER, recipient_user_id INTEGER, recipient_email TEXT, recipient_phone TEXT, channel TEXT NOT NULL, event_type TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, available_at TEXT DEFAULT CURRENT_TIMESTAMP, last_error TEXT, created TEXT DEFAULT CURRENT_TIMESTAMP, sent_at TEXT)`);
        await db.exec('CREATE INDEX IF NOT EXISTS notification_outbox_delivery_idx ON notification_outbox(status, available_at)');
        try { await db.exec("CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique ON products(sku) WHERE sku IS NOT NULL AND sku <> ''"); }
        catch (err) { if (!/unique constraint|duplicate key/i.test(err.message || '')) throw err; console.warn('Existing duplicate product SKUs retained; the global inventory SKU registry will block new conflicts.'); }
        await db.exec(`CREATE TABLE IF NOT EXISTS product_variants (
          id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          size TEXT NOT NULL DEFAULT '', color TEXT NOT NULL DEFAULT '', sku TEXT NOT NULL UNIQUE,
          price REAL NOT NULL CHECK (price > 0), stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
          active INTEGER NOT NULL DEFAULT 1, created TEXT DEFAULT CURRENT_TIMESTAMP
        )`);
        await db.exec('CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants(product_id)');
        await db.exec(`CREATE TABLE IF NOT EXISTS order_stock_restorations (
          order_id INTEGER NOT NULL, line_key TEXT NOT NULL, restored TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY(order_id, line_key)
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS inventory_skus (
          sku_key TEXT PRIMARY KEY, sku TEXT NOT NULL, owner_type TEXT NOT NULL, owner_id INTEGER NOT NULL
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS inventory_sku_conflicts (
          sku_key TEXT NOT NULL, sku TEXT NOT NULL, owner_type TEXT NOT NULL, owner_id INTEGER NOT NULL,
          registered_owner_type TEXT NOT NULL, registered_owner_id INTEGER NOT NULL,
          PRIMARY KEY(sku_key, owner_type, owner_id)
        )`);
        await db.exec("INSERT OR IGNORE INTO inventory_skus(sku_key, sku, owner_type, owner_id) SELECT UPPER(TRIM(sku)), sku, 'product', id FROM products WHERE sku IS NOT NULL AND TRIM(sku) <> '' ORDER BY id");
        await db.exec("INSERT OR IGNORE INTO inventory_skus(sku_key, sku, owner_type, owner_id) SELECT UPPER(TRIM(sku)), sku, 'variant', id FROM product_variants WHERE sku IS NOT NULL AND TRIM(sku) <> '' ORDER BY id");
        await db.exec(`INSERT OR IGNORE INTO inventory_sku_conflicts(sku_key, sku, owner_type, owner_id, registered_owner_type, registered_owner_id)
          SELECT UPPER(TRIM(p.sku)), p.sku, 'product', p.id, r.owner_type, r.owner_id FROM products p JOIN inventory_skus r ON r.sku_key = UPPER(TRIM(p.sku)) WHERE p.sku IS NOT NULL AND (r.owner_type <> 'product' OR r.owner_id <> p.id)`);
        await db.exec(`INSERT OR IGNORE INTO inventory_sku_conflicts(sku_key, sku, owner_type, owner_id, registered_owner_type, registered_owner_id)
          SELECT UPPER(TRIM(v.sku)), v.sku, 'variant', v.id, r.owner_type, r.owner_id FROM product_variants v JOIN inventory_skus r ON r.sku_key = UPPER(TRIM(v.sku)) WHERE v.sku IS NOT NULL AND (r.owner_type <> 'variant' OR r.owner_id <> v.id)`);
        await db.exec("UPDATE inventory_skus SET owner_type = 'legacy_conflict', owner_id = 0 WHERE sku_key IN (SELECT sku_key FROM (SELECT UPPER(TRIM(sku)) AS sku_key FROM products WHERE sku IS NOT NULL AND TRIM(sku) <> '' UNION ALL SELECT UPPER(TRIM(sku)) AS sku_key FROM product_variants WHERE sku IS NOT NULL AND TRIM(sku) <> '') live_skus GROUP BY sku_key HAVING COUNT(*) > 1)");
        await db.exec(`CREATE TRIGGER IF NOT EXISTS products_global_sku_insert_check BEFORE INSERT ON products WHEN NEW.sku IS NOT NULL AND TRIM(NEW.sku) <> '' AND (EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku))) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku)))) BEGIN SELECT RAISE(ABORT, 'SKU already assigned globally'); END`);
        await db.exec(`CREATE TRIGGER IF NOT EXISTS products_global_sku_insert AFTER INSERT ON products WHEN NEW.sku IS NOT NULL AND TRIM(NEW.sku) <> '' BEGIN DELETE FROM inventory_skus WHERE sku_key = UPPER(TRIM(NEW.sku)) AND owner_type = 'legacy_conflict'; INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) VALUES(UPPER(TRIM(NEW.sku)), NEW.sku, 'product', NEW.id); END`);
        await db.exec(`CREATE TRIGGER IF NOT EXISTS products_global_sku_update_check BEFORE UPDATE OF sku ON products WHEN UPPER(TRIM(NEW.sku)) IS NOT UPPER(TRIM(OLD.sku)) AND NEW.sku IS NOT NULL AND TRIM(NEW.sku) <> '' AND (EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku)) AND id <> OLD.id) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku)))) BEGIN SELECT RAISE(ABORT, 'SKU already assigned globally'); END`);
        await db.exec(`CREATE TRIGGER IF NOT EXISTS products_global_sku_update AFTER UPDATE OF sku ON products WHEN UPPER(TRIM(NEW.sku)) IS NOT UPPER(TRIM(OLD.sku)) BEGIN DELETE FROM inventory_skus WHERE sku_key = UPPER(TRIM(OLD.sku)) AND owner_type = 'product' AND owner_id = OLD.id; INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) SELECT UPPER(TRIM(OLD.sku)), OLD.sku, 'legacy_conflict', 0 WHERE OLD.sku IS NOT NULL AND (EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku))) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku)))) ON CONFLICT(sku_key) DO UPDATE SET owner_type = 'legacy_conflict', owner_id = 0; DELETE FROM inventory_skus WHERE sku_key = UPPER(TRIM(OLD.sku)) AND owner_type = 'legacy_conflict' AND NOT EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku))) AND NOT EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku))); DELETE FROM inventory_skus WHERE sku_key = UPPER(TRIM(NEW.sku)) AND owner_type = 'legacy_conflict' AND NOT EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku)) AND id <> NEW.id) AND NOT EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku))); INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) SELECT UPPER(TRIM(NEW.sku)), NEW.sku, 'product', NEW.id WHERE NEW.sku IS NOT NULL AND TRIM(NEW.sku) <> ''; END`);
        await db.exec(`CREATE TRIGGER IF NOT EXISTS products_global_sku_delete AFTER DELETE ON products BEGIN DELETE FROM inventory_skus WHERE sku_key = UPPER(TRIM(OLD.sku)) AND owner_type = 'product' AND owner_id = OLD.id; INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) SELECT UPPER(TRIM(OLD.sku)), OLD.sku, 'legacy_conflict', 0 WHERE OLD.sku IS NOT NULL AND (EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku))) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku)))) ON CONFLICT(sku_key) DO UPDATE SET owner_type = 'legacy_conflict', owner_id = 0; DELETE FROM inventory_skus WHERE sku_key = UPPER(TRIM(OLD.sku)) AND NOT EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku))) AND NOT EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku))); END`);
        await db.exec(`CREATE TRIGGER IF NOT EXISTS variants_global_sku_insert_check BEFORE INSERT ON product_variants WHEN NEW.sku IS NOT NULL AND TRIM(NEW.sku) <> '' AND (EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku))) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku)))) BEGIN SELECT RAISE(ABORT, 'SKU already assigned globally'); END`);
        await db.exec(`CREATE TRIGGER IF NOT EXISTS variants_global_sku_insert AFTER INSERT ON product_variants WHEN NEW.sku IS NOT NULL AND TRIM(NEW.sku) <> '' BEGIN DELETE FROM inventory_skus WHERE sku_key = UPPER(TRIM(NEW.sku)) AND owner_type = 'legacy_conflict'; INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) VALUES(UPPER(TRIM(NEW.sku)), NEW.sku, 'variant', NEW.id); END`);
        await db.exec(`CREATE TRIGGER IF NOT EXISTS variants_global_sku_update_check BEFORE UPDATE OF sku ON product_variants WHEN UPPER(TRIM(NEW.sku)) IS NOT UPPER(TRIM(OLD.sku)) AND NEW.sku IS NOT NULL AND TRIM(NEW.sku) <> '' AND (EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku))) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku)) AND id <> OLD.id)) BEGIN SELECT RAISE(ABORT, 'SKU already assigned globally'); END`);
        await db.exec(`CREATE TRIGGER IF NOT EXISTS variants_global_sku_update AFTER UPDATE OF sku ON product_variants WHEN UPPER(TRIM(NEW.sku)) IS NOT UPPER(TRIM(OLD.sku)) BEGIN DELETE FROM inventory_skus WHERE sku_key = UPPER(TRIM(OLD.sku)) AND owner_type = 'variant' AND owner_id = OLD.id; INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) SELECT UPPER(TRIM(OLD.sku)), OLD.sku, 'legacy_conflict', 0 WHERE OLD.sku IS NOT NULL AND (EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku))) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku)))) ON CONFLICT(sku_key) DO UPDATE SET owner_type = 'legacy_conflict', owner_id = 0; DELETE FROM inventory_skus WHERE sku_key = UPPER(TRIM(OLD.sku)) AND owner_type = 'legacy_conflict' AND NOT EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku))) AND NOT EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku))); DELETE FROM inventory_skus WHERE sku_key = UPPER(TRIM(NEW.sku)) AND owner_type = 'legacy_conflict' AND NOT EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku))) AND NOT EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(NEW.sku)) AND id <> NEW.id); INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) SELECT UPPER(TRIM(NEW.sku)), NEW.sku, 'variant', NEW.id WHERE NEW.sku IS NOT NULL AND TRIM(NEW.sku) <> ''; END`);
        await db.exec(`CREATE TRIGGER IF NOT EXISTS variants_global_sku_delete AFTER DELETE ON product_variants BEGIN DELETE FROM inventory_skus WHERE sku_key = UPPER(TRIM(OLD.sku)) AND owner_type = 'variant' AND owner_id = OLD.id; INSERT INTO inventory_skus(sku_key, sku, owner_type, owner_id) SELECT UPPER(TRIM(OLD.sku)), OLD.sku, 'legacy_conflict', 0 WHERE OLD.sku IS NOT NULL AND (EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku))) OR EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku)))) ON CONFLICT(sku_key) DO UPDATE SET owner_type = 'legacy_conflict', owner_id = 0; DELETE FROM inventory_skus WHERE sku_key = UPPER(TRIM(OLD.sku)) AND NOT EXISTS(SELECT 1 FROM products WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku))) AND NOT EXISTS(SELECT 1 FROM product_variants WHERE UPPER(TRIM(sku)) = UPPER(TRIM(OLD.sku))); END`);

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
      } else {
        // 3. Resilient In-Memory Fallback (Vercel without PostgreSQL configured)
        if (typeof db.getMemoryStore === 'function') {
          db.getMemoryStore();
        }
        console.log('🌿 [CATALOG READY] Running in resilient in-memory fallback mode with full catalog.');
      }
    } catch (err) {
      schemaInitPromise = null;
      console.error('Database schema initialization error:', err.message);
      throw err;
    }
  })();

  return schemaInitPromise;
}

module.exports = { initSchema };
