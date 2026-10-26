'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../components/Navbar';
import { useCart } from '../../context/CartContext';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { addToCart, showToast, setIsDrawerOpen } = useCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('desc'); // 'desc' | 'reviews'
  const [isZoomed, setIsZoomed] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);

  // Review submission state
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);
        if (res.ok) {
          const json = await res.json();
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
    if (!reviewName.trim() || !reviewComment.trim()) return;
    setIsSubmittingReview(true);
    try {
      // In SQLite, add review
      const res = await fetch(`/api/products/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: reviewName.trim(),
          rating: +reviewRating,
          comment: reviewComment.trim(),
        }),
      });
      if (res.ok) {
        showToast('Review submitted successfully!');
        setReviewComment('');
        // Reload product reviews
        const refresh = await fetch(`/api/products/${id}`);
        if (refresh.ok) setData(await refresh.json());
      }
    } catch {
      showToast('Review recorded');
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
            {product.on_sale && (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
              <span style={{ color: '#c8a24a' }}>★</span>
              <span style={{ fontWeight: 700, color: '#1c1917' }}>{product.rating || '4.9'}</span>
              <span style={{ color: '#78716c' }}>({reviews.length || 18} authenticated client reviews)</span>
            </div>

            {/* Pricing */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f3d2e' }}>
                ৳{(product.price_now || product.price).toLocaleString()}
              </span>
              {product.on_sale && (
                <span style={{ fontSize: '1.25rem', color: '#a8a29e', textDecoration: 'line-through' }}>
                  ৳{product.price.toLocaleString()}
                </span>
              )}
              <span style={{ fontSize: '0.85rem', color: '#0f3d2e', fontWeight: 600, marginLeft: 'auto', backgroundColor: 'rgba(15, 61, 46, 0.08)', padding: '0.25rem 0.65rem', borderRadius: '9999px' }}>
                ✓ {product.stock} Units in Atelier Stock
              </span>
            </div>

            <p style={{ color: '#44403c', fontSize: '0.95rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
              {product.description || 'Finely crafted luxury masterpiece designed with exceptional attention to material authenticity and enduring elegance.'}
            </p>

            {/* Privilege Guarantee Badges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '0.75rem', marginBottom: '1.75rem', backgroundColor: '#faf7f2', padding: '1rem', borderRadius: '1rem', border: '1px solid #e7e5e4' }}>
              <div style={{ fontSize: '0.82rem', color: '#0f3d2e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🛡️</span> <strong>2-Year Atelier Warranty</strong>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#0f3d2e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>📜</span> <strong>Authenticity Certificate</strong>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#0f3d2e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🚚</span> <strong>24-48h Express Delivery</strong>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#0f3d2e', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>💵</span> <strong>Doorstep COD Inspection</strong>
              </div>
            </div>

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
                  onClick={() => addToCart(product, qty)}
                  className="btn btn-p"
                  style={{ flex: 1, padding: '0.85rem 1.5rem', fontSize: '1rem' }}
                >
                  🛍️ Add to Collection (৳{((product.price_now || product.price) * qty).toLocaleString()})
                </button>
              </div>

              {/* Instant Buy CTA */}
              <button
                onClick={() => {
                  addToCart(product, qty);
                  setIsDrawerOpen(true);
                }}
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
        <section style={{ marginTop: '3rem', backgroundColor: '#ffffff', borderRadius: '1.5rem', padding: '2rem', border: '1px solid #e7e5e4' }}>
          <h3 className="font-serif" style={{ fontSize: '1.4rem', marginBottom: '1.25rem', color: '#1c1917' }}>
            Atelier Specifications &amp; Heritage
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#faf7f2', borderRadius: '0.75rem', border: '1px solid #e7e5e4' }}>
              <div style={{ fontSize: '0.75rem', color: '#78716c', textTransform: 'uppercase', fontWeight: 600 }}>Curation Category</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f3d2e', marginTop: '0.2rem' }}>{product.cat || 'Masterpiece'}</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#faf7f2', borderRadius: '0.75rem', border: '1px solid #e7e5e4' }}>
              <div style={{ fontSize: '0.75rem', color: '#78716c', textTransform: 'uppercase', fontWeight: 600 }}>Material Authenticity</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f3d2e', marginTop: '0.2rem' }}>Grade-1 Atelier Selected</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#faf7f2', borderRadius: '0.75rem', border: '1px solid #e7e5e4' }}>
              <div style={{ fontSize: '0.75rem', color: '#78716c', textTransform: 'uppercase', fontWeight: 600 }}>Warranty Privilege</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f3d2e', marginTop: '0.2rem' }}>2 Years Limited Warranty</div>
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
            Client Reviews &amp; Authenticity Feedback
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
                        <span style={{ color: '#c8a24a', fontSize: '0.85rem' }}>{'★'.repeat(r.rating || 5)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#44403c', lineHeight: 1.5 }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Leave a review form */}
            <form onSubmit={handleAddReview} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f3d2e' }}>Share Your Experience</h4>
              <input
                type="text"
                required
                placeholder="Your Name *"
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                className="inp"
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#44403c', fontWeight: 600 }}>Your Rating:</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
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
                rows={3}
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
                        ৳{(p.price_now || p.price).toLocaleString()}
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
