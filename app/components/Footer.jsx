import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      style={{
        marginTop: '6rem',
        backgroundColor: '#1c1917',
        color: '#a8a29e',
        padding: '4rem 1.5rem 3rem',
        borderTop: '1px solid rgba(200, 162, 74, 0.2)',
      }}
    >
      <div
        style={{
          maxWidth: '80rem',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '2.5rem',
        }}
      >
        {/* Brand Column */}
        <div>
          <div
            className="font-serif"
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span style={{ color: '#c8a24a' }}>✦</span>
            <span>Luxury & Elegant</span>
          </div>
          <p style={{ marginTop: '0.85rem', fontSize: '0.85rem', lineHeight: 1.7, color: '#a8a29e' }}>
            Curated horology, high-fidelity acoustics, and artisanal lifestyle essentials with verified authentic craftsmanship and fast doorstep delivery across Bangladesh.
          </p>
          <div style={{ marginTop: '1rem', color: '#c8a24a', fontSize: '0.85rem', fontWeight: 600 }}>
            Powered by Next.js 16 Full-Stack Architecture
          </div>
        </div>

        {/* Customer Support */}
        <div>
          <h4
            style={{
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '1rem',
            }}
          >
            Client Services
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
            <li>
              <Link href="/track" style={{ color: '#d6d3d1', textDecoration: 'none' }}>
                Track Order Status
              </Link>
            </li>
            <li>
              <Link href="/#shop" style={{ color: '#d6d3d1', textDecoration: 'none' }}>
                Explore Full Catalog
              </Link>
            </li>
            <li>
              <Link href="/admin" style={{ color: '#d6d3d1', textDecoration: 'none' }}>
                Store Management Portal
              </Link>
            </li>
          </ul>
        </div>

        {/* Payment Methods */}
        <div>
          <h4
            style={{
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '1rem',
            }}
          >
            Accepted Payment Methods
          </h4>
          <p style={{ fontSize: '0.88rem', lineHeight: 1.7, color: '#d6d3d1' }}>
            Cash on Delivery (COD) · bKash · Nagad · Rocket · Visa · Mastercard
          </p>
          <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#78716c' }}>
            Instant SSL-encrypted checkout & tamper-evident delivery packaging.
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        style={{
          maxWidth: '80rem',
          margin: '3rem auto 0',
          paddingTop: '1.5rem',
          borderTop: '1px solid #292524',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: '#78716c',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>© {new Date().getFullYear()} Luxury & Elegant. All rights reserved.</div>
        <div>Dhaka, Bangladesh · 24/7 Concierge Support</div>
      </div>
    </footer>
  );
}
