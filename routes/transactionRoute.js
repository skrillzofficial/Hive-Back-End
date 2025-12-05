const express = require('express');
const router = express.Router();
const {
  verifyTransaction,
  handleWebhook,
  getAllTransactions,
  getCustomerTransactions,
  getRevenue
} = require('../controllers/transaction.controller');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/transactions/verify/:reference', verifyTransaction);
router.post('/transactions/webhook', handleWebhook); 

// Admin routes
router.get('/transactions', protect, authorize('admin'), getAllTransactions);
router.get('/transactions/customer/:email', protect, authorize('admin'), getCustomerTransactions);
router.get('/transactions/revenue', protect, authorize('admin'), getRevenue);

module.exports = router;