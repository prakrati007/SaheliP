const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateSignup, validateLogin, validateOtp } = require('../middleware/validation');
const { isGuest, isAuthenticated } = require('../middleware/auth');

// GET routes - Render pages
router.get('/signup', isGuest, authController.renderSignupChoice);
router.get('/signup/saheli', isGuest, authController.renderSignupSaheli);
router.get('/signup/customer', isGuest, authController.renderSignupCustomer);
router.get('/login', isGuest, authController.renderLogin);
router.get('/verify-otp', authController.renderVerifyOtp);
router.get('/forgot-password', isGuest, authController.renderForgotPassword);
router.get('/reset-password', isGuest, authController.renderResetPassword);

// POST routes - Handle form submissions
router.post('/signup/saheli', isGuest, validateSignup, authController.signupSaheli);
router.post('/signup/customer', isGuest, validateSignup, authController.signupCustomer);
router.post('/verify-otp', validateOtp, authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
router.post('/login/password', isGuest, validateLogin, authController.loginPassword);
router.post('/login/otp', isGuest, authController.loginOtp);
router.post('/verify-login-otp', validateOtp, authController.verifyLoginOtp);
router.post('/forgot-password', isGuest, authController.forgotPassword);
router.post('/reset-password', isGuest, authController.resetPassword);
router.post('/logout', isAuthenticated, authController.logout);

module.exports = router;
