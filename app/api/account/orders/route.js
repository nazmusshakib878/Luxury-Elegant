import { NextResponse } from 'next/server';
const { db, requireCustomer } = require('../_shared');
export async function GET(request) {
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const orders = await db.all('SELECT o.id, o.name, o.phone, o.address, o.area, o.items, o.subtotal, o.discount, o.shipping, o.total, o.method, o.payment_status, o.status, o.return_status, o.created, s.provider AS courier_provider, s.tracking_id, s.consignment_id, s.status AS shipment_status FROM orders o LEFT JOIN courier_shipments s ON s.order_id = o.id WHERE o.user_id = ? ORDER BY o.id DESC', [auth.user.id]);
    return NextResponse.json(orders.map((order) => ({ ...order, items: typeof order.items === 'string' ? JSON.parse(order.items || '[]') : order.items })));
  } catch { return NextResponse.json({ error: 'Orders could not be loaded.' }, { status: 503 }); }
}
