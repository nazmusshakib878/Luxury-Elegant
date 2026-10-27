import { NextResponse } from 'next/server';
const { isAdminRequest } = require('../../../../src/utils/route-auth');
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');

function getEffectivePrice(product) {
  const hasFlashSale = !product.flash_end || new Date(product.flash_end) > new Date();
  const regularPrice = product.price == null || product.price === '' ? null : Number(product.price);
  const salePrice = product.sale_price == null || product.sale_price === '' ? null : Number(product.sale_price);
  if (Number.isFinite(salePrice) && salePrice > 0 && Number.isFinite(regularPrice) && salePrice < regularPrice && hasFlashSale) {
    return salePrice;
  }
  return Number.isFinite(regularPrice) && regularPrice > 0 ? regularPrice : null;
}

function shapeProduct(product) {
  const priceNow = getEffectivePrice(product);
  let parsedVariants = {};
  try {
    parsedVariants = JSON.parse(product.variants || '{}');
  } catch {}

  let imgPath = (product.image || '').trim();
  if (imgPath && !imgPath.startsWith('http://') && !imgPath.startsWith('https://') && !imgPath.startsWith('data:') && !imgPath.startsWith('/')) {
    imgPath = imgPath.startsWith('images/') ? '/' + imgPath : '/images/' + imgPath;
  }

  return {
    ...product,
    price: product.price != null && Number.isFinite(Number(product.price)) && Number(product.price) > 0 ? Number(product.price) : null,
    sale_price: product.sale_price != null && Number.isFinite(Number(product.sale_price)) && Number(product.price) > 0 && Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price) ? Number(product.sale_price) : null,
    stock: Number.isFinite(Number(product.stock)) && Number(product.stock) >= 0 ? Number(product.stock) : null,
    rating: product.rating !== null && product.rating !== undefined && Number.isFinite(Number(product.rating)) && Number(product.rating) >= 0 && Number(product.rating) <= 5 ? Number(product.rating) : null,
    reviews: Number.isFinite(Number(product.reviews)) && Number(product.reviews) >= 0 ? Number(product.reviews) : 0,
    image: imgPath,
    variants: parsedVariants,
    price_now: priceNow,
    on_sale: priceNow !== null && product.price != null && Number.isFinite(Number(product.price)) && priceNow < Number(product.price),
  };
}

export async function GET(request, { params }) {
  try {
    await initSchema();
    const { id } = await params;
    const sql = `
      SELECT 
        p.*,
        c.name AS cat,
        (SELECT ROUND(AVG(r.rating), 1) FROM reviews r INNER JOIN review_verifications v ON v.review_id = r.id WHERE r.product_id = p.id) AS rating,
        (SELECT COUNT(*) FROM reviews r INNER JOIN review_verifications v ON v.review_id = r.id WHERE r.product_id = p.id) AS reviews
      FROM products p
      LEFT JOIN categories c ON c.id = p.cat_id
      WHERE p.id = ?
    `;

    const product = await db.get(sql, [id]);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const reviews = await db.all(
      `SELECT r.id, r.product_id, r.user_name, r.rating, r.comment, r.created, 1 AS verified_purchase
       FROM reviews r INNER JOIN review_verifications v ON v.review_id = r.id
       WHERE r.product_id = ? ORDER BY r.id DESC`,
      [id]
    );

    const productVariants = await db.all('SELECT id, product_id, size, color, sku, price, stock, active FROM product_variants WHERE product_id = ? ORDER BY id', [id]);

    return NextResponse.json({
      product: { ...shapeProduct(product), product_variants: productVariants.map(v => ({ ...v, price: Number(v.price), stock: Number(v.stock), active: Boolean(v.active), available: Boolean(v.active) && Number(v.stock) > 0 })) },
      reviews,
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
        { error: 'Product updating is disabled in read-only catalog mode. Production PostgreSQL database required.' },
        { status: 503 }
      );
    }
    const { id } = await params;
    const body = await request.json();
    const { name, sku, cat_id, price, sale_price, stock, image, description, variants, active } = body;
    const cleanSku = sku === undefined ? undefined : (typeof sku === 'string' && sku.trim() ? sku.trim().toUpperCase() : '');
    if (typeof cleanSku === 'string' && cleanSku && !/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(cleanSku)) {
      return NextResponse.json({ error: 'SKU must be 2–64 characters using letters, numbers, dots, underscores, or hyphens.' }, { status: 400 });
    }

    await db.run(
      `UPDATE products 
       SET sku = CASE WHEN ? IS NULL THEN sku ELSE NULLIF(?, '') END,
           name = COALESCE(?, name),
           cat_id = COALESCE(?, cat_id),
           price = COALESCE(?, price),
           sale_price = ?,
           stock = COALESCE(?, stock),
           image = COALESCE(?, image),
           description = COALESCE(?, description),
           variants = COALESCE(?, variants),
           active = COALESCE(?, active)
       WHERE id = ?`,
      [
        cleanSku === undefined ? null : cleanSku,
        cleanSku === undefined ? null : cleanSku,
        name,
        cat_id,
        price !== undefined ? +price : null,
        sale_price !== undefined ? (sale_price ? +sale_price : null) : null,
        stock !== undefined ? +stock : null,
        image,
        description,
        typeof variants === 'object' ? JSON.stringify(variants) : variants,
        active !== undefined ? +active : null,
        id,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const duplicate = err.code === '23505' || /unique constraint|duplicate key|sku already assigned globally/i.test(err.message || '');
    return NextResponse.json({ error: duplicate ? 'That SKU is already assigned to another product.' : err.message }, { status: duplicate ? 409 : 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await initSchema();
    if (db.isFallback) {
      return NextResponse.json(
        { error: 'Product deletion is disabled in read-only catalog mode. Production PostgreSQL database required.' },
        { status: 503 }
      );
    }
    const { id } = await params;
    await db.run('DELETE FROM products WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
