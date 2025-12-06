const Transaction = require("../models/transaction");
const Order = require("../models/order");
const User = require('../models/user'); 
const Product = require('../models/product');
const axios = require("axios");
const crypto = require("crypto");
const { sendOrderConfirmationEmail } = require('../utils/sendEmail');

// @desc    Verify payment transaction
// @route   GET /api/transactions/verify/:reference
// @access  Public
const verifyTransaction = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: "Please provide transaction reference",
      });
    }

    const transaction = await Transaction.findOne({ reference }).populate(
      "order"
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    // If already successful, just return the data
    if (transaction.status === "success") {
      return res.status(200).json({
        success: true,
        message: "Payment already verified",
        data: {
          transaction: transaction.getPaymentDetails(),
          order: transaction.order
            ? {
                id: transaction.order._id,
                orderNumber: transaction.order.orderNumber,
                status: transaction.order.status,
              }
            : null,
        },
      });
    }

    // Verify with Paystack
    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const paymentData = paystackResponse.data.data;

    if (paymentData.status === "success") {
      // Update transaction status
      await transaction.updateStatus("success", paymentData);

      // IMPORTANT: Check if order already exists, if not create it
      if (!transaction.order) {
        const { customerInfo, orderDetails, userId, accountOptions } =
          transaction.metadata;

        console.log('🔍 VERIFICATION DEBUG:');
        console.log('User ID from metadata:', userId);
        console.log('Customer email:', customerInfo.email);
        console.log('Account options:', accountOptions);

        // Handle user lookup - IMPROVED LOGIC
        let user = null;
        
        // 1. First, try to find user by ID (if logged-in user)
        if (userId) {
          user = await User.findById(userId);
          console.log('✅ Found user by ID:', user?.email);
        }
        
        // 2. If no user found by ID, try by email
        if (!user) {
          user = await User.findOne({
            email: customerInfo.email.toLowerCase(),
          });
          console.log('✅ Found user by email:', user?.email);
        }
        
        // 3. If still no user and account creation requested, create new user
        if (!user && accountOptions?.createAccount && accountOptions?.password) {
          const existingUser = await User.findOne({
            email: customerInfo.email.toLowerCase(),
          });

          if (!existingUser) {
            user = await User.create({
              firstName: customerInfo.firstName,
              lastName: customerInfo.lastName,
              email: customerInfo.email.toLowerCase(),
              password: accountOptions.password,
              phone: customerInfo.phone,
              address: customerInfo.shippingAddress?.street || customerInfo.shippingAddress || '',
            });
            console.log('✅ Created new user:', user.email);
          } else {
            user = existingUser;
            console.log('✅ User already exists:', user.email);
          }
        }

        // Create the order with proper user reference
        const order = await Order.create({
          customer: user ? user._id : null,
          customerInfo: {
            firstName: customerInfo.firstName,
            lastName: customerInfo.lastName,
            email: customerInfo.email.toLowerCase(),
            phone: customerInfo.phone,
            shippingAddress: customerInfo.shippingAddress,
          },
          items: orderDetails.items,
          subtotal: orderDetails.subtotal,
          shippingCost: orderDetails.shippingCost,
          tax: orderDetails.vat || orderDetails.tax || 0,
          total: orderDetails.total,
          deliveryMethod: orderDetails.deliveryMethod || "standard",
          isGuestOrder: !user, // Should be false if user exists
          accountCreated: !!user && !userId, // True only if account was just created (not logged in)
          qualifiesForFreeShipping:
            orderDetails.qualifiesForFreeShipping || false,
          notes: orderDetails.notes || "",
          paymentStatus: "paid",
          status: "confirmed",
          transaction: transaction._id,
        });

        console.log('✅ Order created in verification endpoint:', order.orderNumber);
        console.log('👤 Customer field:', order.customer);
        console.log('👥 Is guest order?', order.isGuestOrder);
        console.log('📧 Customer email:', order.customerInfo.email);

        // Link transaction to order
        transaction.order = order._id;
        await transaction.save();

        // Update stock
        for (const item of orderDetails.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity },
          });
        }

        // Send confirmation email
        await sendOrderConfirmationEmail({
          firstName: order.customerInfo.firstName,
          lastName: order.customerInfo.lastName,
          email: order.customerInfo.email,
          orderId: order.orderNumber,
          orderDate: order.createdAt,
          items: order.items,
          subtotal: order.subtotal,
          shipping: order.shippingCost,
          total: order.total,
          shippingAddress: order.customerInfo.shippingAddress,
          trackingUrl: `${process.env.FRONTEND_URL}/orders/track/${order.orderNumber}`
        });

        console.log("✅ Order confirmation email sent");
      }

      // Refresh transaction with populated order
      const updatedTransaction = await Transaction.findById(
        transaction._id
      ).populate("order");

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        data: {
          transaction: updatedTransaction.getPaymentDetails(),
          order: {
            id: updatedTransaction.order._id,
            orderNumber: updatedTransaction.order.orderNumber,
            status: updatedTransaction.order.status,
          },
        },
      });
    } else {
      await transaction.updateStatus("failed", paymentData);

      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
        data: {
          status: paymentData.status,
          reference: transaction.reference,
        },
      });
    }
  } catch (error) {
    console.error("❌ Verify transaction error:", error);
    res.status(500).json({
      success: false,
      message: "Error verifying payment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
      .createHmac("sha512", secret)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.status(400).send("Invalid signature");
    }

    const event = req.body;

    if (event.event === "charge.success") {
      const reference = event.data.reference;

      const transaction = await Transaction.findOne({ reference });

      if (!transaction) {
        console.error("Transaction not found:", reference);
        return res.sendStatus(404);
      }

      if (transaction.status === "success") {
        console.log("Payment already processed:", reference);
        return res.sendStatus(200);
      }

      // ✅ NOW CREATE THE ORDER (after payment success)
      const { customerInfo, orderDetails, userId, accountOptions } =
        transaction.metadata;

      // Handle user lookup - FIXED LOGIC
      let user = null;
      
      // 1. First, try to find user by ID (if logged-in user)
      if (userId) {
        user = await User.findById(userId);
        console.log('✅ Found user by ID:', user?.email);
      }
      
      // 2. If no user found by ID, try by email
      if (!user) {
        user = await User.findOne({
          email: customerInfo.email.toLowerCase(),
        });
        console.log('✅ Found user by email:', user?.email);
      }
      
      // 3. If still no user and account creation requested, create new user
      if (!user && accountOptions?.createAccount && accountOptions?.password) {
        const existingUser = await User.findOne({
          email: customerInfo.email.toLowerCase(),
        });

        if (!existingUser) {
          user = await User.create({
            firstName: customerInfo.firstName,
            lastName: customerInfo.lastName,
            email: customerInfo.email.toLowerCase(),
            password: accountOptions.password,
            phone: customerInfo.phone,
            address: customerInfo.shippingAddress,
          });
          console.log('✅ Created new user:', user.email);
        } else {
          user = existingUser;
          console.log('✅ User already exists:', user.email);
        }
      }

      // Create the order with proper user reference
      const order = await Order.create({
        customer: user ? user._id : null,
        customerInfo: {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: customerInfo.email.toLowerCase(),
          phone: customerInfo.phone,
          shippingAddress: customerInfo.shippingAddress,
        },
        items: orderDetails.items,
        subtotal: orderDetails.subtotal,
        shippingCost: orderDetails.shippingCost,
        tax: orderDetails.vat || orderDetails.tax || 0,
        total: orderDetails.total,
        deliveryMethod: orderDetails.deliveryMethod || "standard",
        isGuestOrder: !user, // Should be false if user exists
        accountCreated: !!user && !userId, // True only if account was just created (not logged in)
        qualifiesForFreeShipping:
          orderDetails.qualifiesForFreeShipping || false,
        notes: orderDetails.notes || "",
        paymentStatus: "paid",
        status: "confirmed",
        transaction: transaction._id,
      });


      // Update transaction with order reference
      transaction.order = order._id;
      await transaction.updateStatus("success", event.data);

      // Update stock
      for (const item of orderDetails.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }

      // Send confirmation email
      await sendOrderConfirmationEmail({
        firstName: order.customerInfo.firstName,
        lastName: order.customerInfo.lastName,
        email: order.customerInfo.email,
        orderId: order.orderNumber,
        orderDate: order.createdAt,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shippingCost,
        total: order.total,
        shippingAddress: order.customerInfo.shippingAddress,
        trackingUrl: `${process.env.FRONTEND_URL}/orders/track/${order.orderNumber}`
      });

      console.log("✅ Order created successfully:", order.orderNumber);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).send("Webhook processing error");
  }
};

