import { NextResponse } from 'next/server';
const db = require('../../../../../src/database/connection');
const { initSchema } = require('../../../../../src/database/schema');

export async function GET(request, { params }) {
  try {
    await initSchema();
    const { id } = await params;
    const reviews = await db.all(
      `SELECT r.id, r.product_id, r.user_name, r.rating, r.comment, r.created, 1 AS verified_purchase
       FROM reviews r INNER JOIN review_verifications v ON v.review_id = r.id
       WHERE r.product_id = ? ORDER BY r.id DESC`,
      [id]
    );
    return NextResponse.json(reviews);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    await initSchema();
    const { id } = await params;
    const productId = Number(id);
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A valid review request is required.' }, { status: 400 });
    }
    const { rating, comment, order_id, phone } = body;

    if (!Number.isSafeInteger(productId) || productId <= 0 || typeof comment !== 'string' || !comment.trim() || comment.trim().length > 1500) {
      return NextResponse.json({ error: 'A product, rating, and review comment of up to 1,500 characters are required.' }, { status: 400 });
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5.' }, { status: 400 });
    }
    const cleanPhone = String(phone || '').replace(/\D/g, '').replace(/^880/, '0');
    const orderId = Number(order_id);
    if (!Number.isSafeInteger(orderId) || orderId <= 0 || !/^01[3-9]\d{8}$/.test(cleanPhone)) {
      return NextResponse.json({ error: 'Enter the order number and the phone number used for delivery.' }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      const order = await tx.get('SELECT id, name, phone, status, items FROM orders WHERE id = ? AND phone = ?', [orderId, cleanPhone]);
      if (!order) throw Object.assign(new Error('We could not match that order and phone number.'), { status: 404 });
      if (order.status !== 'delivered') throw Object.assign(new Error('You can review this item after its order is marked delivered.'), { status: 409 });
      let items;
      try { items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items; } catch { items = []; }
      if (!Array.isArray(items) || !items.some((item) => Number(item.id) === productId)) {
        throw Object.assign(new Error('That product is not part of the verified order.'), { status: 403 });
      }
      const product = await tx.get('SELECT id FROM products WHERE id = ? AND active = 1', [productId]);
      if (!product) throw Object.assign(new Error('This product is no longer available for review.'), { status: 404 });
      const existing = await tx.get('SELECT review_id FROM review_verifications WHERE product_id = ? AND order_id = ?', [productId, orderId]);
      if (existing) throw Object.assign(new Error('A review for this item has already been submitted for that order.'), { status: 409 });
      const inserted = await tx.run('INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)', [productId, String(order.name || 'Customer').trim().slice(0, 100), numericRating, comment.trim()]);
      await tx.run('INSERT INTO review_verifications (review_id, product_id, order_id) VALUES (?, ?, ?)', [inserted.lastInsertRowid, productId, orderId]);
    });

    return NextResponse.json({ success: true, message: 'Verified review submitted successfully' });
  } catch (err) {
    const isDuplicate = /unique constraint|duplicate key/i.test(err.message || '');
    return NextResponse.json({ error: err.message }, { status: err.status || (isDuplicate ? 409 : db.isFallback ? 503 : 500) });
  }
}
