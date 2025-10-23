/**
 * Razorpay Payment Gateway Integration Utility
 * Handles order creation, payment verification, and webhook validation
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay instance
let razorpayInstance = null;

/**
 * Initialize Razorpay with API credentials
 * @returns {Razorpay} Razorpay instance
 */
function initializeRazorpay() {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error(
      'Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env file'
    );
  }

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });

  console.log('Razorpay initialized successfully');
  return razorpayInstance;
}

/**
 * Create a Razorpay order for payment
 * @param {Object} options - Order options
 * @param {number} options.amount - Amount in rupees (will be converted to paise)
 * @param {string} options.currency - Currency code (default: INR)
 * @param {string} options.receipt - Receipt ID for tracking
 * @param {Object} options.notes - Additional notes/metadata
 * @returns {Promise<Object>} Razorpay order object
 */
async function createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  try {
    const razorpay = initializeRazorpay();

    // Validate amount
    if (!amount || amount <= 0) {
      throw new Error('Invalid amount. Amount must be greater than 0');
    }

    // Convert rupees to paise (smallest currency unit)
    const amountInPaise = convertToSubunits(amount);

    // Create order
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes
    });

    console.log('Razorpay order created:', order.id);
    return order;
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error(`Failed to create payment order: ${error.message}`);
  }
}

/**
 * Verify payment signature to ensure authenticity
 * @param {Object} paymentData - Payment data from Razorpay
 * @param {string} paymentData.orderId - Razorpay order ID
 * @param {string} paymentData.paymentId - Razorpay payment ID
 * @param {string} paymentData.signature - Payment signature
 * @returns {boolean} True if signature is valid
 */
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      throw new Error('Razorpay key secret not configured');
    }

    // Generate expected signature
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(signature)
    );

    if (isValid) {
      console.log('Payment signature verified successfully');
    } else {
      console.warn('Payment signature verification failed');
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
}

/**
 * Verify webhook signature to ensure webhook is from Razorpay
 * @param {string} webhookBody - Raw webhook body (as string)
 * @param {string} signature - Webhook signature from headers
 * @returns {boolean} True if webhook is authentic
 */
function verifyWebhookSignature(webhookBody, signature) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('Razorpay webhook secret not configured');
    }

    // Generate expected signature
    const generatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');

    // Constant-time comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(signature)
    );

    if (isValid) {
      console.log('Webhook signature verified successfully');
    } else {
      console.warn('Webhook signature verification failed');
    }

    return isValid;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Fetch payment details from Razorpay
 * @param {string} paymentId - Razorpay payment ID
 * @returns {Promise<Object>} Payment details
 */
async function fetchPaymentDetails(paymentId) {
  try {
    const razorpay = initializeRazorpay();

    const payment = await razorpay.payments.fetch(paymentId);
    console.log('Payment details fetched:', paymentId);
    return payment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw new Error(`Failed to fetch payment details: ${error.message}`);
  }
}

/**
 * Create a refund for a payment
 * @param {Object} options - Refund options
 * @param {string} options.paymentId - Razorpay payment ID
 * @param {number} options.amount - Amount to refund in rupees (optional, full refund if not provided)
 * @param {Object} options.notes - Additional notes/metadata
 * @returns {Promise<Object>} Razorpay refund object
 */
async function createRefund({ paymentId, amount, notes = {} }) {
  try {
    const razorpay = initializeRazorpay();

    // Validate payment ID
    if (!paymentId) {
      throw new Error('Payment ID is required for refund');
    }

    const refundOptions = { notes };

    // If amount is specified, convert to paise; otherwise full refund
    if (amount && amount > 0) {
      refundOptions.amount = convertToSubunits(amount);
    }

    // Create refund
    const refund = await razorpay.payments.refund(paymentId, refundOptions);

    console.log('Razorpay refund created:', refund.id);
    return refund;
  } catch (error) {
    console.error('Error creating Razorpay refund:', error);
    throw new Error(`Failed to create refund: ${error.message}`);
  }
}

/**
 * Convert rupees to paise (smallest currency unit)
 * @param {number} amount - Amount in rupees
 * @returns {number} Amount in paise
 */
function convertToSubunits(amount) {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    throw new Error('Invalid amount for conversion');
  }

  // Multiply by 100 and round to nearest integer
  const paise = Math.round(amount * 100);

  if (paise <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  return paise;
}

/**
 * Convert paise to rupees
 * @param {number} amount - Amount in paise
 * @returns {number} Amount in rupees
 */
function convertFromSubunits(amount) {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    return 0;
  }

  return amount / 100;
}

/**
 * Format amount as currency string
 * @param {number} amount - Amount in rupees
 * @returns {string} Formatted currency string (e.g., "₹1,234.56")
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

module.exports = {
  initializeRazorpay,
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  fetchPaymentDetails,
  createRefund,
  convertToSubunits,
  convertFromSubunits,
  formatCurrency
};
