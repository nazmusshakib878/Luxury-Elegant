'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';

export default function Navbar({ onSearch }) {
  const { cartCount, setIsDrawerOpen, wishlist, addToCart, toggleWishlist } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    if (onSearch) onSearch('');
  };

  return (
    <>
      {/* 1. Top Luxury Announcement Bar */}
      <div
        style={{
          backgroundColor: '#072118',
          color: '#ffffff',
          textAlign: 'center',
          fontSize: '0.78rem',
          padding: '0.55rem 1rem',
          letterSpacing: '0.04em',
          fontWeight: 500,
          borderBottom: '1px solid rgba(200, 162, 74, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <span>✦ Complimentary White-Glove Delivery on orders above ৳3,000</span>
        <span style={{ color: '#c8a24a' }}>·</span>
        <span>Cash on Delivery across all 64 districts</span>
        <span style={{ color: '#c8a24a' }}>·</span>
        <span style={{ color: '#c8a24a', fontWeight: 600 }}>Use code LUXURY10 for 10% privilege</span>
      </div>

      {/* 2. Main Sticky Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backgroundColor: 'rgba(250, 247, 242, 0.95)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(231, 229, 228, 0.85)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          style={{
            maxWidth: '80rem',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.5rem',
            gap: '1.5rem',
          }}
        >
          {/* Brand Logo */}
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: '#0f3d2e',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.1rem',
                height: '2.1rem',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #0f3d2e 0%, #08231a 100%)',
                color: '#c8a24a',
                fontSize: '1.2rem',
                border: '1px solid rgba(200, 162, 74, 0.4)',
                boxShadow: '0 4px 10px rgba(15, 61, 46, 0.2)',
              }}
            >
              ✦
            </span>
            <div>
              <span
                className="font-serif"
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  color: '#0f3d2e',
                  lineHeight: 1,
                  display: 'block',
                }}
              >
                Luxury &amp; Elegant
              </span>
              <span
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#c8a24a',
                  fontWeight: 600,
                  display: 'block',
                  marginTop: '0.15rem',
                }}
              >
                Atelier Horology &amp; Living
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '1.75rem',
            }}
            className="desktop-nav"
          >
            <a
              href="/#interactive-atelier-3d"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                textDecoration: 'none',
                color: '#1c1917',
                fontSize: '0.88rem',
                fontWeight: 600,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#c8a24a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#1c1917')}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '9999px',
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 6px #10b981',
                }}
              />
              <span>3D Atelier</span>
            </a>

            <a
              href="/#flagship-creation"
              style={{
                textDecoration: 'none',
                color: '#1c1917',
                fontSize: '0.88rem',
                fontWeight: 600,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#c8a24a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#1c1917')}
            >
              Cinematic Flagship
            </a>

            <a
              href="/#shop"
              style={{
                textDecoration: 'none',
                color: '#1c1917',
                fontSize: '0.88rem',
                fontWeight: 600,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#c8a24a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#1c1917')}
            >
              Boutique Collection
            </a>

            <Link
              href="/track"
              style={{
                textDecoration: 'none',
                color: '#1c1917',
                fontSize: '0.88rem',
                fontWeight: 600,
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#c8a24a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#1c1917')}
            >
              Track Order
            </Link>
          </nav>

          {/* Search Form (Centered) */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              flex: 1,
              maxWidth: '26rem',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                position: 'absolute',
                left: '1rem',
                color: '#78716c',
                fontSize: '0.9rem',
                pointerEvents: 'none',
              }}
            >
              🔍
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (onSearch) onSearch(e.target.value);
              }}
              placeholder="Search watches, headphones, luxury..."
              className="inp"
              style={{
                borderRadius: '9999px',
                padding: '0.6rem 2.2rem 0.6rem 2.4rem',
                fontSize: '0.85rem',
                width: '100%',
                backgroundColor: '#ffffff',
                border: '1.5px solid #e7e5e4',
                color: '#1c1917',
                transition: 'all 0.2s ease',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  right: '0.8rem',
                  background: 'none',
                  border: 'none',
                  color: '#a8a29e',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  padding: '0.2rem',
                }}
              >
                ✕
              </button>
            )}
          </form>

          {/* Right Action Icons: Wishlist, Account, Cart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            {/* Wishlist Button */}
            <button
              onClick={() => setIsWishlistOpen(true)}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '9999px',
                backgroundColor: '#ffffff',
                border: '1px solid #e7e5e4',
                color: wishlist.length > 0 ? '#e11d48' : '#44403c',
                fontSize: '1.1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              title="View Wishlist"
              aria-label="Wishlist"
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#c8a24a';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e7e5e4';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {wishlist.length > 0 ? '♥' : '♡'}
              {wishlist.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    backgroundColor: '#e11d48',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    borderRadius: '9999px',
                    padding: '0.1rem 0.4rem',
                    boxShadow: '0 2px 6px rgba(225, 29, 72, 0.4)',
                  }}
                >
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Account Profile / Admin */}
            <Link
              href="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(15, 61, 46, 0.08)',
                border: '1px solid rgba(15, 61, 46, 0.18)',
                color: '#0f3d2e',
                fontSize: '1.05rem',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
              title="Management Atelier"
              aria-label="Client Portal"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(15, 61, 46, 0.14)';
                e.currentTarget.style.borderColor = '#c8a24a';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(15, 61, 46, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(15, 61, 46, 0.18)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              👤
            </Link>

            {/* Bespoke Luxury Shopping Bag Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                height: '2.5rem',
                padding: '0 1rem',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #0f3d2e 0%, #09261c 100%)',
                color: '#ffffff',
                border: '1.5px solid rgba(200, 162, 74, 0.45)',
                cursor: 'pointer',
                fontSize: '0.88rem',
                fontWeight: 600,
                boxShadow: '0 6px 18px rgba(15, 61, 46, 0.28)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              title="View Shopping Bag"
              aria-label="Shopping Bag"
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 61, 46, 0.38)';
                e.currentTarget.style.borderColor = '#c8a24a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(15, 61, 46, 0.28)';
                e.currentTarget.style.borderColor = 'rgba(200, 162, 74, 0.45)';
              }}
            >
              <span style={{ fontSize: '1rem' }}>🛍️</span>
              <span style={{ display: 'none' }} className="bag-label">Bag</span>
              {cartCount > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#c8a24a',
                    color: '#0a2318',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    borderRadius: '9999px',
                    padding: '0.12rem 0.45rem',
                    marginLeft: '0.15rem',
                    boxShadow: '0 2px 8px rgba(200, 162, 74, 0.5)',
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 3. Wishlist Quick Slideout Drawer */}
      {isWishlistOpen && (
        <>
          <div
            onClick={() => setIsWishlistOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(4px)',
              zIndex: 55,
            }}
          />
          <aside
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: '28rem',
              backgroundColor: '#faf7f2',
              boxShadow: '-10px 0 35px rgba(0, 0, 0, 0.25)',
              zIndex: 65,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInRight 0.25s ease-out',
            }}
          >
            {/* Wishlist Header */}
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
                <span style={{ color: '#e11d48', fontSize: '1.2rem' }}>♥</span>
                <h3 className="font-serif" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1c1917' }}>
                  Saved Masterpieces ({wishlist.length})
                </h3>
              </div>
              <button
                onClick={() => setIsWishlistOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.4rem',
                  color: '#78716c',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Wishlist Items List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
              {wishlist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>♡</div>
                  <h4 className="font-serif" style={{ fontSize: '1.15rem', color: '#1c1917', marginBottom: '0.4rem' }}>
                    Your wishlist is empty
                  </h4>
                  <p style={{ color: '#78716c', fontSize: '0.85rem' }}>
                    Click the heart icon on any curation in our gallery to save it for later review.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {wishlist.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.85rem',
                        backgroundColor: '#ffffff',
                        borderRadius: '1rem',
                        border: '1px solid #e7e5e4',
                      }}
                    >
                      <img
                        src={item.image || '/images/default.jpg'}
                        alt={item.name}
                        style={{
                          width: '4rem',
                          height: '4rem',
                          borderRadius: '0.75rem',
                          objectFit: 'cover',
                          backgroundColor: '#f5f5f4',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            color: '#1c1917',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f3d2e', marginTop: '0.2rem' }}>
                          ৳{(item.price_now || item.price).toLocaleString()}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                          <button
                            onClick={() => {
                              addToCart(item);
                              toggleWishlist(item);
                            }}
                            className="btn btn-p"
                            style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                          >
                            + Move to Bag
                          </button>
                          <button
                            onClick={() => toggleWishlist(item)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              textDecoration: 'underline',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
