const db = require('../database/connection');
const { BASE_URL } = require('../config/env');
const { hashPassword, verifyPassword, generateToken } = require('../utils/security');
const { initiatePayment, verifyPayment } = require('../services/payment');
const { notifyNewOrder } = require('../services/notification');

// Query template for products with average rating & review count
const PRODUCT_QUERY = `
  SELECT 
    p.*,
    c.name AS cat,
    (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = p.id) AS rating,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS reviews
  FROM products p
  LEFT JOIN categories c ON c.id = p.cat_id
`;

function getStoreSettings() {
  const rows = db.prepare('SELECT * FROM settings').all();
  return Object.fromEntries(rows.map((row) => [row.k, row.v]));
}

function getEffectivePrice(product) {
  const hasFlashSale = !product.flash_end || new Date(product.flash_end) > new Date();
  if (product.sale_price && hasFlashSale) {
    return product.sale_price;
  }
  return product.price;
}

function shapeProduct(product) {
  const priceNow = getEffectivePrice(product);
  let parsedVariants = {};
  try {
    parsedVariants = JSON.parse(product.variants || '{}');
  } catch {}

  let imgPath = (product.image || '').trim();
  if (imgPath && !imgPath.startsWith('http://') && !imgPath.startsWith('https://') && !imgPath.startsWith('data:') && !imgPath.startsWith('/')) {
    imgPath = imgPath.startsWith('images/') ? '/' + imgPath : '/images/' + imgPath;
  }

  return {
    ...product,
    image: imgPath,
    variants: parsedVariants,
    price_now: priceNow,
    on_sale: priceNow < product.price,
  };
}

// Controllers
exports.getSettings = (req, res) => {
  const s = getStoreSettings();
  res.json({
    shop_name: s.shop_name,
    whatsapp: s.whatsapp,
    free_ship: +s.free_ship,
    ship_dhaka: +s.ship_dhaka,
    ship_outside: +s.ship_outside,
    video_ad_active: s.video_ad_active ?? '1',
    video_ad_url: s.video_ad_url || '/videos/promo.mp4',
    video_ad_poster: s.video_ad_poster || '/images/video-poster.jpg',
    video_ad_tag: s.video_ad_tag || '✦ 3D CRAFTSMANSHIP CINEMATIC',
    video_ad_title: s.video_ad_title || 'Precision in Motion. Sound in Perfection.',
    video_ad_subtitle: s.video_ad_subtitle || 'Experience our 2026 flagship curation — forged from surgical-grade gold alloy, scratchproof sapphire crystal, and acoustic titanium.',
    video_ad_cta_text: s.video_ad_cta_text || 'Shop The Collection',
    video_ad_cta_link: s.video_ad_cta_link || '#shop',
  });
};

exports.getCategories = (req, res) => {
  const categories = db.prepare('SELECT * FROM categories').all();
  res.json(categories);
};

exports.getProducts = (req, res) => {
  const where = ['p.active = 1'];
  const params = [];
  const { q: search, cat, min, max, sort, sale } = req.query;

  if (search) {
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (cat) {
    const trimmedCat = String(cat).trim();
    if (/^\d+$/.test(trimmedCat)) {
      where.push('p.cat_id = ?');
      params.push(Number(trimmedCat));
    } else {
      where.push('(p.cat_id = (SELECT id FROM categories WHERE LOWER(name) = LOWER(?)) OR c.name LIKE ?)');
      params.push(trimmedCat, `%${trimmedCat}%`);
    }
  }

  let rows = db.prepare(`${PRODUCT_QUERY} WHERE ${where.join(' AND ')}`).all(...params).map(shapeProduct);

  if (min) rows = rows.filter((p) => p.price_now >= +min);
  if (max) rows = rows.filter((p) => p.price_now <= +max);
  if (sale) rows = rows.filter((p) => p.on_sale);

  const sorters = {
    low: (a, b) => a.price_now - b.price_now,
    high: (a, b) => b.price_now - a.price_now,
    new: (a, b) => b.id - a.id,
  };
  if (sorters[sort]) rows.sort(sorters[sort]);

  res.json(rows);
};

exports.getProductById = (req, res) => {
  const product = db.prepare(`${PRODUCT_QUERY} WHERE p.id = ?`).get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const reviewList = db.prepare('SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC').all(product.id);
  res.json({
    ...shapeProduct(product),
    reviewList,
  });
};

exports.addReview = (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  db.prepare('INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)')
    .run(req.params.id, req.user.name, rating, comment || '');

  res.json({ ok: 1 });
};

exports.getCoupon = (req, res) => {
  const code = String(req.query.code || req.query.c || '').toUpperCase();
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(code);
  if (!coupon) {
    return res.status(404).json({ error: 'Invalid or expired coupon' });
  }
  res.json(coupon);
};

exports.register = (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password || password.length < 6) {
    throw new Error('Name, valid email and a 6+ character password are required');
  }

  try {
    const info = db.prepare('INSERT INTO users (name, email, phone, pass) VALUES (?, ?, ?, ?)')
      .run(name, email.toLowerCase(), phone || '', hashPassword(password));

    const user = { id: info.lastInsertRowid, name, role: 'customer' };
    res.json({ token: generateToken(user), user });
  } catch {
    throw new Error('Email is already registered');
  }
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase());

  if (!user || !verifyPassword(password || '', user.pass)) {
    throw new Error('Wrong email or password');
  }

  const tokenUser = { id: user.id, name: user.name, role: user.role };
  res.json({
    token: generateToken(tokenUser),
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      phone: user.phone,
    },
  });
};

exports.captureCart = (req, res) => {
  const { phone, items } = req.body;
  if (phone && items && items.length) {
    db.prepare('INSERT OR REPLACE INTO abandoned (phone, items, updated) VALUES (?, ?, CURRENT_TIMESTAMP)')
      .run(phone, JSON.stringify(items));
  }
  res.json({ ok: 1 });
};

