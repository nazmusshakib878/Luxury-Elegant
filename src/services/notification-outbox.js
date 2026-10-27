const db = require('../database/connection');
const { EMAIL_PROVIDER_URL, EMAIL_PROVIDER_TOKEN, SMS_PROVIDER_URL, SMS_PROVIDER_TOKEN, NOTIFY_WEBHOOK, CRON_SECRET } = require('../config/env');

async function enqueueOrderEvent(tx, { order, eventType, customerEmail = null, customerPhone = null }) {
  const payload = JSON.stringify({ order_id: Number(order.id), status: order.status || eventType, total: Number(order.total || 0) });
  const internal = [
    { channel: 'admin', recipient: null, status: 'sent' },
    ...(order.user_id ? [{ channel: 'in_app', recipient: String(order.user_id), status: 'sent' }] : []),
  ];
  const external = [];
  if (customerEmail && EMAIL_PROVIDER_URL && EMAIL_PROVIDER_TOKEN) external.push({ channel: 'email', recipient: customerEmail, status: 'pending' });
  if (customerPhone && SMS_PROVIDER_URL && SMS_PROVIDER_TOKEN) external.push({ channel: 'sms', recipient: customerPhone, status: 'pending' });
  if (NOTIFY_WEBHOOK && secureEndpoint(NOTIFY_WEBHOOK)) external.push({ channel: 'webhook', recipient: null, status: 'pending' });
  for (const item of [...internal, ...external]) {
    const eventKey = `${eventType}:${order.id}:${item.channel}`;
    await tx.run(`INSERT INTO notification_outbox (event_key, order_id, recipient_user_id, recipient_email, recipient_phone, channel, event_type, payload, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(event_key) DO NOTHING`, [eventKey, Number(order.id), item.channel === 'in_app' ? Number(item.recipient) : null, item.channel === 'email' ? item.recipient : null, item.channel === 'sms' ? item.recipient : null, item.channel, eventType, payload, item.status]);
  }
}

function getNotificationCapabilities() {
  return { email: { configured: secureProvider(EMAIL_PROVIDER_URL, EMAIL_PROVIDER_TOKEN) }, sms: { configured: secureProvider(SMS_PROVIDER_URL, SMS_PROVIDER_TOKEN) }, webhook: { configured: Boolean(NOTIFY_WEBHOOK && secureEndpoint(NOTIFY_WEBHOOK)) }, scheduledDeliveryConfigured: CRON_SECRET.length >= 32, durableOutbox: true };
}

function secureProvider(endpoint, token) {
  return Boolean(token && secureEndpoint(endpoint));
}
function secureEndpoint(endpoint) { try { return new URL(endpoint).protocol === 'https:'; } catch { return false; } }

async function deliverOutboxBatch({ limit = 20 } = {}) {
  const now = new Date().toISOString();
  const claimed = await db.transaction(async (tx) => {
    const rows = await tx.all(`SELECT * FROM notification_outbox
      WHERE attempts < 8 AND ((status IN ('pending','failed') AND available_at <= ?) OR (status = 'sending' AND available_at <= ?))
      ORDER BY id LIMIT ?${db.isPostgres ? ' FOR UPDATE SKIP LOCKED' : ''}`, [now, now, limit]);
    for (const row of rows) await tx.run("UPDATE notification_outbox SET status = 'sending', attempts = attempts + 1, available_at = ? WHERE id = ?", [new Date(Date.now() + 5 * 60 * 1000).toISOString(), row.id]);
    return rows.map((row) => ({ ...row, attempts: Number(row.attempts || 0) + 1 }));
  });
  let delivered = 0;
  for (const item of claimed) {
    const endpoint = item.channel === 'email' ? EMAIL_PROVIDER_URL : item.channel === 'sms' ? SMS_PROVIDER_URL : item.channel === 'webhook' ? NOTIFY_WEBHOOK : '';
    const secret = item.channel === 'email' ? EMAIL_PROVIDER_TOKEN : item.channel === 'sms' ? SMS_PROVIDER_TOKEN : '';
    try {
      if (!(item.channel === 'webhook' ? secureEndpoint(endpoint) : secureProvider(endpoint, secret))) throw new Error('A configured HTTPS notification provider is required.');
      const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': item.event_key };
      if (secret) headers.Authorization = `Bearer ${secret}`;
      const response = await fetch(endpoint, { method: 'POST', signal: AbortSignal.timeout(8000), headers, body: JSON.stringify({ to: item.recipient_email || item.recipient_phone, channel: item.channel, event: item.event_type, ...JSON.parse(item.payload) }) });
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}.`);
      await db.run("UPDATE notification_outbox SET status = 'sent', sent_at = ?, last_error = NULL WHERE id = ? AND status = 'sending'", [new Date().toISOString(), item.id]);
      delivered++;
    } catch (error) {
      const backoff = Math.min(6 * 60 * 60 * 1000, 30_000 * (2 ** Math.min(item.attempts - 1, 10)));
      const safeError = String(error.message || 'Delivery failed').replace(/https?:\/\/\S+/g, '[provider]').slice(0, 240);
      await db.run("UPDATE notification_outbox SET status = 'failed', available_at = ?, last_error = ? WHERE id = ? AND status = 'sending'", [new Date(Date.now() + backoff).toISOString(), safeError, item.id]);
    }
  }
  return { claimed: claimed.length, delivered };
}

module.exports = { enqueueOrderEvent, deliverOutboxBatch, getNotificationCapabilities };
