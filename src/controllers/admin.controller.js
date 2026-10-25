const path = require('path');
const fs = require('fs');
const db = require('../database/connection');
const { DB_FILE } = require('../config/env');
const { DEFAULT_SETTINGS } = require('../config/constants');
const { hashPassword } = require('../utils/security');
const { addEventClient, removeEventClient } = require('../services/notification');
const { PRODUCT_QUERY, shapeProduct, getStoreSettings } = require('./store.controller');

// SSE real-time events for admin dashboard
exports.getEvents = (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('\n');
  addEventClient(res);

  req.on('close', () => {
    removeEventClient(res);
  });
};

// Dashboard analytics & metrics
exports.getStats = (req, res) => {
  const liveFilter = "status NOT IN ('cancelled', 'refunded') AND (payment_status = 'paid' OR status = 'delivered')";
  const getSingle = (sql) => db.prepare(sql).get();
  const allOrders = db.prepare('SELECT * FROM orders').all();

  // Calculate top selling products
  const topProductsMap = {};
  allOrders
    .filter((o) => !['cancelled', 'refunded'].includes(o.status))
    .forEach((o) => {
      try {
        const items = JSON.parse(o.items || '[]');
        items.forEach((item) => {
          topProductsMap[item.name] = (topProductsMap[item.name] || 0) + item.qty;
        });
      } catch {}
    });

  const revenueRow = getSingle(`SELECT IFNULL(SUM(total), 0) AS v FROM orders WHERE ${liveFilter}`);
  const todayRow = getSingle(`SELECT IFNULL(SUM(total), 0) AS v FROM orders WHERE ${liveFilter} AND DATE(created) = DATE('now')`);
  const customerRow = getSingle("SELECT COUNT(*) AS v FROM users WHERE role = 'customer'");

  const byStatus = db.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all();
  const days = db.prepare(`
    SELECT DATE(created) AS d, SUM(total) AS v 
    FROM orders 
    WHERE ${liveFilter} AND created >= DATE('now', '-6 day') 
    GROUP BY d
  `).all();

  const top = Object.entries(topProductsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const low = db.prepare('SELECT id, name, stock FROM products WHERE stock <= 5 ORDER BY stock ASC').all();

  res.json({
    revenue: revenueRow.v,
    today: todayRow.v,
    orders: allOrders.length,
    customers: customerRow.v,
    byStatus,
    days,
    top,
    low,
  });
};

// Product management
function parseProductPayload(body) {
  // Category id resolution: body.cat_id, body.category_id, body.category
  let catId = body.cat_id !== undefined ? body.cat_id : (body.category_id !== undefined ? body.category_id : body.category);
  if (catId !== undefined && catId !== null && catId !== '') {
    const trimmed = String(catId).trim();
    if (/^\d+$/.test(trimmed)) {
      catId = Number(trimmed);
    } else {
      const found = db.prepare('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)').get(trimmed);
      catId = found ? found.id : null;
    }
  } else {
    catId = null;
  }

  // Price sanitization (strips currency symbols, commas)
  const sanitizeNum = (val) => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const clean = String(val).replace(/[^0-9.-]/g, '');
    const num = Number(clean);
    return isNaN(num) ? 0 : num;
  };

  const price = sanitizeNum(body.price) || 0;
  const salePrice = sanitizeNum(body.sale_price);
  const stock = body.stock !== undefined ? Math.max(0, parseInt(sanitizeNum(body.stock) || 0, 10)) : 0;

  // Image path normalization
  let image = typeof body.image === 'string' ? body.image.trim() : '';
  if (image && !image.startsWith('http://') && !image.startsWith('https://') && !image.startsWith('data:') && !image.startsWith('/')) {
    image = image.startsWith('images/') ? '/' + image : '/images/' + image;
  }

  // Active status
  let active = 1;
  const rawActive = body.active !== undefined ? body.active : body.is_active;
  if (rawActive === 0 || rawActive === false || rawActive === '0' || rawActive === 'false') {
    active = 0;
  }

  return [
    String(body.name || '').trim(),
    catId,
    price,
    salePrice,
    stock,
    image,
    body.description || '',
    typeof body.variants === 'string' ? body.variants : JSON.stringify(body.variants || {}),
    body.flash_end || null,
    active,
  ];
}

exports.getProducts = (req, res) => {
  const products = db.prepare(PRODUCT_QUERY).all().map(shapeProduct);
  res.json(products);
};

