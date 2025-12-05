const express = require('express');
const router = express.Router();
const {
  initializeCheckout,
  createAccountAfterPurchase,
  getOrderByNumber,
  getUserOrders,
  updateOrderStatus,
  getAllOrders,
  searchOrdersByEmail
} = require('../controllers/order.controller');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.post('/orders/initialize-checkout', initializeCheckout);
router.post('/auth/create-account-post-purchase', createAccountAfterPurchase);
router.get('/orders/track/:orderNumber', getOrderByNumber); 

// Protected routes (authenticated users only)
router.get('/orders/my-orders', protect, getUserOrders);

// Admin routes
router.get('/orders', protect, authorize('admin'), getAllOrders);
router.patch('/orders/:id/status', protect, authorize('admin'), updateOrderStatus);
router.get('/orders/customer/:email', protect, authorize('admin'), searchOrdersByEmail);

module.exports = router;