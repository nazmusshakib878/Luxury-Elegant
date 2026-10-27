const db = require('../../../src/database/connection');
const { initSchema } = require('../../../src/database/schema');
const { getCustomerSessionUser, sameOrigin } = require('../../../src/utils/customer-session');

async function requireCustomer(request) {
  await initSchema();
  if (db.isFallback) return { error: 'Customer accounts require a persistent database.', status: 503 };
  const user = await getCustomerSessionUser(request, db);
  if (!user) return { error: 'Sign in to continue.', status: 401 };
  return { user };
}

function validAddress(input) {
  const label = String(input.label || 'Home').trim().slice(0, 40);
  const recipient_name = String(input.recipient_name || '').trim().slice(0, 100);
  const phone = String(input.phone || '').replace(/\D/g, '');
  const address = String(input.address || '').trim().slice(0, 300);
  const area = input.area === 'dhaka' ? 'dhaka' : 'outside';
  if (!recipient_name || !/^01[3-9]\d{8}$/.test(phone) || address.length < 8) return null;
  return { label, recipient_name, phone, address, area, is_default: input.is_default ? 1 : 0 };
}

module.exports = { db, requireCustomer, validAddress, sameOrigin };
