/**
 * Booking Controller
 * Handles booking creation, payment verification, cancellation, and related operations
 */

const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  convertToSubunits,
  createRefund
} = require('../utils/razorpay');
const {
  sendBookingConfirmationEmail,
  sendBookingStartNotification,
  sendBookingCompleteNotification,
  sendBookingCancellationEmail,
  sendBookingReminderEmail,
  sendRemainingPaymentPrompt
} = require('../utils/emailService');
const {
  calculateBookingPrice,
  validateBookingSlot,
  addMinutes,
  calculateRefundAmount,
  combineDateTime
} = require('../utils/helpers');

/**
 * Create a new booking
 * POST /booking
 */
exports.createBooking = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { serviceId, date, startTime, endTime, address, notes, selectedPackageIndex } = req.body;

    // Validate user role
    const user = await User.findById(userId);
    if (!user || user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Only customers can create bookings'
      });
    }

    // Fetch service with provider details
    const service = await Service.findById(serviceId).populate('providerId', 'name email city');
    if (!service || !service.isActive || service.isPaused) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or not available'
      });
    }

    // Validate booking slot
    const validation = validateBookingSlot(service, date, startTime, endTime);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.error
      });
    }

    // Check slot availability (no overlapping bookings)
    const isAvailable = await Booking.checkSlotAvailability(serviceId, date, startTime, endTime);
    if (!isAvailable) {
      return res.status(409).json({
        success: false,
        message: 'This time slot is no longer available'
      });
    }

    // Get selected package if pricing type is Package
    let selectedPackage = null;
    if (service.pricingType === 'Package') {
      if (selectedPackageIndex === undefined || !service.packages[selectedPackageIndex]) {
        return res.status(400).json({
          success: false,
          message: 'Please select a valid package'
        });
      }
      selectedPackage = service.packages[selectedPackageIndex];
    }

    // Validate address for onsite/hybrid services
    if ((service.mode === 'Onsite' || service.mode === 'Hybrid') && !address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required for onsite services'
      });
    }

    // Calculate pricing
    const pricing = calculateBookingPrice(service, date, startTime, endTime, selectedPackage);

    // Create booking document
    const bookingData = {
      serviceId: service._id,
      providerId: service.providerId._id,
      customerId: userId,
      date: new Date(date),
      startTime,
      endTime,
      serviceType: service.serviceType || service.mode || 'Online',
      address: address || '',
      notes: notes || '',
      pricingType: service.pricingType,
      selectedPackage,
      ...pricing,
      status: 'Pending',
      paymentStatus: 'Pending',
      expiresAt: addMinutes(new Date(), 15)
    };

    // Create booking using atomic operation
    const booking = await Booking.reserveSlot(bookingData);

    // Create Razorpay order for advance payment
    const razorpayOrder = await createOrder({
      amount: pricing.advancePaid,
      currency: 'INR',
      receipt: `adv_${booking._id}`,
      notes: {
        bookingId: booking._id.toString(),
        serviceTitle: service.title,
        customerName: user.name
      }
    });

    // Update booking with Razorpay order ID
    booking.razorpayOrderId = razorpayOrder.id;
    await booking.save();

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: booking._id,
        serviceTitle: service.title,
        providerName: service.providerId.name,
        date: booking.date,
        startTime: booking.startTime,
        endTime: booking.endTime,
        totalAmount: booking.totalAmount,
        advancePaid: booking.advancePaid,
        expiresAt: booking.expiresAt
      },
      razorpayOrder: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      },
      razorpayKeyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create booking'
    });
  }
};

