import { NextResponse } from 'next/server';
const db = require('../../../src/database/connection');
const { initSchema } = require('../../../src/database/schema');

export async function GET(request) {
  try {
    await initSchema();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const phone = (searchParams.get('phone') || '').trim();

    if (!id || !phone) {
      return NextResponse.json({ error: 'Order ID and Phone Number are required' }, { status: 400 });
    }

    const order = await db.get(
      'SELECT * FROM orders WHERE id = ? AND phone LIKE ?',
      [id, `%${phone.slice(-10)}`]
    );

    if (!order) {
      return NextResponse.json({ error: 'No matching order found with the provided details' }, { status: 404 });
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
