import { NextResponse } from 'next/server';
const { db, requireCustomer, sameOrigin } = require('../../_shared');
const crypto = require('crypto');
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json();
  const orderId = Number(body.order_id), token = typeof body.access_token === 'string' ? body.access_token.toLowerCase() : '';
  if (!Number.isSafeInteger(orderId) || !/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Order reference and private order access key are required.' }, { status: 400 });
  const digest = crypto.createHash('sha256').update(token).digest('hex');
  try {
    const claimed = await db.transaction(async (tx) => {
      const order = await tx.get(`SELECT id, user_id, guest_access_token_hash, guest_access_token_expires FROM orders WHERE id = ?${db.isPostgres ? ' FOR UPDATE' : ''}`, [orderId]);
      if (!order || order.user_id || !order.guest_access_token_hash || !order.guest_access_token_expires || new Date(order.guest_access_token_expires).getTime() <= Date.now() || order.guest_access_token_hash !== digest) return false;
      await tx.run('UPDATE orders SET user_id = ?, guest_access_token_hash = NULL WHERE id = ? AND user_id IS NULL', [auth.user.id, orderId]);
      return true;
    });
    return claimed ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Order could not be claimed.' }, { status: 404 });
  } catch { return NextResponse.json({ error: 'Order could not be claimed.' }, { status: 503 }); }
}
