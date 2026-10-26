const db = require('../database/connection');
const { BASE_URL } = require('../config/env');
const { DEFAULT_SETTINGS } = require('../config/constants');
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

async function getStoreSettings() {
  try {
    const rows = await db.all('SELECT * FROM settings');
    return Object.fromEntries(rows.map((row) => [row.k, row.v]));
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

function getEffectivePrice(product) {
  const hasFlashSale = !product.flash_end || new Date(product.flash_end) > new Date();
  if (product.sale_price && hasFlashSale) {
    return +product.sale_price;
  }
  return +product.price;
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
    price: +product.price,
    sale_price: product.sale_price ? +product.sale_price : null,
    stock: +product.stock,
    rating: product.rating !== null && product.rating !== undefined ? +product.rating : null,
    reviews: +product.reviews || 0,
    image: imgPath,
    variants: parsedVariants,
    price_now: priceNow,
    on_sale: priceNow < +product.price,
  };
}

// Controllers
exports.getSettings = async (req, res) => {
  const s = await getStoreSettings();
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

exports.getCategories = async (req, res) => {
  const categories = await db.all('SELECT * FROM categories ORDER BY id ASC');
  res.json(categories);
};

exports.getProducts = async (req, res) => {
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

  const querySql = `${PRODUCT_QUERY} WHERE ${where.join(' AND ')}`;
  const rows = await db.all(querySql, params);
  let shaped = rows.map(shapeProduct);

  if (min) shaped = shaped.filter((p) => p.price_now >= +min);
  if (max) shaped = shaped.filter((p) => p.price_now <= +max);
  if (sale) shaped = shaped.filter((p) => p.on_sale);

  const sorters = {
    low: (a, b) => a.price_now - b.price_now,
    high: (a, b) => b.price_now - a.price_now,
    new: (a, b) => b.id - a.id,
  };
  if (sorters[sort]) shaped.sort(sorters[sort]);

  res.json(shaped);
};

exports.getProductById = async (req, res) => {
  const product = await db.get(`${PRODUCT_QUERY} WHERE p.id = ?`, [req.params.id]);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const reviewList = await db.all('SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC', [product.id]);
  res.json({
    ...shapeProduct(product),
    reviewList,
  });
};

exports.addReview = async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  await db.run('INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)', [
    req.params.id,
    req.user.name,
    rating,
    comment || '',
  ]);

  res.json({ ok: 1 });
};

exports.getCoupon = async (req, res) => {
  const code = String(req.query.code || req.query.c || '').toUpperCase();
  const coupon = await db.get('SELECT * FROM coupons WHERE code = ? AND active = 1', [code]);
  if (!coupon) {
    return res.status(404).json({ error: 'Invalid or expired coupon' });
  }
  res.json({
    code: coupon.code,
    percent: +coupon.percent,
    active: coupon.active,
  });
};

exports.register = async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password || password.length < 6) {
    throw new Error('Name, valid email and a 6+ character password are required');
  }

  try {
    const info = await db.run('INSERT INTO users (name, email, phone, pass) VALUES (?, ?, ?, ?)', [
      name,
      email.toLowerCase(),
      phone || '',
      hashPassword(password),
    ]);

    const user = { id: info.lastInsertRowid, name, role: 'customer' };
    res.json({ token: generateToken(user), user });
  } catch {
    throw new Error('Email is already registered');
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE email = ?', [String(email || '').toLowerCase()]);

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

exports.captureCart = async (req, res) => {
  const { phone, items } = req.body;
  if (phone && items && items.length) {
    await db.run('INSERT INTO abandoned (phone, items, updated) VALUES (?, ?, CURRENT_TIMESTAMP)', [
      phone,
      JSON.stringify(items),
    ]);
  }
  res.json({ ok: 1 });
};

exports.createOrder = async (req, res) => {
  if (db.isFallback) {
    return res.status(503).json({
      error: 'Order placement and payments are disabled in catalog browsing mode. A connected PostgreSQL production database (DATABASE_URL) is required to process live customer orders.',
    });
  }

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
    const product = await db.get('SELECT * FROM products WHERE id = ? AND active = 1', [item.id]);
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
    validCoupon = await db.get('SELECT * FROM coupons WHERE code = ? AND active = 1', [String(coupon).toUpperCase()]);
    if (validCoupon) {
      discount = Math.round((subtotal * validCoupon.percent) / 100);
    }
  }

  // Calculate Shipping
  const settings = await getStoreSettings();
  const freeShipThreshold = +settings.free_ship;
  const shipDhaka = +settings.ship_dhaka;
  const shipOutside = +settings.ship_outside;
  const shipping = subtotal >= freeShipThreshold ? 0 : area === 'dhaka' ? shipDhaka : shipOutside;
  const total = subtotal - discount + shipping;

  const validMethods = ['cod', 'sslcommerz', 'aamarpay'];
  const paymentMethod = validMethods.includes(method) ? method : 'cod';

  // Create order, decrement stocks, remove from abandoned cart
  const result = await db.run(`
    INSERT INTO orders (user_id, name, phone, address, area, items, subtotal, discount, shipping, total, coupon, method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    req.user?.id || null,
    cleanName,
    cleanPhone,
    cleanAddress,
    area || 'dhaka',
    JSON.stringify(lineItems),
    subtotal,
    discount,
    shipping,
    total,
    validCoupon ? validCoupon.code : null,
    paymentMethod,
  ]);

  const orderId = result.lastInsertRowid;

  for (const item of lineItems) {
    await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.qty, item.id]);
  }
  await db.run('DELETE FROM abandoned WHERE phone = ?', [cleanPhone]);

  const createdOrder = await db.get('SELECT * FROM orders WHERE id = ?', [orderId]);

  // Dispatch background notification
  notifyNewOrder(createdOrder).catch(() => {});

  // Handle Online Payment Initiation
  if (paymentMethod === 'sslcommerz' || paymentMethod === 'aamarpay') {
    const paymentUrl = await initiatePayment({
      gateway: paymentMethod,
      orderId,
      amount: total,
      customerName: cleanName,
      customerPhone: cleanPhone,
      customerAddress: cleanAddress,
    });

    if (paymentUrl) {
      return res.json({ id: orderId, redirect: paymentUrl });
    }
  }

  res.json({ id: orderId });
};

exports.trackOrder = async (req, res) => {
  const { id, phone } = req.query;
  if (!id || !phone) {
    throw new Error('Order ID and Phone Number are required');
  }

  const order = await db.get('SELECT * FROM orders WHERE id = ? AND phone = ?', [id, phone]);
  if (!order) {
    return res.status(404).json({ error: 'Order not found with provided credentials' });
  }

  res.json({
    ...order,
    items: JSON.parse(order.items || '[]'),
  });
};

exports.getMyOrders = async (req, res) => {
  const orders = (await db.all('SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC', [req.user.id])).map((o) => ({
    ...o,
    items: JSON.parse(o.items || '[]'),
  }));
  res.json(orders);
};

exports.requestReturn = async (req, res) => {
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    throw new Error('Please provide a reason for return');
  }

  const result = await db.run(`
    UPDATE orders 
    SET return_status = 'requested', return_reason = ? 
    WHERE id = ? AND user_id = ? AND status = 'delivered'
  `, [reason.trim(), req.params.id, req.user.id]);

  if (result.changes === 0) {
    throw new Error('Order is not eligible for return or does not exist');
  }

  res.json({ ok: 1 });
};

exports.handlePaymentCallback = async (req, res) => {
  const { gw, res: resultType } = req.params;
  const payload = req.method === 'POST' ? req.body : req.query;

  const isVerified = await verifyPayment(gw, payload);
  const orderId = payload.tran_id || payload.mer_txnid;

  if (isVerified && orderId) {
    await db.run('UPDATE orders SET payment_status = ? WHERE id = ?', ['paid', orderId]);
  } else if (orderId) {
    await db.run('UPDATE orders SET payment_status = ? WHERE id = ?', [
      resultType === 'cancel' ? 'cancelled' : 'failed',
      orderId,
    ]);
  }

  res.redirect(`/#/track/${orderId}?paid=${isVerified ? 1 : 0}`);
};

exports.getSitemap = async (req, res) => {
  const products = await db.all('SELECT id FROM products WHERE active = 1');
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
exports.getEffectivePrice = getEffectivePrice;