/**
 * Verify payment after Razorpay checkout
 * POST /booking/payment/verify
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;

    // Find booking
    const booking = await Booking.findOne({
      _id: bookingId,
      razorpayOrderId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: 'Booking is not in pending state'
      });
    }

    // Check if booking has expired
    if (booking.isExpired) {
      return res.status(400).json({
        success: false,
        message: 'Payment window has expired. This booking has been cancelled.'
      });
    }

    // Verify payment signature
    const isValid = verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.'
      });
    }

    // Update booking status
    booking.markAsPaid({
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
      method: 'razorpay' // Will be updated with actual method from webhook
    });
    await booking.save();

    // Fetch full booking details for email
    const fullBooking = await Booking.findById(booking._id)
      .populate('serviceId')
      .populate('providerId', 'name email city')
      .populate('customerId', 'name email');

    // Send confirmation email to customer
    try {
      await sendBookingConfirmationEmail({
        to: fullBooking.customerId.email,
        booking: fullBooking,
        service: fullBooking.serviceId,
        provider: fullBooking.providerId,
        customer: fullBooking.customerId
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    // Send notification email to provider
    try {
      await sendBookingConfirmationEmail({
        to: fullBooking.providerId.email,
        booking: fullBooking,
        service: fullBooking.serviceId,
        provider: fullBooking.providerId,
        customer: fullBooking.customerId
      });
    } catch (emailError) {
      console.error('Failed to send provider notification:', emailError);
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      redirectUrl: `/booking/${fullBooking._id}/confirmation`,
      booking: {
        id: fullBooking._id,
        status: fullBooking.status,
        paymentStatus: fullBooking.paymentStatus
      }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed'
    });
  }
};

/**
 * Handle Razorpay webhooks
 * POST /booking/webhook/razorpay
 */
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    
    // req.body is a Buffer from express.raw middleware
    const webhookBody = req.body;

    // Verify webhook signature using raw body
    const isValid = verifyWebhookSignature(webhookBody, signature);
    if (!isValid) {
      console.warn('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Parse the body after verification
    const payload = JSON.parse(webhookBody.toString());
    const event = payload.event;
    const payloadData = payload.payload;

    // Handle different event types
    switch (event) {
      case 'payment.captured':
        // Payment was successfully captured
        const order = payloadData.payment.entity;
        const booking = await Booking.findOne({ razorpayOrderId: order.order_id });
        
        if (booking && booking.status === 'Pending') {
          booking.markAsPaid({
            paymentId: order.id,
            signature: '', // Signature is already verified
            method: order.method
          });
          booking.paymentMethod = order.method;
          await booking.save();
          console.log(`Booking ${booking._id} confirmed via webhook`);
        }
        break;

      case 'payment.failed':
        // Payment failed
        const failedOrder = payloadData.payment.entity;
        console.log(`Payment failed for order ${failedOrder.order_id}`);
        // Optionally notify customer
        break;

      case 'order.paid':
        // Order was paid (redundant check)
        const paidOrder = payloadData.order.entity;
        console.log(`Order ${paidOrder.id} marked as paid`);
        break;

      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    // Return 200 quickly to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Cancel a booking
 * POST /booking/:id/cancel
 */
exports.cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.session.user.id;
    const { reason } = req.body;

    // Find booking
    const booking = await Booking.findById(bookingId)
      .populate('serviceId', 'title cancellationPolicy')
      .populate('providerId', 'name email')
      .populate('customerId', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Validate user is the customer
    if (booking.customerId._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own bookings'
      });
    }

    // Validate booking can be cancelled
    if (booking.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    // Check if booking date is in the past
    if (new Date(booking.date) < new Date().setHours(0, 0, 0, 0)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel past bookings'
      });
    }

    // Determine refund based on policy and initiate refund if applicable
    const { amount: refundAmount, percentage } = calculateRefundAmount(booking.serviceId, booking);

    // Cancel booking
    booking.cancel('customer', reason || 'Cancelled by customer');

    // If advance was paid and refund applicable
    if (booking.paymentStatus === 'AdvancePaid' && refundAmount > 0 && booking.razorpayPaymentId) {
      try {
        const refund = await createRefund({
          paymentId: booking.razorpayPaymentId,
          amount: refundAmount,
          notes: { bookingId: booking._id.toString(), reason: 'Customer cancellation' }
        });
        booking.processRefund({ amount: refundAmount, percentage, reason: 'Customer cancellation', refundId: refund.id });
      } catch (err) {
        console.error('Refund initiation failed:', err.message);
      }
    }

    await booking.save();

    // Send cancellation emails with refund info
    const refundInfo = refundAmount > 0 ? { amount: refundAmount, percentage } : null;
    try {
      await sendBookingCancellationEmail({
        to: booking.customerId.email,
        booking,
        service: booking.serviceId,
        provider: booking.providerId,
        customer: booking.customerId,
        refundInfo
      });
      await sendBookingCancellationEmail({
        to: booking.providerId.email,
        booking,
        service: booking.serviceId,
        provider: booking.providerId,
        customer: booking.customerId,
        refundInfo
      });
    } catch (emailErr) {
      console.error('Failed to send cancellation emails:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      booking: {
        id: booking._id,
        status: booking.status,
        cancelledAt: booking.cancelledAt,
        refundAmount,
        refundPercentage: percentage
      }
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking'
    });
  }
};

