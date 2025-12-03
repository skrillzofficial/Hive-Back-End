const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/order.controller');
const { protect, authorize } = require('../middleware/auth');

// Public routes
router.post('/orders/create', OrderController.createOrder);
router.post('/auth/create-account-post-purchase', OrderController.createAccountAfterPurchase);

// Webhook (no auth needed for Paystack)
router.post('/payment/webhook', OrderController.verifyPaymentWebhook);

// Protected routes (authenticated users only)
router.get('/orders/my-orders', protect, OrderController.getUserOrders);
router.get('/orders/:id', protect, OrderController.getOrder);
router.get('/orders/number/:orderNumber', protect, OrderController.getOrderByNumber);

// Admin routes
router.get('/orders', protect, authorize('admin'), OrderController.getAllOrders);
router.put('/orders/:id/status', protect, authorize('admin'), OrderController.updateOrderStatus);
router.get('/orders/search/phone/:phone', protect, authorize('admin'), OrderController.searchOrdersByPhone);
router.get('/orders/search/email/:email', protect, authorize('admin'), OrderController.searchOrdersByEmail);

module.exports = router;