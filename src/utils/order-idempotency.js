const crypto = require('crypto');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidIdempotencyKey(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function hashOrderRequest({ name, phone, address, area, items, coupon }) {
  const normalizedItems = [...items]
    .map((item) => ({ id: Number(item.id), qty: Number(item.qty), variant_id: item.variant_id == null ? null : Number(item.variant_id) }))
    .sort((a, b) => a.id - b.id || JSON.stringify(a.variant).localeCompare(JSON.stringify(b.variant)));
  const canonical = {
    name: String(name).trim(),
    phone: String(phone),
    address: String(address).trim(),
    area: area === 'dhaka' ? 'dhaka' : 'outside',
    coupon: typeof coupon === 'string' ? coupon.toUpperCase().trim() : null,
    items: normalizedItems,
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

module.exports = { isValidIdempotencyKey, hashOrderRequest };
