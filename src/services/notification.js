const { NOTIFY_WEBHOOK } = require('../config/env');

const sseClients = new Set();

function addEventClient(res) {
  sseClients.add(res);
}

function removeEventClient(res) {
  sseClients.delete(res);
}

function notifyNewOrder(order) {
  const payload = JSON.stringify({
    id: order.id,
    name: order.name,
    total: order.total,
  });

  // Push to all active admin dashboards
  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }

  console.log(`[NEW ORDER] #${order.id} | ${order.name} | ${order.phone} | ৳${order.total}`);

  // Optional external webhook (Zapier, Make, SMS Gateway)
  if (NOTIFY_WEBHOOK) {
    fetch(NOTIFY_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    }).catch((err) => {
      console.warn('Webhook notification error:', err.message);
    });
  }
}

module.exports = {
  addEventClient,
  removeEventClient,
  notifyNewOrder,
};
