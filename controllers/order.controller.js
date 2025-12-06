const Order = require('../models/order');
const Transaction = require('../models/transaction');
const User = require('../models/user');
const Product = require('../models/product');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../utils/sendEmail');

// Helper function to send order confirmation email
const sendOrderConfirmation = async (order) => {
  try {
    await sendOrderConfirmationEmail({
      firstName: order.customerInfo.firstName,
      lastName: order.customerInfo.lastName,
      email: order.customerInfo.email,
      orderId: order.orderNumber,
      total: order.total,
      items: order.items,
      shippingAddress: order.customerInfo.shippingAddress,
      estimatedDelivery: order.estimatedDelivery
    });
    console.log(`Order confirmation email sent to ${order.customerInfo.email}`);
    return true;
  } catch (error) {
    console.error(`Failed to send order confirmation email:`, error);
    return false;
  }
};

// Helper function to send order status update email
const sendOrderStatusUpdate = async (order, status) => {
  try {
    await sendOrderStatusUpdateEmail({
      firstName: order.customerInfo.firstName,
      lastName: order.customerInfo.lastName,
      email: order.customerInfo.email,
      orderId: order.orderNumber,
      status: status,
      trackingNumber: order.trackingNumber,
      estimatedDelivery: order.estimatedDelivery
    });
    console.log(`Order status update email sent to ${order.customerInfo.email}`);
    return true;
  } catch (error) {
    console.error(`Failed to send order status update email:`, error);
    return false;
  }
};

// @desc    Initialize checkout and payment
// @route   POST /api/orders/initialize-checkout
// @access  Private (via protect middleware)
const initializeCheckout = async (req, res) => {
  try {
    const { customerInfo, orderDetails, userId, accountOptions } = req.body;

    console.log('🛒 CHECKOUT DEBUG:');
    console.log('User authenticated?', !!req.user);
    console.log('User ID from token:', req.user?.id);
    console.log('User ID from body:', userId);
    console.log('Customer email:', customerInfo?.email);

    // Validate required fields
    if (!customerInfo || !orderDetails) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Determine the final user ID
    // Priority: 1. User from authentication token (req.user) 2. User ID from body
    let finalUserId = null;
    if (req.user) {
      // User is logged in via token
      finalUserId = req.user.id;
      console.log('✅ Using user ID from authentication token:', finalUserId);
    } else if (userId) {
      // User ID provided in body (from frontend)
      finalUserId = userId;
      console.log('✅ Using user ID from request body:', finalUserId);
    }

    // If user is logged in but email doesn't match, log warning
    if (req.user && customerInfo.email.toLowerCase() !== req.user.email.toLowerCase()) {
      console.warn('⚠️  Warning: Logged-in user email does not match checkout email');
      console.warn('Logged-in email:', req.user.email);
      console.warn('Checkout email:', customerInfo.email);
    }

    // Generate unique reference for this checkout session
    const reference = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create pending transaction with checkout data in metadata
    const transaction = await Transaction.create({
      reference,
      amount: orderDetails.total,
      currency: 'NGN',
      customerEmail: customerInfo.email.toLowerCase(),
      customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
      gateway: 'paystack',
      status: 'pending',
      metadata: {
        customerInfo,
        orderDetails,
        userId: finalUserId, // ✅ Store the determined user ID
        accountOptions: accountOptions || req.body.accountOptions,
        isLoggedInUser: !!req.user
      }
    });

    console.log('✅ Transaction created with user ID:', finalUserId);

    // Initialize Paystack payment
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: customerInfo.email.toLowerCase(),
        amount: Math.round(orderDetails.total * 100), // Paystack expects kobo
        reference: transaction.reference,
        callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
        metadata: {
          transactionId: transaction._id.toString(),
          customerName: `${customerInfo.firstName} ${customerInfo.lastName}`,
          userId: finalUserId // ✅ Also send to Paystack for reference
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

    // Update transaction with Paystack reference
    transaction.gatewayReference = paystackResponse.data.data.reference;
    await transaction.save();

    console.log('✅ Checkout initialized for user:', finalUserId || 'guest');

    res.status(200).json({
      success: true,
      message: 'Checkout initialized successfully',
      data: {
        authorizationUrl: paystackResponse.data.data.authorization_url,
        accessCode: paystackResponse.data.data.access_code,
        reference: transaction.reference,
        userId: finalUserId // ✅ Return user ID for frontend confirmation
      }
    });

  } catch (error) {
    console.error('❌ Initialize checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initializing checkout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get order by order number (for order tracking)
// @route   GET /api/orders/track/:orderNumber
// @access  Public
const getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide order number',
      });
    }

    const order = await Order.findOne({
      orderNumber: orderNumber.toUpperCase()
    })
    .populate('customer', 'firstName lastName email phone')
    .populate('transaction');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Authorization check
    let isAuthorized = false;

    // 1. Admin can view any order
    if (req.user && req.user.role === 'admin') {
      isAuthorized = true;
    }
    // 2. Logged-in user owns the order
    else if (req.user && order.customer && order.customer._id.toString() === req.user.id) {
      isAuthorized = true;
    }
    // 3. Logged-in user email matches guest order
    else if (req.user && order.isGuestOrder && order.customerInfo.email.toLowerCase() === req.user.email.toLowerCase()) {
      isAuthorized = true;
    }
    // 4. Guest tracking with email verification
    else if (!req.user && email && order.customerInfo.email.toLowerCase() === email.toLowerCase()) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order. Please provide the email used for the order.',
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order by number error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
    });
  }
};

