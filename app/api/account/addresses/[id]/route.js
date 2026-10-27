import { NextResponse } from 'next/server';
const { db, requireCustomer, validAddress, sameOrigin } = require('../../_shared');
export async function PUT(request, { params }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const id = Number((await params).id), value = validAddress(await request.json());
    if (!Number.isSafeInteger(id) || !value) return NextResponse.json({ error: 'Invalid address.' }, { status: 400 });
    const changed = await db.transaction(async (tx) => {
      if (db.isPostgres) await tx.get('SELECT id FROM users WHERE id = ? FOR UPDATE', [auth.user.id]);
      if (value.is_default) await tx.run('UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?', [auth.user.id]);
      return tx.run('UPDATE customer_addresses SET label = ?, recipient_name = ?, phone = ?, address = ?, area = ?, is_default = ? WHERE id = ? AND user_id = ?', [value.label, value.recipient_name, value.phone, value.address, value.area, value.is_default, id, auth.user.id]);
    });
    return changed.changes ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Address not found.' }, { status: 404 });
  } catch { return NextResponse.json({ error: 'Address could not be updated.' }, { status: 500 }); }
}
export async function DELETE(request, { params }) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) return NextResponse.json({ error: 'Invalid address.' }, { status: 400 });
  const changed = await db.run('DELETE FROM customer_addresses WHERE id = ? AND user_id = ?', [id, auth.user.id]);
  return changed.changes ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Address not found.' }, { status: 404 });
}
