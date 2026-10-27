import { NextResponse } from 'next/server';
const { db, requireCustomer, sameOrigin } = require('../_shared');
export async function GET(request) {
  const auth = await requireCustomer(request);
  return auth.user ? NextResponse.json({ user: auth.user }) : NextResponse.json({ error: auth.error }, { status: auth.status });
}
export async function PATCH(request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 100) : '';
    const phone = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    if (name.length < 2 || !/^01[3-9]\d{8}$/.test(phone)) return NextResponse.json({ error: 'Enter a valid name and phone number.' }, { status: 400 });
    await db.run("UPDATE users SET name = ?, phone = ? WHERE id = ? AND role = 'customer'", [name, phone, auth.user.id]);
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Profile could not be updated.' }, { status: 500 }); }
}
