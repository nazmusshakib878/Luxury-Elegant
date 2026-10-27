import { NextResponse } from 'next/server';
const db = require('../../../../src/database/connection');
const { requireCustomer } = require('../_shared');
export async function GET(request) {
  const auth = await requireCustomer(request);
  if (!auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const notifications = await db.all("SELECT id, order_id, event_type, status, created FROM notification_outbox WHERE channel = 'in_app' AND recipient_user_id = ? ORDER BY id DESC LIMIT 100", [auth.user.id]);
  return NextResponse.json({ notifications });
}