/**
 * Get booking details
 * GET /booking/:id
 */
exports.getBookingDetails = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.session.user.id;

    console.log('[BOOKING DETAILS] Fetching booking:', bookingId, 'for user:', userId);

    // Find booking with populated references
    const booking = await Booking.findById(bookingId)
      .populate('serviceId')
      .populate('providerId', 'name email city profilePicture')
      .populate('customerId', 'name email city profilePicture');

    if (!booking) {
      console.error('[BOOKING DETAILS] Booking not found:', bookingId);
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    console.log('[BOOKING DETAILS] Booking found:', {
      id: booking._id,
      serviceId: booking.serviceId?._id || 'NULL',
      providerId: booking.providerId?._id || 'NULL',
      customerId: booking.customerId?._id || 'NULL'
    });

    // Check if serviceId was deleted
    if (!booking.serviceId) {
      console.error('[BOOKING DETAILS] Service has been deleted for booking:', bookingId);
      return res.status(404).json({
        success: false,
        message: 'The service associated with this booking no longer exists'
      });
    }

    // Validate user is either customer or provider
    const isCustomer = booking.customerId && booking.customerId._id.toString() === userId;
    const isProvider = booking.providerId && booking.providerId._id.toString() === userId;

    if (!isCustomer && !isProvider) {
      console.error('[BOOKING DETAILS] Unauthorized access attempt by:', userId);
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this booking'
      });
    }

    console.log('[BOOKING DETAILS] Success - returning booking details');
    res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('[BOOKING DETAILS] Error fetching booking details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details: ' + error.message
    });
  }
};

/**
 * Clean up expired bookings (called periodically)
 * Internal function
 */
exports.cleanupExpiredBookings = async () => {
  try {
    const expiredBookings = await Booking.findExpiredBookings();
    
    let count = 0;
    for (const booking of expiredBookings) {
      booking.cancel('system', 'Payment not completed within 15 minutes');
      await booking.save();
      count++;
      
      // Optionally send notification to customer
      console.log(`Auto-cancelled expired booking: ${booking._id}`);
    }
    
    return count;
  } catch (error) {
    console.error('Error cleaning up expired bookings:', error);
    throw error;
  }
};

/**
 * Check slot availability for a service
 */
exports.checkAvailability = async (req, res) => {
  try {
    const serviceId = req.params.serviceId;
    const { date } = req.query;

    // Validate required fields
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    // Fetch service with schedule
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Parse date
    const bookingDate = new Date(date);
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Get booked slots for this date (including Confirmed and non-expired Pending bookings)
    const now = new Date();
    const bookedSlots = await Booking.find({
      serviceId,
      date: {
        $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
        $lt: new Date(bookingDate.setHours(23, 59, 59, 999))
      },
      $or: [
        { status: 'Confirmed' },
        { 
          status: 'Pending',
          expiresAt: { $gt: now }
        }
      ]
    }).select('startTime endTime');

    // Get day of week
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][bookingDate.getDay()];

    // Find available slots for this day
    const daySchedule = service.weeklySchedule?.find(s => s.day === dayOfWeek);
    
    if (!daySchedule || !daySchedule.slots || daySchedule.slots.length === 0) {
      return res.status(200).json({
        success: true,
        availableSlots: [],
        message: 'No slots available for this day'
      });
    }

    // Mark slots as available or booked
    const slotsWithAvailability = daySchedule.slots.map(slot => {
      const isBooked = bookedSlots.some(booking => 
        booking.startTime === slot.start && booking.endTime === slot.end
      );

      return {
        start: slot.start,
        end: slot.end,
        available: !isBooked
      };
    });

    res.status(200).json({
      success: true,
      date: bookingDate,
      dayOfWeek,
      slots: slotsWithAvailability
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability'
    });
  }
};

/**
 * Get provider bookings list (for saheli users)
 * GET /booking/provider/list
 */
