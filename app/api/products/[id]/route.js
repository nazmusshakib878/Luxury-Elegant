import { NextResponse } from 'next/server';
const { isAdminRequest } = require('../../../../src/utils/route-auth');
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');

function getEffectivePrice(product) {
  const hasFlashSale = !product.flash_end || new Date(product.flash_end) > new Date();
  if (product.sale_price && hasFlashSale) {
    return +product.sale_price;
  }
  return +product.price;
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
    price: +product.price,
    sale_price: product.sale_price ? +product.sale_price : null,
    stock: +product.stock,
    rating: product.rating !== null && product.rating !== undefined ? +product.rating : null,
    reviews: +product.reviews || 0,
    image: imgPath,
    variants: parsedVariants,
    price_now: priceNow,
    on_sale: priceNow < +product.price,
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
        (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = p.id) AS rating,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS reviews
      FROM products p
      LEFT JOIN categories c ON c.id = p.cat_id
      WHERE p.id = ?
    `;

    const product = await db.get(sql, [id]);
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const reviews = await db.all(
      'SELECT * FROM reviews WHERE product_id = ? ORDER BY id DESC',
      [id]
    );

    return NextResponse.json({
      product: shapeProduct(product),
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
    const { name, cat_id, price, sale_price, stock, image, description, variants, active } = body;

    await db.run(
      `UPDATE products 
       SET name = COALESCE(?, name),
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
    return NextResponse.json({ error: err.message }, { status: 500 });
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
