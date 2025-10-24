const bcrypt = require('bcrypt');
const User = require('../models/User');
const VerificationToken = require('../models/VerificationToken');
const { generateOtp, generateToken } = require('../utils/crypto');
const { sendOtpEmail, sendWelcomeEmail } = require('../utils/emailService');

// Rate limiting store (in-memory, use Redis in production)
const resendCooldowns = new Map();

/**
 * Render signup choice page
 */
function renderSignupChoice(req, res) {
  res.render('pages/auth/signup-choice', {
    title: 'Join Saheli Plus',
    authPage: true,
  });
}

/**
 * Render Saheli signup form
 */
function renderSignupSaheli(req, res) {
  res.render('pages/auth/signup-saheli', {
    title: 'Sign Up as Saheli',
    errors: [],
    formData: {},
    authPage: true,
  });
}

/**
 * Render Customer signup form
 */
function renderSignupCustomer(req, res) {
  res.render('pages/auth/signup-customer', {
    title: 'Sign Up as Customer',
    errors: [],
    formData: {},
    authPage: true,
  });
}

/**
 * Render login page
 */
function renderLogin(req, res) {
  // Capture a safe returnTo from query (only allow local, absolute paths)
  const returnTo = typeof req.query.returnTo === 'string' ? req.query.returnTo : '';
  if (returnTo && returnTo.startsWith('/')) {
    req.session.returnTo = returnTo;
  }

  res.render('pages/auth/login', {
    title: 'Log In - Saheli Plus',
    errors: [],
    formData: {},
    authPage: true,
  });
}

/**
 * Render OTP verification page
 */
function renderVerifyOtp(req, res) {
  const { email, token, purpose, role } = req.query;
  
  res.render('pages/auth/verify-otp', {
    title: 'Verify OTP - Saheli Plus',
    email: email || '',
    token: token || '',
    purpose: purpose || 'email_verify',
    role: role || '',
    errors: [],
    authPage: true,
  });
}

/**
 * Handle Saheli signup
 */
async function signupSaheli(req, res) {
  try {
    const { name, email, password, city, pincode } = req.body;
    const role = 'saheli';

    // Check if email already exists for this role
    const existingUser = await User.findByEmail(email, role);
    if (existingUser) {
      return res.status(400).render('pages/auth/signup-saheli', {
        title: 'Sign Up as Saheli',
        errors: ['An account with this email and role already exists'],
        formData: req.body,
        authPage: true,
      });
    }

    // Hash password with bcrypt cost factor 12
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      city,
      pincode,
      verified: false,
    });

    // Generate OTP and token
    const otp = generateOtp();
    const token = generateToken(32);

    console.log('=== Signup OTP Generation ===');
    console.log('Generated OTP:', otp, 'Type:', typeof otp);
    console.log('Generated Token:', token);

    // Create verification token with 10-minute expiry
    await VerificationToken.createToken(user._id, 'email_verify', otp, token, 10);

    // Send OTP email
    await sendOtpEmail({ to: email, code: otp, purpose: 'email_verify' });

  // Redirect to verification page (include role)
  res.redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}&token=${token}&role=${role}`);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).render('pages/auth/signup-saheli', {
      title: 'Sign Up as Saheli',
      errors: ['An error occurred during signup. Please try again.'],
      formData: req.body,
      authPage: true,
    });
  }
}

/**
 * Handle Customer signup
 */
async function signupCustomer(req, res) {
  try {
    const { name, email, password, city, pincode } = req.body;
    const role = 'customer';

    // Check if email already exists for this role
    const existingUser = await User.findByEmail(email, role);
    if (existingUser) {
      return res.status(400).render('pages/auth/signup-customer', {
        title: 'Sign Up as Customer',
        errors: ['An account with this email and role already exists'],
        formData: req.body,
        authPage: true,
      });
    }

    // Hash password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
      role,
      city,
      pincode,
      verified: false,
    });

    // Generate OTP and token
    const otp = generateOtp();
    const token = generateToken(32);

    // Create verification token
    await VerificationToken.createToken(user._id, 'email_verify', otp, token, 10);

    // Send OTP email
    await sendOtpEmail({ to: email, code: otp, purpose: 'email_verify' });

  // Redirect to verification page (include role)
  res.redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}&token=${token}&role=${role}`);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).render('pages/auth/signup-customer', {
      title: 'Sign Up as Customer',
      errors: ['An error occurred during signup. Please try again.'],
      formData: req.body,
      authPage: true,
    });
  }
}

/**
 * Verify OTP for email verification
 */