exports.getProviderBookings = async (req, res) => {
  try {
    const providerId = req.session.user.id;
    
    console.log('[PROVIDER BOOKINGS] Fetching bookings for provider:', providerId);
    console.log('[PROVIDER BOOKINGS] Request headers:', {
      xhr: req.xhr,
      accept: req.headers.accept,
      xRequestedWith: req.headers['x-requested-with']
    });
    
    // Fetch all bookings for this provider
    const bookings = await Booking.findByProvider(providerId)
      .populate('serviceId', 'title category images')
      .populate('customerId', 'name email phone city');
    
    console.log('[PROVIDER BOOKINGS] Found bookings:', bookings.length);
    console.log('[PROVIDER BOOKINGS] Bookings status breakdown:', {
      confirmed: bookings.filter(b => b.status === 'Confirmed').length,
      inProgress: bookings.filter(b => b.status === 'InProgress').length,
      completed: bookings.filter(b => b.status === 'Completed').length,
      cancelled: bookings.filter(b => b.status === 'Cancelled').length
    });
    
    // If it's an API request (AJAX), return JSON
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      console.log('[PROVIDER BOOKINGS] Returning JSON response');
      return res.json({
        success: true,
        bookings
      });
    }
    
    console.log('[PROVIDER BOOKINGS] Rendering page');
    // Otherwise render the page
    res.render('pages/bookings/provider-list', {
      title: 'My Bookings',
      bookingsPage: true,
      user: req.session.user
    });
  } catch (error) {
    console.error('[PROVIDER BOOKINGS] Error fetching provider bookings:', error);
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(500).json({
        success: false,
        message: 'Failed to load bookings'
      });
    }
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'An error occurred while loading your bookings.',
      user: req.session.user
    });
  }
};

/**
 * Get remaining payment page (customer only)
 * GET /booking/:id/remaining-payment
 */
exports.getRemainingPaymentPage = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.session.user.id;
    
    const booking = await Booking.findById(bookingId)
      .populate('serviceId', 'title')
      .populate('providerId', 'name email')
      .populate('customerId', 'name email');
    
    if (!booking) {
      return res.status(404).render('error', {
        title: 'Booking Not Found',
        message: 'The booking you are looking for does not exist.',
        user: req.session.user
      });
    }
    
    // Check authorization (only customer can pay)
    if (booking.customerId._id.toString() !== userId) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this page.',
        user: req.session.user
      });
    }
    
    // Check if remaining payment is needed
    if (!booking.hasRemainingBalance || booking.isFullyPaid) {
      return res.redirect(`/booking/${bookingId}?info=Payment already completed`);
    }
    
    res.render('pages/bookings/remaining-payment', {
      title: 'Complete Payment',
      booking,
      user: req.session.user,
      detailPage: true
    });
  } catch (error) {
    console.error('Error loading remaining payment page:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'An error occurred while loading the payment page.',
      user: req.session.user
    });
  }
};

/**
 * Get booking confirmation page
 */
exports.getBookingConfirmation = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.session.user.id;

    // Fetch booking with populated references
    const booking = await Booking.findById(bookingId)
      .populate('serviceId', 'title description category basePrice pricingType location serviceType')
      .populate('providerId', 'name email phone city')
      .populate('customerId', 'name email phone');

    if (!booking) {
      return res.status(404).render('error', {
        title: 'Booking Not Found',
        message: 'The booking you are looking for does not exist.',
        user: req.session.user
      });
    }

    // Check authorization (only customer can view confirmation)
    if (booking.customerId._id.toString() !== userId) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to view this booking confirmation.',
        user: req.session.user
      });
    }

    // Render confirmation page
    res.render('pages/booking/confirmation', {
      title: 'Booking Confirmation',
      booking,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching booking confirmation:', error);
    res.status(500).render('error', {
      title: 'Server Error',
      message: 'An error occurred while loading the confirmation page.',
      user: req.session.user
    });
  }
};

/**
 * Process advance payment for a booking (LEGACY - superseded by verifyPayment)
 * Kept for backward compatibility; recommend using verifyPayment instead
 */
exports.processAdvancePayment = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.session.user.id;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details'
      });
    }

    // Fetch booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.customerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    // Verify payment signature
    const isValidSignature = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Update booking with advance payment using correct enum value
    booking.markAsPaid({
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      method: 'razorpay'
    });
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Advance payment processed successfully',
      booking: {
        id: booking._id,
        paymentStatus: booking.paymentStatus,
        status: booking.status
      }
    });
  } catch (error) {
    console.error('Error processing advance payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process advance payment'
    });
  }
};

