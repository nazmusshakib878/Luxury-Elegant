import React from 'react';
import Link from 'next/link';

const linkStyle = { color: 'inherit', textDecoration: 'none' };

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__grid">
          <section>
            <Link href="/" className="site-footer__brand">Luxury &amp; Elegant</Link>
            <p className="site-footer__intro">Thoughtfully selected pieces for everyday living. Browse the collection, order as a guest, and follow your delivery online.</p>
          </section>
          <nav aria-label="Shop">
            <h2 className="site-footer__heading">Explore</h2>
            <ul className="site-footer__links">
              <li><Link href="/#shop" style={linkStyle}>Shop the collection</Link></li>
              <li><Link href="/#categories" style={linkStyle}>Browse categories</Link></li>
              <li><Link href="/track" style={linkStyle}>Track an order</Link></li>
              <li><Link href="/account" style={linkStyle}>Customer account</Link></li>
            </ul>
          </nav>
          <section>
            <h2 className="site-footer__heading">Customer care</h2>
            <p className="site-footer__copy">Need help with a product or delivery? Contact the store using the support details provided at checkout or on your order confirmation.</p>
            <p className="site-footer__copy">Delivery fees and available payment options are shown before you place an order.</p>
          </section>
        </div>
        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} Luxury &amp; Elegant</span>
          <span>Secure checkout · Guest ordering · Order tracking</span>
          <Link href="/admin" style={{ ...linkStyle, color: '#d7bd78' }}>Store administration</Link>
        </div>
      </div>
    </footer>
  );
}
