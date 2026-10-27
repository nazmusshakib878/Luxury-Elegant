import { NextResponse } from 'next/server';
const { db, requireCustomer, sameOrigin } = require('../_shared');
export async function GET(request) {
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json(await db.all('SELECT p.* FROM customer_wishlist w INNER JOIN products p ON p.id = w.product_id WHERE w.user_id = ? ORDER BY w.created DESC', [auth.user.id]));
}
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const productId = Number((await request.json()).product_id);
  if (!Number.isSafeInteger(productId) || productId < 1 || !await db.get('SELECT id FROM products WHERE id = ?', [productId])) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
  await db.run('INSERT INTO customer_wishlist (user_id, product_id) VALUES (?, ?) ON CONFLICT(user_id, product_id) DO NOTHING', [auth.user.id, productId]);
  return NextResponse.json({ success: true });
}
export async function DELETE(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const productId = Number(new URL(request.url).searchParams.get('product_id'));
  if (!Number.isSafeInteger(productId)) return NextResponse.json({ error: 'Invalid product.' }, { status: 400 });
  await db.run('DELETE FROM customer_wishlist WHERE user_id = ? AND product_id = ?', [auth.user.id, productId]);
  return NextResponse.json({ success: true });
}
