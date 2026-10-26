const db = require('../database/connection');
const { getStoreSettings } = require('./store.controller');

exports.renderInvoice = async (req, res) => {
  const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);

  if (!order) {
    return res.status(404).send('Order not found');
  }

  // Authorization: allow store staff/admin or customer with matching phone
  const isStaffOrAdmin = req.user && req.user.role !== 'customer';
  const isMatchingCustomer = req.query.phone && req.query.phone === order.phone;

  if (!isStaffOrAdmin && !isMatchingCustomer) {
    return res.status(403).send('Forbidden: You do not have permission to view this invoice');
  }

  const settings = await getStoreSettings();
  const items = [];
  try {
    items = JSON.parse(order.items || '[]');
  } catch {}

  // Escape HTML to prevent stored XSS from order/customer-entered data
  const esc = (str) =>
    String(str ?? '').replace(/[&<>"]/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    }[c]));

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice #${esc(order.id)} — ${esc(settings.shop_name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1c1917;
      background: #faf7f2;
      margin: 0;
      padding: 40px 20px;
    }
    .invoice-card {
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      padding: 36px 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f5f5f4;
      padding-bottom: 24px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 28px;
      color: #0f3d2e;
      margin: 0 0 6px 0;
      letter-spacing: 0.5px;
    }
    .meta-text {
      color: #78716c;
      font-size: 13px;
    }
    .btn-print {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0f3d2e;
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: 10px 22px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn-print:hover {
      background: #165a44;
    }
    .customer-info {
      margin-bottom: 28px;
    }
    .customer-info p {
      margin: 4px 0;
      color: #44403c;
    }
    .customer-name {
      font-size: 16px;
      font-weight: 600;
      color: #1c1917;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
    }
    th {
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #78716c;
      padding: 12px 10px;
      border-bottom: 1.5px solid #e7e5e4;
    }
    td {
      padding: 14px 10px;
      border-bottom: 1px solid #f5f5f4;
      vertical-align: middle;
    }
    .r { text-align: right; }
    .summary-box {
      margin-top: 24px;
      text-align: right;
      line-height: 1.8;
      color: #57534e;
    }
    .summary-box .total-row {
      font-size: 20px;
      font-weight: 700;
      color: #0f3d2e;
      margin-top: 8px;
    }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      background: #ecfdf5;
      color: #065f46;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .invoice-card { box-shadow: none; border-radius: 0; padding: 20px; }
      .btn-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <h1 class="brand-title">${settings.shop_name}</h1>
        <div class="meta-text">Invoice #<b>${esc(order.id)}</b> · ${esc(order.created)}</div>
      </div>
      <button class="btn-print" onclick="window.print()">🖨 Print / Save PDF</button>
    </div>

    <div class="customer-info">
      <div class="customer-name">${esc(order.name)}</div>
      <p>📞 ${esc(order.phone)}</p>
      <p>📍 ${esc(order.address)} (${esc(order.area) === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</p>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th class="r">Unit Price</th>
          <th class="r">Qty</th>
          <th class="r">Total</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((i) => `
          <tr>
            <td>
              <b>${esc(i.name)}</b>
              ${i.variant ? `<br><small style="color:#78716c">${esc(i.variant)}</small>` : ''}
            </td>
            <td class="r">৳${Math.round(i.price).toLocaleString('en-IN')}</td>
            <td class="r">${i.qty}</td>
            <td class="r">৳${Math.round(i.price * i.qty).toLocaleString('en-IN')}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="summary-box">
      <div>Subtotal: ৳${Math.round(order.subtotal).toLocaleString('en-IN')}</div>
      ${order.discount ? `<div style="color:#15803d">Discount: −৳${Math.round(order.discount).toLocaleString('en-IN')}</div>` : ''}
      <div>Shipping: ${order.shipping ? `৳${order.shipping}` : 'Free'}</div>
      <div class="total-row">Total: ৳${Math.round(order.total).toLocaleString('en-IN')}</div>
      <div style="margin-top: 10px;">
        Payment: <b>${esc(order.method).toUpperCase()}</b> · Status: <span class="badge">${esc(order.payment_status)}</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  res.send(html);
};
