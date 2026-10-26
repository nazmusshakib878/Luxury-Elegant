import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: '#0c3125',
        color: '#ffffff',
        padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1rem, 3vw, 1.5rem) 2rem',
        marginTop: '5rem',
        borderTop: '2px solid rgba(200, 162, 74, 0.4)',
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.15)',
      }}
    >
      <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
            gap: 'clamp(1.5rem, 3vw, 3rem)',
            marginBottom: '3rem',
          }}
        >
          {/* Col 1: Brand Info */}
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
                marginBottom: '1rem',
              }}
            >
              <span style={{ color: '#c8a24a' }}>✦</span>
              <span>Luxury &amp; Elegant</span>
            </div>
            <p style={{ color: '#d6d3d1', fontSize: '0.85rem', lineHeight: 1.7, margin: '0 0 1.25rem' }}>
              Purveyors of Geneva-grade horology, studio-fidelity acoustics, artisanal living aesthetics, and radiance wellness for discerning lifestyles across Bangladesh.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['Facebook', 'Instagram', 'YouTube'].map((social) => (
                <span
                  key={social}
                  style={{
                    display: 'inline-block',
                    padding: '0.3rem 0.75rem',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(200, 162, 74, 0.25)',
                    fontSize: '0.72rem',
                    color: '#c8a24a',
                    fontWeight: 600,
                  }}
                >
                  {social}
                </span>
              ))}
            </div>
          </div>

          {/* Col 2: Curated Collections */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c8a24a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>
              Curated Collections
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: '#e7e5e4' }}>
              <li><a href="/#interactive-atelier-3d" style={{ color: 'inherit', textDecoration: 'none' }}>✦ 3D Horology Atelier</a></li>
              <li><a href="/#flagship-creation" style={{ color: 'inherit', textDecoration: 'none' }}>Aura Pro Studio Wireless</a></li>
              <li><a href="/#shop" style={{ color: 'inherit', textDecoration: 'none' }}>Geneva Minimalist Gold Watch</a></li>
              <li><a href="/#shop" style={{ color: 'inherit', textDecoration: 'none' }}>Artisanal Home &amp; Living</a></li>
              <li><a href="/#shop" style={{ color: 'inherit', textDecoration: 'none' }}>Radiance Botanical Elixir</a></li>
            </ul>
          </div>

          {/* Col 3: Patron Services */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c8a24a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>
              Patron Services
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.85rem', color: '#e7e5e4' }}>
              <li><Link href="/track" style={{ color: 'inherit', textDecoration: 'none' }}>🚚 Real-Time Order Tracking</Link></li>
              <li><a href="/#shop" style={{ color: 'inherit', textDecoration: 'none' }}>💵 Doorstep Cash on Delivery</a></li>
              <li><a href="/#shop" style={{ color: 'inherit', textDecoration: 'none' }}>🛡️ 2-Year Atelier Warranty</a></li>
              <li><a href="/#shop" style={{ color: 'inherit', textDecoration: 'none' }}>🔄 7-Day Exchange Privilege</a></li>
              <li><Link href="/admin" style={{ color: '#c8a24a', textDecoration: 'none' }}>🔒 Atelier Management Portal</Link></li>
            </ul>
          </div>

          {/* Col 4: Dhaka Concierge */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c8a24a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>
              Dhaka Concierge
            </h4>
            <div style={{ color: '#e7e5e4', fontSize: '0.85rem', lineHeight: 1.7 }}>
              <div><strong>Flagship Atelier:</strong> Level 5, Road 11, Banani, Dhaka 1213</div>
              <div style={{ marginTop: '0.4rem' }}><strong>Helpline:</strong> +880 1800-LUXURY</div>
              <div style={{ marginTop: '0.2rem' }}><strong>WhatsApp:</strong> +880 1700-000000</div>
              <div style={{ marginTop: '0.2rem' }}><strong>Hours:</strong> Daily 10:00 AM – 10:00 PM</div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Payment Badges & Copyright */}
        <div
          style={{
            paddingTop: '2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.8rem',
            color: '#a8a29e',
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} Luxury &amp; Elegant Atelier Ltd. All rights reserved.
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: '#c8a24a' }}>Accepted Privileges:</span>
            <span style={{ backgroundColor: '#ffffff', color: '#e11d48', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', fontWeight: 800, fontSize: '0.72rem' }}>bKash</span>
            <span style={{ backgroundColor: '#ffffff', color: '#ea580c', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', fontWeight: 800, fontSize: '0.72rem' }}>Nagad</span>
            <span style={{ backgroundColor: '#ffffff', color: '#1e40af', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', fontWeight: 800, fontSize: '0.72rem' }}>VISA</span>
            <span style={{ backgroundColor: '#ffffff', color: '#dc2626', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', fontWeight: 800, fontSize: '0.72rem' }}>Mastercard</span>
            <span style={{ backgroundColor: '#0f3d2e', border: '1px solid #c8a24a', color: '#c8a24a', padding: '0.2rem 0.5rem', borderRadius: '0.35rem', fontWeight: 700, fontSize: '0.72rem' }}>Doorstep COD</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
