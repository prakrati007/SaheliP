/**
 * Booking Routes
 * Handles all booking-related endpoints
 */

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { isAuthenticated, requireRole, ensureBookingProvider } = require('../middleware/auth');
const { validateBookingCreate } = require('../middleware/validation');

// Provider bookings list (saheli only) - MUST come before /:id routes
router.get('/provider/list', isAuthenticated, requireRole('saheli'), bookingController.getProviderBookings);

// Check slot availability for a service - specific route before /:id
router.get('/availability/:serviceId', bookingController.checkAvailability);

// Verify payment after checkout (customer only)
router.post('/payment/verify', isAuthenticated, requireRole('customer'), bookingController.verifyPayment);

// Remaining payment verification (customer only)
router.post('/payment/remaining/verify', isAuthenticated, requireRole('customer'), bookingController.verifyRemainingPayment);

// Create booking (customer only)
router.post('/', isAuthenticated, requireRole('customer'), validateBookingCreate, bookingController.createBooking);

// Process advance payment (customer only - LEGACY)
router.post('/:id/payment/advance', isAuthenticated, requireRole('customer'), bookingController.processAdvancePayment);

// Complete remaining payment (customer only - LEGACY)
router.post('/:id/payment/complete', isAuthenticated, requireRole('customer'), bookingController.completePayment);

// Process refund (saheli/provider only)
router.post('/:id/payment/refund', isAuthenticated, requireRole('saheli'), bookingController.processRefund);

// Remaining payment order creation (customer)
router.post('/:id/remaining/order', isAuthenticated, requireRole('customer'), bookingController.createRemainingPaymentOrder);

// Provider actions (saheli role)
router.post('/:id/start', isAuthenticated, requireRole('saheli'), ensureBookingProvider, bookingController.startBooking);
router.post('/:id/complete', isAuthenticated, requireRole('saheli'), ensureBookingProvider, bookingController.completeBooking);
router.post('/:id/provider-cancel', isAuthenticated, requireRole('saheli'), ensureBookingProvider, bookingController.cancelByProvider);

// Cancel booking (customer only)
router.post('/:id/cancel', isAuthenticated, requireRole('customer'), bookingController.cancelBooking);

// Booking confirmation page (customer only)
router.get('/:id/confirmation', isAuthenticated, requireRole('customer'), bookingController.getBookingConfirmation);

// Remaining payment page (customer only)
router.get('/:id/remaining-payment', isAuthenticated, requireRole('customer'), bookingController.getRemainingPaymentPage);

// Get booking details (customer or provider) - must be last among GET /:id routes
router.get('/:id', isAuthenticated, bookingController.getBookingDetails);

// Webhook endpoint (public, no authentication)
router.post('/webhook/razorpay', bookingController.handleWebhook);

module.exports = router;