/**
 * Complete remaining payment for a booking (LEGACY - superseded by verifyRemainingPayment)
 * Kept for backward compatibility; recommend using createRemainingPaymentOrder + verifyRemainingPayment instead
 */
exports.completePayment = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.session.user.id;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment details'
      });
    }

    // Fetch booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization
    if (booking.customerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    // Verify booking has advance paid
    if (booking.paymentStatus !== 'AdvancePaid') {
      return res.status(400).json({
        success: false,
        message: 'Booking must have advance payment before completing remaining'
      });
    }

    // Verify payment signature
    const isValidSignature = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Update booking to mark remaining as paid using correct enum value
    booking.markRemainingAsPaid({
      paymentId: razorpay_payment_id
    });
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Remaining payment completed successfully',
      booking: {
        id: booking._id,
        paymentStatus: booking.paymentStatus,
        remainingPaidAt: booking.remainingPaidAt
      }
    });
  } catch (error) {
    console.error('Error completing payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete payment'
    });
  }
};

/**
 * Process refund for a booking (provider only)
 */
exports.processRefund = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.session.user.id;
    const { refundAmount, reason } = req.body;

    // Validate required fields
    if (!refundAmount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing refund amount or reason'
      });
    }

    // Fetch booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check authorization (only provider can issue refund)
    if (booking.providerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    // Verify booking has an advance or any payment
    if (booking.paymentStatus !== 'AdvancePaid' && booking.paymentStatus !== 'FullyPaid') {
      return res.status(400).json({
        success: false,
        message: 'Booking has no captured payment to refund'
      });
    }

    // Verify refund amount is valid (cannot exceed advancePaid)
    const maxRefund = booking.advancePaid - (booking.refundAmount || 0);
    if (parseFloat(refundAmount) > maxRefund) {
      return res.status(400).json({
        success: false,
        message: `Refund amount cannot exceed ${maxRefund}`
      });
    }

    // Create refund via Razorpay
    const refund = await createRefund({
      paymentId: booking.razorpayPaymentId,
      amount: parseFloat(refundAmount),
      notes: {
        bookingId: booking._id.toString(),
        reason
      }
    });

    // Update booking with refund details
    booking.processRefund({ amount: parseFloat(refundAmount), reason, refundId: refund.id });
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: parseFloat(refundAmount),
        status: refund.status
      },
      booking: {
        id: booking._id,
        refundAmount: booking.refundAmount,
        paymentStatus: booking.paymentStatus
      }
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process refund'
    });
  }
};

/**
 * Provider actions: start booking, complete booking, cancel booking
 */
