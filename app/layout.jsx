import './globals.css';
import { CartProvider } from './context/CartContext';
import CartDrawer from './components/CartDrawer';
import Footer from './components/Footer';

export const metadata = {
  title: 'Luxury & Elegant — Interactive 3D E-Commerce Platform',
  description: 'Premium curated fashion, horology, high-fidelity acoustics & lifestyle essentials with fast delivery across Bangladesh.',
  openGraph: {
    title: 'Luxury & Elegant — Interactive 3D E-Commerce Platform',
    description: 'Experience procedural 3D WebGL product showcases and luxury catalog with fast delivery.',
    type: 'website',
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90' fill='%23c8a24a'>✦</text></svg>",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script src="/js/vendor/three.min.js"></script>
        <script src="/js/vendor/gsap.min.js"></script>
        <script src="/js/vendor/ScrollTrigger.min.js"></script>
        <script src="/js/product-3d.js"></script>
      </head>
      <body className="font-sans">
        <CartProvider>
          {children}
          <CartDrawer />
          <Footer />

          {/* Floating WhatsApp Quick Support */}
          <a
            href="https://wa.me/8801700000000"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: 'fixed',
              bottom: '1.5rem',
              right: '1.5rem',
              zIndex: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '3.4rem',
              height: '3.4rem',
              borderRadius: '9999px',
              backgroundColor: '#25D366',
              color: '#ffffff',
              fontSize: '1.5rem',
              boxShadow: '0 10px 25px rgba(37, 211, 102, 0.4)',
              textDecoration: 'none',
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            title="Chat on WhatsApp"
          >
            💬
          </a>
        </CartProvider>
      </body>
    </html>
  );
}
