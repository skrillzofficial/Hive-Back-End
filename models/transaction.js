const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    // Transaction Identification
    reference: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },

    // Order Reference
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },

    // Payment Details
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "NGN",
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer", "paystack", "pay_on_delivery"],
      default: "card",
    },

    // Payment Gateway Details
    gateway: {
      type: String,
      enum: ["paystack", "stripe", "flutterwave", "manual"],
      default: "paystack",
    },
    gatewayReference: String,
    gatewayResponse: Object,

    // Status
    status: {
      type: String,
      enum: ["pending", "success", "failed", "abandoned"],
      default: "pending",
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Customer Information
    customerEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    customerName: String,

    // Timestamps
    paidAt: Date,
    processedAt: Date,
  },
  {
    timestamps: true,
  }
);

// ✅ REMOVED PRE-SAVE HOOK - You're generating reference in controller anyway

// Static Methods
transactionSchema.statics.findByReference = function (reference) {
  return this.findOne({ reference }).populate("order");
};

transactionSchema.statics.findByOrder = function (orderId) {
  return this.find({ order: orderId }).sort({ createdAt: -1 });
};

transactionSchema.statics.findByCustomer = function (email) {
  return this.find({ customerEmail: email.toLowerCase() }).sort({
    createdAt: -1,
  });
};

// Instance Methods
transactionSchema.methods.updateStatus = async function (
  newStatus,
  gatewayData = {}
) {
  this.status = newStatus;

  if (newStatus === "success") {
    this.paidAt = new Date();
    this.gatewayResponse = gatewayData;

    if (this.order) {
      const Order = mongoose.model("Order");
      await Order.findByIdAndUpdate(this.order, {
        paymentStatus: "paid",
        status: "confirmed",
      });
    }
  } else if (newStatus === "failed") {
    this.gatewayResponse = gatewayData;

    if (this.order) {
      const Order = mongoose.model("Order");
      await Order.findByIdAndUpdate(this.order, {
        paymentStatus: "failed",
      });
    }
  }

  return this.save();
};

transactionSchema.methods.getPaymentDetails = function () {
  return {
    reference: this.reference,
    amount: this.amount,
    currency: this.currency,
    status: this.status,
    paymentMethod: this.paymentMethod,
    gateway: this.gateway,
    createdAt: this.createdAt,
    paidAt: this.paidAt,
  };
};

module.exports = mongoose.model("Transaction", transactionSchema);