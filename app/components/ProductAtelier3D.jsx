'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../utils/format';

const SHOWCASE_DATA = {
  watch: {
    id: 3,
    category: 'Fashion & Horology',
    badge: '✦ Swiss Quartz Precision Movement',
    title: 'Geneva Gold Minimalist Watch',
    tagline: 'Ultra-slim surgical-grade champagne gold casing with scratch-resistant sapphire crystal and Italian top-grain calfskin leather strap.',
    price: 3600,
    regularPrice: 4500,
    specs: [
      { label: 'Casing', val: '316L Surgical Champagne Gold' },
      { label: 'Crystal', val: 'Scratch-Resistant Sapphire Glass' },
      { label: 'Strap', val: 'Stitched Italian Calfskin Leather' },
      { label: 'Movement', val: 'Swiss Quartz Precision' },
    ],
    components: ['Calfskin Strap', 'Sapphire Dome', 'Coin-Fluted Bezel', 'Dauphine Hands', 'Emerald Dial', 'Exhibition Calibre'],
  },
  headphones: {
    id: 4,
    category: 'High-Fidelity Acoustics',
    badge: '✦ 40mm Titanium Acoustic Transducer',
    title: 'Aura Pro Studio Wireless Headphones',
    tagline: 'Precision 40mm titanium acoustic drivers, hybrid active noise cancellation, brushed aluminum hardware, and 45-hour ultra-long battery life with spatial audio.',
    price: 6990,
    regularPrice: 8900,
    specs: [
      { label: 'Transducers', val: '40mm Custom Titanium Drivers' },
      { label: 'Architecture', val: 'Acoustic Obsidian Shells' },
      { label: 'Battery', val: '45-Hour Ultra-Long Playback' },
      { label: 'Connectivity', val: 'Spatial Bluetooth 5.4' },
    ],
    components: ['Memory Foam Cushions', 'Titanium Drivers', 'Obsidian Earcups', 'Brushed Gimbals', 'Leather Headband'],
  },
  perfume: {
    id: 8,
    category: 'Artisanal Skincare & Fragrance',
    badge: '✦ Pure L-Ascorbic Acid Ferulic Complex',
    title: 'Lumière 20% Vitamin C Radiance Serum',
    tagline: 'Refractive amber crystal apothecary flacon containing stabilized 20% pure L-Ascorbic Acid, botanic hyaluronic acid, and gold foil embossed label with precision dropper.',
    price: 1850,
    regularPrice: 1850,
    specs: [
      { label: 'Concentration', val: '20% Pure L-Ascorbic Acid' },
      { label: 'Flacon', val: 'Heavy Amber Crystal Flint Glass' },
      { label: 'Pipette', val: 'Graduated Medical Glass Dropper' },
      { label: 'Volume', val: '30ml / 1.0 fl. oz. Extrait' },
    ],
    components: ['Amber Flint Flacon', 'Gold Foil Label', 'Serum Caustic Core', 'Knurled Collar', 'Glass Pipette'],
  },
};

