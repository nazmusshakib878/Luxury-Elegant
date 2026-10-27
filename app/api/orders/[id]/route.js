import { NextResponse } from 'next/server';
const { isAdminRequest } = require('../../../../src/utils/route-auth');
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');
const { restoreOrderLine } = require('../../../../src/services/inventory');

export async function GET(request, { params }) {
  try {
    await initSchema();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    // Guard against information disclosure: the requester must own this order
    if (!phone || String(order.phone) !== String(phone)) {
      return NextResponse.json({ error: 'This invoice is not available for the provided details' }, { status: 404 });
    }
    return NextResponse.json({
      ...order,
      items: typeof order.items === 'string' ? JSON.parse(order.items || '[]') : order.items,
      subtotal: +order.subtotal,
      discount: +order.discount,
      shipping: +order.shipping,
      total: +order.total,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await initSchema();
    if (db.isFallback) {
      return NextResponse.json(
        { error: 'Order updating is disabled in read-only catalog mode. Production PostgreSQL database required.' },
        { status: 503 }
      );
    }
    const { id } = await params;
    const body = await request.json();
    const { status, payment_status } = body;
    const validStatuses = new Set(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded']);
    const validPaymentStatuses = new Set(['unpaid', 'pending', 'paid', 'failed', 'cancelled', 'refunded']);
    if (status !== undefined && !validStatuses.has(status)) return NextResponse.json({ error: 'Invalid order status.' }, { status: 400 });
    if (payment_status !== undefined && !validPaymentStatuses.has(payment_status)) return NextResponse.json({ error: 'Invalid payment status.' }, { status: 400 });

    await db.transaction(async (tx) => {
      const order = await tx.get(`SELECT * FROM orders WHERE id = ?${db.isPostgres ? ' FOR UPDATE' : ''}`, [id]);
      if (!order) throw Object.assign(new Error('Order not found.'), { status: 404 });
      const nextStatus = status || order.status;
      const terminal = new Set(['cancelled', 'returned', 'refunded']);
      if (terminal.has(order.status) && !terminal.has(nextStatus)) {
        throw Object.assign(new Error('A cancelled or refunded order cannot be reopened.'), { status: 409 });
      }
      if (!terminal.has(order.status) && terminal.has(nextStatus)) {
        let items;
        try { items = typeof order.items === 'string' ? JSON.parse(order.items || '[]') : order.items; } catch { items = null; }
        if (!Array.isArray(items)) throw new Error('Order item data is invalid; inventory was not changed.');
        for (const [index, item] of items.entries()) {
          const qty = Number(item.qty);
          const productId = Number(item.id);
          if (!Number.isSafeInteger(qty) || qty <= 0 || !Number.isSafeInteger(productId) || productId <= 0) throw new Error('Order item data is invalid; inventory was not changed.');
          const lineKey = String(item.variant_id || ('product:' + productId + ':' + index));
          await restoreOrderLine(tx, { orderId: id, lineKey, variantId: item.variant_id, productId, quantity: qty });
        }
      }
      await tx.run(
        'UPDATE orders SET status = ?, payment_status = ? WHERE id = ?',
        [nextStatus, payment_status || order.payment_status, id]
      );
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status || (db.isFallback ? 503 : 500) });
  }
}