exports.startBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('serviceId')
      .populate('providerId', 'name email')
      .populate('customerId', 'name email');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (String(booking.providerId._id) !== String(req.session.user.id)) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }
    
    // Time gating: ensure it's time to start (allow 30 min early grace)
    const scheduledStart = combineDateTime(booking.date, booking.startTime);
    const earlyStartThreshold = new Date(scheduledStart.getTime() - 30 * 60 * 1000); // 30 min before
    if (new Date() < earlyStartThreshold) {
      return res.status(400).json({
        success: false,
        message: `Service can only be started from ${earlyStartThreshold.toLocaleTimeString()} onwards`
      });
    }
    
    booking.startService('provider');
    await booking.save();
    
    // Send notification
    try {
      await sendBookingStartNotification({
        to: booking.customerId.email,
        booking,
        service: booking.serviceId,
        provider: booking.providerId,
        customer: booking.customerId,
        isAuto: false
      });
    } catch (emailErr) {
      console.error('Failed to send start notification:', emailErr.message);
    }
    
    return res.json({ success: true, message: 'Service started', status: booking.status });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('serviceId')
      .populate('providerId', 'name email')
      .populate('customerId', 'name email');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (String(booking.providerId._id) !== String(req.session.user.id)) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }
    booking.completeService('provider');
    await booking.save();
    
    // Send completion notification
    try {
      await sendBookingCompleteNotification({
        to: booking.customerId.email,
        booking,
        service: booking.serviceId,
        provider: booking.providerId,
        customer: booking.customerId,
        isAuto: false
      });
      
      // Prompt for remaining payment if applicable
      if (booking.hasRemainingBalance) {
        await sendRemainingPaymentPrompt({
          to: booking.customerId.email,
          booking,
          service: booking.serviceId,
          customer: booking.customerId
        });
      }
    } catch (emailErr) {
      console.error('Failed to send completion notifications:', emailErr.message);
    }
    
    return res.json({ success: true, message: 'Service completed', status: booking.status });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.cancelByProvider = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('serviceId')
      .populate('providerId', 'name email')
      .populate('customerId', 'name email');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (String(booking.providerId._id) !== String(req.session.user.id)) {
      return res.status(403).json({ success: false, message: 'Not your booking' });
    }
    booking.cancel('provider', req.body.reason || 'Cancelled by provider');
    
    // Provider-initiated cancellation: refund full advance if any
    let refundInfo = null;
    if (booking.paymentStatus === 'AdvancePaid' && booking.razorpayPaymentId) {
      try {
        const refundable = Math.max(0, (booking.advancePaid || 0) - (booking.refundAmount || 0));
        if (refundable > 0) {
          const refund = await createRefund({
            paymentId: booking.razorpayPaymentId,
            amount: refundable,
            notes: { bookingId: booking._id.toString(), reason: 'Provider cancellation' }
          });
          booking.processRefund({
            amount: refundable,
            percentage: 100,
            reason: 'Provider cancellation',
            refundId: refund.id
          });
          refundInfo = { amount: refundable, percentage: 100 };
        }
      } catch (err) {
        console.error('Provider refund failed:', err.message);
      }
    }
    
    await booking.save();
    
    // Send cancellation notifications
    try {
      await sendBookingCancellationEmail({
        to: booking.customerId.email,
        booking,
        service: booking.serviceId,
        provider: booking.providerId,
        customer: booking.customerId,
        refundInfo
      });
      await sendBookingCancellationEmail({
        to: booking.providerId.email,
        booking,
        service: booking.serviceId,
        provider: booking.providerId,
        customer: booking.customerId,
        refundInfo
      });
    } catch (emailErr) {
      console.error('Failed to send cancellation emails:', emailErr.message);
    }
    
    return res.json({ success: true, message: 'Booking cancelled', status: booking.status });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Remaining payment: create order and verify payment
 */
