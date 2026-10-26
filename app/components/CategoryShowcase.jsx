'use client';

import React from 'react';

const CATEGORIES_DATA = [
  {
    id: 1,
    name: 'Fashion',
    subtitle: 'Refined Apparel & Leathercraft',
    image: '/images/cat-fashion.jpg',
  },
  {
    id: 2,
    name: 'Electronics',
    subtitle: 'High-Fidelity Audio & Tech',
    image: '/images/cat-electronics.jpg',
  },
  {
    id: 3,
    name: 'Home & Living',
    subtitle: 'Artisanal Decor & Living',
    image: '/images/cat-home.jpg',
  },
  {
    id: 4,
    name: 'Beauty',
    subtitle: 'Radiance Formulas & Skincare',
    image: '/images/cat-beauty.jpg',
  },
];

export default function CategoryShowcase({ onSelectCategory }) {
  const handleClick = (catId) => {
    if (onSelectCategory) {
      onSelectCategory(String(catId));
    }
    const shopEl = document.getElementById('shop');
    if (shopEl) {
      shopEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="featured-categories" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {CATEGORIES_DATA.map((cat) => (
          <div
            key={cat.id}
            onClick={() => handleClick(cat.id)}
            className="category-card group"
            style={{
              position: 'relative',
              borderRadius: '1.5rem',
              overflow: 'hidden',
              cursor: 'pointer',
              aspectRatio: '16 / 11',
              backgroundColor: '#1c1917',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {/* Background Image */}
            <img
              src={cat.image}
              alt={cat.name}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/images/hero.jpg';
              }}
            />

            {/* Dark Vignette Overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.88) 0%, rgba(0, 0, 0, 0.38) 55%, rgba(0, 0, 0, 0.15) 100%)',
                transition: 'background 0.3s ease',
              }}
            />

            {/* Content Overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                color: '#ffffff',
                zIndex: 2,
              }}
            >
              <h3
                className="font-serif"
                style={{
                  margin: 0,
                  fontSize: '1.35rem',
                  fontWeight: 700,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                }}
              >
                {cat.name}
              </h3>
              <p
                style={{
                  margin: '0.25rem 0 0',
                  fontSize: '0.8rem',
                  color: '#d6d3d1',
                  fontWeight: 400,
                  lineHeight: 1.35,
                }}
              >
                {cat.subtitle}
              </p>
              <span
                style={{
                  marginTop: '0.65rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#c8a24a',
                }}
              >
                <span>Explore Collection</span>
                <span>→</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
