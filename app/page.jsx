'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from './components/Navbar';
import ProductAtelier3D from './components/ProductAtelier3D';
import CategoryShowcase from './components/CategoryShowcase';
import FlagshipCinematicShowcase from './components/FlagshipCinematicShowcase';
import { useCart } from './context/CartContext';
import { formatPrice, getProductPricing, normalizeProducts } from './utils/format';
import ErrorBoundary from './components/ErrorBoundary';

import seedData from '../src/database/seed-data.json';

const INITIAL_CATEGORIES = (seedData.categories || []).map((c) => ({ ...c }));
const INITIAL_PRODUCTS = normalizeProducts((seedData.products || []).map((p) => {
  const cat = INITIAL_CATEGORIES.find((c) => c.id === p.cat_id);
  const reviews = (seedData.reviews || []).filter((r) => r.product_id === p.id);
  const validRatings = reviews.map((review) => Number(review.rating)).filter((rating) => Number.isFinite(rating) && rating >= 0 && rating <= 5);
  const rating = validRatings.length ? +(validRatings.reduce((sum, value) => sum + value, 0) / validRatings.length).toFixed(1) : null;
  const regularPrice = p.price != null && !isNaN(Number(p.price)) ? Number(p.price) : null;
  const salePrice = p.sale_price != null && !isNaN(Number(p.sale_price)) ? Number(p.sale_price) : null;
  const priceNow = salePrice != null ? salePrice : regularPrice;
  return {
    ...p,
    cat: cat ? cat.name : 'Artisanal',
    rating,
    reviews: reviews.length,
    price: regularPrice,
    sale_price: salePrice,
    price_now: priceNow,
    on_sale: Boolean(regularPrice !== null && salePrice !== null && salePrice < regularPrice),
  };
}));

