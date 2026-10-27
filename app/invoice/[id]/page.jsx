'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatPrice } from '../../utils/format';

export default function InvoicePage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoice() {
      try {
        const accessToken = new URLSearchParams(window.location.hash.slice(1)).get('access_token');
        const adminToken = localStorage.getItem('luxury_admin_token');
        const headers = { ...(accessToken ? { 'X-Guest-Order-Token': accessToken } : {}), ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}) };
        const res = await fetch(`/api/orders/${id}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        }
      } catch (err) {
        console.error('Failed to load invoice:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadInvoice();
  }, [id]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>Generating official invoice…</div>;
  }

  if (!order) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <h2>Invoice Not Found</h2>
        <Link href="/" className="btn btn-p" style={{ marginTop: '1rem' }}>
          Back to Store
        </Link>
      </div>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div
      style={{
        maxWidth: '52rem',
        margin: '2rem auto',
        padding: '2.5rem',
        backgroundColor: '#ffffff',
        borderRadius: '1.5rem',
        border: '1px solid #e7e5e4',
        boxShadow: '0 20px 40px rgba(0,0,0,0.06)',
        color: '#1c1917',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Print & Back Controls (Hidden in Print) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }} className="no-print">
        <Link href="/" style={{ color: '#0f3d2e', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
          ← Return to Storefront
        </Link>
        <button
          onClick={() => window.print()}
          className="btn btn-gold"
          style={{ padding: '0.45rem 1.25rem', fontSize: '0.85rem' }}
        >
          🖨️ Print Invoice
        </button>
      </div>

      {/* Invoice Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #0f3d2e', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
        <div>
          <div className="font-serif" style={{ fontSize: '1.8rem', fontWeight: 700, color: '#0f3d2e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ color: '#c8a24a' }}>✦</span>
            <span>Luxury & Elegant</span>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#78716c', marginTop: '0.25rem' }}>
            Curated Artisanal Horology & High-Fidelity Living
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f3d2e' }}>
            INVOICE #{order.id}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#78716c', marginTop: '0.2rem' }}>
            Date: {new Date(order.created || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Bill To & Order Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', fontSize: '0.88rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#c8a24a', marginBottom: '0.4rem' }}>
            Billed To & Delivery Address:
          </div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1c1917' }}>{order.name}</div>
          <div style={{ color: '#44403c', marginTop: '0.2rem' }}>{order.phone}</div>
          <div style={{ color: '#44403c', marginTop: '0.2rem', whiteSpace: 'pre-wrap' }}>{order.address}</div>
          <div style={{ color: '#78716c', marginTop: '0.2rem', textTransform: 'capitalize' }}>Region: {order.area} Dhaka</div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#c8a24a', marginBottom: '0.4rem' }}>
            Payment & Status:
          </div>
          <div>Payment Method: <strong>{order.method === 'cod' ? 'Cash on Delivery' : 'Online Gateway'}</strong></div>
          <div>Payment Status: <strong style={{ textTransform: 'capitalize', color: order.payment_status === 'paid' ? '#0f3d2e' : '#b45309' }}>{order.payment_status}</strong></div>
          <div>Order Status: <strong style={{ textTransform: 'capitalize', color: '#0f3d2e' }}>{order.status}</strong></div>
        </div>
      </div>

      {/* Item Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#0f3d2e', color: '#ffffff', textAlign: 'left' }}>
            <th style={{ padding: '0.75rem 1rem', borderRadius: '0.5rem 0 0 0.5rem' }}>Description</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Qty</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Unit Price</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'right', borderRadius: '0 0.5rem 0.5rem 0' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #f5f5f4' }}>
              <td style={{ padding: '1rem' }}>
                <div style={{ fontWeight: 600 }}>{item.name}</div>
                {item.variant && <div style={{ fontSize: '0.8rem', color: '#78716c' }}>Option: {item.variant}</div>}
              </td>
              <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>{item.qty}</td>
              <td style={{ padding: '1rem', textAlign: 'right', color: '#44403c' }}>৳{formatPrice(item.price)}</td>
              <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#0f3d2e' }}>
                ৳{item.price != null && Number.isFinite(Number(item.price)) ? formatPrice(Number(item.price) * Number(item.qty || 1)) : 'Price unavailable'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2.5rem' }}>
        <div style={{ width: '18rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716c' }}>
            <span>Subtotal:</span>
            <span style={{ fontWeight: 600, color: '#1c1917' }}>৳{formatPrice(order?.subtotal)}</span>
          </div>
          {order?.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f3d2e' }}>
              <span>Coupon Discount:</span>
              <span style={{ fontWeight: 600 }}>-৳{formatPrice(order?.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#78716c' }}>
            <span>Shipping Charge:</span>
            <span style={{ fontWeight: 600, color: '#1c1917' }}>{+order?.shipping === 0 ? 'FREE' : `৳${formatPrice(order?.shipping)}`}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.25rem',
              fontWeight: 800,
              color: '#0f3d2e',
              borderTop: '2px solid #0f3d2e',
              paddingTop: '0.6rem',
              marginTop: '0.25rem',
            }}
          >
            <span>Total Payable:</span>
            <span>৳{formatPrice(order?.total)}</span>
          </div>
        </div>
      </div>

      {/* Invoice Footer */}
      <div style={{ textAlign: 'center', borderTop: '1px solid #e7e5e4', paddingTop: '1.5rem', color: '#78716c', fontSize: '0.8rem' }}>
        <p style={{ margin: 0 }}>Thank you for placing your trust in Luxury & Elegant.</p>
        <p style={{ margin: '0.25rem 0 0' }}>For inquiries or concierge support, contact concierge@shop.com or WhatsApp 01700000000.</p>
      </div>
    </div>
  );
}
