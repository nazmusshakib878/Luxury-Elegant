const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/async-handler');
const { requireAuth } = require('../middleware/auth');
const store = require('../controllers/store.controller');

// Public Storefront Endpoints
router.get('/settings', store.getSettings);
router.get('/categories', store.getCategories);
router.get('/products', store.getProducts);
router.get('/products/:id', store.getProductById);
router.post('/products/:id/reviews', requireAuth, asyncHandler(store.addReview));
router.get('/coupon', store.getCoupon);

const { createRateLimiter } = require('../middleware/rate-limiter');

const authLimiter = createRateLimiter({ windowMs: 60000, max: 20, message: 'Too many authentication attempts. Please try again in a minute.' });

// Authentication & Customer
router.post('/register', authLimiter, asyncHandler(store.register));
router.post('/login', authLimiter, asyncHandler(store.login));
router.post('/cart-capture', store.captureCart);

// Orders & Tracking
router.post('/orders', asyncHandler(store.createOrder));
router.get('/track', store.trackOrder);
router.get('/my/orders', requireAuth, store.getMyOrders);
router.post('/orders/:id/return', asyncHandler(store.requestReturn));

module.exports = router;
