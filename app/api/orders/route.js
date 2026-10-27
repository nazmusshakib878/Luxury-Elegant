import { NextResponse } from 'next/server';
const { isAdminRequest } = require('../../../src/utils/route-auth');
const db = require('../../../src/database/connection');
const { initSchema } = require('../../../src/database/schema');
const { DEFAULT_SETTINGS } = require('../../../src/config/constants');
const { notifyNewOrder } = require('../../../src/services/notification');
const { isValidIdempotencyKey, hashOrderRequest } = require('../../../src/utils/order-idempotency');
const { reserveVariantStock, reserveProductStock } = require('../../../src/services/inventory');

export async function GET(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await initSchema();
    const orders = await db.all('SELECT * FROM orders ORDER BY id DESC');
    const formatted = orders.map((o) => ({
      ...o,
      items: typeof o.items === 'string' ? JSON.parse(o.items || '[]') : o.items,
      subtotal: +o.subtotal,
      discount: +o.discount,
      shipping: +o.shipping,
      total: +o.total,
    }));
    return NextResponse.json(formatted);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  let idempotencyKey = null;
  let requestHash = null;
  try {
    await initSchema();
    if (db.isFallback) {
      return NextResponse.json(
        { error: 'Order placement and payments are disabled in catalog preview mode. A persistent PostgreSQL database is required on Vercel.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A valid order request is required.' }, { status: 400 });
    }
    const { name, phone, address, area, items, coupon: couponCode, method = 'cod' } = body;
    idempotencyKey = request.headers.get('idempotency-key');
    if (!isValidIdempotencyKey(idempotencyKey)) {
      return NextResponse.json({ error: 'A valid Idempotency-Key is required to safely place this order.' }, { status: 400 });
    }
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : '';
    const cleanPhone = typeof phone === 'string' ? phone.replace(/[^0-9]/g, '') : '';
    const cleanAddress = typeof address === 'string' ? address.trim().slice(0, 300) : '';
    if (!cleanName || !/^01[3-9]\d{8}$/.test(cleanPhone) || !cleanAddress || !Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: 'Valid name, Bangladeshi phone, address, and cart items are required.' }, { status: 400 });
    }
    if (method !== 'cod') {
      return NextResponse.json({ error: 'Online payment is unavailable until a verified payment gateway is configured. No order or payment was created.' }, { status: 503 });
    }

    const requestedItems = [];
    for (const item of items) {
      const id = Number(item?.id);
      const qty = Number(item?.qty);
      if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(qty) || qty <= 0 || qty > 99) {
        return NextResponse.json({ error: 'Each cart item must have a valid product ID and quantity from 1 to 99.' }, { status: 400 });
      }
      const variant_id = item.variant_id == null ? null : Number(item.variant_id);
      if (variant_id !== null && (!Number.isSafeInteger(variant_id) || variant_id <= 0)) return NextResponse.json({ error: 'Invalid product variant.' }, { status: 400 });
      requestedItems.push({ id, qty, variant_id });
    }
    requestHash = hashOrderRequest({ name: cleanName, phone: cleanPhone, address: cleanAddress, area, items: requestedItems, coupon: couponCode });

    const order = await db.transaction(async (tx) => {
      const previous = await tx.get(
        `SELECT o.id, o.subtotal, o.discount, o.shipping, o.total, o.items, k.request_hash
         FROM order_idempotency k INNER JOIN orders o ON o.id = k.order_id
         WHERE k.idempotency_key = ?`,
        [idempotencyKey]
      );
      if (previous) {
        if (previous.request_hash !== requestHash) throw Object.assign(new Error('This order request key was already used with different checkout details. Please retry checkout.'), { status: 409 });
        return {
          orderId: previous.id,
          subtotal: Number(previous.subtotal),
          discount: Number(previous.discount),
          shipping: Number(previous.shipping),
          total: Number(previous.total),
          items: typeof previous.items === 'string' ? JSON.parse(previous.items || '[]') : previous.items,
          replayed: true,
        };
      }

      const settingsRows = await tx.all('SELECT * FROM settings');
      const settings = Object.fromEntries(settingsRows.map((row) => [row.k, row.v]));
      const settingNumber = (key) => {
        const value = Number(settings[key] ?? DEFAULT_SETTINGS[key]);
        return Number.isFinite(value) && value >= 0 ? value : Number(DEFAULT_SETTINGS[key]);
      };
      const freeShipThreshold = settingNumber('free_ship');
      const shipDhaka = settingNumber('ship_dhaka');
      const shipOutside = settingNumber('ship_outside');

      const ids = [...new Set(requestedItems.map((item) => item.id))];
      const placeholders = ids.map(() => '?').join(',');
      const lockClause = db.isPostgres ? ' FOR UPDATE' : '';
      const productSql = 'SELECT * FROM products WHERE id IN (' + placeholders + ') AND active = 1' + lockClause;
      const dbProducts = await tx.all(productSql, ids);
      const productMap = new Map(dbProducts.map((product) => [Number(product.id), product]));
      const requiredStock = new Map();
      const requiredVariants = new Map();
      for (const item of requestedItems) {
        const key = item.variant_id == null ? String(item.id) : String(item.variant_id);
        const map = item.variant_id == null ? requiredStock : requiredVariants;
        map.set(Number(key), (map.get(Number(key)) || 0) + item.qty);
      }

      const variantIds = [...requiredVariants.keys()];
      const variantMap = new Map();
      if (variantIds.length) {
        const variantSql = 'SELECT * FROM product_variants WHERE id IN (' + variantIds.map(() => '?').join(',') + ') AND active = 1' + lockClause;
        for (const variant of await tx.all(variantSql, variantIds)) variantMap.set(Number(variant.id), variant);
      }
      for (const [id, qty] of requiredStock) {
        const product = productMap.get(id);
        if (!product) throw Object.assign(new Error('Product ID #' + id + ' is unavailable.'), { status: 400 });
        const stock = Number(product.stock);
        if (!Number.isFinite(stock) || stock < qty) throw Object.assign(new Error('Insufficient stock for ' + (product.name || 'this item') + '.'), { status: 409 });
        const price = Number(product.price);
        if (!Number.isFinite(price) || price <= 0) throw Object.assign(new Error('A valid price is unavailable for ' + (product.name || 'this item') + '.'), { status: 409 });
      }
      for (const [id, qty] of requiredVariants) {
        const variant = variantMap.get(id);
        if (!variant || Number(variant.stock) < qty) throw Object.assign(new Error('Selected size and color are out of stock.'), { status: 409 });
      }

      let subtotal = 0;
      const verifiedItems = requestedItems.map((item) => {
        const product = productMap.get(item.id);
        const selectedVariant = item.variant_id == null ? null : variantMap.get(item.variant_id);
        if (item.variant_id != null && (!selectedVariant || Number(selectedVariant.product_id) !== Number(product.id))) throw Object.assign(new Error('Selected variant is unavailable for this product.'), { status: 409 });
        const regularPrice = selectedVariant ? Number(selectedVariant.price) : Number(product.price);
        const salePrice = product.sale_price == null ? null : Number(product.sale_price);
        const flashActive = !product.flash_end || new Date(product.flash_end).getTime() > Date.now();
        const unitPrice = selectedVariant ? regularPrice : (Number.isFinite(salePrice) && salePrice > 0 && salePrice < regularPrice && flashActive ? salePrice : regularPrice);
        subtotal += unitPrice * item.qty;
        return { id: product.id, name: product.name, price: unitPrice, qty: item.qty, variant_id: item.variant_id, variant: selectedVariant ? { size: selectedVariant.size, color: selectedVariant.color, sku: selectedVariant.sku } : null, image: product.image || '' };
      });
      if (!Number.isFinite(subtotal)) throw Object.assign(new Error('The cart total is invalid.'), { status: 400 });

      let discount = 0;
      let appliedCoupon = null;
      if (typeof couponCode === 'string' && couponCode.trim()) {
        const coupon = await tx.get('SELECT code, percent FROM coupons WHERE code = ? AND active = 1', [couponCode.toUpperCase().trim()]);
        const percent = Number(coupon?.percent);
        if (coupon && Number.isFinite(percent) && percent >= 0 && percent <= 100) {
          appliedCoupon = coupon.code;
          discount = Math.round((subtotal * percent) / 100);
        }
      }

      const shipping = subtotal >= freeShipThreshold ? 0 : area === 'dhaka' ? shipDhaka : shipOutside;
      const total = Math.max(0, subtotal - discount + shipping);
      const insert = await tx.run(
        'INSERT INTO orders (user_id, name, phone, address, area, items, subtotal, discount, shipping, total, coupon, method, payment_status, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [null, cleanName, cleanPhone, cleanAddress, area === 'dhaka' ? 'dhaka' : 'outside', JSON.stringify(verifiedItems), subtotal, discount, shipping, total, appliedCoupon, 'cod', 'unpaid', 'pending']
      );

      for (const [id, qty] of requiredStock) {
        await reserveProductStock(tx, id, qty);
      }
      for (const [id, qty] of requiredVariants) {
        await reserveVariantStock(tx, id, qty);
      }
      await tx.run('INSERT INTO order_idempotency (idempotency_key, request_hash, order_id) VALUES (?, ?, ?)', [idempotencyKey, requestHash, insert.lastInsertRowid]);
      return { orderId: insert.lastInsertRowid, subtotal, discount, shipping, total, items: verifiedItems, replayed: false };
    });

    try {
      if (!order.replayed) {
      Promise.resolve(notifyNewOrder({ id: order.orderId, customer: cleanName, phone: cleanPhone, total: order.total, items: order.items })).catch(() => {});
      }
    } catch {}

    return NextResponse.json({ success: true, order_id: order.orderId, subtotal: order.subtotal, discount: order.discount, shipping: order.shipping, total: order.total, method: 'cod' });
  } catch (err) {
    if (idempotencyKey && requestHash && /unique constraint|duplicate key/i.test(err.message || '')) {
      try {
        const previous = await db.get(
          `SELECT o.id, o.subtotal, o.discount, o.shipping, o.total, o.items, k.request_hash
           FROM order_idempotency k INNER JOIN orders o ON o.id = k.order_id
           WHERE k.idempotency_key = ?`,
          [idempotencyKey]
        );
        if (previous) {
          if (previous.request_hash !== requestHash) return NextResponse.json({ error: 'This order request key was already used with different checkout details. Please retry checkout.' }, { status: 409 });
          return NextResponse.json({ success: true, order_id: previous.id, subtotal: Number(previous.subtotal), discount: Number(previous.discount), shipping: Number(previous.shipping), total: Number(previous.total), method: 'cod', replayed: true });
        }
      } catch {}
    }
    return NextResponse.json({ error: err.message }, { status: err.status || (db.isFallback ? 503 : 500) });
  }
}
