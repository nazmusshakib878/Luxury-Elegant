import { NextResponse } from 'next/server';
const db = require('../../../src/database/connection');
const { initSchema } = require('../../../src/database/schema');
const crypto = require('crypto');
const { getCustomerSessionUser } = require('../../../src/utils/customer-session');

export async function GET(request) {
  try {
    await initSchema();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const accessToken = request.headers.get('x-guest-order-token') || '';
    if (!/^\d{1,12}$/.test(id)) return NextResponse.json({ error: 'Order reference is required.' }, { status: 400 });
    const order = await db.get('SELECT o.*, s.provider AS courier_provider, s.tracking_id, s.consignment_id, s.status AS shipment_status FROM orders o LEFT JOIN courier_shipments s ON s.order_id = o.id WHERE o.id = ?', [Number(id)]);

    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    const user = await getCustomerSessionUser(request, db);
    const owns = user && Number(order.user_id) === Number(user.id);
    const tokenMatches = accessToken && order.guest_access_token_hash && order.guest_access_token_expires && new Date(order.guest_access_token_expires).getTime() > Date.now() && crypto.createHash('sha256').update(accessToken).digest('hex') === order.guest_access_token_hash;
    if (!owns && !tokenMatches) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

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