exports.createRemainingPaymentOrder = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const userId = req.session.user.id;
    
    console.log('[REMAINING PAYMENT] Creating order for booking:', bookingId, 'user:', userId);
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      console.error('[REMAINING PAYMENT] Booking not found:', bookingId);
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    console.log('[REMAINING PAYMENT] Booking found:', {
      id: booking._id,
      customerId: booking.customerId,
      status: booking.status,
      paymentStatus: booking.paymentStatus,
      remainingAmount: booking.remainingAmount,
      hasRemainingBalance: booking.hasRemainingBalance
    });
    
    if (String(booking.customerId) !== String(userId)) {
      console.error('[REMAINING PAYMENT] Unauthorized access attempt');
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    if (!booking.hasRemainingBalance) {
      console.error('[REMAINING PAYMENT] No remaining balance:', {
        remainingAmount: booking.remainingAmount,
        paymentStatus: booking.paymentStatus
      });
      return res.status(400).json({ success: false, message: 'No remaining balance to pay' });
    }
    
    console.log('[REMAINING PAYMENT] Creating Razorpay order for amount:', booking.remainingAmount);
    
    const order = await createOrder({
      amount: booking.remainingAmount,
      currency: 'INR',
      receipt: `rem_${booking._id}`,
      notes: { bookingId: booking._id.toString(), type: 'remaining' }
    });
    
    console.log('[REMAINING PAYMENT] Razorpay order created:', order.id);
    
    booking.remainingRazorpayOrderId = order.id;
    await booking.save();
    
    return res.json({ 
      success: true, 
      razorpayOrder: { 
        id: order.id, 
        amount: order.amount, 
        currency: order.currency 
      }, 
      razorpayKeyId: process.env.RAZORPAY_KEY_ID 
    });
  } catch (err) {
    console.error('[REMAINING PAYMENT] Error creating order:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyRemainingPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookingId } = req.body;
    
    console.log('[REMAINING PAYMENT] Verifying payment:', {
      bookingId,
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId
    });
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      console.error('[REMAINING PAYMENT] Booking not found for verification:', bookingId);
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    console.log('[REMAINING PAYMENT] Booking order ID:', booking.remainingRazorpayOrderId);
    
    if (booking.remainingRazorpayOrderId !== razorpayOrderId) {
      console.error('[REMAINING PAYMENT] Order ID mismatch:', {
        expected: booking.remainingRazorpayOrderId,
        received: razorpayOrderId
      });
      return res.status(400).json({ success: false, message: 'Order mismatch' });
    }
    
    const isValid = verifyPaymentSignature({ 
      orderId: razorpayOrderId, 
      paymentId: razorpayPaymentId, 
      signature: razorpaySignature 
    });
    
    console.log('[REMAINING PAYMENT] Signature validation:', isValid);
    
    if (!isValid) {
      console.error('[REMAINING PAYMENT] Invalid signature');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }
    
    booking.markRemainingAsPaid({ paymentId: razorpayPaymentId });
    await booking.save();
    
    console.log('[REMAINING PAYMENT] Payment marked as paid:', {
      paymentStatus: booking.paymentStatus,
      remainingPaidAt: booking.remainingPaidAt
    });
    
    return res.json({ 
      success: true, 
      message: 'Remaining payment completed', 
      paymentStatus: booking.paymentStatus 
    });
  } catch (err) {
    console.error('[REMAINING PAYMENT] Error verifying payment:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Cron-friendly internal processors
 */
exports.processAutoStart = async () => {
  const pending = await Booking.findBookingsForAutoStart()
    .populate('serviceId')
    .populate('providerId', 'name email')
    .populate('customerId', 'name email');
  let count = 0;
  for (const b of pending) {
    try {
      if (b.canAutoStart()) {
        b.startService('system');
        await b.save();
        count++;
        
        // Send notification
        try {
          await sendBookingStartNotification({
            to: b.customerId.email,
            booking: b,
            service: b.serviceId,
            provider: b.providerId,
            customer: b.customerId,
            isAuto: true
          });
        } catch (emailErr) {
          console.error('Auto-start email failed:', emailErr.message);
        }
      }
    } catch (err) {
      console.error('Auto-start failed for booking:', b._id, err.message);
    }
  }
  return count;
};

exports.processAutoComplete = async () => {
  const inProgress = await Booking.findBookingsForAutoComplete()
    .populate('serviceId')
    .populate('providerId', 'name email')
    .populate('customerId', 'name email');
  let count = 0;
  for (const b of inProgress) {
    try {
      if (b.canAutoComplete()) {
        b.completeService('system');
        await b.save();
        count++;
        
        // Update provider stats (if User model has completedBookingsCount)
        try {
          await User.findByIdAndUpdate(b.providerId._id, { $inc: { completedBookingsCount: 1 } });
        } catch (statErr) {
          console.error('Provider stat update failed:', statErr.message);
        }
        
        // Send notifications
        try {
          await sendBookingCompleteNotification({
            to: b.customerId.email,
            booking: b,
            service: b.serviceId,
            provider: b.providerId,
            customer: b.customerId,
            isAuto: true
          });
          
          if (b.hasRemainingBalance) {
            await sendRemainingPaymentPrompt({
              to: b.customerId.email,
              booking: b,
              service: b.serviceId,
              customer: b.customerId
            });
          }
        } catch (emailErr) {
          console.error('Auto-complete email failed:', emailErr.message);
        }
      }
    } catch (err) {
      console.error('Auto-complete failed for booking:', b._id, err.message);
    }
  }
  return count;
};

exports.sendBookingReminders = async () => {
  const upcoming = await Booking.findBookingsForReminder()
    .populate('serviceId')
    .populate('providerId', 'name email')
    .populate('customerId', 'name email');
  let count = 0;
  for (const b of upcoming) {
    try {
      if (b.needsReminder()) {
        b.reminderSent = true;
        b.reminderSentAt = new Date();
        await b.save();
        
        // Send reminder emails to both customer and provider
        try {
          await sendBookingReminderEmail({
            to: b.customerId.email,
            booking: b,
            service: b.serviceId,
            provider: b.providerId,
            customer: b.customerId
          });
          await sendBookingReminderEmail({
            to: b.providerId.email,
            booking: b,
            service: b.serviceId,
            provider: b.providerId,
            customer: b.customerId
          });
        } catch (emailErr) {
          console.error('Reminder email failed:', emailErr.message);
        }
        
        count++;
      }
    } catch (err) {
      console.error('Reminder failed for booking:', b._id, err.message);
    }
  }
  return count;
};
