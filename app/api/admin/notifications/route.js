import { NextResponse } from 'next/server';
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');
const { isAdminRequest } = require('../../../../src/utils/route-auth');
const { deliverOutboxBatch, getNotificationCapabilities } = require('../../../../src/services/notification-outbox');
const { sameOrigin } = require('../../../../src/utils/customer-session');

export async function GET(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  try {
    await initSchema();
    if (db.isFallback) return NextResponse.json({ error: 'Persistent database required.' }, { status: 503 });
    const rows = await db.all('SELECT id, order_id, channel, event_type, status, attempts, available_at, last_error, created, sent_at FROM notification_outbox ORDER BY id DESC LIMIT 300');
    return NextResponse.json({ notifications: rows, failed: rows.filter((row) => row.status === 'failed').length, providers: getNotificationCapabilities() });
  } catch { return NextResponse.json({ error: 'Notification history unavailable.' }, { status: 503 }); }
}

export async function POST(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    await initSchema();
    if (db.isFallback) return NextResponse.json({ error: 'Persistent database required.' }, { status: 503 });
    const { id } = await request.json(), rowId = Number(id);
    if (!Number.isSafeInteger(rowId)) return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    const updated = await db.run("UPDATE notification_outbox SET status = 'pending', attempts = 0, available_at = CURRENT_TIMESTAMP, last_error = NULL WHERE id = ? AND status = 'failed'", [rowId]);
    if (!updated.changes) return NextResponse.json({ error: 'Failed notification not found.' }, { status: 404 });
    return NextResponse.json({ success: true, queued: true });
  } catch { return NextResponse.json({ error: 'Notification retry could not be queued.' }, { status: 503 }); }
}
