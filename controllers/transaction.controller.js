const Transaction = require('../models/transaction');
const Order = require('../models/order');
const axios = require('axios');
const crypto = require('crypto');

// @desc    Initialize payment transaction
// @route   POST /api/transactions/initialize
// @access  Public
const initializeTransaction = async (req, res) => {
  try {
    const { orderId, email, amount } = req.body;

    if (!orderId || !email || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Please provide order ID, email, and amount',
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Check if transaction already exists
    const existingTransaction = await Transaction.findOne({ order: orderId });
    if (existingTransaction && existingTransaction.status === 'success') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this order',
      });
    }

    let transaction;
    if (existingTransaction) {
      transaction = existingTransaction;
    } else {
      transaction = await Transaction.create({
        order: orderId,
        amount,
        currency: 'NGN',
        customerEmail: email.toLowerCase(),
        customerName: `${order.customerInfo.firstName} ${order.customerInfo.lastName}`,
        gateway: 'paystack',
        status: 'pending'
      });
    }

    // Initialize Paystack payment
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: email.toLowerCase(),
        amount: Math.round(amount * 100),
        reference: transaction.reference,
        callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!paystackResponse.data.status) {
      return res.status(400).json({
        success: false,
        message: 'Failed to initialize payment',
      });
    }

    transaction.gatewayReference = paystackResponse.data.data.reference;
    await transaction.save();

    res.status(200).json({
      success: true,
      message: 'Payment initialized successfully',
      data: {
        authorizationUrl: paystackResponse.data.data.authorization_url,
        accessCode: paystackResponse.data.data.access_code,
        reference: transaction.reference
      }
    });

  } catch (error) {
    console.error('Initialize transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify payment transaction
// @route   GET /api/transactions/verify/:reference
// @access  Public
const verifyTransaction = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Please provide transaction reference',
      });
    }

    const transaction = await Transaction.findOne({ reference })
      .populate('order');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    if (transaction.status === 'success') {
      return res.status(200).json({
        success: true,
        message: 'Payment already verified',
        data: {
          transaction: transaction.getPaymentDetails(),
          order: {
            id: transaction.order._id,
            orderNumber: transaction.order.orderNumber,
            status: transaction.order.status
          }
        }
      });
    }

    // Verify with Paystack
    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const paymentData = paystackResponse.data.data;

    if (paymentData.status === 'success') {
      await transaction.updateStatus('success', paymentData);
      await transaction.order.updateStock();

      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          transaction: transaction.getPaymentDetails(),
          order: {
            id: transaction.order._id,
            orderNumber: transaction.order.orderNumber,
            status: transaction.order.status
          }
        }
      });
    } else {
      await transaction.updateStatus('failed', paymentData);

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        data: {
          status: paymentData.status,
          reference: transaction.reference
        }
      });
    }

  } catch (error) {
    console.error('Verify transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Handle Paystack webhook
// @route   POST /api/transactions/webhook
// @access  Public (Paystack only)
const handleWebhook = async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const transaction = await Transaction.findOne({ reference })
        .populate('order');
      
      if (transaction && transaction.status !== 'success') {
        await transaction.updateStatus('success', event.data);
        if (transaction.order) {
          await transaction.order.updateStock();
        }
      }
    }

    res.sendStatus(200);

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Webhook processing error');
  }
};

// @desc    Get all transactions with order details (Admin)
// @route   GET /api/transactions
// @access  Private/Admin
const getAllTransactions = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: 'order',
        select: 'orderNumber customerInfo.firstName customerInfo.lastName customerInfo.email total status createdAt'
      });

    const total = await Transaction.countDocuments(query);

    // Format response for table display
    const formattedData = transactions.map(t => ({
      transactionId: t._id,
      reference: t.reference,
      orderId: t.order?._id,
      orderNumber: t.order?.orderNumber,
      customer: t.order ? `${t.order.customerInfo.firstName} ${t.order.customerInfo.lastName}` : t.customerName,
      email: t.customerEmail,
      date: t.createdAt,
      amount: t.amount,
      status: t.status,
      paidAt: t.paidAt
    }));

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: formattedData
    });

  } catch (error) {
    console.error('Get all transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
    });
  }
};

// @desc    Get customer transaction history by email (Admin)
// @route   GET /api/transactions/customer/:email
// @access  Private/Admin
const getCustomerTransactions = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide customer email',
      });
    }

    const transactions = await Transaction.find({
      customerEmail: email.toLowerCase()
    })
    .sort({ createdAt: -1 })
    .populate({
      path: 'order',
      select: 'orderNumber customerInfo total status createdAt items'
    });

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No transactions found for this customer',
      });
    }

    // Calculate customer summary
    let totalSpent = 0;
    let successfulCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    transactions.forEach(t => {
      if (t.status === 'success') {
        totalSpent += t.amount;
        successfulCount++;
      } else if (t.status === 'failed') {
        failedCount++;
      } else if (t.status === 'pending') {
        pendingCount++;
      }
    });

    // Format transactions for display
    const formattedData = transactions.map(t => ({
      transactionId: t._id,
      reference: t.reference,
      orderId: t.order?._id,
      orderNumber: t.order?.orderNumber,
      date: t.createdAt,
      amount: t.amount,
      status: t.status,
      paidAt: t.paidAt
    }));

    res.status(200).json({
      success: true,
      customer: {
        email: email.toLowerCase(),
        name: transactions[0]?.customerName || 'N/A',
        totalSpent,
        totalTransactions: transactions.length,
        successfulTransactions: successfulCount,
        failedTransactions: failedCount,
        pendingTransactions: pendingCount
      },
      data: formattedData
    });

  } catch (error) {
    console.error('Get customer transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer transactions',
    });
  }
};

// @desc    Get total revenue and statistics (Admin)
// @route   GET /api/transactions/revenue
// @access  Private/Admin
const getRevenue = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    const { startDate, endDate } = req.query;
    const dateFilter = {};

    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    const matchStage = Object.keys(dateFilter).length > 0 
      ? { createdAt: dateFilter } 
      : {};

    const stats = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const summary = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      totalRevenue: 0,
      successfulRevenue: 0
    };

    stats.forEach(stat => {
      summary.totalTransactions += stat.count;
      if (stat._id === 'success') {
        summary.successfulTransactions = stat.count;
        summary.successfulRevenue = stat.totalAmount;
        summary.totalRevenue = stat.totalAmount;
      } else if (stat._id === 'failed') {
        summary.failedTransactions = stat.count;
      } else if (stat._id === 'pending') {
        summary.pendingTransactions = stat.count;
      }
    });

    res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Get revenue error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue',
    });
  }
};

module.exports = {
  // Public routes
  initializeTransaction,
  verifyTransaction,
  handleWebhook,
  
  // Admin routes
  getAllTransactions,
  getCustomerTransactions,
  getRevenue,
};