'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useCart } from '../../context/CartContext';
import { formatPrice, getProductPricing } from '../../utils/format';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { addToCart, showToast, setIsDrawerOpen, wishlist = [], toggleWishlist } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('desc'); // 'desc' | 'reviews'
  const [isZoomed, setIsZoomed] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Review submission state
  const [reviewOrderId, setReviewOrderId] = useState('');
  const [reviewPhone, setReviewPhone] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.product?.product_variants?.length) setSelectedVariant(json.product.product_variants.find((v) => v.available) || json.product.product_variants[0]);
          setData(json);
        }

        // Fetch related products
        const relRes = await fetch('/api/products');
        if (relRes.ok) {
          const allProds = await relRes.json();
          setRelatedProducts(allProds.filter((p) => String(p.id) !== String(id)).slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load product:', err);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadProduct();
  }, [id]);

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!reviewOrderId.trim() || !reviewPhone.trim() || !reviewComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      // In SQLite, add review
      const res = await fetch(`/api/products/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: reviewOrderId.trim(),
          phone: reviewPhone.trim(),
          rating: +reviewRating,
          comment: reviewComment.trim(),
        }),
      });
      if (res.ok) {
        showToast('Verified review submitted successfully.');
        setReviewOrderId('');
        setReviewPhone('');
        setReviewComment('');
        // Reload product reviews
        const refresh = await fetch(`/api/products/${id}`);
        if (refresh.ok) setData(await refresh.json());
      } else {
        const result = await res.json().catch(() => ({}));
        showToast(result.error || 'Review could not be submitted.');
      }
    } catch {
      showToast('Could not submit review. Please try again.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '6rem 1rem', color: '#78716c' }}>
          <div>Loading luxury product details…</div>
        </div>
      </>
    );
  }

  if (!data || !data.product) {
    return (
      <>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '6rem 1rem' }}>
          <h2 className="font-serif">Product Not Found</h2>
          <p style={{ color: '#78716c', marginBottom: '1.5rem' }}>This product may no longer be available in our collection.</p>
          <Link href="/" className="btn btn-p">
            Return to Storefront
          </Link>
        </div>
      </>
    );
  }

  const { product, reviews = [] } = data;
  const pricing = getProductPricing(product);
  const displayedPrice = selectedVariant ? Number(selectedVariant.price) : pricing.priceNow;
  const selectedStock = selectedVariant ? Number(selectedVariant.stock) : Number(product.stock || 0);
  const canPurchase = displayedPrice !== null && displayedPrice > 0 && selectedStock > 0 && (!product.product_variants?.length || selectedVariant?.available);

  return (
    <>
      <Navbar />

      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem 1.25rem' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: '0.85rem', color: '#78716c', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link href="/" style={{ color: '#78716c', textDecoration: 'none' }}>Home</Link>
          <span>/</span>
          <span style={{ color: '#0f3d2e', fontWeight: 600 }}>{product.cat || 'Collection'}</span>
          <span>/</span>
          <span style={{ color: '#1c1917', fontWeight: 500 }}>{product.name}</span>
        </div>

        {/* Product Hero Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: 'clamp(1.5rem, 3vw, 3rem)',
            backgroundColor: '#ffffff',
            borderRadius: 'clamp(1.2rem, 3vw, 2rem)',
            padding: 'clamp(1.2rem, 3vw, 2.5rem)',
            border: '1px solid #e7e5e4',
            boxShadow: '0 15px 40px rgba(0,0,0,0.04)',
          }}
        >
          {/* Left: Product Image with Zoom Trigger */}
          <div
            onClick={() => setIsZoomed(true)}
            style={{
              position: 'relative',
              borderRadius: '1.75rem',
              overflow: 'hidden',
              backgroundColor: '#faf7f2',
              minHeight: '420px',
              cursor: 'zoom-in',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.05)',
            }}
          >
            <img
              src={product.image || '/images/default.jpg'}
              alt={product.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
            />
            {product.on_sale && !product.product_variants?.length && (
              <span
                style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  backgroundColor: '#0f3d2e',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.35rem 0.85rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(200, 162, 74, 0.4)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                }}
              >
                SPECIAL PRIVILEGE OFFER
              </span>
            )}
            <div
              style={{
                position: 'absolute',
                bottom: '1rem',
                right: '1rem',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                color: '#ffffff',
                backdropFilter: 'blur(8px)',
                borderRadius: '9999px',
                padding: '0.35rem 0.85rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              <span>🔍</span> Click to Inspect
            </div>
          </div>

          {/* Right: Info & Actions */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#c8a24a', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                ✦ {product.cat || 'Artisanal'}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '9999px', backgroundColor: '#16a34a' }}></span>
                Ready to Dispatch
              </span>
            </div>

            <h1
              className="font-serif"
              style={{
                fontSize: '2.4rem',
                fontWeight: 700,
                color: '#1c1917',
                margin: '0.4rem 0 0.8rem',
                lineHeight: 1.2,
              }}
            >
              {product.name}
            </h1>

            {/* Rating summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.9rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#c8a24a' }}>★</span>
              {product.rating !== null && product.rating !== undefined && <span style={{ fontWeight: 700, color: '#1c1917' }}>{Number(product.rating).toFixed(1)}</span>}
              <span style={{ color: '#78716c' }}>({reviews.length} customer reviews)</span>
              <a href="#reviews" style={{ marginLeft: '0.35rem', color: '#0f3d2e', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Write a review</a>
            </div>

            {/* Pricing */}
            {(() => {
              return (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.85rem', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f3d2e' }}>
                    ৳{displayedPrice !== null ? formatPrice(displayedPrice) : 'Price unavailable'}
                  </span>
                  {!selectedVariant && pricing.onSale && pricing.formattedRegular && (
                    <span style={{ fontSize: '1.25rem', color: '#a8a29e', textDecoration: 'line-through' }}>
                      ৳{pricing.formattedRegular}
                    </span>
                  )}
                  <span style={{ fontSize: '0.85rem', color: '#0f3d2e', fontWeight: 600, marginLeft: 'auto', backgroundColor: 'rgba(15, 61, 46, 0.08)', padding: '0.25rem 0.65rem', borderRadius: '9999px' }}>
                    {selectedStock > 0 ? `✓ ${selectedStock} Units in Atelier Stock` : 'Currently unavailable'}
                  </span>
                </div>
              );
            })()}

            <p style={{ color: '#44403c', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              {product.description || 'Review the product details, price, and current availability before placing your order.'}
            </p>

            {/* Privilege Guarantee Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '0.75rem', marginBottom: '1.75rem', backgroundColor: '#faf7f2', padding: '1rem', borderRadius: '1rem', border: '1px solid #e7e5e4' }}>
              <div style={{ fontSize: '0.82rem', color: '#0f3d2e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🛡️</span> <strong>Product support</strong>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#0f3d2e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>📜</span> <strong>Product details shown clearly</strong>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#0f3d2e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🚚</span> <strong>Delivery fee shown at checkout</strong>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#0f3d2e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>💵</span> <strong>Doorstep COD Inspection</strong>
              </div>
            </div>

            {product.product_variants?.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '0.82rem', color: '#44403c', fontWeight: 600 }}>Size &amp; Color
                  <select value={selectedVariant?.id || ''} onChange={(e) => setSelectedVariant(product.product_variants.find((v) => String(v.id) === e.target.value) || null)} className="inp" style={{ display: 'block', marginTop: '0.3rem', width: '100%' }}>
                    {product.product_variants.map((v) => <option key={v.id} value={v.id} disabled={!v.available}>{v.size || 'One size'}{v.color ? ` · ${v.color}` : ''} · ৳{formatPrice(v.price)}{!v.available ? ' · Out of stock' : ''}</option>)}
                  </select>
                </label>
                <div style={{ fontSize: '0.82rem', color: '#44403c', fontWeight: 600 }}>Availability
                  <div style={{ marginTop: '0.6rem', color: selectedVariant?.available ? '#15803d' : '#b91c1c' }}>{selectedVariant?.available ? `${selectedVariant.stock} available` : 'Out of stock'}</div>
                </div>
              </div>
            )}

            {/* Quantity and Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: 'auto' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {/* Qty Selector */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: '1.5px solid #d6d3d1',
                    borderRadius: '9999px',
                    padding: '0.45rem 0.85rem',
                    backgroundColor: '#faf7f2',
                  }}
                >
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '0 0.5rem' }}
                  >
                    -
                  </button>
                  <span style={{ fontWeight: 700, minWidth: '1.75rem', textAlign: 'center' }}>{qty}</span>
                  <button
                    onClick={() => setQty((q) => q + 1)}
                    style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '0 0.5rem' }}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => addToCart(product, qty, selectedVariant)}
                  disabled={!canPurchase}
                  className="btn btn-p"
                  style={{ flex: 1, padding: '0.85rem 1.5rem', fontSize: '1rem' }}
                >
                  {canPurchase ? `🛍️ Add to Collection (৳${formatPrice(displayedPrice * qty)})` : 'Unavailable'}
                </button>

                <button
                  type="button"
                  onClick={() => toggleWishlist && toggleWishlist(product)}
                  style={{
                    width: '3.1rem',
                    height: '3.1rem',
                    borderRadius: '9999px',
                    backgroundColor: (wishlist || []).some((item) => item.id === product.id) ? 'rgba(225, 29, 72, 0.08)' : '#faf7f2',
                    border: (wishlist || []).some((item) => item.id === product.id) ? '1.5px solid #e11d48' : '1.5px solid #d6d3d1',
                    color: (wishlist || []).some((item) => item.id === product.id) ? '#e11d48' : '#78716c',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                  }}
                  title={(wishlist || []).some((item) => item.id === product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                  aria-label="Wishlist"
                >
                  {(wishlist || []).some((item) => item.id === product.id) ? '♥' : '♡'}
                </button>
              </div>

              {/* Instant Buy CTA */}
              <button
                onClick={() => {
                  addToCart(product, qty, selectedVariant);
                  setIsDrawerOpen(true);
                }}
                disabled={!canPurchase}
                className="btn btn-gold"
                style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', boxShadow: '0 8px 20px rgba(200, 162, 74, 0.3)' }}
              >
                ⚡ Instant Order via Cash on Delivery
              </button>
            </div>
          </div>
        </div>

        {/* Fullscreen Lightbox Zoom Modal */}
        {isZoomed && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              backgroundColor: 'rgba(0, 0, 0, 0.92)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              cursor: 'zoom-out',
            }}
            onClick={() => setIsZoomed(false)}
          >
            <button
              onClick={() => setIsZoomed(false)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                width: '3rem',
                height: '3rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#ffffff',
                fontSize: '1.5rem',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
            <img
              src={product.image || '/images/default.jpg'}
              alt={product.name}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '1.5rem',
                boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
              }}
            />
          </div>
        )}

        {/* Specifications & Craftsmanship Table */}
        <section id="reviews" style={{ scrollMarginTop: '6rem', marginTop: '3rem', backgroundColor: '#ffffff', borderRadius: '1.5rem', padding: '2rem', border: '1px solid #e7e5e4' }}>
          <h3 className="font-serif" style={{ fontSize: '1.4rem', marginBottom: '1.25rem', color: '#1c1917' }}>
            Atelier Specifications &amp; Heritage
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#faf7f2', borderRadius: '0.75rem', border: '1px solid #e7e5e4' }}>
              <div style={{ fontSize: '0.75rem', color: '#78716c', textTransform: 'uppercase', fontWeight: 600 }}>Curation Category</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f3d2e', marginTop: '0.2rem' }}>{product.cat || 'Masterpiece'}</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#faf7f2', borderRadius: '0.75rem', border: '1px solid #e7e5e4' }}>
              <div style={{ fontSize: '0.75rem', color: '#78716c', textTransform: 'uppercase', fontWeight: 600 }}>Materials</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f3d2e', marginTop: '0.2rem' }}>Grade-1 Atelier Selected</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#faf7f2', borderRadius: '0.75rem', border: '1px solid #e7e5e4' }}>
              <div style={{ fontSize: '0.75rem', color: '#78716c', textTransform: 'uppercase', fontWeight: 600 }}>Customer support</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f3d2e', marginTop: '0.2rem' }}>Order tracking available</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#faf7f2', borderRadius: '0.75rem', border: '1px solid #e7e5e4' }}>
              <div style={{ fontSize: '0.75rem', color: '#78716c', textTransform: 'uppercase', fontWeight: 600 }}>Packaging</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f3d2e', marginTop: '0.2rem' }}>Bespoke Presentation Box</div>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section style={{ marginTop: '3rem', backgroundColor: '#ffffff', borderRadius: '1.5rem', padding: '2rem', border: '1px solid #e7e5e4' }}>
          <h3 className="font-serif" style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: '#1c1917' }}>
            Customer Reviews
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {/* Reviews list */}
            <div>
              {reviews.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#faf7f2', borderRadius: '1rem', color: '#78716c' }}>
                  No reviews submitted yet for this item. Be the first to share your experience!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reviews.map((r, i) => (
                    <div key={i} style={{ padding: '1.25rem', backgroundColor: '#faf7f2', borderRadius: '1rem', border: '1px solid #e7e5e4' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1c1917' }}>{r.user_name}</span>
                        <span style={{ color: '#c8a24a', fontSize: '0.85rem' }}>{'★'.repeat(Number.isFinite(Number(r.rating)) && Number(r.rating) >= 0 && Number(r.rating) <= 5 ? Math.round(Number(r.rating)) : 0)}</span>
                      </div>
                      {Number(r.verified_purchase) === 1 && <span style={{ display: 'inline-block', marginBottom: '0.5rem', color: '#0f6b4d', fontSize: '0.72rem', fontWeight: 700 }}>Verified purchase</span>}
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#44403c', lineHeight: 1.5 }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leave a review form */}
            <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f3d2e' }}>Share Your Experience</h4>
              <label style={{ display: 'grid', gap: '0.4rem', color: '#44403c', fontSize: '0.84rem', fontWeight: 600 }}>
                Order number
                <input type="text" required inputMode="numeric" placeholder="e.g. 1042" value={reviewOrderId} onChange={(e) => setReviewOrderId(e.target.value)} className="inp" />
              </label>
              <label style={{ display: 'grid', gap: '0.4rem', color: '#44403c', fontSize: '0.84rem', fontWeight: 600 }}>
                Delivery phone number
                <input type="tel" required autoComplete="tel" placeholder="01XXXXXXXXX" value={reviewPhone} onChange={(e) => setReviewPhone(e.target.value)} className="inp" />
              </label>
              <p style={{ margin: 0, color: '#78716c', fontSize: '0.82rem', lineHeight: 1.5 }}>You can review this product after its order is marked delivered. Your order number and delivery phone verify the purchase.</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#44403c', fontWeight: 600 }}>Your Rating:</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      aria-label={`Rate ${star} out of 5`}
                      aria-pressed={reviewRating === star}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1.35rem',
                        color: star <= reviewRating ? '#c8a24a' : '#d6d3d1',
                        padding: 0,
                      }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                required
                aria-label="Review comment"
                minLength={3}
                maxLength={1500}
                rows={4}
                placeholder="Your feedback on craftsmanship, acoustic clarity, or finishing…"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="inp"
              />
              <button
                type="submit"
                disabled={isSubmittingReview}
                className="btn btn-gold"
                style={{ alignSelf: 'flex-start' }}
              >
                {isSubmittingReview ? 'Submitting…' : 'Submit Client Review →'}
              </button>
            </form>
          </div>
        </section>

        {/* "You May Also Admire" Related Curations */}
        {relatedProducts.length > 0 && (
          <section style={{ marginTop: '4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ color: '#0f3d2e', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  ✦ Complementary Curations
                </span>
                <h3 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1c1917', margin: '0.25rem 0 0' }}>
                  You May Also Admire
                </h3>
              </div>
              <Link href="/#shop" style={{ color: '#c8a24a', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none' }}>
                View All Items →
              </Link>
            </div>

            <div className="responsive-product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: '1.5rem' }}>
              {relatedProducts.map((p) => (
                <div key={p.id} className="product-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ position: 'relative', paddingTop: '85%', overflow: 'hidden', backgroundColor: '#f5f5f4' }}>
                    <img
                      src={p.image || '/images/default.jpg'}
                      alt={p.name}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontSize: '0.72rem', color: '#c8a24a', fontWeight: 600, textTransform: 'uppercase' }}>
                      {p.cat || 'Artisanal'}
                    </span>
                    <Link
                      href={`/products/${p.id}`}
                      style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1c1917', textDecoration: 'none', margin: '0.25rem 0 0.5rem' }}
                    >
                      {p.name}
                    </Link>
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #f5f5f4' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f3d2e' }}>
                        ৳{formatPrice(p.price_now ?? p.price)}
                      </span>
                      <button
                        onClick={() => addToCart(p)}
                        className="btn btn-p"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
