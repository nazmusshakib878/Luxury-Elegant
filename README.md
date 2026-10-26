# Luxury & Elegant — Interactive 3D E-Commerce Platform

A production-ready luxury e-commerce platform built with **Next.js 16 (App Router), React 19, Node.js, SQLite (better-sqlite3) & PostgreSQL**, featuring interactive procedural **Three.js & WebGL 3D Product Showcases**, **GSAP ScrollTrigger** scroll-responsive animations, and a responsive luxury storefront.

---

## 🌟 Key Features

- **Interactive 3D Product Atelier:**
  - **Luxury Watch (Geneva Gold Minimalist Watch):** 360° orbital rotation, zoom controls, and exploded component separation (sapphire crystal, coin-fluted bezel, hands, sunburst dial, and calibre movement).
  - **Studio Headphones (Aura Pro Studio Wireless):** 3D rotation and exploded acoustic chamber view (headband, anodized yokes, acoustic shells, 40mm titanium drivers, memory foam cushions).
  - **Radiance Elixir Bottle (Lumière Vitamin C Serum):** Refractive amber flint glass bottle, luminous golden serum core, gold foil label, and precision dropper pipette.
  - **GSAP ScrollTrigger:** Smooth scroll-responsive rotation (including reverse scrolling).
  - **Database Integration:** Direct purchase and specifications connected to SQLite database products.
  - **Mobile & Fallback Support:** Full touch gesture controls with accessible static fallback for non-WebGL devices.

- **Storefront & Commerce:**
  - Modern luxury emerald-and-gold design aesthetic.
  - Responsive catalog with real-time category filtering (Fashion, Electronics, Home & Living, Beauty).
  - Dynamic shopping cart, instant toast notifications, and checkout with price recalculation.
  - Cash on Delivery (COD) and payment gateway ready (SSLCOMMERZ & aamarPay).
  - Direct printable and PDF customer invoices.
  - Realtime order tracking with multi-step delivery status.

- **Administrative Control Panel:**
  - Realtime SSE (Server-Sent Events) live order alerts and dashboard metrics.
  - Product catalog management, variants, and stock tracking.
  - Coupon management (percentage discounts, expiry).
  - Abandoned cart recovery with WhatsApp contact links.
  - Automated one-click SQLite WAL checkpoint backups.

---

## 📁 Project Architecture & Directory Structure

```text
shop/
├── src/
│   ├── config/
│   │   ├── env.js                # Environment configuration loader (.env)
│   │   └── constants.js          # Default store constants & status lists
│   ├── database/
│   │   ├── connection.js         # SQLite database instance with WAL mode
│   │   └── schema.js             # Table definitions & initial database seeding
│   ├── middleware/
│   │   ├── auth.js               # JWT/HMAC authentication & RBAC roles
│   │   └── async-handler.js      # Express async route error wrapper
│   ├── services/
│   │   ├── payment.js            # SSLCOMMERZ & aamarPay gateway integrations
│   │   └── notification.js       # Real-time SSE order alerts & webhooks
│   ├── controllers/
│   │   ├── store.controller.js   # Products, cart, orders, reviews, tracking
│   │   ├── admin.controller.js   # Dashboard metrics, catalog, staff, backups
│   │   └── invoice.controller.js # Printable PDF invoice generator
│   └── routes/
│       ├── api.routes.js         # Public storefront API routes
│       └── admin.routes.js       # Authenticated admin API routes
├── public/
│   ├── css/
│   │   ├── style.css             # Storefront design, 3D container & animations
│   │   └── admin.css             # Admin dashboard styling
│   ├── js/
│   │   ├── vendor/               # Three.js r128, GSAP 3.12, ScrollTrigger
│   │   ├── product-3d.js         # Procedural Three.js 3D Product Atelier engine
│   │   ├── app.js                # Customer storefront client SPA logic
│   │   └── admin.js              # Admin portal SPA logic
│   ├── images/                   # Product catalog assets
│   ├── index.html                # Main storefront page
│   └── admin.html                # Admin dashboard entry
├── server.js                     # Main application entry point
├── .env.example                  # Template for environment variables
└── package.json                  # Dependencies & npm scripts
```

---

## 🚀 Quick Start

1. **Install dependencies:**
   ```powershell
   npm install
   ```

2. **Environment configuration:**
   Copy the example environment file:
   ```powershell
   cp .env.example .env
   ```

3. **Start the server:**
   ```powershell
   # Development mode with auto-reload:
   npm run dev

   # Standard production start:
   npm start
   ```

4. **Access the application:**
   - **Public Storefront:** [http://localhost:3000](http://localhost:3000)
   - **Admin Control Panel:** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)
     - Set your admin credentials securely in `.env` via `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
     - Or reset/create admin password anytime with: `npm run reset-admin`

---

## 💳 Payment Gateway Configuration

- **Cash on Delivery (COD):** Pre-configured and active by default.
- **SSLCOMMERZ / aamarPay:** 
  1. Add your Store ID and Store Password / Signature in `.env`.
  2. Runs in sandbox mode by default.
  3. For live production, set `SSL_LIVE=1` or `AAMARPAY_LIVE=1` and set `BASE_URL` to your production domain.
