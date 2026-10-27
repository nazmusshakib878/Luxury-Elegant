import { NextResponse } from 'next/server';
const { db, requireCustomer, validAddress, sameOrigin } = require('../_shared');
export async function GET(request) {
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json(await db.all('SELECT * FROM customer_addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC', [auth.user.id]));
}
export async function POST(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const value = validAddress(await request.json());
    if (!value) return NextResponse.json({ error: 'Enter a recipient, valid phone, and complete address.' }, { status: 400 });
    const saved = await db.transaction(async (tx) => {
      if (db.isPostgres) await tx.get('SELECT id FROM users WHERE id = ? FOR UPDATE', [auth.user.id]);
      if (value.is_default) await tx.run('UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?', [auth.user.id]);
      const result = await tx.run('INSERT INTO customer_addresses (user_id, label, recipient_name, phone, address, area, is_default) VALUES (?, ?, ?, ?, ?, ?, ?)', [auth.user.id, value.label, value.recipient_name, value.phone, value.address, value.area, value.is_default]);
      return { id: result.lastInsertRowid, ...value };
    });
    return NextResponse.json({ address: saved }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Address could not be saved.' }, { status: 500 }); }
}
