import { NextResponse } from 'next/server';
const { isAdminRequest } = require('../../../../src/utils/route-auth');
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');

export async function GET(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  try {
    await initSchema();
    const [revRow, ordersCountRow, productsCountRow, lowStockRow, recentOrders] = await Promise.all([
      db.get("SELECT COALESCE(SUM(total), 0) AS total_revenue FROM orders WHERE status != 'cancelled'"),
      db.get('SELECT COUNT(*) AS total_orders FROM orders'),
      db.get('SELECT COUNT(*) AS total_products FROM products WHERE active = 1'),
      db.all("SELECT 'product' AS type, id, name, stock FROM products WHERE active = 1 AND stock <= 5 AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = products.id) UNION ALL SELECT 'variant' AS type, v.id, p.name || ' (' || COALESCE(v.size, '') || ' ' || COALESCE(v.color, '') || ')' AS name, v.stock FROM product_variants v INNER JOIN products p ON p.id = v.product_id WHERE v.active = 1 AND v.stock <= 5 ORDER BY stock ASC LIMIT 20"),
      db.all('SELECT id, name, phone, total, status, created FROM orders ORDER BY id DESC LIMIT 8'),
    ]);

    return NextResponse.json({
      revenue: +(revRow?.total_revenue || 0),
      orders: +(ordersCountRow?.total_orders || 0),
      products: +(productsCountRow?.total_products || 0),
      lowStock: lowStockRow || [],
      low: lowStockRow || [],
      recentOrders: recentOrders || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