async function verifyOtp(req, res) {
  try {
    const { email, otp, token, role } = req.body;

    console.log('=== OTP Verification Debug ===');
    console.log('Received OTP:', otp, 'Type:', typeof otp);
    console.log('Received Token:', token);
    console.log('Email:', email);
    console.log('Role:', role);

    // Find user
    const user = await User.findByEmail(email, role);
    if (!user) {
      console.log('User not found for email:', email, 'role:', role);
      return res.status(400).render('pages/auth/verify-otp', {
        title: 'Verify OTP - Saheli Plus',
        errors: ['Invalid verification request'],
        email,
        token,
        role,
        authPage: true,
      });
    }

    console.log('User found:', user._id);

    // Find active verification token
    const verificationToken = await VerificationToken.findOne({
      userId: user._id,
      purpose: 'email_verify',
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!verificationToken) {
      console.log('No active verification token found for user:', user._id);
      return res.status(400).render('pages/auth/verify-otp', {
        title: 'Verify OTP - Saheli Plus',
        errors: ['Verification code has expired. Please request a new one.'],
        email,
        token,
        role,
        authPage: true,
      });
    }

    console.log('Verification token found, attempts:', verificationToken.attempts, '/', verificationToken.maxAttempts);

    // Check max attempts
    if (verificationToken.attempts >= verificationToken.maxAttempts) {
      console.log('Max attempts exceeded');
      return res.status(400).render('pages/auth/verify-otp', {
        title: 'Verify OTP - Saheli Plus',
        errors: ['Maximum verification attempts exceeded. Please request a new code.'],
        email,
        token,
        authPage: true,
      });
    }

    // Verify OTP and token
    const isValid = await verificationToken.verify(otp, token);
    console.log('Verification result:', isValid);

    if (isValid) {
      // Mark token as consumed
      verificationToken.consumedAt = new Date();
      await verificationToken.save();

      // Update user verification status
      user.verified = true;
      user.emailVerifiedAt = new Date();
      await user.save();

      // Create session
      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      // Regenerate session ID to prevent fixation
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
        }
        
        // Restore user data after regeneration
        req.session.user = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        };

        // Send welcome email (async, don't wait)
        sendWelcomeEmail({ to: user.email, name: user.name, role: user.role });

        // Redirect to returnTo if present, else dashboard
        const redirectTo = req.session.returnTo || `/dashboard?role=${user.role}`;
        delete req.session.returnTo;
        res.redirect(redirectTo);
      });
    } else {
      const attemptsLeft = verificationToken.maxAttempts - verificationToken.attempts;
      return res.status(400).render('pages/auth/verify-otp', {
        title: 'Verify OTP - Saheli Plus',
        errors: [`Invalid verification code. ${attemptsLeft} attempts remaining.`],
        email,
        token,
        role,
        authPage: true,
      });
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).render('pages/auth/verify-otp', {
      title: 'Verify OTP - Saheli Plus',
      errors: ['An error occurred during verification. Please try again.'],
      email: req.body.email,
      token: req.body.token,
      role: req.body.role,
      authPage: true,
    });
  }
}

/**
 * Resend OTP
 */
async function resendOtp(req, res) {
  try {
    const { email, purpose, role } = req.body;
    const validPurpose = purpose || 'email_verify';

    // Validate purpose
    if (!['email_verify', 'login_otp', 'password_reset'].includes(validPurpose)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purpose specified',
      });
    }

    // Check rate limit (60 seconds cooldown)
    const cooldownKey = `resend_${email}_${validPurpose}`;
    const lastResend = resendCooldowns.get(cooldownKey);
    const now = Date.now();
    
    if (lastResend && now - lastResend < 60000) {
      const secondsLeft = Math.ceil((60000 - (now - lastResend)) / 1000);
      return res.status(429).json({
        success: false,
        message: `Please wait ${secondsLeft} seconds before requesting a new code`,
      });
    }

    // Find user
  const user = await User.findByEmail(email, role);
    if (!user) {
      // Generic response to prevent user enumeration
      return res.json({
        success: true,
        message: 'If the email exists, a new code has been sent',
      });
    }

    // Invalidate previous active tokens for this purpose
    await VerificationToken.updateMany(
      {
        userId: user._id,
        purpose: validPurpose,
        consumedAt: null,
      },
      {
        $set: { consumedAt: new Date() },
      }
    );

    // Generate new OTP and token
    const otp = generateOtp();
    const token = generateToken(32);

    // Create new verification token with the specified purpose
    await VerificationToken.createToken(user._id, validPurpose, otp, token, 10);

    // Send OTP email
    await sendOtpEmail({ to: email, code: otp, purpose: validPurpose });

    // Set cooldown
    resendCooldowns.set(cooldownKey, now);

    res.json({
      success: true,
      message: 'A new verification code has been sent to your email',
      token,
      purpose: validPurpose,
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
    });
  }
}