// @desc    Get all transactions with order details (Admin)
// @route   GET /api/transactions
// @access  Private/Admin
const getAllTransactions = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
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
        path: "order",
        select:
          "orderNumber customerInfo.firstName customerInfo.lastName customerInfo.email total status createdAt",
      });

    const total = await Transaction.countDocuments(query);

    // Format response for table display
    const formattedData = transactions.map((t) => ({
      transactionId: t._id,
      reference: t.reference,
      orderId: t.order?._id,
      orderNumber: t.order?.orderNumber,
      customer: t.order
        ? `${t.order.customerInfo.firstName} ${t.order.customerInfo.lastName}`
        : t.customerName,
      email: t.customerEmail,
      date: t.createdAt,
      amount: t.amount,
      status: t.status,
      paidAt: t.paidAt,
    }));

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: formattedData,
    });
  } catch (error) {
    console.error("Get all transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching transactions",
    });
  }
};

// @desc    Get customer transaction history by email (Admin)
// @route   GET /api/transactions/customer/:email
// @access  Private/Admin
const getCustomerTransactions = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide customer email",
      });
    }

    const transactions = await Transaction.find({
      customerEmail: email.toLowerCase(),
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "order",
        select: "orderNumber customerInfo total status createdAt items",
      });

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No transactions found for this customer",
      });
    }

    // Calculate customer summary
    let totalSpent = 0;
    let successfulCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    transactions.forEach((t) => {
      if (t.status === "success") {
        totalSpent += t.amount;
        successfulCount++;
      } else if (t.status === "failed") {
        failedCount++;
      } else if (t.status === "pending") {
        pendingCount++;
      }
    });

    // Format transactions for display
    const formattedData = transactions.map((t) => ({
      transactionId: t._id,
      reference: t.reference,
      orderId: t.order?._id,
      orderNumber: t.order?.orderNumber,
      date: t.createdAt,
      amount: t.amount,
      status: t.status,
      paidAt: t.paidAt,
    }));

    res.status(200).json({
      success: true,
      customer: {
        email: email.toLowerCase(),
        name: transactions[0]?.customerName || "N/A",
        totalSpent,
        totalTransactions: transactions.length,
        successfulTransactions: successfulCount,
        failedTransactions: failedCount,
        pendingTransactions: pendingCount,
      },
      data: formattedData,
    });
  } catch (error) {
    console.error("Get customer transactions error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching customer transactions",
    });
  }
};

// @desc    Get total revenue and statistics (Admin)
// @route   GET /api/transactions/revenue
// @access  Private/Admin
const getRevenue = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
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

    const matchStage =
      Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

    const stats = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const summary = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      totalRevenue: 0,
      successfulRevenue: 0,
    };

    stats.forEach((stat) => {
      summary.totalTransactions += stat.count;
      if (stat._id === "success") {
        summary.successfulTransactions = stat.count;
        summary.successfulRevenue = stat.totalAmount;
        summary.totalRevenue = stat.totalAmount;
      } else if (stat._id === "failed") {
        summary.failedTransactions = stat.count;
      } else if (stat._id === "pending") {
        summary.pendingTransactions = stat.count;
      }
    });

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Get revenue error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching revenue",
    });
  }
};

module.exports = {
  // Public routes
  verifyTransaction,
  handleWebhook,

  // Admin routes
  getAllTransactions,
  getCustomerTransactions,
  getRevenue,
};