export default function ProductAtelier3D() {
  const containerRef = useRef(null);
  const { addToCart } = useCart();
  const [activeKey, setActiveKey] = useState('watch');
  const [isExploded, setIsExploded] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const activeProduct = SHOWCASE_DATA[activeKey];

  useEffect(() => {
    let timer = null;

    const tryInit = () => {
      if (typeof window !== 'undefined' && window.Product3DExperience && document.getElementById('atelier-canvas-wrapper')) {
        try {
          window.Product3DExperience.init('#atelier-canvas-wrapper');
          setIsInitialized(true);
          return true;
        } catch (err) {
          console.warn('3D Experience initialization retry:', err);
        }
      }
      return false;
    };

    if (!tryInit()) {
      timer = setInterval(() => {
        if (tryInit()) {
          clearInterval(timer);
        }
      }, 100);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (typeof window !== 'undefined' && window.Product3DExperience) {
        try {
          window.Product3DExperience.destroy();
        } catch {}
      }
    };
  }, []);

  const handleSwitch = (key) => {
    setActiveKey(key);
    setIsExploded(false);
    if (typeof window !== 'undefined' && window.Product3DExperience) {
      window.Product3DExperience.switchModel(key);
    }
  };

  const handleToggleExplode = () => {
    const nextState = !isExploded;
    setIsExploded(nextState);
    if (typeof window !== 'undefined' && window.Product3DExperience) {
      window.Product3DExperience.toggleExplode();
    }
  };

  const handleZoom = (dir) => {
    if (typeof window !== 'undefined' && window.Product3DExperience) {
      window.Product3DExperience.zoom(dir);
    }
  };

  const handleReset = () => {
    setIsExploded(false);
    if (typeof window !== 'undefined' && window.Product3DExperience) {
      window.Product3DExperience.resetView();
    }
  };

  const handleAddToCart = () => {
    addToCart({
      id: activeProduct.id,
      name: activeProduct.title,
      price: activeProduct.price,
      price_now: activeProduct.price,
      stock: 25,
      image: `/images/${activeKey === 'watch' ? 'prod-3.jpg' : activeKey === 'headphones' ? 'prod-4.jpg' : 'prod-8.jpg'}`,
    });
  };

  return (
    <section id="interactive-atelier-3d" style={{ margin: '3.5rem 0' }}>
      <div className="atelier-3d-container">
        {/* Header Controls & Showcase Tabs */}
        <div
          style={{
            padding: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            borderBottom: '1px solid rgba(200, 162, 74, 0.15)',
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div>
            <span
              style={{
                display: 'inline-block',
                color: '#c8a24a',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '0.25rem',
              }}
            >
              ✦ Interactive 3D Product Atelier
            </span>
            <h2
              className="font-serif"
              style={{
                margin: 0,
                fontSize: '1.45rem',
                color: '#ffffff',
                fontWeight: 700,
              }}
            >
              WebGL Interactive Craftsmanship
            </h2>
          </div>

          {/* Showcase Selector Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleSwitch('watch')}
              data-model="watch"
              className={`atelier-tab-btn ${activeKey === 'watch' ? 'active' : ''}`}
            >
              ⌚ 01 · Luxury Watch
            </button>
            <button
              onClick={() => handleSwitch('headphones')}
              data-model="headphones"
              className={`atelier-tab-btn ${activeKey === 'headphones' ? 'active' : ''}`}
            >
              🎧 02 · Studio Headphones
            </button>
            <button
              onClick={() => handleSwitch('perfume')}
              data-model="perfume"
              className={`atelier-tab-btn ${activeKey === 'perfume' ? 'active' : ''}`}
            >
              ✨ 03 · Radiance Elixir
            </button>
          </div>
        </div>

        {/* Grid Layout: 3D Stage (Left) & Real Specs Card (Right) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            position: 'relative',
          }}
        >
          {/* Left: 3D Canvas Target Wrapper */}
          <div style={{ position: 'relative', overflow: 'hidden', minHeight: '380px' }}>
            <div
              id="atelier-canvas-wrapper"
              ref={containerRef}
              className="atelier-canvas-wrapper"
              style={{ width: '100%', height: '520px', minHeight: '380px', position: 'relative' }}
            />

            {/* Floating 3D Interaction Control Overlay */}
            <div
              style={{
                position: 'absolute',
                bottom: 'clamp(0.6rem, 2vw, 1.25rem)',
                left: 'clamp(0.5rem, 2vw, 1.25rem)',
                right: 'clamp(0.5rem, 2vw, 1.25rem)',
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              <button
                id="atelier-explode-btn"
                onClick={handleToggleExplode}
                className="atelier-tab-btn"
                style={{
                  pointerEvents: 'auto',
                  backgroundColor: isExploded ? '#c8a24a' : 'rgba(0,0,0,0.65)',
                  color: isExploded ? '#1c1917' : '#ffffff',
                  border: '1px solid rgba(200, 162, 74, 0.4)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  fontWeight: 700,
                }}
                title="Explode & inspect components"
              >
                <span style={{ color: isExploded ? '#1c1917' : '#c8a24a', marginRight: '0.35rem' }}>✦</span>
                <span>{isExploded ? 'Reassemble 3D View' : 'Explode 3D Components'}</span>
              </button>

              <div
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(12px)',
                  padding: '0.3rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
              >
                <button
                  onClick={() => handleZoom('in')}
                  className="atelier-control-btn"
                  style={{ width: '2rem', height: '2rem', fontSize: '1.1rem' }}
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  onClick={() => handleZoom('out')}
                  className="atelier-control-btn"
                  style={{ width: '2rem', height: '2rem', fontSize: '1.1rem' }}
                  title="Zoom Out"
                >
                  −
                </button>
                <button
                  onClick={handleReset}
                  className="atelier-control-btn"
                  style={{ width: '2rem', height: '2rem', fontSize: '0.85rem' }}
                  title="Reset View"
                >
                  ⟲
                </button>
              </div>
            </div>

            {/* Orbital Drag Hint Badge */}
            <div
              style={{
                position: 'absolute',
                top: '1.25rem',
                left: '1.25rem',
                backgroundColor: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(8px)',
                color: '#e7e5e4',
                fontSize: '0.75rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                border: '1px solid rgba(255,255,255,0.15)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span style={{ color: '#c8a24a' }}>↻</span>
              <span>Drag to Rotate 360° · Scroll to Scrub</span>
            </div>
          </div>

          {/* Right: Dynamic Product Specifications Card (React Rendered) */}
          <div
            id="react-atelier-specs-card"
            style={{
              padding: 'clamp(1.2rem, 3vw, 2rem)',
              backgroundColor: 'rgba(10, 26, 19, 0.88)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              borderLeft: '1px solid rgba(200, 162, 74, 0.15)',
            }}
          >
            <div>
              <span
                style={{
                  display: 'inline-block',
                  color: '#c8a24a',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  backgroundColor: 'rgba(200, 162, 74, 0.12)',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(200, 162, 74, 0.25)',
                  marginBottom: '0.75rem',
                }}
              >
                {activeProduct.badge}
              </span>

              <h3
                className="font-serif"
                style={{
                  fontSize: 'clamp(1.4rem, 3vw, 1.85rem)',
                  fontWeight: 700,
                  color: '#ffffff',
                  margin: '0 0 0.5rem',
                  lineHeight: 1.2,
                }}
              >
                {activeProduct.title}
              </h3>

              <p
                style={{
                  color: '#d6d3d1',
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  marginBottom: '1.5rem',
                  fontWeight: 300,
                }}
              >
                {activeProduct.tagline}
              </p>

              {/* Four Key Specs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                }}
              >
                {activeProduct.specs.map((s, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.65rem 0.85rem',
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      borderRadius: '0.75rem',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{ color: '#c8a24a', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase' }}>
                      {s.label}
                    </div>
                    <div style={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.15rem' }}>
                      {s.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Separable Components Tags */}
              <div>
                <div style={{ color: '#c8a24a', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                  3D Component Architecture:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {activeProduct.components.map((c, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.75rem',
                        color: '#d6d3d1',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Price & Action */}
            <div
              style={{
                marginTop: '2rem',
                paddingTop: '1.25rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ color: '#a8a29e', fontSize: '0.8rem' }}>Exclusive Price</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c8a24a' }}>
                    ৳{formatPrice(activeProduct?.price)}
                  </span>
                  {activeProduct?.regularPrice > activeProduct?.price && (
                    <span style={{ fontSize: '1rem', color: '#78716c', textDecoration: 'line-through' }}>
                      ৳{formatPrice(activeProduct?.regularPrice)}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className="btn btn-gold"
                style={{ padding: '0.85rem 1.6rem', fontSize: '0.95rem' }}
              >
                🛍️ Quick Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