exports.createOrder = async (req, res) => {
  const { name, phone, address, area, items, coupon, method } = req.body;
  if (!name || !phone || !address || !items || !items.length) {
    throw new Error('Name, phone, address, and cart items are required');
  }

  const cleanPhone = String(phone || '').replace(/[^0-9]/g, '');
  if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
    throw new Error('Please enter a valid 11-digit Bangladeshi mobile number (e.g. 017XXXXXXXX)');
  }

  const cleanName = String(name || '').trim().slice(0, 100);
  const cleanAddress = String(address || '').trim().slice(0, 300);

  let subtotal = 0;
  const lineItems = [];

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(item.id);
    const qty = Math.max(1, +item.qty || 1);

    if (!product || product.stock < qty) {
      throw new Error(`Out of stock: ${product ? product.name : item.id}`);
    }

    const price = getEffectivePrice(product);
    subtotal += price * qty;
    lineItems.push({
      id: product.id,
      name: product.name,
      image: (product.image || '').split(',')[0],
      price,
      qty,
      variant: item.variant || '',
    });
  }

  // Calculate Coupon discount
  let discount = 0;
  let validCoupon = null;
  if (coupon) {
    validCoupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND active = 1').get(String(coupon).toUpperCase());
    if (validCoupon) {
      discount = Math.round((subtotal * validCoupon.percent) / 100);
    }
  }

  // Calculate Shipping
  const settings = getStoreSettings();
  const freeShipThreshold = +settings.free_ship;
  const shipDhaka = +settings.ship_dhaka;
  const shipOutside = +settings.ship_outside;
  const shipping = subtotal >= freeShipThreshold ? 0 : area === 'dhaka' ? shipDhaka : shipOutside;
  const total = subtotal - discount + shipping;

  const validMethods = ['cod', 'sslcommerz', 'aamarpay'];
  const paymentMethod = validMethods.includes(method) ? method : 'cod';

  // Transaction: Create order, decrement stocks, remove from abandoned cart
  const orderId = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO orders (user_id, name, phone, address, area, items, subtotal, discount, shipping, total, coupon, method)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user?.id || null,
      cleanName,
      cleanPhone,
      cleanAddress,
      area || 'outside',
      JSON.stringify(lineItems),
      subtotal,
      discount,
      shipping,
      total,
      validCoupon?.code || null,
      paymentMethod
    );

    const id = result.lastInsertRowid;
    const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
    lineItems.forEach((line) => updateStock.run(line.qty, line.id));
    db.prepare('DELETE FROM abandoned WHERE phone = ?').run(cleanPhone);

    return id;
  })();

  const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  notifyNewOrder(createdOrder);

  let paymentUrl = null;
  let payError = null;
  if (paymentMethod !== 'cod') {
    try {
      paymentUrl = await initiatePayment(createdOrder, paymentMethod);
    } catch (err) {
      payError = err.message;
    }
  }

  res.json({
    id: orderId,
    total,
    payment_url: paymentUrl,
    pay_error: payError,
  });
};

exports.trackOrder = (req, res) => {
  const { id, phone } = req.query;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND phone = ?').get(id, phone);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  res.json({
    ...order,
    items: JSON.parse(order.items || '[]'),
  });
};

exports.getMyOrders = (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC')
    .all(req.user.id)
    .map((o) => ({
      ...o,
      items: JSON.parse(o.items || '[]'),
    }));

  res.json(orders);
};

exports.requestReturn = (req, res) => {
  const { reason, phone } = req.body;
  const result = db.prepare(`
    UPDATE orders 
    SET return_status = 'requested', return_reason = ? 
    WHERE id = ? AND phone = ? AND status = 'delivered'
  `).run(reason || '', req.params.id, phone);

  if (!result.changes) {
    throw new Error('Return request not eligible (must be a delivered order with matching phone)');
  }

  res.json({ ok: 1 });
};

exports.handlePaymentCallback = async (req, res) => {
  const { gw, res: resultType } = req.params;
  const callbackData = { ...req.query, ...req.body };
  const rawId = String(callbackData.tran_id || callbackData.mer_txnid || '').replace('ORD', '');
  const orderId = parseInt(rawId, 10);

  let isVerified = false;
  const order = orderId ? db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) : null;

  if (order && resultType === 'success') {
    isVerified = await verifyPayment(gw, callbackData, order);
  }

  if (isVerified) {
    db.prepare(`
      UPDATE orders 
      SET payment_status = 'paid', status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END 
      WHERE id = ?
    `).run(orderId);
  } else if (order && order.payment_status === 'unpaid') {
    db.prepare('UPDATE orders SET payment_status = ? WHERE id = ?')
      .run(resultType === 'cancel' ? 'cancelled' : 'failed', orderId);
  }

  res.redirect(`/#/track/${orderId}?paid=${isVerified ? 1 : 0}`);
};

exports.getSitemap = (req, res) => {
  const products = db.prepare('SELECT id FROM products WHERE active = 1').all();
  const urls = products.map((p) => `<url><loc>${BASE_URL}/#/p/${p.id}</loc></url>`).join('');

  res.type('xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${BASE_URL}/</loc></url>
  ${urls}
</urlset>`);
};

exports.getRobots = (req, res) => {
  res.type('text').send(`User-agent: *\nDisallow: /admin.html\nSitemap: ${BASE_URL}/sitemap.xml`);
};

// Export helpers for use in admin controller and invoice
exports.getStoreSettings = getStoreSettings;
exports.PRODUCT_QUERY = PRODUCT_QUERY;
exports.shapeProduct = shapeProduct;
