const path = require('path');
const express = require('express');
const { PORT, BASE_URL } = require('./src/config/env');
const { initSchema } = require('./src/database/schema');
const { authenticateUser } = require('./src/middleware/auth');
const asyncHandler = require('./src/middleware/async-handler');
const store = require('./src/controllers/store.controller');
const invoice = require('./src/controllers/invoice.controller');
const apiRoutes = require('./src/routes/api.routes');
const adminRoutes = require('./src/routes/admin.routes');

// 1. Initialize SQLite Database Tables & Seeds
initSchema();

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

// 3. Global Auth Middleware (populates req.user from token)
app.use(authenticateUser);

// 4. API Endpoints
app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);

// 5. Payment Gateway Callbacks (SSLCOMMERZ & aamarPay)
app.all('/pay/:gw/:res', asyncHandler(store.handlePaymentCallback));

// 6. Printable Order Invoice
app.get('/invoice/:id', invoice.renderInvoice);

// 7. SEO Sitemap & Robots
app.get('/sitemap.xml', store.getSitemap);
app.get('/robots.txt', store.getRobots);

// 8. Static Web Assets
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  extensions: ['html'],
}));

// 9. Centralized Error Handler (prevents stack leaks & HTML error pages)
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 400;
  res.status(status).json({ error: err.message || 'An unexpected error occurred' });
});

// 10. Start Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🛍️  Shop Storefront: ${BASE_URL}`);
  console.log(`⚙️  Admin Dashboard: ${BASE_URL}/admin.html`);
  console.log(`🔑 Default Admin:    admin@shop.com / admin123`);
  console.log(`======================================================\n`);
});

module.exports = app;
