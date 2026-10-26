import { NextResponse } from 'next/server';
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');

export async function GET() {
  try {
    await initSchema();
    const [revRow, ordersCountRow, productsCountRow, lowStockRow, recentOrders] = await Promise.all([
      db.get("SELECT COALESCE(SUM(total), 0) AS total_revenue FROM orders WHERE status != 'cancelled'"),
      db.get('SELECT COUNT(*) AS total_orders FROM orders'),
      db.get('SELECT COUNT(*) AS total_products FROM products WHERE active = 1'),
      db.all('SELECT id, name, stock FROM products WHERE active = 1 AND stock <= 5 ORDER BY stock ASC LIMIT 10'),
      db.all('SELECT id, name, phone, total, status, created FROM orders ORDER BY id DESC LIMIT 8'),
    ]);

    return NextResponse.json({
      revenue: +(revRow?.total_revenue || 0),
      orders: +(ordersCountRow?.total_orders || 0),
      products: +(productsCountRow?.total_products || 0),
      lowStock: lowStockRow || [],
      recentOrders: recentOrders || [],
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
