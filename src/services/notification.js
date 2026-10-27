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

}

module.exports = {
  addEventClient,
  removeEventClient,
  notifyNewOrder,
};
