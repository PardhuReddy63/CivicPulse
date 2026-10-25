const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const {
  registerValidation,
  loginValidation,
  verifyOtpValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  officerActivationValidation,
} = require('../validators/authValidator');

router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/verify-otp', otpLimiter, verifyOtpValidation, authController.verifyOtp);
router.post('/resend-otp', otpLimiter, authController.resendOtp);
router.post('/login', authLimiter, loginValidation, authController.login);
router.post(
  '/officer/activate',
  authLimiter,
  officerActivationValidation,
  authController.activateOfficer
);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authLimiter, forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordValidation, authController.resetPassword);
router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authLimiter, authenticate, changePasswordValidation, authController.changePassword);

module.exports = router;