exports.createProduct = (req, res) => {
  if (!req.body.name) {
    throw new Error('Product name is required');
  }

  const result = db.prepare(`
    INSERT INTO products (name, cat_id, price, sale_price, stock, image, description, variants, flash_end, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(...parseProductPayload(req.body));

  res.json({ id: result.lastInsertRowid });
};

exports.updateProduct = (req, res) => {
  db.prepare(`
    UPDATE products 
    SET name = ?, cat_id = ?, price = ?, sale_price = ?, stock = ?, image = ?, description = ?, variants = ?, flash_end = ?, active = ?
    WHERE id = ?
  `).run(...parseProductPayload(req.body), req.params.id);

  res.json({ ok: 1 });
};

exports.deleteProduct = (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ ok: 1 });
};

// Category management
exports.createCategory = (req, res) => {
  db.prepare('INSERT INTO categories (name) VALUES (?)').run(req.body.name);
  res.json({ ok: 1 });
};

exports.deleteCategory = (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: 1 });
};

// Order management
exports.getOrders = (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all().map((o) => ({
    ...o,
    items: JSON.parse(o.items || '[]'),
  }));
  res.json(orders);
};

exports.updateOrder = (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) {
    throw new Error('Order not found');
  }

  const { status, payment_status, return_status } = req.body;
  const newStatus = status || order.status;
  const terminalStatuses = ['cancelled', 'refunded'];

  // If status is transitioning to cancelled/refunded, replenish product stock
  if (terminalStatuses.includes(newStatus) && !terminalStatuses.includes(order.status)) {
    try {
      const items = JSON.parse(order.items || '[]');
      const restoreStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      items.forEach((item) => restoreStock.run(item.qty, item.id));
    } catch {}
  }

  db.prepare(`
    UPDATE orders 
    SET status = ?, payment_status = ?, return_status = ? 
    WHERE id = ?
  `).run(
    newStatus,
    payment_status || order.payment_status,
    return_status !== undefined ? return_status : order.return_status,
    order.id
  );

  res.json({ ok: 1 });
};

// Customer list
exports.getCustomers = (req, res) => {
  const customers = db.prepare(`
    SELECT 
      u.id, u.name, u.email, u.phone, u.created,
      (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS orders,
      (SELECT IFNULL(SUM(total), 0) FROM orders WHERE user_id = u.id) AS spent
    FROM users u 
    WHERE role = 'customer'
  `).all();

  res.json(customers);
};

// Coupon management
exports.getCoupons = (req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons').all();
  res.json(coupons);
};

exports.createCoupon = (req, res) => {
  db.prepare('INSERT OR REPLACE INTO coupons (code, percent, active) VALUES (?, ?, 1)')
    .run(String(req.body.code || '').toUpperCase(), +req.body.percent);

  res.json({ ok: 1 });
};

exports.deleteCoupon = (req, res) => {
  db.prepare('DELETE FROM coupons WHERE code = ?').run(req.params.c);
  res.json({ ok: 1 });
};

// Abandoned carts
exports.getAbandonedCarts = (req, res) => {
  const abandoned = db.prepare('SELECT * FROM abandoned ORDER BY updated DESC').all().map((a) => ({
    ...a,
    items: JSON.parse(a.items || '[]'),
  }));
  res.json(abandoned);
};

// Store Settings
exports.getSettings = (req, res) => {
  res.json(getStoreSettings());
};

exports.updateSettings = (req, res) => {
  const insertOrReplace = db.prepare('INSERT OR REPLACE INTO settings (k, v) VALUES (?, ?)');
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (key in req.body) {
      insertOrReplace.run(key, String(req.body[key]));
    }
  }
  res.json({ ok: 1 });
};

// Staff management
exports.getStaff = (req, res) => {
  const staff = db.prepare("SELECT id, name, email, role FROM users WHERE role != 'customer'").all();
  res.json(staff);
};

exports.createStaff = (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    throw new Error('Name, email, and password are required');
  }

  const assignedRole = role === 'admin' ? 'admin' : 'staff';
  db.prepare('INSERT INTO users (name, email, pass, role) VALUES (?, ?, ?, ?)')
    .run(name, email.toLowerCase(), hashPassword(password), assignedRole);

  res.json({ ok: 1 });
};

// Database backup
exports.backupDatabase = (req, res) => {
  db.pragma('wal_checkpoint(TRUNCATE)');
  const dbPath = path.resolve(process.cwd(), DB_FILE);
  res.download(dbPath, 'shop-backup.db');
};

// Video Advertisement Upload
exports.uploadVideoAd = (req, res) => {
  const { filename, base64 } = req.body;
  if (!filename || !base64) {
    throw new Error('Video filename and base64 data are required');
  }

  const ext = path.extname(filename).toLowerCase();
  if (!['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) {
    throw new Error('Only MP4, WebM, OGG, or MOV video files are supported');
  }

  const cleanBase64 = base64.replace(/^data:video\/[a-zA-Z0-9]+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  const videosDir = path.resolve(process.cwd(), 'public', 'videos');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  const safeFilename = 'promo_' + Date.now() + ext;
  const filePath = path.join(videosDir, safeFilename);
  fs.writeFileSync(filePath, buffer);

  const videoUrl = '/videos/' + safeFilename;
  db.prepare('INSERT OR REPLACE INTO settings (k, v) VALUES (?, ?)').run('video_ad_url', videoUrl);

  res.json({ ok: 1, url: videoUrl });
};

