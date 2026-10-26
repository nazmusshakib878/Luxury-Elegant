'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '../components/Navbar';

const STEPS = [
  { key: 'pending', label: 'Order Confirmed', icon: '📝' },
  { key: 'processing', label: 'In Assembly & QC', icon: '⚙️' },
  { key: 'shipped', label: 'Out for Delivery', icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '✓' },
];

export default function OrderTrackingPage() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Read URL search params on mount if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlId = urlParams.get('id');
      const urlPhone = urlParams.get('phone');
      if (urlId) setOrderId(urlId);
      if (urlPhone) setPhone(urlPhone);
      if (urlId && urlPhone) {
        fetchOrder(urlId, urlPhone);
      }
    }
  }, []);

  const fetchOrder = async (idToUse, phoneToUse) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/track?id=${idToUse}&phone=${encodeURIComponent(phoneToUse)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Order not found');
      }
      setOrder(data);
    } catch (err) {
      setErrorMsg(err.message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!orderId.trim() || !phone.trim()) {
      setErrorMsg('Please enter both Order ID and Phone Number.');
      return;
    }
    fetchOrder(orderId.trim(), phone.trim());
  };

  const currentStepIndex = order
    ? order.status === 'cancelled'
      ? -1
      : STEPS.findIndex((s) => s.key === order.status) !== -1
      ? STEPS.findIndex((s) => s.key === order.status)
      : 0
    : 0;

  return (
    <>
      <Navbar />

      <main style={{ maxWidth: '48rem', margin: '3rem auto', padding: '0 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ color: '#c8a24a', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            ✦ Real-time Logistics Concierge
          </span>
          <h1 className="font-serif" style={{ fontSize: '2.2rem', fontWeight: 700, color: '#1c1917', margin: '0.4rem 0' }}>
            Track Your Order
          </h1>
          <p style={{ color: '#78716c', fontSize: '0.95rem' }}>
            Enter your order reference ID and registered mobile number to view live courier status.
          </p>
        </div>

        {/* Search Card */}
        <form
          onSubmit={handleSearch}
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '1.5rem',
            padding: '1.75rem',
            border: '1px solid #e7e5e4',
            boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
            marginBottom: '2rem',
          }}
        >
          {errorMsg && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '0.3rem' }}>
                Order ID *
              </label>
              <input
                required
                type="text"
                placeholder="e.g. 1, 1024"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="inp"
              />
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '0.3rem' }}>
                Mobile Number *
              </label>
              <input
                required
                type="tel"
                placeholder="017xxxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="inp"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-p"
            style={{ width: '100%', fontSize: '0.95rem', padding: '0.75rem' }}
          >
            {loading ? 'Locating Package…' : 'Locate Order Status →'}
          </button>
        </form>

        {/* Order Result Card */}
        {order && (
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1.5rem',
              padding: '2rem',
              border: '1px solid #e7e5e4',
              boxShadow: '0 15px 35px rgba(0,0,0,0.06)',
            }}
          >
            {/* Order Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e7e5e4', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#78716c' }}>Reference ID:</span>
                <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f3d2e', marginLeft: '0.4rem' }}>
                  #{order.id}
                </span>
              </div>
              <Link
                href={`/invoice/${order.id}`}
                target="_blank"
                className="btn btn-gold"
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
              >
                📄 View Invoice
              </Link>
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', margin: '2rem 0 2.5rem' }}>
              {/* Connecting line */}
              <div
                style={{
                  position: 'absolute',
                  top: '1.2rem',
                  left: '10%',
                  right: '10%',
                  height: '3px',
                  backgroundColor: '#e7e5e4',
                  zIndex: 1,
                }}
              />

              {STEPS.map((s, idx) => {
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;
                return (
                  <div
                    key={s.key}
                    style={{
                      position: 'relative',
                      zIndex: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      maxWidth: '6.5rem',
                    }}
                  >
                    <div
                      style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        borderRadius: '9999px',
                        backgroundColor: isPassed ? '#0f3d2e' : '#ffffff',
                        border: isPassed ? '2px solid #0f3d2e' : '2px solid #d6d3d1',
                        color: isPassed ? '#ffffff' : '#78716c',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 700,
                        boxShadow: isCurrent ? '0 0 0 5px rgba(200, 162, 74, 0.35)' : 'none',
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {s.icon}
                    </div>
                    <span
                      style={{
                        marginTop: '0.5rem',
                        fontSize: '0.75rem',
                        fontWeight: isPassed ? 700 : 500,
                        color: isPassed ? '#0f3d2e' : '#78716c',
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Estimated Arrival Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                backgroundColor: 'rgba(200, 162, 74, 0.12)',
                border: '1px solid rgba(200, 162, 74, 0.4)',
                borderRadius: '1rem',
                padding: '0.85rem 1.25rem',
                marginBottom: '1.5rem',
                fontSize: '0.88rem',
                color: '#0f3d2e',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>⏳</span>
              <div>
                <strong>Estimated Arrival:</strong>{' '}
                {order.area === 'dhaka'
                  ? 'Within 24 Hours via White-Glove Dispatch (Dhaka Metro)'
                  : '48 – 72 Hours via Express Tracked Courier (Nationwide)'}
              </div>
            </div>

            {/* Order Items Breakdown */}
            {Array.isArray(order.items) && order.items.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1c1917', marginBottom: '0.75rem' }}>
                  Package Contents ({order.items.length} items)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#faf7f2',
                        borderRadius: '0.85rem',
                        border: '1px solid #e7e5e4',
                      }}
                    >
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ width: '2.75rem', height: '2.75rem', objectFit: 'cover', borderRadius: '0.5rem' }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1c1917' }}>{item.name}</div>
                        <div style={{ fontSize: '0.78rem', color: '#78716c' }}>Quantity: {item.qty}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f3d2e' }}>
                        ৳{((+item.price) * item.qty).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Order Items & Customer details */}
            <div style={{ backgroundColor: '#faf7f2', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1c1917', marginBottom: '0.75rem' }}>
                Delivery Destination &amp; Payment
              </div>
              <div style={{ fontSize: '0.85rem', color: '#44403c', lineHeight: 1.6 }}>
                <div><strong>Recipient:</strong> {order.name} ({order.phone})</div>
                <div><strong>Address:</strong> {order.address} ({order.area === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</div>
                <div><strong>Payment Method:</strong> <span style={{ textTransform: 'capitalize' }}>{order.method === 'cod' ? 'Cash on Delivery (Doorstep Inspection)' : order.method}</span></div>
                <div><strong>Payment Status:</strong> <span style={{ textTransform: 'capitalize', color: order.payment_status === 'paid' ? '#0f3d2e' : '#b45309', fontWeight: 600 }}>{order.payment_status}</span></div>
              </div>
            </div>

            {/* Total and Concierge Support */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e7e5e4', paddingTop: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#78716c' }}>Total Order Value:</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f3d2e' }}>৳{order.total?.toLocaleString()}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <a
                  href={`https://wa.me/8801700000000?text=${encodeURIComponent(`Hello Concierge, I would like to inquire about the delivery status of Order #${order.id}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-p"
                  style={{ backgroundColor: '#25D366', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  💬 WhatsApp Concierge
                </a>
                <Link
                  href={`/invoice/${order.id}`}
                  target="_blank"
                  className="btn btn-gold"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  📄 Official Invoice
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Luxury Footer */}
      <footer
        style={{
          backgroundColor: '#0c3125',
          color: '#ffffff',
          padding: '3rem 1.25rem 2rem',
          marginTop: '6rem',
          borderTop: '2px solid rgba(200, 162, 74, 0.4)',
        }}
      >
        <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="font-serif" style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ffffff' }}>
              <span style={{ color: '#c8a24a' }}>✦</span> Luxury &amp; Elegant
            </div>
            <div style={{ fontSize: '0.8rem', color: '#a8a29e', marginTop: '0.25rem' }}>
              &copy; {new Date().getFullYear()} Luxury &amp; Elegant Atelier Ltd.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
            <Link href="/" style={{ color: '#e7e5e4', textDecoration: 'none' }}>Storefront</Link>
            <Link href="/track" style={{ color: '#c8a24a', textDecoration: 'none' }}>Track Order</Link>
            <Link href="/admin" style={{ color: '#e7e5e4', textDecoration: 'none' }}>Admin</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
