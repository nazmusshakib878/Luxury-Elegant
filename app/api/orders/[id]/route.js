import { NextResponse } from 'next/server';
const { isAdminRequest } = require('../../../../src/utils/route-auth');
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');

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

    await db.run(
      `UPDATE orders 
       SET status = COALESCE(?, status),
           payment_status = COALESCE(?, payment_status)
       WHERE id = ?`,
      [status || null, payment_status || null, id]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