/**
 * Handle password login
 */
async function loginPassword(req, res) {
  try {
    const { email, password, role } = req.body;

    // Validate role
    if (!role || !['saheli', 'customer'].includes(role)) {
      return res.status(400).render('pages/auth/login', {
        title: 'Log In - Saheli Plus',
        errors: ['Please select your role (Customer or Saheli)'],
        formData: req.body,
        authPage: true,
      });
    }

    // Find user by email AND role
    const user = await User.findByEmail(email, role);
    
    // Generic error to prevent user enumeration
    if (!user) {
      return res.status(400).render('pages/auth/login', {
        title: 'Log In - Saheli Plus',
        errors: ['Invalid email, password, or role'],
        formData: req.body,
        authPage: true,
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).render('pages/auth/login', {
        title: 'Log In - Saheli Plus',
        errors: ['Invalid email, password, or role'],
        formData: req.body,
        authPage: true,
      });
    }

    // Check if email is verified
    if (!user.verified) {
      // Generate OTP and redirect to verification
      const otp = generateOtp();
      const token = generateToken(32);
      await VerificationToken.createToken(user._id, 'email_verify', otp, token, 10);
      await sendOtpEmail({ to: email, code: otp, purpose: 'email_verify' });
      
  return res.redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}&token=${token}&role=${role}`);
    }

    // Create session
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    // Capture returnTo before session regeneration
    const returnTo = req.session.returnTo || `/dashboard?role=${user.role}`;

    // Regenerate session ID
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
      }
      
      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      // Redirect using captured returnTo
      res.redirect(returnTo);
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('pages/auth/login', {
      title: 'Log In - Saheli Plus',
      errors: ['An error occurred during login. Please try again.'],
      formData: req.body,
      authPage: true,
    });
  }
}

/**
 * Handle OTP login
 */
async function loginOtp(req, res) {
  try {
    const { email, role } = req.body;

    // Validate role
    if (!role || !['saheli', 'customer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Please select your role (Customer or Saheli)',
      });
    }

    // Find user by email AND role
    const user = await User.findByEmail(email, role);
    
    // Generic response to prevent user enumeration
    if (!user || !user.verified) {
      return res.json({
        success: true,
        message: 'If the email exists, a verification code has been sent',
      });
    }

    // Generate OTP and token
    const otp = generateOtp();
    const token = generateToken(32);

    // Create verification token for login
    await VerificationToken.createToken(user._id, 'login_otp', otp, token, 10);

    // Send OTP email
    await sendOtpEmail({ to: email, code: otp, purpose: 'login_otp' });

    res.json({
      success: true,
      message: 'A verification code has been sent to your email',
      token,
      email,
    });
  } catch (error) {
    console.error('OTP login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
    });
  }
}

/**
 * Verify OTP for login
 */
async function verifyLoginOtp(req, res) {
  try {
    const { email, otp, token, role } = req.body;

    // Find user
    const user = await User.findByEmail(email, role);
    if (!user) {
      return res.status(400).render('pages/auth/verify-otp', {
        title: 'Verify OTP - Saheli Plus',
        errors: ['Invalid verification request'],
        email,
        token,
        role,
        authPage: true,
      });
    }

    // Find active verification token
    const verificationToken = await VerificationToken.findOne({
      userId: user._id,
      purpose: 'login_otp',
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!verificationToken) {
      return res.status(400).render('pages/auth/verify-otp', {
        title: 'Verify OTP - Saheli Plus',
        errors: ['Verification code has expired. Please request a new one.'],
        email,
        token,
        role,
        authPage: true,
      });
    }

    // Verify OTP
    const isValid = await verificationToken.verify(otp, token);

    if (isValid) {
      // Mark token as consumed
      verificationToken.consumedAt = new Date();
      await verificationToken.save();

      // Create session
      req.session.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      };

      // Regenerate session ID
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
        }
        
        req.session.user = {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        };

        // Redirect to returnTo if present, else dashboard
        const redirectTo = req.session.returnTo || `/dashboard?role=${user.role}`;
        delete req.session.returnTo;
        res.redirect(redirectTo);
      });
    } else {
      const attemptsLeft = verificationToken.maxAttempts - verificationToken.attempts;
      return res.status(400).render('pages/auth/verify-otp', {
        title: 'Verify OTP - Saheli Plus',
        errors: [`Invalid verification code. ${attemptsLeft} attempts remaining.`],
        email,
        token,
        role,
        authPage: true,
      });
    }
  } catch (error) {
    console.error('Login OTP verification error:', error);
    res.status(500).render('pages/auth/verify-otp', {
      title: 'Verify OTP - Saheli Plus',
      errors: ['An error occurred during verification. Please try again.'],
      email: req.body.email,
      token: req.body.token,
      role: req.body.role,
      authPage: true,
    });
  }
}

/**
 * Handle logout
 */
function logout(req, res) {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/?message=You have been logged out successfully');
  });
}

/**
 * Render forgot password page
 */
function renderForgotPassword(req, res) {
  res.render('pages/auth/forgot-password', {
    title: 'Forgot Password - Saheli Plus',
    authPage: true,
  });
}

/**
 * Handle forgot password request
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    // Find user by email (without role - could be either)
    const user = await User.findByEmail(email);
    
    // Generic message to prevent user enumeration
    const successMessage = 'If an account exists with this email, you will receive a password reset OTP.';

    if (!user) {
      // Don't reveal if user doesn't exist
      return res.render('pages/auth/forgot-password', {
        title: 'Forgot Password - Saheli Plus',
        successMessage,
        authPage: true,
      });
    }

    // Generate OTP and token
    const otp = generateOtp();
    const token = generateToken(32);

    // Invalidate previous password reset tokens
    await VerificationToken.updateMany(
      { userId: user._id, purpose: 'password_reset', consumedAt: null },
      { $set: { consumedAt: new Date() } }
    );

    // Create new password reset token
    await VerificationToken.createToken(user._id, 'password_reset', otp, token, 10);

    // Send OTP email
    await sendOtpEmail({
      to: email,
      code: otp,
      purpose: 'password_reset',
    });

    res.render('pages/auth/forgot-password', {
      title: 'Forgot Password - Saheli Plus',
      successMessage,
      authPage: true,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).render('pages/auth/forgot-password', {
      title: 'Forgot Password - Saheli Plus',
      errors: ['An error occurred. Please try again.'],
      formData: req.body,
      authPage: true,
    });
  }
}

/**
 * Render reset password page
 */
function renderResetPassword(req, res) {
  const { email, token } = req.query;
  
  if (!email || !token) {
    return res.redirect('/auth/forgot-password?error=Invalid reset link');
  }

  res.render('pages/auth/reset-password', {
    title: 'Reset Password - Saheli Plus',
    email,
    token,
    authPage: true,
  });
}

/**
 * Handle reset password
 */
async function resetPassword(req, res) {
  try {
    const { email, token, otp, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(400).render('pages/auth/reset-password', {
        title: 'Reset Password - Saheli Plus',
        errors: ['Invalid reset request'],
        email,
        token,
        authPage: true,
      });
    }

    // Find valid token
    const verificationToken = await VerificationToken.findOne({
      userId: user._id,
      purpose: 'password_reset',
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!verificationToken) {
      return res.status(400).render('pages/auth/reset-password', {
        title: 'Reset Password - Saheli Plus',
        errors: ['Password reset link has expired. Please request a new one.'],
        email,
        token,
        authPage: true,
      });
    }

    // Verify OTP and token
    const isValid = await verificationToken.verify(otp, token);
    if (!isValid) {
      return res.status(400).render('pages/auth/reset-password', {
        title: 'Reset Password - Saheli Plus',
        errors: ['Invalid OTP. Please check and try again.'],
        email,
        token,
        authPage: true,
      });
    }

    // Hash new password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, bcryptRounds);

    // Update user password
    user.passwordHash = passwordHash;
    await user.save();

    // Mark token as consumed
    verificationToken.consumedAt = new Date();
    await verificationToken.save();

    // Redirect to login with success message
    res.redirect('/auth/login?message=Password reset successful! Please log in with your new password.');
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).render('pages/auth/reset-password', {
      title: 'Reset Password - Saheli Plus',
      errors: ['An error occurred. Please try again.'],
      email: req.body.email,
      token: req.body.token,
      authPage: true,
    });
  }
}

module.exports = {
  renderSignupChoice,
  renderSignupSaheli,
  renderSignupCustomer,
  renderLogin,
  renderVerifyOtp,
  signupSaheli,
  signupCustomer,
  verifyOtp,
  resendOtp,
  loginPassword,
  loginOtp,
  verifyLoginOtp,
  logout,
  renderForgotPassword,
  forgotPassword,
  renderResetPassword,
  resetPassword,
};
