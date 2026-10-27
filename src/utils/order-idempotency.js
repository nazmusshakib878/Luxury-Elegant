const crypto = require('crypto');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidIdempotencyKey(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function hashOrderRequest({ name, phone, address, area, items, coupon, customer_id, address_id, guest_access_token }) {
  const normalizedItems = [...items]
    .map((item) => ({ id: Number(item.id), qty: Number(item.qty), variant_id: item.variant_id == null ? null : Number(item.variant_id) }))
    .sort((a, b) => a.id - b.id || Number(a.variant_id || 0) - Number(b.variant_id || 0) || a.qty - b.qty);
  const canonical = {
    name: String(name).trim(),
    phone: String(phone),
    address: String(address).trim(),
    area: area === 'dhaka' ? 'dhaka' : 'outside',
    coupon: typeof coupon === 'string' ? coupon.toUpperCase().trim() : null,
    items: normalizedItems,
    ...(customer_id == null ? {} : { customer_id: Number(customer_id) }),
    ...(address_id == null ? {} : { address_id: Number(address_id) }),
    ...(guest_access_token ? { guest_access_token: String(guest_access_token) } : {}),
  };
  return crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

module.exports = { isValidIdempotencyKey, hashOrderRequest };
