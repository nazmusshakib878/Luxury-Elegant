import { NextResponse } from 'next/server';
const { isAdminRequest } = require('../../../src/utils/route-auth');
const db = require('../../../src/database/connection');
const { initSchema } = require('../../../src/database/schema');

function getEffectivePrice(product) {
  const hasFlashSale = !product.flash_end || new Date(product.flash_end) > new Date();
  const regularPrice = Number(product.price);
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
    price: Number.isFinite(Number(product.price)) && product.price !== null ? Number(product.price) : null,
    sale_price: product.sale_price !== null && Number.isFinite(Number(product.sale_price)) && Number.isFinite(Number(product.price)) && Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price) ? Number(product.sale_price) : null,
    stock: Number.isFinite(Number(product.stock)) ? Number(product.stock) : null,
    rating: product.rating !== null && product.rating !== undefined && Number.isFinite(Number(product.rating)) && Number(product.rating) >= 0 && Number(product.rating) <= 5 ? Number(product.rating) : null,
    reviews: Number.isFinite(Number(product.reviews)) && Number(product.reviews) >= 0 ? Number(product.reviews) : 0,
    image: imgPath,
    variants: parsedVariants,
    price_now: priceNow,
    on_sale: priceNow !== null && Number.isFinite(Number(product.price)) && priceNow < Number(product.price),
  };
}

export async function GET(request) {
  try {
    await initSchema();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q');
    const cat = searchParams.get('cat');
    const min = searchParams.get('min');
    const max = searchParams.get('max');
    const sort = searchParams.get('sort');
    const sale = searchParams.get('sale');

    const where = ['p.active = 1'];
    const params = [];

    if (search) {
      where.push('(p.name LIKE ? OR p.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (cat) {
      const trimmedCat = String(cat).trim();
      if (/^\d+$/.test(trimmedCat)) {
        where.push('p.cat_id = ?');
        params.push(Number(trimmedCat));
      } else {
        where.push('LOWER(c.name) = LOWER(?)');
        params.push(trimmedCat);
      }
    }

    if (min) {
      where.push('COALESCE(p.sale_price, p.price) >= ?');
      params.push(+min);
    }
    if (max) {
      where.push('COALESCE(p.sale_price, p.price) <= ?');
      params.push(+max);
    }
    if (sale === '1' || sale === 'true') {
      where.push('p.sale_price IS NOT NULL AND p.sale_price < p.price');
    }

    let orderBy = 'p.id DESC';
    if (sort === 'price_asc') orderBy = 'COALESCE(p.sale_price, p.price) ASC';
    else if (sort === 'price_desc') orderBy = 'COALESCE(p.sale_price, p.price) DESC';
    else if (sort === 'rating') orderBy = 'rating DESC NULLS LAST, p.id DESC';

    const sql = `
      SELECT 
        p.*,
        c.name AS cat,
        (SELECT ROUND(AVG(rating), 1) FROM reviews WHERE product_id = p.id) AS rating,
        (SELECT COUNT(*) FROM reviews WHERE product_id = p.id) AS reviews
      FROM products p
      LEFT JOIN categories c ON c.id = p.cat_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${orderBy}
    `;

    const products = await db.all(sql, params);
    return NextResponse.json(products.map(shapeProduct));
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await initSchema();
    if (db.isFallback) {
      return NextResponse.json(
        { error: 'Product creation is disabled in read-only catalog mode. Production PostgreSQL database required.' },
        { status: 503 }
      );
    }
    const body = await request.json();
    const { name, cat_id, price, sale_price, stock, image, description, variants } = body;

    if (!name || !price) {
      return NextResponse.json({ error: 'Name and price are required' }, { status: 400 });
    }

    const res = await db.run(
      `INSERT INTO products (name, cat_id, price, sale_price, stock, image, description, variants)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        cat_id || null,
        +price,
        sale_price ? +sale_price : null,
        +stock || 0,
        image || '',
        description || '',
        typeof variants === 'object' ? JSON.stringify(variants) : (variants || '{}'),
      ]
    );

    return NextResponse.json({ success: true, id: res.lastInsertRowid });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
