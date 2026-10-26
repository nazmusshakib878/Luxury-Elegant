import { NextResponse } from 'next/server';
const { isAdminRequest } = require('../../../src/utils/route-auth');
const db = require('../../../src/database/connection');
const { initSchema } = require('../../../src/database/schema');
const { DEFAULT_SETTINGS } = require('../../../src/config/constants');
const { notifyNewOrder } = require('../../../src/services/notification');

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
  try {
    await initSchema();

    // CRITICAL SAFETY CONSTRAINT: Never allow in-memory fallback to accept real orders or payments.
    if (db.isFallback) {
      return NextResponse.json(
        { error: 'Order placement and payments are disabled in catalog browsing mode. A connected PostgreSQL production database (DATABASE_URL) is required to process live customer orders.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { name, phone, address, area, items, coupon: couponCode, method } = body;

    if (!name || !phone || !address || !items || !items.length) {
      return NextResponse.json({ error: 'Please provide all required delivery details and cart items' }, { status: 400 });
    }

    // 1. Fetch store settings for shipping rules
    const settingsRows = await db.all('SELECT * FROM settings');
    const settings = Object.fromEntries(settingsRows.map((r) => [r.k, r.v]));
    const freeShipThreshold = +(settings.free_ship || DEFAULT_SETTINGS.free_ship);
    const shipDhaka = +(settings.ship_dhaka || DEFAULT_SETTINGS.ship_dhaka);
    const shipOutside = +(settings.ship_outside || DEFAULT_SETTINGS.ship_outside);

    // 2. Fetch all products in cart from database to verify prices securely
    const productIds = items.map((i) => i.id);
    const placeholders = productIds.map(() => '?').join(',');
    const dbProducts = await db.all(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds);
    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    let subtotal = 0;
    const verifiedItems = [];

    for (const item of items) {
      const p = productMap.get(item.id);
      if (!p) {
        return NextResponse.json({ error: `Product ID #${item.id} not found or no longer available` }, { status: 400 });
      }

      const hasFlashSale = !p.flash_end || new Date(p.flash_end) > new Date();
      const unitPrice = p.sale_price && hasFlashSale ? +p.sale_price : +p.price;
      const qty = Math.max(1, parseInt(item.qty || 1, 10));

      subtotal += unitPrice * qty;
      verifiedItems.push({
        id: p.id,
        name: p.name,
        price: unitPrice,
        qty,
        variant: item.variant || null,
        image: p.image || '',
      });
    }

    // 3. Apply Coupon if provided
    let discount = 0;
    let appliedCoupon = null;
    if (couponCode) {
      const couponRow = await db.get(
        'SELECT code, percent FROM coupons WHERE code = ? AND active = 1',
        [String(couponCode).toUpperCase().trim()]
      );
      if (couponRow) {
        appliedCoupon = couponRow.code;
        discount = Math.round((subtotal * +couponRow.percent) / 100);
      }
    }

    // 4. Calculate Shipping
    let shipping = area === 'dhaka' ? shipDhaka : shipOutside;
    if (subtotal >= freeShipThreshold) {
      shipping = 0;
    }

    const total = Math.max(0, subtotal - discount + shipping);

    // 5. Insert order
    const insertRes = await db.run(
      `INSERT INTO orders (user_id, name, phone, address, area, items, subtotal, discount, shipping, total, coupon, method, payment_status, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        null,
        name,
        phone,
        address,
        area || 'dhaka',
        JSON.stringify(verifiedItems),
        subtotal,
        discount,
        shipping,
        total,
        appliedCoupon,
        method || 'cod',
        method === 'cod' ? 'unpaid' : 'pending',
        'pending',
      ]
    );

    const orderId = insertRes.lastInsertRowid;

    // 6. Update inventory
    for (const item of verifiedItems) {
      await db.run('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?', [item.qty, item.id]);
    }

    // 7. Fire notification async
    try {
      notifyNewOrder({
        id: orderId,
        customer: name,
        phone,
        total,
        items: verifiedItems,
      }).catch(() => {});
    } catch {}

    return NextResponse.json({
      success: true,
      order_id: orderId,
      subtotal,
      discount,
      shipping,
      total,
      method: method || 'cod',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
