const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    // Order Identification
    orderNumber: {
      type: String,
      unique: true,
      uppercase: true
    },
    
    // Customer Information
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    customerInfo: {
      firstName: {
        type: String,
        required: true
      },
      lastName: {
        type: String,
        required: true
      },
      email: {
        type: String,
        required: true,
        lowercase: true
      },
      phone: {
        type: String,
        required: true
      },
      shippingAddress: {
        street: {
          type: String,
          required: true
        },
        city: {
          type: String,
          required: true
        },
        state: {
          type: String,
          required: true
        },
        zipCode: {
          type: String,
          required: true
        },
        country: {
          type: String,
          default: 'Nigeria'
        }
      }
    },
    
    // Order Items
    items: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      name: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      price: {
        type: Number,
        required: true
      },
      size: String,
      color: String,
      image: String
    }],
    
    // Order Summary
    subtotal: {
      type: Number,
      required: true
    },
    shippingCost: {
      type: Number,
      required: true
    },
    tax: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    },
    
    // Delivery Information
    deliveryMethod: {
      type: String,
      enum: ['standard', 'express'],
      default: 'standard'
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending'
    },
    estimatedDelivery: Date,
    trackingNumber: String,
    
    // Payment Information
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    
    // Order Status
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'completed', 'cancelled'],
      default: 'pending'
    },
    
    // Guest Order Information
    isGuestOrder: {
      type: Boolean,
      default: true
    },
    accountCreated: {
      type: Boolean,
      default: false
    },
    
    // Additional Information
    notes: String,
    specialInstructions: String,
    
    // Shipping Threshold
    qualifiesForFreeShipping: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

//Generate order number BEFORE validation
orderSchema.pre('validate', async function(next) {
  if (!this.orderNumber) {
    // Generate unique order number with better format
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Get count of orders today for sequential numbering
    const todayStart = new Date(date.setHours(0, 0, 0, 0));
    const todayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    const count = await this.constructor.countDocuments({
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });
    
    const sequence = String(count + 1).padStart(4, '0');
    this.orderNumber = `ORD-${year}${month}${day}-${sequence}`;
  }
  next();
});

// Index for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'customerInfo.email': 1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

// Static Methods
orderSchema.statics.findByOrderNumber = function(orderNumber) {
  return this.findOne({ orderNumber }).populate('customer', 'firstName lastName email phone');
};

orderSchema.statics.findByCustomer = function(customerId) {
  return this.find({ customer: customerId }).sort({ createdAt: -1 });
};

orderSchema.statics.findGuestOrdersByEmail = function(email) {
  return this.find({ 
    'customerInfo.email': email.toLowerCase(),
    isGuestOrder: true 
  }).sort({ createdAt: -1 });
};

// Instance Methods
orderSchema.methods.getOrderSummary = function() {
  return {
    orderNumber: this.orderNumber,
    total: this.total,
    status: this.status,
    paymentStatus: this.paymentStatus,
    deliveryStatus: this.deliveryStatus,
    itemsCount: this.items.length,
    createdAt: this.createdAt
  };
};

orderSchema.methods.updateStock = async function() {
  try {
    for (const item of this.items) {
      const product = await mongoose.model('Product').findById(item.product);
      if (product) {
        await product.reduceStock(item.quantity);
      }
    }
    return true;
  } catch (error) {
    console.error('Error updating stock:', error);
    return false;
  }
};

module.exports = mongoose.model('Order', orderSchema);