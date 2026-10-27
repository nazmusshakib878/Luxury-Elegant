import { NextResponse } from 'next/server';
const crypto = require('crypto');
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');
const { deliverOutboxBatch } = require('../../../../src/services/notification-outbox');
const { CRON_SECRET } = require('../../../../src/config/env');

export async function GET(request) {
  const supplied = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (CRON_SECRET.length < 32 || supplied.length !== CRON_SECRET.length || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(CRON_SECRET))) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    await initSchema();
    if (db.isFallback) return NextResponse.json({ error: 'Persistent database required.' }, { status: 503 });
    return NextResponse.json(await deliverOutboxBatch());
  } catch { return NextResponse.json({ error: 'Notification delivery is unavailable.' }, { status: 503 }); }
}
