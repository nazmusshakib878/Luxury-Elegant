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
exports.getStats = async (req, res) => {
  const liveFilter = "status NOT IN ('cancelled', 'refunded') AND (payment_status = 'paid' OR status = 'delivered')";
  const allOrders = await db.all('SELECT * FROM orders');

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

  const revenueRow = await db.get(`SELECT COALESCE(SUM(total), 0) AS v FROM orders WHERE ${liveFilter}`);
  const todayRow = await db.get(`SELECT COALESCE(SUM(total), 0) AS v FROM orders WHERE ${liveFilter} AND DATE(created) = CURRENT_DATE`);
  const customerRow = await db.get("SELECT COUNT(*) AS v FROM users WHERE role = 'customer'");

  const byStatus = await db.all('SELECT status, COUNT(*) AS n FROM orders GROUP BY status');
  const days = await db.all(`
    SELECT DATE(created) AS d, SUM(total) AS v 
    FROM orders 
    WHERE ${liveFilter} AND created >= CURRENT_DATE - INTERVAL '6 days' 
    GROUP BY d
  `);

  const top = Object.entries(topProductsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const low = await db.all('SELECT id, name, stock FROM products WHERE stock <= 5 ORDER BY stock ASC');

  res.json({
    revenue: revenueRow?.v ? +revenueRow.v : 0,
    today: todayRow?.v ? +todayRow.v : 0,
    orders: allOrders.length,
    customers: customerRow?.v ? +customerRow.v : 0,
    byStatus: (byStatus || []).map((s) => ({ status: s.status, n: +s.n })),
    days: (days || []).map((d) => ({ d: d.d, v: +d.v })),
    top,
    low: (low || []).map((l) => ({ ...l, stock: +l.stock })),
  });
};

// Product management helper
async function parseProductPayload(body) {
  let catId = body.cat_id !== undefined ? body.cat_id : (body.category_id !== undefined ? body.category_id : body.category);
  if (catId !== undefined && catId !== null && catId !== '') {
    const trimmed = String(catId).trim();
    if (/^\d+$/.test(trimmed)) {
      catId = Number(trimmed);
    } else {
      const found = await db.get('SELECT id FROM categories WHERE LOWER(name) = LOWER(?)', [trimmed]);
      catId = found ? found.id : null;
    }
  } else {
    catId = null;
  }

  const sanitizeNum = (val) => {
    if (val === undefined || val === null || val === '') return null;
    const num = Number(val);
    return Number.isFinite(num) ? num : null;
  };

  const price = sanitizeNum(body.price);
  const salePrice = sanitizeNum(body.sale_price);
  const stock = body.stock !== undefined ? sanitizeNum(body.stock) : 0;
  if (!String(body.name || '').trim()) throw new Error('Product name is required');
  if (price === null || price <= 0) throw new Error('A valid product price greater than zero is required');
  if (body.sale_price !== undefined && body.sale_price !== null && body.sale_price !== '' && (salePrice === null || salePrice <= 0 || salePrice >= price)) {
    throw new Error('Sale price must be greater than zero and lower than the regular price');
  }
  if (stock === null || !Number.isSafeInteger(stock) || stock < 0) throw new Error('Stock must be a non-negative whole number');

  let image = typeof body.image === 'string' ? body.image.trim() : '';
  if (image && !image.startsWith('http://') && !image.startsWith('https://') && !image.startsWith('data:') && !image.startsWith('/')) {
    image = image.startsWith('images/') ? '/' + image : '/images/' + image;
  }

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

exports.getProducts = async (req, res) => {
  const products = (await db.all(PRODUCT_QUERY)).map(shapeProduct);
  res.json(products);
};

exports.createProduct = async (req, res) => {
  const params = await parseProductPayload(req.body);
  const result = await db.run(`
    INSERT INTO products (name, cat_id, price, sale_price, stock, image, description, variants, flash_end, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, params);

  res.json({ id: result.lastInsertRowid });
};

exports.updateProduct = async (req, res) => {
  const params = await parseProductPayload(req.body);
  await db.run(`
    UPDATE products 
    SET name = ?, cat_id = ?, price = ?, sale_price = ?, stock = ?, image = ?, description = ?, variants = ?, flash_end = ?, active = ?
    WHERE id = ?
  `, [...params, req.params.id]);

  res.json({ ok: 1 });
};

exports.deleteProduct = async (req, res) => {
  await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
  res.json({ ok: 1 });
};

// Category management
exports.createCategory = async (req, res) => {
  await db.run('INSERT INTO categories (name) VALUES (?)', [req.body.name]);
  res.json({ ok: 1 });
};

exports.deleteCategory = async (req, res) => {
  await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
  res.json({ ok: 1 });
};

// Order management
exports.getOrders = async (req, res) => {
  const orders = (await db.all('SELECT * FROM orders ORDER BY id DESC')).map((o) => ({
    ...o,
    items: JSON.parse(o.items || '[]'),
    total: +o.total,
    subtotal: +o.subtotal,
    discount: +o.discount,
    shipping: +o.shipping,
  }));
  res.json(orders);
};

exports.updateOrder = async (req, res) => {
  const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
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
      for (const item of items) {
        await db.run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.qty, item.id]);
      }
    } catch {}
  }

  await db.run(`
    UPDATE orders 
    SET status = ?, payment_status = ?, return_status = ? 
    WHERE id = ?
  `, [
    newStatus,
    payment_status || order.payment_status,
    return_status !== undefined ? return_status : order.return_status,
    order.id,
  ]);

  res.json({ ok: 1 });
};

// Customer list
exports.getCustomers = async (req, res) => {
  const customers = await db.all(`
    SELECT 
      u.id, u.name, u.email, u.phone, u.created,
      (SELECT COUNT(*) FROM orders WHERE user_id = u.id) AS orders,
      (SELECT IFNULL(SUM(total), 0) FROM orders WHERE user_id = u.id) AS spent
    FROM users u 
    WHERE role = 'customer'
    ORDER BY u.id DESC
  `);

  res.json(customers.map((c) => ({
    ...c,
    orders: +c.orders,
    spent: +c.spent,
  })));
};

// Coupon management
exports.getCoupons = async (req, res) => {
  const coupons = await db.all('SELECT * FROM coupons ORDER BY code ASC');
  res.json(coupons.map((c) => ({ ...c, percent: +c.percent })));
};

exports.createCoupon = async (req, res) => {
  await db.run('INSERT INTO coupons (code, percent, active) VALUES (?, ?, 1)', [
    String(req.body.code || '').toUpperCase(),
    +req.body.percent,
  ]);

  res.json({ ok: 1 });
};

exports.deleteCoupon = async (req, res) => {
  await db.run('DELETE FROM coupons WHERE code = ?', [req.params.c]);
  res.json({ ok: 1 });
};

// Abandoned carts
exports.getAbandonedCarts = async (req, res) => {
  const abandoned = (await db.all('SELECT * FROM abandoned ORDER BY updated DESC')).map((a) => ({
    ...a,
    items: JSON.parse(a.items || '[]'),
  }));
  res.json(abandoned);
};

// Store Settings
exports.getSettings = async (req, res) => {
  res.json(await getStoreSettings());
};

exports.updateSettings = async (req, res) => {
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (key in req.body) {
      await db.run('INSERT INTO settings (k, v) VALUES (?, ?)', [key, String(req.body[key])]);
    }
  }
  res.json({ ok: 1 });
};

// Staff management
exports.getStaff = async (req, res) => {
  const staff = await db.all("SELECT id, name, email, role FROM users WHERE role != 'customer' ORDER BY id ASC");
  res.json(staff);
};

exports.createStaff = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    throw new Error('Name, email, and password are required');
  }

  const assignedRole = role === 'admin' ? 'admin' : 'staff';
  await db.run('INSERT INTO users (name, email, pass, role) VALUES (?, ?, ?, ?)', [
    name,
    email.toLowerCase(),
    hashPassword(password),
    assignedRole,
  ]);

  res.json({ ok: 1 });
};

// Database backup
exports.backupDatabase = async (req, res) => {
  if (db.isPostgres) {
    // If PostgreSQL, export seed JSON
    const tables = ['users', 'categories', 'products', 'orders', 'order_idempotency', 'coupons', 'reviews', 'review_verifications', 'abandoned', 'settings'];
    const backup = {};
    for (const t of tables) {
      backup[t] = await db.all(`SELECT * FROM ${t}`);
    }
    res.setHeader('Content-Disposition', 'attachment; filename="shop-backup.json"');
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(backup, null, 2));
  }

  if (db.sqlite) {
    db.sqlite.pragma('wal_checkpoint(TRUNCATE)');
    const dbPath = path.resolve(process.cwd(), DB_FILE);
    return res.download(dbPath, 'shop-backup.db');
  }

  res.status(400).json({ error: 'Backup not available in current environment' });
};

// Video Advertisement Upload
exports.uploadVideoAd = async (req, res) => {
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
  await db.run('INSERT INTO settings (k, v) VALUES (?, ?)', ['video_ad_url', videoUrl]);

  res.json({ ok: 1, url: videoUrl });
};
