const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/async-handler');
const { requireStaffOrAdmin, requireAdmin } = require('../middleware/auth');
const admin = require('../controllers/admin.controller');

// All admin routes require at least staff/admin credentials
router.use(requireStaffOrAdmin);

// Realtime SSE stream
router.get('/events', admin.getEvents);

// Dashboard metrics
router.get('/stats', asyncHandler(admin.getStats));

// Products
router.get('/products', asyncHandler(admin.getProducts));
router.post('/products', asyncHandler(admin.createProduct));
router.put('/products/:id', asyncHandler(admin.updateProduct));
router.delete('/products/:id', requireAdmin, asyncHandler(admin.deleteProduct));

// Categories
router.post('/categories', asyncHandler(admin.createCategory));
router.delete('/categories/:id', requireAdmin, asyncHandler(admin.deleteCategory));

// Orders
router.get('/orders', asyncHandler(admin.getOrders));
router.put('/orders/:id', asyncHandler(admin.updateOrder));

// Customers & Coupons
router.get('/customers', asyncHandler(admin.getCustomers));
router.get('/coupons', asyncHandler(admin.getCoupons));
router.post('/coupons', asyncHandler(admin.createCoupon));
router.delete('/coupons/:c', asyncHandler(admin.deleteCoupon));

// Abandoned carts & Settings
router.get('/abandoned', asyncHandler(admin.getAbandonedCarts));
router.get('/settings', asyncHandler(admin.getSettings));
router.put('/settings', requireAdmin, asyncHandler(admin.updateSettings));

// Staff management & Backup (Admin only)
router.get('/staff', requireAdmin, asyncHandler(admin.getStaff));
router.post('/staff', requireAdmin, asyncHandler(admin.createStaff));
router.get('/backup', requireAdmin, asyncHandler(admin.backupDatabase));
router.post('/upload-video', requireAdmin, asyncHandler(admin.uploadVideoAd));

module.exports = router;
