'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/format';

export default function CartDrawer() {
  const {
    cart,
    isDrawerOpen,
    setIsDrawerOpen,
    updateQty,
    removeFromCart,
    clearCart,
    showToast,
  } = useCart();

  const [step, setStep] = useState('cart'); // 'cart' | 'checkout' | 'success'
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscountPercent, setCouponDiscountPercent] = useState(0);
  const [couponAppliedCode, setCouponAppliedCode] = useState('');
  const [area, setArea] = useState('dhaka'); // 'dhaka' | 'outside'
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState('cod');
  const [trxId, setTrxId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isDrawerOpen) return null;

  const subtotal = cart.reduce((sum, item) => {
    const itemPrice = item && item.price != null && !isNaN(Number(item.price)) ? Number(item.price) : 0;
    const itemQty = item && item.qty != null && !isNaN(Number(item.qty)) ? Number(item.qty) : 1;
    return sum + itemPrice * itemQty;
  }, 0);
  const discountAmount = Math.round((subtotal * couponDiscountPercent) / 100);
  const shippingFee = subtotal >= 3000 ? 0 : area === 'dhaka' ? 60 : 120;
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);

  const applySpecificCoupon = async (codeToApply) => {
    setIsApplyingCoupon(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/coupon?code=${encodeURIComponent(codeToApply.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid coupon');
      }
      setCouponDiscountPercent(data.percent);
      setCouponAppliedCode(data.code);
      setCouponCode(data.code);
      showToast(`Privilege coupon "${data.code}" applied! (${data.percent}% Discount)`);
    } catch (err) {
      setErrorMsg(err.message);
      showToast(err.message);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    await applySpecificCoupon(couponCode);
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setErrorMsg('Please fill in your name, phone number, and delivery address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        area,
        items: cart.map((item) => ({
          id: item.id,
          qty: item.qty,
          variant: item.variant,
        })),
        coupon: couponAppliedCode || null,
        method,
        trx_id: trxId.trim() || null,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      setPlacedOrder({ ...data, phone });
      setStep('success');
      clearCart();
      showToast(`Order #${data.order_id} confirmed successfully!`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetDrawer = () => {
    setStep('cart');
    setPlacedOrder(null);
    setErrorMsg('');
    setIsDrawerOpen(false);
  };

  const freeShippingThreshold = 3000;
  const progressPercent = Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={resetDrawer}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(6px)',
          zIndex: 50,
        }}
      />

      {/* Drawer Panel */}
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '32rem',
          backgroundColor: '#faf7f2',
          boxShadow: '-10px 0 40px rgba(0, 0, 0, 0.3)',
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e7e5e4',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#c8a24a', fontSize: '1.2rem' }}>✦</span>
            <h2
              className="font-serif"
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#1c1917',
              }}
            >
              {step === 'cart' && 'Your Curated Bag'}
              {step === 'checkout' && 'White-Glove Checkout'}
              {step === 'success' && 'Acquisition Confirmed!'}
            </h2>
          </div>
          <button
            onClick={resetDrawer}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.4rem',
              cursor: 'pointer',
              color: '#78716c',
            }}
          >
            ✕
          </button>
        </div>

        {/* Step Progress Breadcrumb */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 1.5rem',
            backgroundColor: '#f5f5f4',
            borderBottom: '1px solid #e7e5e4',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}
        >
          <div style={{ color: step === 'cart' ? '#0f3d2e' : '#78716c', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '1.2rem', height: '1.2rem', borderRadius: '9999px', backgroundColor: step === 'cart' ? '#0f3d2e' : '#d6d3d1', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>1</span>
            <span>Bag</span>
          </div>
          <span style={{ color: '#d6d3d1' }}>→</span>
          <div style={{ color: step === 'checkout' ? '#0f3d2e' : '#78716c', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '1.2rem', height: '1.2rem', borderRadius: '9999px', backgroundColor: step === 'checkout' ? '#0f3d2e' : '#d6d3d1', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>2</span>
            <span>Delivery</span>
          </div>
          <span style={{ color: '#d6d3d1' }}>→</span>
          <div style={{ color: step === 'success' ? '#10b981' : '#78716c', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '1.2rem', height: '1.2rem', borderRadius: '9999px', backgroundColor: step === 'success' ? '#10b981' : '#d6d3d1', color: '#ffffff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>3</span>
            <span>Confirmed</span>
          </div>
        </div>

        {/* Complimentary Delivery Meter (When in cart step) */}
        {step === 'cart' && cart.length > 0 && (
          <div style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f0fdf4', borderBottom: '1px solid #bbf7d0', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', color: '#166534', fontWeight: 600 }}>
              {subtotal >= freeShippingThreshold ? (
                <span>✓ Complimentary White-Glove Delivery Unlocked!</span>
              ) : (
                <span>Add ৳{formatPrice(Math.max(0, freeShippingThreshold - subtotal))} more for Free Delivery</span>
              )}
              <span>৳{formatPrice(subtotal)} / ৳{formatPrice(freeShippingThreshold)}</span>
            </div>
            <div style={{ width: '100%', height: '6px', backgroundColor: '#dcfce7', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  backgroundColor: '#10b981',
                  borderRadius: '9999px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {step === 'cart' && (
            <>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛍️</div>
                  <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                    Your curated bag is empty
                  </h3>
                  <p style={{ color: '#78716c', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Explore our luxury horology, acoustic, and living curation and select items for your collection.
                  </p>
                  <button onClick={() => setIsDrawerOpen(false)} className="btn btn-p">
                    Browse Boutique Catalog
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {cart.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.85rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '1rem',
                        border: '1px solid #e7e5e4',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      }}
                    >
                      <img
                        src={item.image || '/images/default.jpg'}
                        alt={item.name}
                        style={{
                          width: '4.5rem',
                          height: '4.5rem',
                          borderRadius: '0.75rem',
                          objectFit: 'cover',
                          backgroundColor: '#f5f5f4',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#1c1917', lineHeight: 1.3 }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: '#78716c', margin: '0.2rem 0' }}>
                          ৳{formatPrice(item.price)} each
                        </div>

                        {/* Quantity Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                          <button
                            onClick={() => updateQty(item.id, -1, item.variant)}
                            style={{
                              width: '1.6rem',
                              height: '1.6rem',
                              borderRadius: '9999px',
                              border: '1px solid #d6d3d1',
                              background: '#ffffff',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '0.88rem', fontWeight: 600, minWidth: '1.2rem', textAlign: 'center' }}>
                            {item.qty}
                          </span>
                          <button
                            onClick={() => updateQty(item.id, 1, item.variant)}
                            style={{
                              width: '1.6rem',
                              height: '1.6rem',
                              borderRadius: '9999px',
                              border: '1px solid #d6d3d1',
                              background: '#ffffff',
                              cursor: 'pointer',
                              fontWeight: 700,
                            }}
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id, item.variant)}
                            style={{
                              marginLeft: 'auto',
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, color: '#0f3d2e', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                        ৳{formatPrice((item.price || 0) * (item.qty || 1))}
                      </div>
                    </div>
                  ))}

                  {/* Privilege Coupon Section */}
                  <div
                    style={{
                      padding: '1rem',
                      backgroundColor: '#ffffff',
                      borderRadius: '1rem',
                      border: '1px solid #e7e5e4',
                      marginTop: '0.5rem',
                    }}
                  >
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1c1917', display: 'block', marginBottom: '0.4rem' }}>
                      Apply Promo or Privilege Coupon
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Enter coupon (e.g. LUXURY10)"
                        className="inp"
                        style={{ textTransform: 'uppercase', padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={isApplyingCoupon}
                        className="btn btn-p"
                        style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                      >
                        {isApplyingCoupon ? '...' : 'Apply'}
                      </button>
                    </div>

                    {/* 1-Click Quick Coupon Badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#78716c' }}>Quick apply:</span>
                      {['WELCOME10', 'LUXURY10', 'VIP20', 'ELEGANT15'].map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => applySpecificCoupon(code)}
                          style={{
                            border: '1px dashed #c8a24a',
                            backgroundColor: couponAppliedCode === code ? '#0f3d2e' : 'rgba(200, 162, 74, 0.1)',
                            color: couponAppliedCode === code ? '#ffffff' : '#0f3d2e',
                            borderRadius: '9999px',
                            padding: '0.2rem 0.55rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✦ {code}
                        </button>
                      ))}
                    </div>

                    {couponAppliedCode && (
                      <div style={{ color: '#0f3d2e', fontSize: '0.82rem', fontWeight: 700, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span>✓ Privilege code {couponAppliedCode} active</span>
                        <span style={{ color: '#10b981' }}>({couponDiscountPercent}% Discount)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 'checkout' && (
            <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {errorMsg && (
                <div style={{ padding: '0.75rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '0.75rem', fontSize: '0.85rem' }}>
                  {errorMsg}
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '0.3rem' }}>
                  Recipient Full Name *
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shahriar Rahman"
                  className="inp"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '0.3rem' }}>
                  Mobile Phone Number (for courier SMS) *
                </label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="017xxxxxxxx or 018xxxxxxxx"
                  className="inp"
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '0.3rem' }}>
                  Delivery Address *
                </label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House, Road, Apartment, Area, City"
                  className="inp"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '0.3rem' }}>
                  Delivery Region *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setArea('dhaka')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.75rem',
                      border: area === 'dhaka' ? '2px solid #0f3d2e' : '1px solid #d6d3d1',
                      backgroundColor: area === 'dhaka' ? 'rgba(15, 61, 46, 0.08)' : '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      color: area === 'dhaka' ? '#0f3d2e' : '#44403c',
                    }}
                  >
                    Inside Dhaka (৳60)
                  </button>
                  <button
                    type="button"
                    onClick={() => setArea('outside')}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '0.75rem',
                      border: area === 'outside' ? '2px solid #0f3d2e' : '1px solid #d6d3d1',
                      backgroundColor: area === 'outside' ? 'rgba(15, 61, 46, 0.08)' : '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      color: area === 'outside' ? '#0f3d2e' : '#44403c',
                    }}
                  >
                    Outside Dhaka (৳120)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#44403c', display: 'block', marginBottom: '0.3rem' }}>
                  Payment Method
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem',
                      backgroundColor: '#ffffff',
                      borderRadius: '0.75rem',
                      border: method === 'cod' ? '2px solid #0f3d2e' : '1px solid #d6d3d1',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={method === 'cod'}
                      onChange={() => setMethod('cod')}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1c1917' }}>Cash on Delivery (COD)</div>
                      <div style={{ fontSize: '0.78rem', color: '#78716c' }}>Inspect package before paying at your doorstep</div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.85rem',
                      backgroundColor: '#ffffff',
                      borderRadius: '0.75rem',
                      border: method === 'online' ? '2px solid #0f3d2e' : '1px solid #d6d3d1',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      checked={method === 'online'}
                      onChange={() => setMethod('online')}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1c1917' }}>bKash / Nagad / Card Payment</div>
                      <div style={{ fontSize: '0.78rem', color: '#78716c' }}>Send payment to official merchant account & enter TrxID</div>
                    </div>
                  </label>

                  {method === 'online' && (
                    <div style={{ padding: '0.85rem', backgroundColor: '#f0fdf4', borderRadius: '0.75rem', border: '1px solid #bbf7d0', fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 700, color: '#166534', marginBottom: '0.3rem' }}>
                        Merchant bKash / Nagad Number: <strong>01700-000000</strong>
                      </div>
                      <div style={{ color: '#44403c', marginBottom: '0.5rem' }}>
                        Please Send Money ৳{formatPrice(grandTotal)} and enter Transaction ID (TrxID) below:
                      </div>
                      <input
                        type="text"
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)}
                        placeholder="e.g. 9J4K2L1M90"
                        className="inp"
                        style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="btn btn-o"
                  style={{ flex: 1 }}
                >
                  ← Back to Bag
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-gold"
                  style={{ flex: 2 }}
                >
                  {isSubmitting ? 'Confirming Order…' : `Confirm Order (৳${formatPrice(grandTotal)})`}
                </button>
              </div>
            </form>
          )}

          {step === 'success' && placedOrder && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '0.8rem' }}>🎉</div>
              <h3 className="font-serif" style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f3d2e', marginBottom: '0.4rem' }}>
                Acquisition Confirmed!
              </h3>
              <p style={{ color: '#44403c', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
                Your order has been safely placed with our atelier concierge.
              </p>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '1rem',
                  border: '1px solid #e7e5e4',
                  padding: '1.25rem',
                  textAlign: 'left',
                  marginBottom: '1.5rem',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.04)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#78716c' }}>Order Reference:</span>
                  <span style={{ fontWeight: 800, color: '#0f3d2e', fontSize: '1.05rem' }}>#{placedOrder.order_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#78716c' }}>Recipient:</span>
                  <span style={{ fontWeight: 600, color: '#1c1917' }}>{placedOrder.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: '#78716c' }}>Amount Due:</span>
                  <span style={{ fontWeight: 700, color: '#0f3d2e', fontSize: '1.1rem' }}>৳{formatPrice(placedOrder?.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#78716c' }}>Payment Method:</span>
                  <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                    {placedOrder.method === 'cod' ? 'Cash on Delivery (COD)' : 'Mobile Gateway'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Link
                  href={`/invoice/${placedOrder.order_id}?phone=${encodeURIComponent(placedOrder.phone)}`}
                  target="_blank"
                  className="btn btn-gold"
                  style={{ width: '100%' }}
                >
                  📄 View Official Tax Invoice
                </Link>
                <Link
                  href={`/track?id=${placedOrder.order_id}&phone=${encodeURIComponent(phone)}`}
                  className="btn btn-p"
                  style={{ width: '100%' }}
                >
                  📍 Track Package Status
                </Link>
                <button
                  onClick={resetDrawer}
                  className="btn btn-o"
                  style={{ width: '100%' }}
                >
                  Return to Storefront
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer (Summary & Action for step === 'cart') */}
        {step === 'cart' && cart.length > 0 && (
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e7e5e4',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              boxShadow: '0 -4px 15px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#78716c' }}>
              <span>Subtotal:</span>
              <span style={{ fontWeight: 600, color: '#1c1917' }}>৳{formatPrice(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#0f3d2e' }}>
                <span>Privilege Discount ({couponDiscountPercent}%):</span>
                <span style={{ fontWeight: 700 }}>-৳{formatPrice(discountAmount)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#78716c' }}>
              <span>Delivery ({subtotal >= freeShippingThreshold ? 'Complimentary ✦' : area === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}):</span>
              <span style={{ fontWeight: 700, color: shippingFee === 0 ? '#10b981' : '#1c1917' }}>
                {shippingFee === 0 ? 'FREE' : `৳${shippingFee}`}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.2rem',
                fontWeight: 700,
                color: '#0f3d2e',
                borderTop: '1px solid #e7e5e4',
                paddingTop: '0.6rem',
                marginTop: '0.2rem',
              }}
            >
              <span>Estimated Total:</span>
              <span>৳{formatPrice(grandTotal)}</span>
            </div>

            <button
              onClick={() => setStep('checkout')}
              className="btn btn-gold"
              style={{ width: '100%', marginTop: '0.4rem', fontSize: '1rem', padding: '0.85rem' }}
            >
              Proceed to White-Glove Checkout →
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
