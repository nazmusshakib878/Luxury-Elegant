const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/async-handler');
const { requireAuth } = require('../middleware/auth');
const store = require('../controllers/store.controller');

// Public Storefront Endpoints
router.get('/settings', asyncHandler(store.getSettings));
router.get('/categories', asyncHandler(store.getCategories));
router.get('/products', asyncHandler(store.getProducts));
router.get('/products/:id', asyncHandler(store.getProductById));
router.post('/products/:id/reviews', requireAuth, asyncHandler(store.addReview));
router.get('/coupon', asyncHandler(store.getCoupon));

const { createRateLimiter } = require('../middleware/rate-limiter');

const authLimiter = createRateLimiter({ windowMs: 60000, max: 20, message: 'Too many authentication attempts. Please try again in a minute.' });

// Authentication & Customer
router.post('/register', authLimiter, asyncHandler(store.register));
router.post('/login', authLimiter, asyncHandler(store.login));
router.post('/cart-capture', asyncHandler(store.captureCart));

// Orders & Tracking
router.post('/orders', asyncHandler(store.createOrder));
router.get('/track', asyncHandler(store.trackOrder));
router.get('/my/orders', requireAuth, asyncHandler(store.getMyOrders));
router.post('/orders/:id/return', asyncHandler(store.requestReturn));

module.exports = router;