export default function HomePage() {
  const { addToCart, wishlist, toggleWishlist, setIsDrawerOpen, showToast } = useCart();
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [saleOnly, setSaleOnly] = useState(false);

  // New interactive states
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewQty, setQuickViewQty] = useState(1);
  const [addedId, setAddedId] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);
  const [vipEmail, setVipEmail] = useState('');
  const [vipJoined, setVipJoined] = useState(false);
  const [copiedCoupon, setCopiedCoupon] = useState(false);

  const handleCopyCoupon = (code) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCoupon(true);
      if (showToast) showToast(`Privilege Code "${code}" copied to clipboard!`);
      setTimeout(() => setCopiedCoupon(false), 2500);
    }
  };

  // Fetch products and categories on mount or when filter changes
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const params = new URLSearchParams();
        if (selectedCat !== 'all') params.set('cat', selectedCat);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        if (sortBy === 'price_asc') params.set('sort', 'price_asc');
        if (sortBy === 'price_desc') params.set('sort', 'price_desc');
        if (sortBy === 'rating') params.set('sort', 'rating');
        if (saleOnly) params.set('sale', '1');
        const [catRes, prodRes] = await Promise.all([
          fetch('/api/categories').catch(() => null),
          fetch('/api/products?' + params.toString()).catch(() => null),
        ]);
        if (cancelled) return;
        if (catRes?.ok) {
          const cats = await catRes.json().catch(() => null);
          if (Array.isArray(cats) && cats.length) {
            setCategories(cats.filter((c) => c && c.id != null && typeof c.name === 'string'));
          }
        }
        if (prodRes?.ok) {
          const prods = await prodRes.json().catch(() => null);
          if (Array.isArray(prods)) {
            setProducts(normalizeProducts(prods));
            return;
          }
        }
        let filtered = [...INITIAL_PRODUCTS];
        if (selectedCat !== 'all') {
          filtered = filtered.filter((p) => String(p.cat_id) === String(selectedCat));
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter((p) => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
        }
        if (saleOnly) filtered = filtered.filter((p) => p.on_sale);
        if (sortBy === 'price_asc') filtered.sort((a, b) => (a.price_now ?? Infinity) - (b.price_now ?? Infinity));
        if (sortBy === 'price_desc') filtered.sort((a, b) => (b.price_now ?? -Infinity) - (a.price_now ?? -Infinity));
        if (sortBy === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        setProducts(normalizeProducts(filtered));
      } catch (err) {
        console.warn('API notice: using curated collection fallback:', err);
        if (!cancelled) setProducts(INITIAL_PRODUCTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, [selectedCat, searchQuery, sortBy, saleOnly]);

  return (
    <>
      <Navbar onSearch={(q) => setSearchQuery(q)} />

      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.5rem 1.25rem' }}>
        {/* 1. Large Elegant Hero Section (Exact Original Design) */}
        <section
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'clamp(1.5rem, 4vw, 2.5rem)',
            background: 'linear-gradient(135deg, #0c3125 0%, #0f3d2e 50%, #08231a 100%)',
            padding: 'clamp(1.75rem, 4vw, 3rem) clamp(1rem, 3.5vw, 2.5rem)',
            color: '#ffffff',
            boxShadow: '0 25px 60px -15px rgba(12, 49, 37, 0.45)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
          }}
        >
          {/* Ambient Background Glow Accents */}
          <div
            style={{
              position: 'absolute',
              top: '-6rem',
              right: '-6rem',
              width: '24rem',
              height: '24rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(200, 162, 74, 0.15)',
              filter: 'blur(100px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-6rem',
              left: '-6rem',
              width: '20rem',
              height: '20rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(52, 211, 153, 0.1)',
              filter: 'blur(90px)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              gap: 'clamp(1.5rem, 3vw, 2.5rem)',
              alignItems: 'center',
            }}
          >
            {/* Left Content */}
            <div style={{ maxWidth: '42rem' }}>
              {/* Exclusive Curation Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(200, 162, 74, 0.4)',
                  backgroundColor: 'rgba(200, 162, 74, 0.1)',
                  padding: '0.4rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#c8a24a',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  backdropFilter: 'blur(8px)',
                  marginBottom: '1.5rem',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '0.5rem',
                    height: '0.5rem',
                    borderRadius: '9999px',
                    backgroundColor: '#c8a24a',
                  }}
                />
                <span>Exclusive 2026 Collection</span>
              </div>

              {/* Bold Luxury Headline */}
              <h1
                className="font-serif"
                style={{
                  fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                  lineHeight: 1.12,
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                Timeless Elegance, <br />
                <span
                  style={{
                    fontStyle: 'italic',
                    fontWeight: 400,
                    color: '#c8a24a',
                  }}
                  className="shimmer-text"
                >
                  Curated
                </span>{' '}
                for Everyday Luxury.
              </h1>

              {/* Subtitle */}
              <p
                style={{
                  marginTop: '1.25rem',
                  color: '#e7e5e4',
                  fontSize: '1.05rem',
                  lineHeight: 1.7,
                  fontWeight: 300,
                }}
              >
                Discover handpicked designer apparel, high-fidelity acoustics, artisanal living decor, and radiance skincare — tailored for discerning lifestyles across Bangladesh.
              </p>

              {/* CTA Buttons: Shop Now and Explore Collection */}
              <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                <a
                  href="#shop"
                  className="btn btn-gold"
                  style={{
                    padding: '0.9rem 2rem',
                    fontSize: '1rem',
                    boxShadow: '0 10px 25px rgba(200, 162, 74, 0.4)',
                  }}
                >
                  <span>Shop Now</span>
                  <span style={{ fontSize: '1.2rem', marginLeft: '0.3rem' }}>→</span>
                </a>
                <a
                  href="#interactive-atelier-3d"
                  className="btn btn-outline-white"
                  style={{ padding: '0.9rem 1.75rem', fontSize: '1rem' }}
                >
                  Explore Collection
                </a>
              </div>

              {/* Verified Service Guarantees (10K+ / 4.9 ★ / 100%) */}
              <div
                style={{
                  marginTop: '2.5rem',
                  paddingTop: '2rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1.5rem',
                  maxWidth: '32rem',
                }}
              >
                <div>
                  <p className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    10K+
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#d6d3d1', marginTop: '0.2rem', margin: 0 }}>
                    Discerning Patrons
                  </p>
                </div>
                <div>
                  <p className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#c8a24a', margin: 0 }}>
                    4.9 ★
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#d6d3d1', marginTop: '0.2rem', margin: 0 }}>
                    Customer Rating
                  </p>
                </div>
                <div>
                  <p className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                    100%
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#d6d3d1', marginTop: '0.2rem', margin: 0 }}>
                    Genuine Guarantee
                  </p>
                </div>
              </div>
            </div>

            {/* Right: High-Quality Static Visual Showcase Frame */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '30rem', margin: '0 auto' }}>
              {/* Backlight Glow */}
              <div
                style={{
                  position: 'absolute',
                  inset: '-0.4rem',
                  borderRadius: '2.5rem',
                  background: 'linear-gradient(90deg, rgba(200, 162, 74, 0.3) 0%, rgba(52, 211, 153, 0.2) 50%, rgba(200, 162, 74, 0.25) 100%)',
                  filter: 'blur(20px)',
                  opacity: 0.8,
                  pointerEvents: 'none',
                }}
              />

              {/* Image Frame */}
              <div
                style={{
                  position: 'relative',
                  aspectRatio: '4 / 3',
                  width: '100%',
                  overflow: 'hidden',
                  borderRadius: '1.75rem',
                  border: '2px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.65)',
                  backgroundColor: '#000000',
                }}
              >
                <img
                  src="/images/hero.jpg"
                  alt="Curated Luxury Masterpieces"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Dark Vignette Overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.1) 100%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Floating Top Editorial Tag */}
                <div
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    left: '1rem',
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(10px)',
                    padding: '0.35rem 0.9rem',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#c8a24a',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '0.45rem',
                      height: '0.45rem',
                      borderRadius: '9999px',
                      backgroundColor: '#c8a24a',
                    }}
                  />
                  <span>✦ 2026 EDITORIAL</span>
                </div>

                {/* Floating Bottom Caption Banner */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '1rem',
                    left: '1rem',
                    right: '1rem',
                    zIndex: 20,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: '1rem',
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c8a24a' }}>
                      FEATURED HERITAGE
                    </p>
                    <h4 className="font-serif" style={{ margin: '0.15rem 0 0', fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>
                      Geneva Chronometers &amp; Apparel
                    </h4>
                  </div>
                  <a
                    href="#interactive-atelier-3d"
                    className="btn btn-gold"
                    style={{ padding: '0.4rem 0.9rem', fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    Explore →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Curated Category Showcase (Fashion, Electronics, Home & Living, Beauty) */}
        <CategoryShowcase onSelectCategory={(catId) => setSelectedCat(catId)} />

        {/* 3. Flagship Creation Cinematic Showcase (Aura Pro Studio Wireless Titanium Headphones) */}
        <FlagshipCinematicShowcase />

        {/* 4. Trust Badges Strip (4 Columns) */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            margin: '2rem 0',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1.25rem',
              padding: '1.25rem',
              border: '1px solid #e7e5e4',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.75rem',
                height: '2.75rem',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(15, 61, 46, 0.1)',
                fontSize: '1.3rem',
                flexShrink: 0,
              }}
            >
              🚚
            </span>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1c1917' }}>Express Delivery</h4>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#78716c', lineHeight: 1.4 }}>
                Fast &amp; secure shipping across all 64 districts
              </p>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1.25rem',
              padding: '1.25rem',
              border: '1px solid #e7e5e4',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.75rem',
                height: '2.75rem',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(200, 162, 74, 0.12)',
                fontSize: '1.3rem',
                flexShrink: 0,
              }}
            >
              🛡️
            </span>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1c1917' }}>100% Authentic</h4>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#78716c', lineHeight: 1.4 }}>
                Directly sourced premium craftsmanship
              </p>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1.25rem',
              padding: '1.25rem',
              border: '1px solid #e7e5e4',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.75rem',
                height: '2.75rem',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fontSize: '1.3rem',
                flexShrink: 0,
              }}
            >
              💵
            </span>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1c1917' }}>Cash on Delivery</h4>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#78716c', lineHeight: 1.4 }}>
                Inspect package before paying at doorstep
              </p>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '1.25rem',
              padding: '1.25rem',
              border: '1px solid #e7e5e4',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
            }}
          >
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.75rem',
                height: '2.75rem',
                borderRadius: '0.75rem',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                fontSize: '1.3rem',
                flexShrink: 0,
              }}
            >
              🔄
            </span>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1c1917' }}>7-Day Easy Returns</h4>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#78716c', lineHeight: 1.4 }}>
                Hassle-free exchanges &amp; dedicated support
              </p>
            </div>
          </div>
        </section>

        {/* 3. Interactive 3D Product Atelier (Watch, Headphones, Radiance Serum) */}
        <ProductAtelier3D />

        {/* 4. Product Catalog Section */}
        <section id="shop" style={{ marginTop: '4rem' }}>
          {/* Section Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <span
                style={{
                  color: '#0f3d2e',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                Curated Showcase
              </span>
              <h2
                className="font-serif"
                style={{
                  margin: '0.25rem 0 0',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#1c1917',
                }}
              >
                Our Exclusive Collection
              </h2>
            </div>

            {/* Sorting & Filter Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                  backgroundColor: '#ffffff',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '9999px',
                  border: '1px solid #d6d3d1',
                }}
              >
                <input
                  type="checkbox"
                  checked={saleOnly}
                  onChange={(e) => setSaleOnly(e.target.checked)}
                />
                <span>Sale Items Only</span>
              </label>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: '9999px',
                  border: '1px solid #d6d3d1',
                  backgroundColor: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="default">Sort by: Featured</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              paddingBottom: '0.75rem',
              marginBottom: '2rem',
            }}
          >
            <button
              onClick={() => setSelectedCat('all')}
              className={`pill ${selectedCat === 'all' ? 'on' : ''}`}
            >
              All Masterpieces
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(String(cat.id))}
                className={`pill ${selectedCat === String(cat.id) ? 'on' : ''}`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem', color: '#78716c' }}>
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
              <div>Retrieving boutique collection…</div>
            </div>
          ) : products.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 1rem',
                backgroundColor: '#ffffff',
                borderRadius: '1.5rem',
                border: '1px solid #e7e5e4',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔍</div>
              <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                No products found
              </h3>
              <p style={{ color: '#78716c', fontSize: '0.9rem' }}>
                Try adjusting your search query or category filters.
              </p>
            </div>
          ) : (
            <div
              className="responsive-product-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))',
                gap: '1.5rem',
              }}
            >
              {products.map((p) => {
                const isWishlisted = wishlist.some((w) => w.id === p.id);
                const isRecentlyAdded = addedId === p.id;
                return (
                  <ErrorBoundary key={p.id ?? `${p.name}-${p.cat_id}`} fallback={null}>
                    <div className="product-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Image Container with Badges */}
                    <div
                      style={{
                        position: 'relative',
                        paddingTop: '85%',
                        overflow: 'hidden',
                        backgroundColor: '#f5f5f4',
                      }}
                    >
                      <img
                        src={p.image || '/images/default.jpg'}
                        alt={p.name}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.5s ease',
                        }}
                      />

                      {/* On Sale Badge */}
                      {p.on_sale && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '0.75rem',
                            left: '0.75rem',
                            backgroundColor: '#0f3d2e',
                            color: '#ffffff',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.6rem',
                            borderRadius: '9999px',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                            border: '1px solid rgba(200, 162, 74, 0.4)',
                          }}
                        >
                          SALE
                        </span>
                      )}

                      {/* Wishlist Heart Button */}
                      <button
                        onClick={() => toggleWishlist(p)}
                        style={{
                          position: 'absolute',
                          top: '0.75rem',
                          right: '0.75rem',
                          width: '2.2rem',
                          height: '2.2rem',
                          borderRadius: '9999px',
                          backgroundColor: 'rgba(255, 255, 255, 0.92)',
                          backdropFilter: 'blur(8px)',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isWishlisted ? '#e11d48' : '#78716c',
                          fontSize: '1rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          transition: 'transform 0.2s ease',
                        }}
                        title={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        {isWishlisted ? '♥' : '♡'}
                      </button>

                      {/* Quick View Button on Image */}
                      <button
                        onClick={() => {
                          setQuickViewProduct(p);
                          setQuickViewQty(1);
                        }}
                        style={{
                          position: 'absolute',
                          bottom: '0.75rem',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          backgroundColor: 'rgba(15, 61, 46, 0.92)',
                          color: '#ffffff',
                          border: '1px solid rgba(200, 162, 74, 0.6)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: '9999px',
                          padding: '0.35rem 0.85rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <span>👁️</span> Quick View
                      </button>
                    </div>

                    {/* Product Details */}
                    {(() => {
                      const pricing = getProductPricing(p);
                      const catTag = (() => {
                        const c = String(p.cat || '').toLowerCase();
                        if (c.includes('fashion')) return '✦ BESPOKE COUTURE';
                        if (c.includes('electronic')) return '✦ TITANIUM ACOUSTICS';
                        if (c.includes('home')) return '✦ ARTISANAL LIVING';
                        if (c.includes('beauty')) return '✦ CELLULAR ELIXIR';
                        return '✦ ATELIER MASTERPIECE';
                      })();

                      return (
                        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '0.35rem',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: '#c8a24a',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                              }}
                            >
                              {catTag}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span style={{ width: '0.4rem', height: '0.4rem', borderRadius: '9999px', backgroundColor: '#16a34a' }}></span>
                              In Stock
                            </span>
                          </div>

                          <Link
                            href={`/products/${p.id}`}
                            style={{
                              fontWeight: 700,
                              fontSize: '1.05rem',
                              color: '#1c1917',
                              textDecoration: 'none',
                              marginBottom: '0.4rem',
                              lineHeight: 1.35,
                            }}
                          >
                            {p.name}
                          </Link>

                          {/* Rating */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              marginBottom: '0.75rem',
                              fontSize: '0.82rem',
                            }}
                          >
                            <span style={{ color: '#c8a24a' }}>★</span>
                            <span style={{ fontWeight: 600, color: '#1c1917' }}>{p.rating !== null && p.rating !== undefined ? p.rating.toFixed(1) : ''}</span>
                            <span style={{ color: '#a8a29e' }}>({formatPrice(p.reviews, '0')} reviews)</span>
                          </div>

                          {/* Price & Action */}
                          <div
                            style={{
                              marginTop: 'auto',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              paddingTop: '0.75rem',
                              borderTop: '1px solid #f5f5f4',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f3d2e', display: 'flex', alignItems: 'baseline' }}>
                                  <span style={{ color: '#c8a24a', fontSize: '0.95rem', marginRight: '0.15rem' }}>৳</span>
                                  {pricing.priceNow !== null ? pricing.formattedCurrent : 'Price unavailable'}
                                </div>
                                {pricing.onSale && pricing.formattedRegular && (
                                  <div style={{ fontSize: '0.8rem', color: '#a8a29e', textDecoration: 'line-through' }}>
                                    ৳{pricing.formattedRegular}
                                  </div>
                                )}
                              </div>
                              {pricing.savings > 0 && pricing.formattedSavings && (
                                <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 600, marginTop: '0.15rem' }}>
                                  Privilege Save ৳{pricing.formattedSavings}
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                addToCart(p);
                                setAddedId(p.id);
                                setTimeout(() => setAddedId(null), 1200);
                              }}
                              className="btn btn-p"
                              style={{
                                padding: '0.55rem 1.1rem',
                                fontSize: '0.85rem',
                                backgroundColor: isRecentlyAdded ? '#15803d' : '#0f3d2e',
                                borderColor: isRecentlyAdded ? '#22c55e' : 'transparent',
                                transition: 'all 0.25s ease',
                              }}
                            >
                              {isRecentlyAdded ? '✓ Added' : '+ Add'}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </ErrorBoundary>
              );
            })}
            </div>
          )}
        </section>

        {/* 5. Artisanal Provenance & Heritage Pillars */}
        <section
          style={{
            marginTop: '5rem',
            position: 'relative',
            borderRadius: '2.5rem',
            background: 'linear-gradient(135deg, #09261d 0%, #0c3327 50%, #061c15 100%)',
            padding: 'clamp(2rem, 5vw, 4rem) clamp(1.25rem, 4vw, 3rem)',
            color: '#ffffff',
            border: '1px solid rgba(200, 162, 74, 0.3)',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Ambient Background Light */}
          <div
            style={{
              position: 'absolute',
              top: '-8rem',
              right: '-8rem',
              width: '28rem',
              height: '28rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(200, 162, 74, 0.12)',
              filter: 'blur(100px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-8rem',
              left: '-8rem',
              width: '28rem',
              height: '28rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              filter: 'blur(100px)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ position: 'relative', zIndex: 10 }}>
            {/* Header */}
            <div style={{ textAlign: 'center', maxWidth: '42rem', margin: '0 auto 3.5rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(200, 162, 74, 0.4)',
                  backgroundColor: 'rgba(200, 162, 74, 0.1)',
                  padding: '0.35rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#c8a24a',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: '1rem',
                }}
              >
                <span>✦ THE FOUR ATELIER CORNERSTONES</span>
              </div>
              <h2
                className="font-serif"
                style={{
                  fontSize: 'clamp(2rem, 4vw, 2.85rem)',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 0 1rem',
                  letterSpacing: '-0.02em',
                }}
              >
                Artisanal Provenance &amp; Heritage
              </h2>
              <p style={{ color: '#d6d3d1', fontSize: '1rem', lineHeight: 1.7, margin: 0, fontWeight: 300 }}>
                Every creation in our collection originates from celebrated master craft houses across the world, directly curated and guaranteed genuine for Bangladesh.
              </p>
            </div>

            {/* 4 Pillars Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))',
                gap: '1.5rem',
              }}
            >
              {/* Pillar 1: Geneva Horology */}
              <div
                className="provenance-card"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '1.75rem',
                  padding: '2rem 1.5rem',
                  border: '1px solid rgba(200, 162, 74, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '2.2rem' }}>⏱️</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: '#c8a24a', textTransform: 'uppercase', border: '1px solid rgba(200, 162, 74, 0.35)', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'rgba(200, 162, 74, 0.08)' }}>
                    SWITZERLAND
                  </span>
                </div>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem' }}>
                  Geneva Horology
                </h3>
                <p style={{ color: '#a8a29e', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 1.25rem', flex: 1 }}>
                  Hand-finished tourbillon escapements, 316L surgical steel cases, sapphire crystal with dual anti-reflective coating, and 2-Year Atelier seals.
                </p>
                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.78rem', color: '#c8a24a', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>✓ 28,800 vph High-Beat Escapement</div>
                  <div>✓ Master Chronometer Tested</div>
                </div>
              </div>

              {/* Pillar 2: Florence Leather */}
              <div
                className="provenance-card"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '1.75rem',
                  padding: '2rem 1.5rem',
                  border: '1px solid rgba(200, 162, 74, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '2.2rem' }}>👞</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: '#c8a24a', textTransform: 'uppercase', border: '1px solid rgba(200, 162, 74, 0.35)', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'rgba(200, 162, 74, 0.08)' }}>
                    TUSCANY, ITALY
                  </span>
                </div>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem' }}>
                  Florence Master Leather
                </h3>
                <p style={{ color: '#a8a29e', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 1.25rem', flex: 1 }}>
                  Full-grain Tuscan calfskin, hand-burnished espresso patinas, and channelled Goodyear welted soles crafted for a lifetime of distinction.
                </p>
                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.78rem', color: '#c8a24a', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>✓ Hand-Welted Goodyear Soles</div>
                  <div>✓ Vegetable-Tanned Full Grain</div>
                </div>
              </div>

              {/* Pillar 3: Kyoto Fluted Crystal */}
              <div
                className="provenance-card"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '1.75rem',
                  padding: '2rem 1.5rem',
                  border: '1px solid rgba(200, 162, 74, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '2.2rem' }}>🥃</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: '#c8a24a', textTransform: 'uppercase', border: '1px solid rgba(200, 162, 74, 0.35)', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'rgba(200, 162, 74, 0.08)' }}>
                    KYOTO, JAPAN
                  </span>
                </div>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem' }}>
                  Kyoto Fluted Crystal &amp; Marble
                </h3>
                <p style={{ color: '#a8a29e', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 1.25rem', flex: 1 }}>
                  Mouth-blown 24% fluted crystal decanters and hand-carved Carrara marble trays with brass spherical feet, designed for exquisite entertaining.
                </p>
                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.78rem', color: '#c8a24a', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>✓ Diamond-Cut Refractive Facets</div>
                  <div>✓ Solid Carrara Veined Marble</div>
                </div>
              </div>

              {/* Pillar 4: Grasse Parfumerie */}
              <div
                className="provenance-card"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '1.75rem',
                  padding: '2rem 1.5rem',
                  border: '1px solid rgba(200, 162, 74, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '2.2rem' }}>✨</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: '#c8a24a', textTransform: 'uppercase', border: '1px solid rgba(200, 162, 74, 0.35)', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'rgba(200, 162, 74, 0.08)' }}>
                    GRASSE, FRANCE
                  </span>
                </div>
                <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem' }}>
                  Grasse Parfumerie &amp; 24K Radiance
                </h3>
                <p style={{ color: '#a8a29e', fontSize: '0.88rem', lineHeight: 1.6, margin: '0 0 1.25rem', flex: 1 }}>
                  Suspended 24K colloidal gold face nectars, cold-pressed Damask rose, and aged wild Cambodian agarwood oud formulations with 16-hour longevity.
                </p>
                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.78rem', color: '#c8a24a', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>✓ 24-Karat Colloidal Bio-Gold</div>
                  <div>✓ Extrait de Parfum Concentration</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Patron Testimonials & Press Accolades */}
        <section style={{ marginTop: '5rem', padding: '3rem 2rem', backgroundColor: '#ffffff', borderRadius: '2rem', border: '1px solid #e7e5e4', boxShadow: '0 15px 35px rgba(0,0,0,0.03)' }}>
          <div style={{ textAlign: 'center', maxWidth: '36rem', margin: '0 auto 3rem' }}>
            <span style={{ color: '#c8a24a', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              ✦ Authentic Patron Accolades
            </span>
            <h2 className="font-serif" style={{ fontSize: '2.2rem', fontWeight: 700, color: '#1c1917', margin: '0.5rem 0' }}>
              Voices of Distinction
            </h2>
            <p style={{ color: '#78716c', fontSize: '0.95rem', margin: 0, lineHeight: 1.6 }}>
              Read verified impressions from our patrons across Dhaka, Chittagong, and Sylhet.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem' }}>
            <div style={{ padding: '1.75rem', backgroundColor: '#faf7f2', borderRadius: '1.5rem', border: '1px solid #e7e5e4', display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#c8a24a', fontSize: '1.1rem', marginBottom: '0.75rem' }}>★★★★★</div>
              <p style={{ color: '#292524', fontSize: '0.95rem', lineHeight: 1.7, fontStyle: 'italic', margin: 0, flex: 1 }}>
                &ldquo;The Geneva Tourbillon arrived in a bespoke velvet-lined wooden presentation box within 24 hours in Gulshan. The mechanical sweep and 18K finish rival Swiss horology.&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e7e5e4' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', backgroundColor: '#0f3d2e', color: '#c8a24a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
                  TR
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1c1917' }}>Tahmid Al-Rashid</div>
                  <div style={{ fontSize: '0.75rem', color: '#78716c' }}>Gulshan 2, Dhaka · Verified Patron</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.75rem', backgroundColor: '#faf7f2', borderRadius: '1.5rem', border: '1px solid #e7e5e4', display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#c8a24a', fontSize: '1.1rem', marginBottom: '0.75rem' }}>★★★★★</div>
              <p style={{ color: '#292524', fontSize: '0.95rem', lineHeight: 1.7, fontStyle: 'italic', margin: 0, flex: 1 }}>
                &ldquo;The Aura Pro Studio Wireless Headphones deliver acoustic clarity and active noise cancellation on par with leading studio monitors. Paying via Cash on Delivery made the process effortless.&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e7e5e4' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', backgroundColor: '#0f3d2e', color: '#c8a24a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
                  NJ
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1c1917' }}>Nusrat Jahan</div>
                  <div style={{ fontSize: '0.75rem', color: '#78716c' }}>Banani, Dhaka · Studio Sound Producer</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.75rem', backgroundColor: '#faf7f2', borderRadius: '1.5rem', border: '1px solid #e7e5e4', display: 'flex', flexDirection: 'column' }}>
              <div style={{ color: '#c8a24a', fontSize: '1.1rem', marginBottom: '0.75rem' }}>★★★★★</div>
              <p style={{ color: '#292524', fontSize: '0.95rem', lineHeight: 1.7, fontStyle: 'italic', margin: 0, flex: 1 }}>
                &ldquo;Exceptional white-glove packaging. Being able to inspect the package at my doorstep before finalizing payment gave me absolute peace of mind. Truly the highest standard in Bangladesh.&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e7e5e4' }}>
                <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '9999px', backgroundColor: '#0f3d2e', color: '#c8a24a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.95rem' }}>
                  FZ
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1c1917' }}>Farhan Zahed</div>
                  <div style={{ fontSize: '0.75rem', color: '#78716c' }}>Dhanmondi, Dhaka · Verified Patron</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Atelier FAQ Accordion */}
        <section style={{ marginTop: '5rem', padding: '3rem 2rem', backgroundColor: '#ffffff', borderRadius: '2rem', border: '1px solid #e7e5e4' }}>
          <div style={{ textAlign: 'center', maxWidth: '36rem', margin: '0 auto 3rem' }}>
            <span style={{ color: '#c8a24a', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              ✦ Concierge Knowledge
            </span>
            <h2 className="font-serif" style={{ fontSize: '2.2rem', fontWeight: 700, color: '#1c1917', margin: '0.5rem 0' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ color: '#78716c', fontSize: '0.95rem', margin: 0 }}>
              Everything you need to know about purchasing, authentications, and delivery.
            </p>
          </div>

          <div style={{ maxWidth: '44rem', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              {
                q: 'How does Doorstep Cash on Delivery (COD) & inspection work?',
                a: 'Our white-glove express courier delivers directly to your address across all 64 districts in Bangladesh. You are welcomed to inspect the external parcel seal and verify physical condition at your doorstep before completing payment.',
              },
              {
                q: 'Are all chronometers, acoustics, and luxury curations certified authentic?',
                a: 'Yes, 100%. Every item is directly sourced, batch-inspected by master technicians, and accompanied by our Atelier Certificate of Authenticity and a comprehensive 2-Year Limited Warranty.',
              },
              {
                q: 'What are the delivery schedules across Dhaka and nationwide?',
                a: 'Inside Dhaka Metropolitan, orders are dispatched with priority and arrive within 24 to 48 hours. Nationwide deliveries to all 64 districts typically arrive within 48 to 72 hours with end-to-end SMS tracking.',
              },
              {
                q: 'What is the 7-day Atelier exchange policy?',
                a: 'Should you wish to exchange an item for a different colorway, size, or model, we provide a hassle-free 7-day exchange privilege. Simply contact our concierge helpline or message our WhatsApp team.',
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  style={{
                    borderRadius: '1.25rem',
                    border: '1px solid',
                    borderColor: isOpen ? '#c8a24a' : '#e7e5e4',
                    backgroundColor: isOpen ? '#faf7f2' : '#ffffff',
                    overflow: 'hidden',
                    transition: 'all 0.25s ease',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    style={{
                      width: '100%',
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: isOpen ? '#0f3d2e' : '#1c1917',
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ fontSize: '1.2rem', color: '#c8a24a', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}>
                      ▾
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 1.5rem 1.25rem', color: '#44403c', fontSize: '0.92rem', lineHeight: 1.7 }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 7. VIP Atelier Club Newsletter Privilege */}
        <section
          style={{
            marginTop: '5rem',
            borderRadius: '2.5rem',
            background: 'linear-gradient(135deg, #0c3125 0%, #0f3d2e 60%, #08231a 100%)',
            padding: '3.5rem 2.5rem',
            color: '#ffffff',
            border: '1px solid rgba(200, 162, 74, 0.35)',
            boxShadow: '0 25px 60px -15px rgba(12, 49, 37, 0.45)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              maxWidth: '38rem',
              margin: '0 auto',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                borderRadius: '9999px',
                border: '1px solid rgba(200, 162, 74, 0.4)',
                backgroundColor: 'rgba(200, 162, 74, 0.12)',
                padding: '0.35rem 1rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#c8a24a',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}
            >
              ✦ Atelier Private Circle
            </span>
            <h2 className="font-serif" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 700, margin: '0 0 1rem', color: '#ffffff' }}>
              Join the Atelier Circle
            </h2>
            <p style={{ color: '#e7e5e4', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Receive an exclusive <strong style={{ color: '#c8a24a' }}>20% Welcome Privilege</strong> with code <code style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.5rem', borderRadius: '0.4rem', border: '1px solid #c8a24a', color: '#c8a24a' }}>VIP20</code>, early previews of limited-run horology, and private trunk show access.
            </p>

            {/* Interactive Quick Copy Coupon Pill */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(200, 162, 74, 0.45)',
                  borderRadius: '9999px',
                  padding: '0.35rem 0.85rem',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#e7e5e4' }}>
                  Privilege Code: <strong style={{ color: '#c8a24a', letterSpacing: '0.05em' }}>VIP20</strong> (-20%)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCoupon('VIP20')}
                  style={{
                    backgroundColor: copiedCoupon ? '#16a34a' : '#c8a24a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '9999px',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {copiedCoupon ? '✓ Copied' : 'Copy'}
                </button>
              </div>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  backgroundColor: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(200, 162, 74, 0.45)',
                  borderRadius: '9999px',
                  padding: '0.35rem 0.85rem',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: '#e7e5e4' }}>
                  Welcome: <strong style={{ color: '#c8a24a', letterSpacing: '0.05em' }}>LUXURY10</strong> (-10%)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCoupon('LUXURY10')}
                  style={{
                    backgroundColor: '#0f3d2e',
                    border: '1px solid #c8a24a',
                    color: '#c8a24a',
                    borderRadius: '9999px',
                    padding: '0.25rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            {vipJoined ? (
              <div style={{ backgroundColor: 'rgba(200, 162, 74, 0.15)', border: '1px solid #c8a24a', padding: '1.25rem 1.5rem', borderRadius: '1.25rem', color: '#ffffff', fontSize: '0.95rem' }}>
                🎉 <strong>Welcome to the Atelier Circle!</strong> Your exclusive 20% privilege code is active: <strong style={{ color: '#c8a24a' }}>VIP20</strong>. Apply at checkout for immediate discount.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (vipEmail.trim()) setVipJoined(true);
                }}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  maxWidth: '30rem',
                  margin: '0 auto',
                  flexWrap: 'wrap',
                }}
              >
                <input
                  type="email"
                  required
                  placeholder="Enter your email or phone"
                  value={vipEmail}
                  onChange={(e) => setVipEmail(e.target.value)}
                  style={{
                    flex: '1 1 200px',
                    padding: '0.85rem 1.25rem',
                    borderRadius: '9999px',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    backdropFilter: 'blur(8px)',
                  }}
                />
                <button
                  type="submit"
                  className="btn btn-gold"
                  style={{
                    padding: '0.85rem 1.75rem',
                    fontSize: '0.95rem',
                    boxShadow: '0 8px 20px rgba(200, 162, 74, 0.35)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Claim Privilege →
                </button>
              </form>
            )}
          </div>
        </section>

        {/* 8. Quick View Modal */}
        {quickViewProduct && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(0, 0, 0, 0.72)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.25rem',
            }}
            onClick={() => setQuickViewProduct(null)}
          >
            <div
              className="modal-enter"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '2rem',
                maxWidth: '52rem',
                width: '100%',
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '2rem',
                border: '1px solid #e7e5e4',
                boxShadow: '0 30px 70px rgba(0,0,0,0.3)',
                position: 'relative',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setQuickViewProduct(null)}
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  width: '2.4rem',
                  height: '2.4rem',
                  borderRadius: '9999px',
                  backgroundColor: '#f5f5f4',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  color: '#44403c',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                }}
              >
                ✕
              </button>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '2rem',
                  alignItems: 'center',
                }}
              >
                {/* Product Image */}
                <div
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '1.5rem',
                    overflow: 'hidden',
                    backgroundColor: '#faf7f2',
                  }}
                >
                  <img
                    src={quickViewProduct.image || '/images/default.jpg'}
                    alt={quickViewProduct.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {quickViewProduct.on_sale && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '1rem',
                        left: '1rem',
                        backgroundColor: '#0f3d2e',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.3rem 0.75rem',
                        borderRadius: '9999px',
                        border: '1px solid rgba(200, 162, 74, 0.4)',
                      }}
                    >
                      PRIVILEGE OFFER
                    </span>
                  )}
                </div>

                {/* Info & Purchase */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: '#c8a24a', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    ✦ {quickViewProduct.cat || 'Curated Masterpiece'}
                  </span>
                  <h3
                    className="font-serif"
                    style={{
                      fontSize: '1.75rem',
                      fontWeight: 700,
                      color: '#1c1917',
                      margin: '0.35rem 0 0.6rem',
                      lineHeight: 1.25,
                    }}
                  >
                    {quickViewProduct.name}
                  </h3>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', marginBottom: '1rem' }}>
                    <span style={{ color: '#c8a24a' }}>★</span>
                    <span style={{ fontWeight: 700, color: '#1c1917' }}>{quickViewProduct.rating !== null && quickViewProduct.rating !== undefined ? quickViewProduct.rating.toFixed(1) : ''}</span>
                    <span style={{ color: '#78716c' }}>({formatPrice(quickViewProduct.reviews, '0')} authenticated reviews)</span>
                  </div>

                  {(() => {
                    const qvPricing = getProductPricing(quickViewProduct);
                    return (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f3d2e' }}>
                          ৳{qvPricing.formattedCurrent}
                        </span>
                        {qvPricing.onSale && qvPricing.formattedRegular && (
                          <span style={{ fontSize: '1.1rem', color: '#a8a29e', textDecoration: 'line-through' }}>
                            ৳{qvPricing.formattedRegular}
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  <p style={{ color: '#44403c', fontSize: '0.92rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    {quickViewProduct.description || 'Artisanal curation crafted with meticulous precision and premium finishes, designed for enduring sophistication.'}
                  </p>

                  {/* Highlights */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', color: '#0f3d2e', marginBottom: '1.5rem', backgroundColor: '#faf7f2', padding: '0.75rem 1rem', borderRadius: '0.75rem' }}>
                    <div>✓ 2-Year Atelier Warranty</div>
                    <div>✓ Authenticity Card Included</div>
                    <div>✓ 24-48h Doorstep Delivery</div>
                    <div>✓ Inspect Before Paying (COD)</div>
                  </div>

                  {/* Quantity and Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d6d3d1', borderRadius: '9999px', padding: '0.25rem 0.65rem' }}>
                      <button
                        onClick={() => setQuickViewQty((q) => Math.max(1, q - 1))}
                        style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '0 0.4rem' }}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 700, minWidth: '1.5rem', textAlign: 'center' }}>{quickViewQty}</span>
                      <button
                        onClick={() => setQuickViewQty((q) => q + 1)}
                        style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', padding: '0 0.4rem' }}
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        addToCart(quickViewProduct, quickViewQty);
                        setQuickViewProduct(null);
                      }}
                      className="btn btn-p"
                      style={{ flex: 1, padding: '0.75rem 1.25rem', fontSize: '0.9rem' }}
                    >
                      + Add to Bag
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => {
                        addToCart(quickViewProduct, quickViewQty);
                        setQuickViewProduct(null);
                        setIsDrawerOpen(true);
                      }}
                      className="btn btn-gold"
                      style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem' }}
                    >
                      ⚡ Order via Cash on Delivery
                    </button>
                  </div>

                  <Link
                    href={`/products/${quickViewProduct.id}`}
                    style={{
                      textAlign: 'center',
                      marginTop: '1rem',
                      color: '#0f3d2e',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    View Full Specifications &amp; Client Feedback →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
