import { NextResponse } from 'next/server';
const { isAdminRequest } = require('../../../../../../src/utils/route-auth');
const db = require('../../../../../../src/database/connection');
const { initSchema } = require('../../../../../../src/database/schema');

function normalize(body) {
  const sku = String(body.sku || '').trim().toUpperCase();
  const price = Number(body.price), stock = Number(body.stock);
  if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(sku)) throw new Error('SKU must be 2–64 characters using letters, numbers, dots, underscores, or hyphens.');
  if (!Number.isFinite(price) || price <= 0) throw new Error('Variant price must be greater than zero.');
  if (!Number.isSafeInteger(stock) || stock < 0) throw new Error('Variant stock must be a non-negative whole number.');
  return { size: String(body.size || '').trim(), color: String(body.color || '').trim(), sku, price, stock, active: body.active === false || body.active === 0 ? 0 : 1 };
}

export async function GET(request, { params }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try { await initSchema(); const { id } = await params; return NextResponse.json(await db.all('SELECT * FROM product_variants WHERE product_id = ? ORDER BY id', [id])); }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}

export async function POST(request, { params }) { return save(request, params, null); }
export async function PUT(request, { params }) { return save(request, params, new URL(request.url).searchParams.get('variantId')); }

async function save(request, paramsPromise, variantId) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await initSchema();
    if (db.isFallback) return NextResponse.json({ error: 'Inventory updates require a persistent database.' }, { status: 503 });
    const { id } = await paramsPromise;
    const p = normalize(await request.json());
    const product = await db.get('SELECT id FROM products WHERE id = ?', [id]);
    if (!product) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    if (variantId) await db.run('UPDATE product_variants SET size = ?, color = ?, sku = ?, price = ?, stock = ?, active = ? WHERE id = ? AND product_id = ?', [p.size, p.color, p.sku, p.price, p.stock, p.active, variantId, id]);
    else { const result = await db.run('INSERT INTO product_variants (product_id, size, color, sku, price, stock, active) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, p.size, p.color, p.sku, p.price, p.stock, p.active]); return NextResponse.json({ success: true, id: result.lastInsertRowid }); }
    return NextResponse.json({ success: true });
  } catch (err) { const duplicate = err.code === '23505' || /unique constraint|duplicate key/i.test(err.message || ''); return NextResponse.json({ error: duplicate ? 'That SKU is already assigned.' : err.message }, { status: duplicate ? 409 : 400 }); }
}

export async function DELETE(request, { params }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try { await initSchema(); if (db.isFallback) return NextResponse.json({ error: 'Inventory updates require a persistent database.' }, { status: 503 }); const { id } = await params; const variantId = new URL(request.url).searchParams.get('variantId'); await db.run('DELETE FROM product_variants WHERE id = ? AND product_id = ?', [variantId, id]); return NextResponse.json({ success: true }); }
  catch (err) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
