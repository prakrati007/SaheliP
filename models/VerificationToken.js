const mongoose = require('mongoose');
const { hashValue, timingSafeEqual } = require('../utils/crypto');

const verificationTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ['email_verify', 'login_otp', 'password_reset'],
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    metadata: {
      userAgent: String,
      ipHash: String,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index for automatic cleanup of expired tokens
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient active token queries
verificationTokenSchema.index({ userId: 1, purpose: 1, consumedAt: 1 });

/**
 * Static method to create a new verification token
 * @param {ObjectId} userId - User ID
 * @param {string} purpose - Purpose of the token
 * @param {string} otp - 6-digit OTP
 * @param {string} token - Random verification token
 * @param {number} ttlMinutes - Time to live in minutes
 * @returns {Promise<VerificationToken>} - Created token document
 */
verificationTokenSchema.statics.createToken = async function (
  userId,
  purpose,
  otp,
  token,
  ttlMinutes = 10
) {
  console.log('=== Creating Verification Token ===');
  console.log('OTP:', otp, 'Type:', typeof otp);
  console.log('Token:', token);
  
  // Hash OTP and token using crypto utility
  const otpHash = hashValue(otp.toString());
  const tokenHash = hashValue(token);

  console.log('OTP Hash:', otpHash);
  console.log('Token Hash:', tokenHash);

  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  console.log('Expires At:', expiresAt);

  return await this.create({
    userId,
    purpose,
    otpHash,
    tokenHash,
    expiresAt,
  });
};

/**
 * Instance method to verify OTP and token
 * @param {string} otp - OTP to verify
 * @param {string} token - Token to verify
 * @returns {Promise<boolean>} - True if verification succeeds
 */
verificationTokenSchema.methods.verify = async function (otp, token) {
  console.log('=== Token Verify Method ===');
  console.log('Input OTP:', otp, 'Type:', typeof otp);
  console.log('Input Token:', token);
  
  // Check if token is expired
  if (this.expiresAt < new Date()) {
    console.log('Token expired');
    return false;
  }

  // Check if token is already consumed
  if (this.consumedAt) {
    console.log('Token already consumed');
    return false;
  }

  // Check if max attempts exceeded
  if (this.attempts >= this.maxAttempts) {
    console.log('Max attempts exceeded');
    return false;
  }

  // Hash provided OTP and token using crypto utility
  const otpHash = hashValue(otp.toString());
  const tokenHash = hashValue(token);

  console.log('Generated OTP hash:', otpHash);
  console.log('Stored OTP hash:', this.otpHash);
  console.log('Generated Token hash:', tokenHash);
  console.log('Stored Token hash:', this.tokenHash);

  // Constant-time comparison
  const otpMatch = timingSafeEqual(otpHash, this.otpHash);
  const tokenMatch = timingSafeEqual(tokenHash, this.tokenHash);

  console.log('OTP match:', otpMatch);
  console.log('Token match:', tokenMatch);

  if (otpMatch && tokenMatch) {
    console.log('Verification successful');
    return true;
  } else {
    // Increment attempts on failure
    this.attempts += 1;
    await this.save();
    console.log('Verification failed, attempts incremented to:', this.attempts);
    return false;
  }
};

const VerificationToken = mongoose.model('VerificationToken', verificationTokenSchema);

module.exports = VerificationToken;
