const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Please add a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please add a password"],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    phone: {
      type: String,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Phone verification fields
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    phoneOTP: {
      type: String,
      select: false,
    },
    phoneOTPExpire: {
      type: Date,
      select: false,
    },
    // Password reset OTP fields
    passwordResetOTP: {
      type: String,
      select: false,
    },
    passwordResetOTPExpire: {
      type: Date,
      select: false,
    },
    // Legacy password reset fields (keep for backward compatibility if needed)
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
userSchema.pre("save", async function () {
  // Skip if password is not modified
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "30d",
  });
};

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash phone OTP
userSchema.methods.generatePhoneOTP = function () {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash OTP and set to phoneOTP field
  this.phoneOTP = crypto.createHash('sha256').update(otp).digest('hex');
  
  // Set expire time (10 minutes)
  this.phoneOTPExpire = Date.now() + 10 * 60 * 1000;
  
  return otp;
};

// Verify phone OTP
userSchema.methods.verifyPhoneOTP = function (enteredOTP) {
  // Hash the entered OTP
  const hashedOTP = crypto.createHash('sha256').update(enteredOTP).digest('hex');
  
  // Check if OTP matches and is not expired
  if (this.phoneOTP === hashedOTP && this.phoneOTPExpire > Date.now()) {
    return true;
  }
  
  return false;
};

// Generate and hash password reset OTP
userSchema.methods.generatePasswordResetOTP = function () {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash OTP and set to passwordResetOTP field
  this.passwordResetOTP = crypto.createHash('sha256').update(otp).digest('hex');
  
  // Set expire time (10 minutes)
  this.passwordResetOTPExpire = Date.now() + 10 * 60 * 1000;
  
  return otp;
};

// Verify password reset OTP
userSchema.methods.verifyPasswordResetOTP = function (enteredOTP) {
  // Check if OTP exists and hasn't expired
  if (!this.passwordResetOTP || !this.passwordResetOTPExpire) {
    return false;
  }
  
  if (Date.now() > this.passwordResetOTPExpire) {
    return false;
  }
  
  // Hash the entered OTP
  const hashedOTP = crypto.createHash('sha256').update(enteredOTP).digest('hex');
  
  // Check if OTP matches
  return this.passwordResetOTP === hashedOTP;
};

module.exports = mongoose.model("User", userSchema);