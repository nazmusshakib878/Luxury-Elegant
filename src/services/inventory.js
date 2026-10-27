async function reserveVariantStock(tx, variantId, quantity) {
  const result = await tx.run('UPDATE product_variants SET stock = stock - ? WHERE id = ? AND active = 1 AND stock >= ?', [quantity, variantId, quantity]);
  if (result.changes !== 1) throw Object.assign(new Error('Selected variant is unavailable or out of stock.'), { status: 409 });
}

async function reserveProductStock(tx, productId, quantity) {
  const result = await tx.run('UPDATE products SET stock = stock - ? WHERE id = ? AND active = 1 AND stock >= ?', [quantity, productId, quantity]);
  if (result.changes !== 1) throw Object.assign(new Error('Product is unavailable or out of stock.'), { status: 409 });
}

async function restoreOrderLine(tx, { orderId, lineKey, variantId, productId, quantity }) {
  const inserted = await tx.run('INSERT INTO order_stock_restorations (order_id, line_key) VALUES (?, ?) ON CONFLICT (order_id, line_key) DO NOTHING', [orderId, lineKey]);
  if (inserted.changes !== 1) return false;
  if (variantId) await tx.run('UPDATE product_variants SET stock = stock + ? WHERE id = ?', [quantity, variantId]);
  else await tx.run('UPDATE products SET stock = stock + ? WHERE id = ?', [quantity, productId]);
  return true;
}

module.exports = { reserveVariantStock, reserveProductStock, restoreOrderLine };
