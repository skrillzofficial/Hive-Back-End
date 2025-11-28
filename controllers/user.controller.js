const User = require('../models/user');
const { sendOTPEmail, sendWelcomeEmail, sendPasswordResetOTPEmail } = require('../utils/sendEmail');

// Helper function to send OTP via email
const sendOTP = async (email, firstName, lastName, otp) => {
  try {
    await sendOTPEmail({
      firstName,
      lastName,
      email,
      otp
    });
    console.log(` OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(` Failed to send OTP email:`, error);
    return false;
  }
};

// Helper function to send password reset OTP via email
const sendPasswordResetOTP = async (email, firstName, lastName, otp) => {
  try {
    await sendPasswordResetOTPEmail({
      firstName,
      lastName,
      email,
      otp
    });
    console.log(` Password reset OTP email sent to ${email}`);
    return true;
  } catch (error) {
    console.error(` Failed to send password reset OTP email:`, error);
    return false;
  }
};


// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create user (first time - no verification required)
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      loginCount: 0,
    });

    // Send welcome email
    await sendWelcomeEmail({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    });

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
        phone: user.phone,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Increment login count
    user.loginCount = (user.loginCount || 0) + 1;
    
    // Check if this is second login and phone not verified
    if (user.loginCount >= 2 && !user.isPhoneVerified) {
      // Generate OTP
      const otp = user.generatePhoneOTP();
      await user.save();
      
      // Send OTP to user's email
      await sendOTP(user.email, user.firstName, user.lastName, otp);
      
      return res.status(200).json({
        success: true,
        requiresPhoneVerification: true,
        message: 'Please verify your account. OTP has been sent to your email.',
        userId: user._id,
      });
    }

    // First login or already verified - allow login
    await user.save();
    
    // Generate token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify phone OTP
// @route   POST /api/users/verify-phone
// @access  Public
const verifyPhoneOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID and OTP',
      });
    }

    // Get user with OTP fields
    const user = await User.findById(userId).select('+phoneOTP +phoneOTPExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify OTP
    const isValidOTP = user.verifyPhoneOTP(otp);

    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Mark phone as verified and clear OTP
    user.isPhoneVerified = true;
    user.phoneOTP = undefined;
    user.phoneOTPExpire = undefined;
    await user.save();

    // Generate token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Phone verified successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isPhoneVerified: user.isPhoneVerified,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Resend phone OTP
// @route   POST /api/users/resend-otp
// @access  Public
const resendPhoneOTP = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID',
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Generate new OTP
    const otp = user.generatePhoneOTP();
    await user.save();

    // Send OTP to user's email
    await sendOTP(user.email, user.firstName, user.lastName, otp);

    res.status(200).json({
      success: true,
      message: 'OTP has been resent to your email',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// @desc    Send password reset OTP
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address',
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, you will receive a password reset code',
      });
    }

    // Generate password reset OTP
    const otp = user.generatePasswordResetOTP();
    await user.save();

    // Send OTP to user's email
    await sendPasswordResetOTP(user.email, user.firstName, user.lastName, otp);

    res.status(200).json({
      success: true,
      message: 'Password reset OTP has been sent to your email',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify password reset OTP
// @route   POST /api/users/verify-reset-otp
// @access  Public
const verifyResetOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and OTP',
      });
    }

    // Find user and include OTP fields
    const user = await User.findOne({ email }).select('+passwordResetOTP +passwordResetOTPExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify OTP
    const isValidOTP = user.verifyPasswordResetOTP(otp);

    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
    });
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reset password with OTP
// @route   POST /api/users/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, OTP, and new password',
      });
    }

    // Find user and include OTP fields
    const user = await User.findOne({ email }).select('+passwordResetOTP +passwordResetOTPExpire');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify OTP one more time
    const isValidOTP = user.verifyPasswordResetOTP(otp);

    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Reset password
    user.password = newPassword;
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// @desc    Get current logged in user
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      address: req.body.address,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update password
// @route   PUT /api/users/password
// @access  Private
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password',
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      token,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============= ADMIN ROUTES =============

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private/Admin
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create admin user
// @route   POST /api/users/admin
// @access  Private/Admin
const createAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Create admin user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role: 'admin',
      isPhoneVerified: true, // Admins don't need phone verification
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  // Public routes
  registerUser,
  loginUser,
  verifyPhoneOTP,
  resendPhoneOTP,
  forgotPassword,
  verifyResetOTP,
  resetPassword,
  
  // Private routes (authenticated users)
  getMe,
  updateProfile,
  updatePassword,
  
  // Admin routes
  getAllUsers,
  getUser,
  createAdmin,
  updateUser,
  deleteUser,
};