// @desc    Get user orders (authenticated users)
// @route   GET /api/orders/my-orders
// @access  Private
const getUserOrders = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Get all orders for this user (by customer ID OR matching email for guest orders)
    const orders = await Order.find({
      $or: [
        { customer: req.user.id },
        { 
          isGuestOrder: true,
          'customerInfo.email': req.user.email.toLowerCase()
        }
      ]
    })
    .sort({ createdAt: -1 })
    .populate('transaction');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
    });
  }
};

// @desc    Create account after purchase (guest to user)
// @route   POST /api/auth/create-account-post-purchase
// @access  Public
const createAccountAfterPurchase = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please login.',
      });
    }

    // Create new user
    const user = await User.create({
      firstName: firstName || '',
      lastName: lastName || '',
      email: email.toLowerCase(),
      password,
      loginCount: 0,
    });

    // Find and link guest orders to this user
    await Order.updateMany(
      { 
        'customerInfo.email': email.toLowerCase(),
        isGuestOrder: true,
        customer: null
      },
      { 
        customer: user._id,
        isGuestOrder: false,
        accountCreated: true
      }
    );

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
      }
    });

  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, deliveryStatus, trackingNumber } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide order ID',
      });
    }

    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update order status',
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Update fields if provided
    const previousStatus = order.status;
    
    if (status) {
      order.status = status;
      
      // 🔥 AUTO-UPDATE DELIVERY STATUS BASED ON ORDER STATUS
      if (status === 'confirmed') {
        order.deliveryStatus = 'processing';
      } else if (status === 'processing') {
        order.deliveryStatus = 'processing';
      } else if (status === 'completed') {
        order.deliveryStatus = 'delivered';
      } else if (status === 'cancelled') {
        order.deliveryStatus = 'cancelled';
      }
    }
    
    if (deliveryStatus) order.deliveryStatus = deliveryStatus;
    if (trackingNumber) order.trackingNumber = trackingNumber;

    await order.save();

    // Send status update email if status changed
    if (status && status !== previousStatus) {
      await sendOrderStatusUpdate(order, status);
    }

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order',
    });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view all orders',
      });
    }

    const { 
      status, 
      page = 1, 
      limit = 20, 
      search, 
      startDate, 
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const query = {};
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Search by order number or customer email
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'customerInfo.email': { $regex: search, $options: 'i' } },
        { 'customerInfo.firstName': { $regex: search, $options: 'i' } },
        { 'customerInfo.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Determine sort order
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortOptions = { [sortBy]: sortDirection };

    console.log('🔍 ADMIN ORDERS DEBUG:');
    console.log('Query:', query);
    console.log('Sort options:', sortOptions);
    console.log('Skip:', skip, 'Limit:', limit);

    // Fetch orders with population that handles null customers
    const orders = await Order.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit))
      .populate({
        path: 'customer',
        select: 'firstName lastName email phone',
        // Handle null customer references gracefully
        options: { 
          allowNull: true,
          default: null 
        }
      })
      .populate({
        path: 'transaction',
        select: 'reference amount status gatewayReference paidAt'
      });

    // Get total count for pagination
    const total = await Order.countDocuments(query);

    console.log(`✅ Found ${orders.length} orders out of ${total} total`);

    // Format orders for response
    const formattedOrders = orders.map(order => {
      // Safely get customer name
      let customerName = 'Guest Customer';
      let customerEmail = order.customerInfo?.email || 'N/A';
      
      if (order.customer) {
        customerName = `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim();
        customerEmail = order.customer.email || customerEmail;
      } else if (order.customerInfo) {
        customerName = `${order.customerInfo.firstName || ''} ${order.customerInfo.lastName || ''}`.trim();
      }

      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        customerId: order.customer?._id || null,
        customerName,
        customerEmail,
        customerPhone: order.customerInfo?.phone || 'N/A',
        itemsCount: order.items?.length || 0,
        items: order.items?.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })) || [],
        subtotal: order.subtotal || 0,
        shippingCost: order.shippingCost || 0,
        tax: order.tax || 0,
        total: order.total || 0,
        status: order.status || 'pending',
        paymentStatus: order.paymentStatus || 'pending',
        deliveryStatus: order.deliveryStatus || 'pending',
        deliveryMethod: order.deliveryMethod || 'standard',
        isGuestOrder: order.isGuestOrder || true,
        accountCreated: order.accountCreated || false,
        qualifiesForFreeShipping: order.qualifiesForFreeShipping || false,
        trackingNumber: order.trackingNumber || null,
        notes: order.notes || '',
        transaction: order.transaction ? {
          reference: order.transaction.reference,
          amount: order.transaction.amount,
          status: order.transaction.status,
          gatewayReference: order.transaction.gatewayReference,
          paidAt: order.transaction.paidAt
        } : null,
        shippingAddress: order.customerInfo?.shippingAddress || {},
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        // Include raw data for debugging if needed
        _rawCustomer: order.customer,
        _rawCustomerInfo: order.customerInfo
      };
    });

    // Get statistics for dashboard
    const stats = await Order.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$total' }
        }
      }
    ]);

    // Calculate summary statistics
    const summary = {
      totalOrders: total,
      totalRevenue: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      processingOrders: 0,
      shippedOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0
    };

    stats.forEach(stat => {
      summary.totalRevenue += stat.totalRevenue || 0;
      switch (stat._id) {
        case 'pending':
          summary.pendingOrders = stat.count;
          break;
        case 'confirmed':
          summary.confirmedOrders = stat.count;
          break;
        case 'processing':
          summary.processingOrders = stat.count;
          break;
        case 'shipped':
          summary.shippedOrders = stat.count;
          break;
        case 'delivered':
          summary.deliveredOrders = stat.count;
          break;
        case 'cancelled':
          summary.cancelledOrders = stat.count;
          break;
      }
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      perPage: parseInt(limit),
      summary,
      data: formattedOrders,
      filters: {
        status: status || 'all',
        search: search || '',
        startDate: startDate || '',
        endDate: endDate || '',
        sortBy,
        sortOrder
      }
    });

  } catch (error) {
    console.error('❌ Get all orders error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Error fetching orders';
    let statusCode = 500;
    
    if (error.name === 'CastError') {
      errorMessage = 'Invalid query parameters';
      statusCode = 400;
    } else if (error.name === 'ValidationError') {
      errorMessage = 'Validation error in query';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : undefined
    });
  }
};

// @desc    Search orders by email (Admin only)
// @route   GET /api/orders/customer/:email
// @access  Private/Admin
const searchOrdersByEmail = async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to search orders',
      });
    }

    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address',
      });
    }

    // Search for orders with matching email
    const orders = await Order.find({
      'customerInfo.email': email.toLowerCase()
    })
    .sort({ createdAt: -1 })
    .populate('customer', 'firstName lastName email')
    .populate('transaction');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {
    console.error('Search orders by email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching orders',
    });
  }
};

module.exports = {
  // Public routes
  initializeCheckout,
  createAccountAfterPurchase,
  getOrderByNumber, 
  
  // Private routes (authenticated users)
  getUserOrders,
  
  // Admin routes
  updateOrderStatus,
  getAllOrders,
  searchOrdersByEmail, 
};