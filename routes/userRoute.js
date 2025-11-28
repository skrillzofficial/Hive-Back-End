const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyPhoneOTP,
  resendPhoneOTP,
  forgotPassword,        
  verifyResetOTP,        
  resetPassword,         
  getMe,
  updateProfile,
  updatePassword,
  getAllUsers,
  getUser,
  createAdmin,
  updateUser,
  deleteUser,
} = require('../controllers/user.controller');

const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-email', verifyPhoneOTP);
router.post('/resend-otp', resendPhoneOTP);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-otp', verifyResetOTP);
router.post('/reset-password', resetPassword);

// Private routes (authenticated users)
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, updatePassword);

// Admin routes
router.get('/', protect, authorize('admin'), getAllUsers);
router.post('/admin', protect, authorize('admin'), createAdmin);
router.get('/:id', protect, authorize('admin'), getUser);
router.patch('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;