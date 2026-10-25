const db = require('./connection');
const { DEFAULT_SETTINGS } = require('../config/constants');
const { hashPassword } = require('../utils/security');

function initSchema() {
  db.exec(`
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
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (k, v) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    insertSetting.run(key, value);
  }

  // Seed default Admin and sample products if no users exist
  const hasUsers = db.prepare('SELECT 1 FROM users LIMIT 1').get();
  if (!hasUsers) {
    db.prepare("INSERT INTO users (name, email, pass, role) VALUES ('Admin', 'admin@shop.com', ?, 'admin')")
      .run(hashPassword('admin123'));

    const insertCat = db.prepare('INSERT INTO categories (name) VALUES (?)');
    ['Fashion', 'Electronics', 'Home & Living', 'Beauty'].forEach((cat) => insertCat.run(cat));

    const sampleProducts = [
      ['Riviera Tailored Linen Shirt', 1, 2490, 1790, 40, '/images/prod-1.jpg', '{"sizes":["S","M","L","XL"],"colors":["White","Navy","Olive"]}', 'Meticulously crafted from 100% European flax linen. Breathable, relaxed tailoring with mother-of-pearl buttons, ideal for refined tropical elegance.'],
      ['Milano Full-Grain Leather Weekender', 1, 6900, 0, 15, '/images/prod-2.jpg', '{"colors":["Tan","Black"]}', 'Handcrafted from vegetable-tanned full-grain cognac leather. Features antique brass hardware, reinforced luggage handles, and spacious waterproof lined interior.'],
      ['Geneva Gold Minimalist Watch', 1, 4500, 3600, 25, '/images/prod-3.jpg', '{"colors":["Silver","Gold"]}', 'Ultra-slim surgical-grade champagne gold casing with scratch-resistant sapphire crystal and Italian top-grain calfskin leather strap. Accurate Swiss quartz movement.'],
      ['Aura Pro Studio Wireless Headphones', 2, 8900, 6990, 30, '/images/prod-4.jpg', '{"colors":["Black","White"]}', 'Precision 40mm titanium acoustic drivers, hybrid active noise cancellation, brushed aluminum hardware, and 45-hour ultra-long battery life with spatial audio.'],
      ['PulseTrack OLED Smart Fitness Band', 2, 3200, 0, 50, '/images/prod-5.jpg', '{}', 'Vibrant curved 1.47-inch AMOLED display with real-time biometric heart rate, SpO2 monitoring, 50m water resistance, and 14-day endurance battery.'],
      ['Nordic Ceramic Sculptural Table Lamp', 3, 2800, 0, 20, '/images/prod-6.jpg', '{"colors":["Cream","Sage"]}', 'Hand-thrown matte textured stoneware ceramic base complemented by a natural woven linen shade. Emits warm ambient illumination for serene interiors.'],
      ['Botanical Amber Soy Scented Candle', 3, 1450, 990, 60, '/images/prod-7.jpg', '{}', 'Poured with 100% organic soy wax and natural wooden wick in an apothecary amber glass vessel. Infused with cedarwood, vanilla amber, and bergamot essential oils.'],
      ['Lumière 20% Vitamin C Radiance Serum', 4, 1850, 0, 45, '/images/prod-8.jpg', '{}', 'Advanced antioxidant brightening elixir formulated with 20% stabilized L-Ascorbic Acid, pure hyaluronic acid, and botanical ferulic acid for a luminous, firm complexion.'],
    ];

    const flashEnd = new Date(Date.now() + 3 * 864e5).toISOString();
    const insertProd = db.prepare(`
      INSERT INTO products (name, cat_id, price, sale_price, stock, image, description, variants, flash_end)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    sampleProducts.forEach(([name, catId, price, salePrice, stock, imgPath, variants, desc]) => {
      insertProd.run(
        name,
        catId,
        price,
        salePrice || null,
        stock,
        imgPath,
        desc,
        variants,
        salePrice ? flashEnd : null
      );
    });

    db.prepare("INSERT INTO coupons (code, percent, active) VALUES ('WELCOME10', 10, 1)").run();
  }
}

module.exports = { initSchema };
