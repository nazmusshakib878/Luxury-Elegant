import { NextResponse } from 'next/server';
const { db, requireCustomer } = require('../../_shared');
export async function GET(request, { params }) {
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  const order = await db.get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [id, auth.user.id]);
  if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  return NextResponse.json({ ...order, items: typeof order.items === 'string' ? JSON.parse(order.items || '[]') : order.items });
}
