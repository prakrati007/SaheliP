const crypto = require('crypto');

/**
 * Generate a secure 6-digit OTP
 * Uses crypto.randomInt for cryptographically secure random generation
 * @returns {string} - 6-digit OTP padded with leading zeros
 */
function generateOtp() {
  const otp = crypto.randomInt(0, 1000000);
  return otp.toString().padStart(6, '0');
}

/**
 * Generate a URL-safe random token
 * Used for verification tokens to prevent blind guessing
 * @param {number} bytes - Number of random bytes to generate (default 32)
 * @returns {string} - Base64url encoded random token
 */
function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Hash a value using HMAC-SHA256 with pepper
 * Used for storing OTP and token hashes securely
 * Pepper adds an additional layer of security beyond database compromise
 * @param {string} value - Value to hash
 * @returns {string} - Base64url encoded HMAC hash
 */
function hashValue(value) {
  const pepper = process.env.OTP_PEPPER;
  
  if (!pepper) {
    console.warn('WARNING: OTP_PEPPER not set in environment variables. Using default (insecure).');
  }
  
  const secret = pepper || 'default-pepper-change-in-production';
  return crypto
    .createHmac('sha256', secret)
    .update(value.toString())
    .digest('base64url');
}

/**
 * Perform constant-time string comparison
 * Prevents timing attacks by ensuring comparison time doesn't leak information
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - True if strings match
 */
function timingSafeEqual(a, b) {
  // Handle length mismatch safely
  if (a.length !== b.length) {
    return false;
  }
  
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (error) {
    // If conversion fails, strings don't match
    return false;
  }
}

module.exports = {
  generateOtp,
  generateToken,
  hashValue,
  timingSafeEqual,
};
