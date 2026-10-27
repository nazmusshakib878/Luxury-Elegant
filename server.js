const path = require('path');
const express = require('express');
const { PORT, BASE_URL, ADMIN_EMAIL } = require('./src/config/env');
const db = require('./src/database/connection');
const { initSchema } = require('./src/database/schema');
const { authenticateUser } = require('./src/middleware/auth');
const asyncHandler = require('./src/middleware/async-handler');
const store = require('./src/controllers/store.controller');
const invoice = require('./src/controllers/invoice.controller');
const apiRoutes = require('./src/routes/api.routes');
const adminRoutes = require('./src/routes/admin.routes');
const { LEGACY_COMMERCE_API_ENABLED } = require('./src/config/env');
const { isLegacyCommerceRouteBlocked } = require('./src/utils/legacy-route-guard');

// 1. Initialize Database Schema & Seeds (async safe)
initSchema().catch((err) => {
  console.warn('Database initialization warning:', err.message);
});

// 2. Initialize Express App
const app = express();
app.disable('x-powered-by');

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 3. Health & Diagnostics Route (Accessible without auth or db crash)
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let userCount = 0;
  let productCount = 0;

  try {
    await initSchema();
    const u = db.isFallback ? null : await db.get('SELECT COUNT(*) as c FROM users');
    const p = await db.get('SELECT COUNT(*) as c FROM products');
    userCount = +(u?.c || u?.count || 0);
    productCount = +(p?.c || p?.count || 0);
    dbStatus = db.isPostgres
      ? 'postgresql_connected'
      : (db.sqlite ? 'sqlite_connected' : 'disconnected (showcase_read_only_fallback)');
  } catch (err) {
    dbStatus = 'error: ' + err.message;
  }

  const isPostgres = Boolean(db.isPostgres);
  const isVercel = Boolean(process.env.VERCEL);
  const isFallback = Boolean(db.isFallback);

  res.json({
    status: isPostgres || !isVercel ? 'ok' : 'showcase_fallback',
    mode: isPostgres ? 'postgresql' : (isVercel ? 'vercel_showcase_fallback' : 'sqlite'),
    isVercel,
    database: {
      connected: isPostgres,
      engine: isPostgres ? 'PostgreSQL (Persistent)' : (db.sqlite ? 'SQLite (Local)' : 'None (In-Memory Showcase Preview)'),
      status: dbStatus,
      ordersAllowed: isPostgres || (!isVercel && Boolean(db.sqlite)),
      mutationsAllowed: isPostgres || (!isVercel && Boolean(db.sqlite)),
      setupRequired: !isPostgres && isVercel
        ? 'DATABASE_URL (or POSTGRES_URL) is required in Vercel Project Settings to connect persistent PostgreSQL for orders, payments, and admin mutations.'
        : null,
    },
    catalog: {
      mode: isPostgres ? 'persistent' : (db.sqlite ? 'local_sqlite' : 'read_only_showcase'),
      productsAvailable: productCount || 16,
      usersCount: userCount,
      readOnlyPreview: isFallback,
    },
    security: {
      inMemoryOrdersBlocked: isFallback,
      adminMutationsBlocked: isFallback,
    },
    timestamp: new Date().toISOString(),
  });
});

// 4. Global Auth Middleware (populates req.user from token)
app.use(authenticateUser);

// 5. API Endpoints
// The Express commerce API is a legacy parallel path. Keep read-only catalog
// endpoints available, but block its order and payment flows unless explicitly
// enabled for isolated local migration work.
app.use('/api', (req, res, next) => {
  if (isLegacyCommerceRouteBlocked(req.method, req.path, LEGACY_COMMERCE_API_ENABLED)) {
    return res.status(410).json({ error: 'This legacy commerce endpoint is disabled. Use the Next.js storefront.' });
  }
  next();
}, apiRoutes);
app.use('/api/admin', adminRoutes);

// 6. Payment Gateway Callbacks (SSLCOMMERZ & aamarPay)
app.all('/pay/:gw/:res', (req, res) => res.status(410).send('Legacy payment callbacks are disabled.'));

// 7. Printable Order Invoice
app.get('/invoice/:id', asyncHandler(invoice.renderInvoice));

// 8. SEO Sitemap & Robots
app.get('/sitemap.xml', asyncHandler(store.getSitemap));
app.get('/robots.txt', store.getRobots);

// 9. Static Web Assets
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  extensions: ['html'],
}));

// 10. Centralized Error Handler (prevents stack leaks & HTML error pages)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 400;
  res.status(status).json({ error: err.message || 'An unexpected error occurred' });
});

// 11. Start Server (Standalone Local Mode Only)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🛍️  Shop Storefront: ${BASE_URL}`);
    console.log(`⚙️  Admin Dashboard: ${BASE_URL}/admin.html`);
    console.log(`🔒 Admin Account:   ${ADMIN_EMAIL}`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
