import { NextResponse } from 'next/server';
const db = require('../../../../src/database/connection');
const { initSchema } = require('../../../../src/database/schema');
const { isAdminRequest } = require('../../../../src/utils/route-auth');
const { sameOrigin } = require('../../../../src/utils/customer-session');
const { COURIER_DELIVERY_CHARGE_STEADFAST, COURIER_DELIVERY_CHARGE_PATHAO } = require('../../../../src/config/env');
const { enqueueOrderEvent } = require('../../../../src/services/notification-outbox');
const { getCourierCapabilities, createBooking } = require('../../../../src/services/courier-adapters');

const providers = {
  steadfast: { charge: COURIER_DELIVERY_CHARGE_STEADFAST },
  pathao: { charge: COURIER_DELIVERY_CHARGE_PATHAO },
  manual: { baseUrl: '', token: '', charge: '' },
};
export async function GET(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  try {
    await initSchema();
    if (db.isFallback) return NextResponse.json({ error: 'Persistent database required.' }, { status: 503 });
    const shipments = await db.all('SELECT s.*, o.status AS order_status, o.name AS customer_name FROM courier_shipments s JOIN orders o ON o.id = s.order_id ORDER BY s.id DESC LIMIT 200');
    const activities = shipments.length ? await db.all('SELECT shipment_id, event, details, created FROM courier_activity WHERE shipment_id IN (' + shipments.map(() => '?').join(',') + ') ORDER BY id DESC', shipments.map((shipment) => shipment.id)) : [];
    return NextResponse.json({ shipments: shipments.map((shipment) => ({ ...shipment, activity: activities.filter((activity) => Number(activity.shipment_id) === Number(shipment.id)) })), providers: getCourierCapabilities() });
  } catch { return NextResponse.json({ error: 'Courier data unavailable.' }, { status: 503 }); }
}

export async function POST(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    await initSchema();
    if (db.isFallback) return NextResponse.json({ error: 'Persistent database required.' }, { status: 503 });
    const body = await request.json();
    const orderId = Number(body.order_id), provider = String(body.provider || 'manual').toLowerCase();
    if (!Number.isSafeInteger(orderId) || !providers[provider]) return NextResponse.json({ error: 'Choose a valid order and courier.' }, { status: 400 });
    const shipment = await db.transaction(async (tx) => {
      const order = await tx.get(`SELECT id, status FROM orders WHERE id = ?${db.isPostgres ? ' FOR UPDATE' : ''}`, [orderId]);
      if (!order) throw Object.assign(new Error('Order not found.'), { status: 404 });
      if (!['confirmed', 'processing', 'shipped'].includes(order.status)) throw Object.assign(new Error('Confirm or begin processing the order before courier booking.'), { status: 409 });
      const adapter = provider === 'manual' ? { mode: 'manual', status: 'manual_required', reason: 'Manual tracking entry.' } : await createBooking(provider);
      const old = await tx.get('SELECT * FROM courier_shipments WHERE order_id = ?', [orderId]);
      if (old) {
        if (old.provider !== provider) throw Object.assign(new Error('A shipment already exists for this order. Edit its tracking details instead.'), { status: 409 });
        return old;
      }
      const settingKey = provider === 'steadfast' ? 'courier_charge_steadfast' : provider === 'pathao' ? 'courier_charge_pathao' : null;
      const savedCharge = settingKey ? await tx.get('SELECT v FROM settings WHERE k = ?', [settingKey]) : null;
      const configuredCharge = Number(savedCharge?.v ?? providers[provider].charge);
      const charge = body.delivery_charge == null ? Number.isFinite(configuredCharge) && configuredCharge >= 0 ? configuredCharge : null : Number(body.delivery_charge);
      if (charge !== null && (!Number.isFinite(charge) || charge < 0 || charge > 100000)) throw Object.assign(new Error('Invalid delivery charge.'), { status: 400 });
      const result = await tx.run("INSERT INTO courier_shipments (order_id, provider, tracking_id, consignment_id, status, delivery_charge, attempts, request_json, response_json) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)", [orderId, provider, String(body.tracking_id || '').trim().slice(0, 120) || null, String(body.consignment_id || '').trim().slice(0, 120) || null, adapter.status, charge, JSON.stringify({ mode: adapter.mode }), JSON.stringify({ live_booking_enabled: false, reason: adapter.reason })]);
      const created = await tx.get('SELECT * FROM courier_shipments WHERE id = ?', [result.lastInsertRowid]);
      await tx.run('INSERT INTO courier_activity (shipment_id, event, details) VALUES (?, ?, ?)', [created.id, 'shipment_created', JSON.stringify({ provider, mode: 'manual' })]);
      return created;
    });
    return NextResponse.json({ shipment, live_booking_enabled: false }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error.status ? error.message : 'Courier booking could not be recorded.' }, { status: error.status || 500 }); }
}

export async function PATCH(request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  try {
    await initSchema();
    if (db.isFallback) return NextResponse.json({ error: 'Persistent database required.' }, { status: 503 });
    const body = await request.json(), id = Number(body.id);
    const statuses = new Set(['manual_required', 'booked', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'cancelled']);
    if (!Number.isSafeInteger(id) || !statuses.has(body.status)) return NextResponse.json({ error: 'Invalid shipment update.' }, { status: 400 });
    const updated = await db.transaction(async (tx) => {
      const shipment = await tx.get(`SELECT * FROM courier_shipments WHERE id = ?${db.isPostgres ? ' FOR UPDATE' : ''}`, [id]);
      if (!shipment) throw Object.assign(new Error('Shipment not found.'), { status: 404 });
      await tx.run('UPDATE courier_shipments SET tracking_id = ?, consignment_id = ?, status = ?, updated = CURRENT_TIMESTAMP WHERE id = ?', [String(body.tracking_id ?? shipment.tracking_id ?? '').trim().slice(0, 120) || null, String(body.consignment_id ?? shipment.consignment_id ?? '').trim().slice(0, 120) || null, body.status, id]);
      if (shipment.status !== body.status) await tx.run('INSERT INTO courier_activity (shipment_id, event, details) VALUES (?, ?, ?)', [id, body.status, JSON.stringify({ source: 'admin_manual_update' })]);
      const orderStatus = body.status === 'delivered' ? 'delivered' : ['picked_up', 'in_transit', 'out_for_delivery'].includes(body.status) ? 'shipped' : null;
      if (orderStatus) {
        const order = await tx.get(`SELECT * FROM orders WHERE id = ?${db.isPostgres ? ' FOR UPDATE' : ''}`, [shipment.order_id]);
        if (!order || ['cancelled', 'returned', 'refunded'].includes(order.status)) return tx.get('SELECT * FROM courier_shipments WHERE id = ?', [id]);
        if (order && order.status !== orderStatus) {
          await tx.run('UPDATE orders SET status = ? WHERE id = ?', [orderStatus, shipment.order_id]);
          const recipient = order.user_id ? await tx.get('SELECT email FROM users WHERE id = ?', [order.user_id]) : null;
          await enqueueOrderEvent(tx, { order: { ...order, status: orderStatus }, eventType: `order_${orderStatus}`, customerEmail: recipient?.email || null, customerPhone: order.phone || null });
        }
      }
      return tx.get('SELECT * FROM courier_shipments WHERE id = ?', [id]);
    });
    return NextResponse.json({ shipment: updated });
  } catch (error) { return NextResponse.json({ error: error.status ? error.message : 'Shipment update failed.' }, { status: error.status || 500 }); }
}
