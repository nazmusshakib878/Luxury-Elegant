'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/format';

export default function Navbar({ onSearch }) {
  const { cartCount, setIsDrawerOpen, wishlist, addToCart, toggleWishlist } = useCart();
  const [searchTerm, setSearchTerm] = useState('');
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

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
          fontSize: 'clamp(0.68rem, 2vw, 0.78rem)',
          padding: '0.45rem 0.75rem',
          letterSpacing: '0.04em',
          fontWeight: 500,
          borderBottom: '1px solid rgba(200, 162, 74, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          lineHeight: 1.4,
        }}
      >
        <span>✦ Complimentary White-Glove Delivery on orders above ৳3,000</span>
        <span style={{ color: '#c8a24a' }}>·</span>
        <span className="mobile-hide">Cash on Delivery across 64 districts</span>
        <span style={{ color: '#c8a24a' }} className="mobile-hide">·</span>
        <span style={{ color: '#c8a24a', fontWeight: 600 }}>Privilege Code: LUXURY10</span>
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
            padding: '0.75rem clamp(0.75rem, 3vw, 1.5rem)',
            gap: 'clamp(0.5rem, 2vw, 1.5rem)',
          }}
        >
          {/* Left Group: Mobile Menu Button + Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="desktop-hide"
              style={{
                width: '2.4rem',
                height: '2.4rem',
                borderRadius: '0.65rem',
                backgroundColor: 'rgba(15, 61, 46, 0.08)',
                border: '1px solid rgba(15, 61, 46, 0.18)',
                color: '#0f3d2e',
                fontSize: '1.2rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Open Navigation Menu"
              aria-label="Navigation Menu"
            >
              ☰
            </button>

            {/* Brand Logo */}
            <Link
              href="/"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
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
                  fontSize: '1.15rem',
                  border: '1px solid rgba(200, 162, 74, 0.4)',
                  boxShadow: '0 4px 10px rgba(15, 61, 46, 0.2)',
                  flexShrink: 0,
                }}
              >
                ✦
              </span>
              <div>
                <span
                  className="font-serif desktop-brand-text"
                  style={{
                    fontSize: '1.45rem',
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
                  className="font-serif mobile-brand-text"
                  style={{
                    fontSize: '1.18rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    color: '#0f3d2e',
                    lineHeight: 1,
                    display: 'none',
                  }}
                >
                  Luxury
                </span>
                <span
                  className="mobile-hide"
                  style={{
                    fontSize: '0.62rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: '#c8a24a',
                    fontWeight: 600,
                    marginTop: '0.15rem',
                  }}
                >
                  Atelier Horology &amp; Living
                </span>
              </div>
            </Link>
          </div>

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

          {/* Search Form (Desktop Centered) */}
          <form
            onSubmit={handleSearchSubmit}
            className="mobile-hide"
            style={{
              flex: 1,
              maxWidth: '24rem',
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

          {/* Right Action Icons: Mobile Search, Wishlist, Account, Cart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.4rem, 1.5vw, 0.75rem)', flexShrink: 0 }}>
            {/* Mobile Search Toggle Button */}
            <button
              onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
              className="desktop-hide"
              style={{
                width: '2.4rem',
                height: '2.4rem',
                borderRadius: '9999px',
                backgroundColor: isMobileSearchOpen ? 'rgba(200, 162, 74, 0.2)' : '#ffffff',
                border: isMobileSearchOpen ? '1px solid #c8a24a' : '1px solid #e7e5e4',
                color: '#1c1917',
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Search Masterpieces"
              aria-label="Search"
            >
              🔍
            </button>

            {/* Wishlist Button */}
            <button
              onClick={() => setIsWishlistOpen(true)}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.4rem',
                height: '2.4rem',
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
                    padding: '0.1rem 0.35rem',
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
              className="mobile-hide"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.4rem',
                height: '2.4rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(15, 61, 46, 0.08)',
                border: '1px solid rgba(15, 61, 46, 0.18)',
                color: '#0f3d2e',
                fontSize: '1rem',
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
                gap: '0.4rem',
                height: '2.4rem',
                padding: '0 clamp(0.75rem, 2vw, 1rem)',
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
              <span style={{ fontSize: '0.95rem' }}>🛍️</span>
              <span style={{ display: 'none' }} className="bag-label">Bag</span>
              {cartCount > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#c8a24a',
                    color: '#0a2318',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    borderRadius: '9999px',
                    padding: '0.1rem 0.4rem',
                    marginLeft: '0.1rem',
                    boxShadow: '0 2px 8px rgba(200, 162, 74, 0.5)',
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Expandable Search Bar */}
        {isMobileSearchOpen && (
          <div
            className="desktop-hide"
            style={{
              padding: '0.65rem clamp(0.75rem, 3vw, 1.5rem)',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e7e5e4',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
            }}
          >
            <form onSubmit={handleSearchSubmit} style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <span style={{ position: 'absolute', left: '0.9rem', color: '#78716c', fontSize: '0.85rem', pointerEvents: 'none' }}>🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (onSearch) onSearch(e.target.value);
                }}
                placeholder="Search watches, headphones, luxury..."
                autoFocus
                style={{
                  borderRadius: '9999px',
                  padding: '0.55rem 2.2rem 0.55rem 2.3rem',
                  fontSize: '0.85rem',
                  width: '100%',
                  backgroundColor: '#f5f5f4',
                  border: '1px solid #d6d3d1',
                  color: '#1c1917',
                  outline: 'none',
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={clearSearch}
                  style={{ position: 'absolute', right: '0.8rem', background: 'none', border: 'none', color: '#a8a29e', fontSize: '0.85rem', cursor: 'pointer', padding: '0.2rem' }}
                >
                  ✕
                </button>
              )}
            </form>
          </div>
        )}
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
                          ৳{formatPrice(item.price_now ?? item.price)}
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

      {/* 4. Luxury Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <>
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(7, 33, 24, 0.6)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 70,
            }}
          />
          <aside
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '85vw',
              maxWidth: '22rem',
              backgroundColor: '#faf7f2',
              boxShadow: '10px 0 40px rgba(0, 0, 0, 0.3)',
              zIndex: 80,
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideInLeft 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
              overflowY: 'auto',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.25rem 1.25rem',
                backgroundColor: '#0a2318',
                borderBottom: '1px solid rgba(200, 162, 74, 0.3)',
                color: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '1.9rem',
                    height: '1.9rem',
                    borderRadius: '0.45rem',
                    background: 'rgba(200, 162, 74, 0.2)',
                    color: '#c8a24a',
                    fontSize: '1rem',
                    border: '1px solid rgba(200, 162, 74, 0.4)',
                  }}
                >
                  ✦
                </span>
                <div>
                  <div className="font-serif" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#faf7f2' }}>
                    Luxury &amp; Elegant
                  </div>
                  <div style={{ fontSize: '0.62rem', letterSpacing: '0.15em', color: '#c8a24a', textTransform: 'uppercase' }}>
                    Exclusive Atelier
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#faf7f2',
                  fontSize: '1.1rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            {/* Navigation Links */}
            <nav style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '0.5rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', color: '#78716c', textTransform: 'uppercase' }}>
                Atelier Experiences
              </div>

              <a
                href="/#interactive-atelier-3d"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1.25rem',
                  color: '#1c1917',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ color: '#10b981', fontSize: '0.8rem' }}>●</span>
                <span>3D Interactive Atelier</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#0f3d2e', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '9999px', fontWeight: 700 }}>
                  Live 3D
                </span>
              </a>

              <a
                href="/#flagship-creation"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1.25rem',
                  color: '#1c1917',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                <span style={{ color: '#c8a24a', fontSize: '0.9rem' }}>✦</span>
                <span>Cinematic Flagship</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#c8a24a', backgroundColor: 'rgba(200, 162, 74, 0.15)', padding: '0.15rem 0.45rem', borderRadius: '9999px', fontWeight: 700 }}>
                  Craft
                </span>
              </a>

              <a
                href="/#shop"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1.25rem',
                  color: '#1c1917',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                <span style={{ color: '#0f3d2e', fontSize: '0.9rem' }}>💎</span>
                <span>Boutique Catalog</span>
              </a>

              <Link
                href="/track"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1.25rem',
                  color: '#1c1917',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                <span style={{ color: '#0f3d2e', fontSize: '0.9rem' }}>📦</span>
                <span>Track VIP Order</span>
              </Link>

              <Link
                href="/admin"
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1.25rem',
                  color: '#1c1917',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                <span style={{ color: '#0f3d2e', fontSize: '0.9rem' }}>🛡️</span>
                <span>Management Atelier</span>
              </Link>

              {/* Privilege Code Banner in Drawer */}
              <div style={{ margin: '1rem 1.25rem', padding: '0.85rem 1rem', borderRadius: '0.85rem', background: 'linear-gradient(135deg, #0f3d2e 0%, #072118 100%)', color: '#ffffff', border: '1px solid rgba(200, 162, 74, 0.35)' }}>
                <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#c8a24a', fontWeight: 700 }}>
                  VIP Privilege Voucher
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, marginTop: '0.2rem', letterSpacing: '0.05em', color: '#ffffff' }}>
                  LUXURY10
                </div>
                <div style={{ fontSize: '0.75rem', color: '#d6d3d1', marginTop: '0.2rem' }}>
                  Enjoy 10% privilege savings at checkout on all haute collections.
                </div>
              </div>

              {/* Concierge Support Section */}
              <div style={{ padding: '0.5rem 1.25rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', color: '#78716c', textTransform: 'uppercase' }}>
                Private Concierge
              </div>

              <a
                href="https://wa.me/8801700000000"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.25rem',
                  color: '#16a34a',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>💬</span>
                <span>WhatsApp Private Client</span>
              </a>

              <a
                href="tel:+8801800589879"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1.25rem',
                  color: '#44403c',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>📞</span>
                <span>+880 1800-LUXURY (Toll-Free)</span>
              </a>
            </nav>

            {/* Bottom Actions */}
            <div style={{ marginTop: 'auto', padding: '1.25rem', borderTop: '1px solid #e7e5e4', backgroundColor: '#f5f5f4', display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsWishlistOpen(true);
                }}
                className="btn btn-o"
                style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem' }}
              >
                ♥ Wishlist ({wishlist.length})
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsDrawerOpen(true);
                }}
                className="btn btn-p"
                style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem' }}
              >
                🛍️ Bag ({cartCount})
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
