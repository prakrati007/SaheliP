const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Verify transporter configuration on startup
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter.verify((error) => {
    if (error) {
      console.error('Email service configuration error:', error.message);
    } else {
      console.log('Email service is ready to send messages');
    }
  });
}

/**
 * Send OTP verification email
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.code - 6-digit OTP code
 * @param {string} params.purpose - Purpose of OTP (email_verify, login_otp, password_reset)
 * @returns {Promise<void>}
 */
async function sendOtpEmail({ to, code, purpose }) {
  const subjects = {
    email_verify: 'Verify Your Email - Saheli Plus',
    login_otp: 'Your Login Code - Saheli Plus',
    password_reset: 'Reset Your Password - Saheli Plus',
  };

  const titles = {
    email_verify: 'Email Verification',
    login_otp: 'Login Verification',
    password_reset: 'Password Reset',
  };

  const subject = subjects[purpose] || 'Verification Code - Saheli Plus';
  const title = titles[purpose] || 'Verification Code';

  const mailOptions = {
    from: process.env.MAIL_FROM || 'Saheli Plus <no-reply@saheliplus.com>',
    to,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #F9C5D1 0%, #F6A5C0 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: #333; margin: 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #E0E0E0; border-top: none; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #F6A5C0; text-align: center; padding: 20px; background: #FFF9F8; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .warning { background: #FFF3CD; border-left: 4px solid #FFB6A3; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Saheli Plus</h1>
          </div>
          <div class="content">
            <h2>${title}</h2>
            <p>Hello,</p>
            <p>Your verification code is:</p>
            <div class="otp-code">${code}</div>
            <p>This code will expire in <strong>10 minutes</strong>.</p>
            <div class="warning">
              <strong>Security Notice:</strong> Never share this code with anyone. Saheli Plus staff will never ask for your verification code.
            </div>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Saheli Plus. All rights reserved.</p>
            <p>Empowering Women, One Service at a Time</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Saheli Plus - ${title}
      
      Your verification code is: ${code}
      
      This code will expire in 10 minutes.
      
      Security Notice: Never share this code with anyone. Saheli Plus staff will never ask for your verification code.
      
      If you didn't request this code, please ignore this email.
      
      © ${new Date().getFullYear()} Saheli Plus. All rights reserved.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent to ${to} for ${purpose}`);
  } catch (error) {
    console.error('Failed to send OTP email:', error.message);
    // Don't throw error to prevent auth flow interruption
  }
}

/**
 * Send welcome email after successful verification
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.name - User's name
 * @param {string} params.role - User's role (saheli or customer)
 * @returns {Promise<void>}
 */
async function sendWelcomeEmail({ to, name, role }) {
  const roleMessages = {
    saheli: 'You can now start listing your services and connecting with customers!',
    customer: 'You can now browse and book services from trusted providers!',
  };

  const mailOptions = {
    from: process.env.MAIL_FROM || 'Saheli Plus <no-reply@saheliplus.com>',
    to,
    subject: 'Welcome to Saheli Plus!',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #F9C5D1 0%, #F6A5C0 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: #333; margin: 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #E0E0E0; border-top: none; }
          .button { display: inline-block; padding: 12px 24px; background: #F6A5C0; color: #fff; text-decoration: none; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Saheli Plus!</h1>
          </div>
          <div class="content">
            <h2>Hello ${name}! 👋</h2>
            <p>Thank you for joining Saheli Plus - your trusted women's service marketplace.</p>
            <p>${roleMessages[role]}</p>
            <p>Here's what you can do next:</p>
            <ul>
              <li>Complete your profile</li>
              <li>${role === 'saheli' ? 'List your first service' : 'Browse available services'}</li>
              <li>Connect with the community</li>
            </ul>
            <center>
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">Go to Dashboard</a>
            </center>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Saheli Plus. All rights reserved.</p>
            <p>Empowering Women, One Service at a Time</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Welcome to Saheli Plus!
      
      Hello ${name}!
      
      Thank you for joining Saheli Plus - your trusted women's service marketplace.
      
      ${roleMessages[role]}
      
      © ${new Date().getFullYear()} Saheli Plus. All rights reserved.
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send welcome email:', error.message);
  }
}

/**
 * Send password reset email
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {string} params.code - Reset code
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail({ to, code }) {
  return sendOtpEmail({ to, code, purpose: 'password_reset' });
}

/**
 * Send booking confirmation email
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {Object} params.booking - Booking document
 * @param {Object} params.service - Service document
 * @param {Object} params.provider - Provider user document
 * @param {Object} params.customer - Customer user document
 * @returns {Promise<void>}
 */
async function sendBookingConfirmationEmail({ to, booking, service, provider, customer }) {
  const { formatBookingDateTime } = require('./helpers');
  
  const bookingDateTime = formatBookingDateTime(booking.date, booking.startTime, booking.endTime);
  const bookingId = booking._id.toString().slice(-8).toUpperCase();

  const mailOptions = {
    from: process.env.MAIL_FROM || 'Saheli Plus <no-reply@saheliplus.com>',
    to,
    subject: `Booking Confirmed - ${service.title} - Saheli Plus`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #F9C5D1 0%, #F6A5C0 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: #333; margin: 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #E0E0E0; border-top: none; }
          .booking-id { display: inline-block; background: #F9C5D1; padding: 8px 16px; border-radius: 6px; font-weight: bold; color: #333; margin: 10px 0; }
          .section { background: #FFF9F8; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .section-title { font-size: 18px; font-weight: bold; color: #F6A5C0; margin-bottom: 15px; border-bottom: 2px solid #F9C5D1; padding-bottom: 8px; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F0F0F0; }
          .detail-label { font-weight: 600; color: #666; }
          .detail-value { color: #333; text-align: right; }
          .price-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .price-total { font-size: 20px; font-weight: bold; color: #F6A5C0; border-top: 2px solid #F9C5D1; padding-top: 12px; margin-top: 8px; }
          .badge { display: inline-block; background: #4CAF50; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .button { display: inline-block; padding: 14px 28px; background: #F6A5C0; color: #fff; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          .info-box { background: #E3F2FD; border-left: 4px solid #2196F3; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Saheli Plus</h1>
          </div>
          <div class="content">
            <h2>🎉 Booking Confirmed!</h2>
            <p>Dear ${customer.name},</p>
            <p>Your booking has been confirmed successfully. Here are your booking details:</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <div class="booking-id">Booking ID: #${bookingId}</div>
              <div class="badge">Advance Paid</div>
            </div>

            <div class="section">
              <div class="section-title">Service Details</div>
              <div class="detail-row">
                <span class="detail-label">Service</span>
                <span class="detail-value">${service.title}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Category</span>
                <span class="detail-value">${service.category}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Date & Time</span>
                <span class="detail-value">${bookingDateTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration</span>
                <span class="detail-value">${booking.duration} hour${booking.duration !== 1 ? 's' : ''}</span>
              </div>
              ${booking.address ? `
              <div class="detail-row">
                <span class="detail-label">Address</span>
                <span class="detail-value">${booking.address}</span>
              </div>
              ` : ''}
            </div>

            <div class="section">
              <div class="section-title">Provider Information</div>
              <div class="detail-row">
                <span class="detail-label">Provider</span>
                <span class="detail-value">${provider.name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Email</span>
                <span class="detail-value">${provider.email}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Location</span>
                <span class="detail-value">${provider.city || service.city}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Payment Summary</div>
              <div class="price-row">
                <span class="detail-label">Base Amount</span>
                <span class="detail-value">₹${booking.baseAmount.toFixed(2)}</span>
              </div>
              ${booking.travelFee > 0 ? `
              <div class="price-row">
                <span class="detail-label">Travel Fee</span>
                <span class="detail-value">₹${booking.travelFee.toFixed(2)}</span>
              </div>
              ` : ''}
              ${booking.weekendPremium > 0 ? `
              <div class="price-row">
                <span class="detail-label">Weekend Premium</span>
                <span class="detail-value">₹${booking.weekendPremium.toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="price-row price-total">
                <span>Total Amount</span>
                <span>₹${booking.totalAmount.toFixed(2)}</span>
              </div>
              <div class="price-row" style="color: #4CAF50;">
                <span class="detail-label">✓ Advance Paid (${booking.advancePercentage}%)</span>
                <span class="detail-value">₹${booking.advancePaid.toFixed(2)}</span>
              </div>
              <div class="price-row" style="color: #FF9800;">
                <span class="detail-label">Remaining Balance</span>
                <span class="detail-value">₹${booking.remainingAmount.toFixed(2)}</span>
              </div>
            </div>

            <div class="info-box">
              <strong>What's Next?</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>${provider.name} will contact you before the service date</li>
                <li>The remaining balance of ₹${booking.remainingAmount.toFixed(2)} will be collected after service completion</li>
                <li>You can view and manage your booking in your dashboard</li>
                <li>For cancellations, please check the cancellation policy: ${service.cancellationPolicy || 'Contact provider for details'}</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/booking/${booking._id}" class="button">View Booking Details</a>
            </div>

            <p>Thank you for choosing Saheli Plus!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Saheli Plus. All rights reserved.</p>
            <p>Empowering Women, One Service at a Time</p>
            <p style="font-size: 12px; margin-top: 10px;">
              Questions? Contact us at <a href="mailto:support@saheliplus.com" style="color: #F6A5C0;">support@saheliplus.com</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      Saheli Plus - Booking Confirmed
      
      Dear ${customer.name},
      
      Your booking has been confirmed successfully!
      
      Booking ID: #${bookingId}
      Payment Status: Advance Paid
      
      SERVICE DETAILS
      ---------------
      Service: ${service.title}
      Category: ${service.category}
      Date & Time: ${bookingDateTime}
      Duration: ${booking.duration} hour${booking.duration !== 1 ? 's' : ''}
      ${booking.address ? `Address: ${booking.address}` : ''}
      
      PROVIDER INFORMATION
      --------------------
      Provider: ${provider.name}
      Email: ${provider.email}
      Location: ${provider.city || service.city}
      
      PAYMENT SUMMARY
      ---------------
      Base Amount: ₹${booking.baseAmount.toFixed(2)}
      ${booking.travelFee > 0 ? `Travel Fee: ₹${booking.travelFee.toFixed(2)}` : ''}
      ${booking.weekendPremium > 0 ? `Weekend Premium: ₹${booking.weekendPremium.toFixed(2)}` : ''}
      Total Amount: ₹${booking.totalAmount.toFixed(2)}
      Advance Paid (${booking.advancePercentage}%): ₹${booking.advancePaid.toFixed(2)}
      Remaining Balance: ₹${booking.remainingAmount.toFixed(2)}
      
      WHAT'S NEXT?
      ------------
      - ${provider.name} will contact you before the service date
      - The remaining balance will be collected after service completion
      - You can view your booking at: ${process.env.APP_URL || 'http://localhost:3000'}/booking/${booking._id}
      - Cancellation Policy: ${service.cancellationPolicy || 'Contact provider for details'}
      
      Thank you for choosing Saheli Plus!
      
      © ${new Date().getFullYear()} Saheli Plus. All rights reserved.
      Questions? Contact us at support@saheliplus.com
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Booking confirmation email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send booking confirmation email:', error.message);
    // Don't throw to prevent booking flow interruption
  }
}

/**
 * Send booking start notification
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {Object} params.booking - Booking document
 * @param {Object} params.service - Service document
 * @param {Object} params.provider - Provider user document
 * @param {Object} params.customer - Customer user document
 * @param {boolean} params.isAuto - Whether this was auto-started
 * @returns {Promise<void>}
 */
async function sendBookingStartNotification({ to, booking, service, provider, customer, isAuto = false }) {
  const { formatBookingDateTime } = require('./helpers');
  const bookingDateTime = formatBookingDateTime(booking.date, booking.startTime, booking.endTime);
  const bookingId = booking._id.toString().slice(-8).toUpperCase();
  const startMethod = isAuto ? 'automatically started' : `started by ${provider.name}`;

  const mailOptions = {
    from: process.env.MAIL_FROM || 'Saheli Plus <no-reply@saheliplus.com>',
    to,
    subject: `Service Started - ${service.title} - Saheli Plus`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #45A049 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: #fff; margin: 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #E0E0E0; border-top: none; }
          .badge { display: inline-block; background: #4CAF50; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .section { background: #F1F8E9; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Service In Progress</h1>
          </div>
          <div class="content">
            <h2>Hello ${customer.name}!</h2>
            <p>Your booking #${bookingId} for <strong>${service.title}</strong> has been ${startMethod}.</p>
            <div class="section">
              <p><strong>Scheduled:</strong> ${bookingDateTime}</p>
              <p><strong>Provider:</strong> ${provider.name}</p>
              <p><strong>Status:</strong> <span class="badge">In Progress</span></p>
            </div>
            <p>${isAuto ? 'The service is now underway as scheduled.' : `${provider.name} has marked the service as started.`}</p>
            <p>The remaining balance of ₹${booking.remainingAmount.toFixed(2)} will be collected after completion.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Saheli Plus. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Service Started - ${service.title}\n\nHello ${customer.name}!\n\nYour booking #${bookingId} for ${service.title} has been ${startMethod}.\n\nScheduled: ${bookingDateTime}\nProvider: ${provider.name}\nStatus: In Progress\n\nThe remaining balance of ₹${booking.remainingAmount.toFixed(2)} will be collected after completion.`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Booking start notification sent to ${to}`);
  } catch (error) {
    console.error('Failed to send booking start notification:', error.message);
  }
}

/**
 * Send booking complete notification
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {Object} params.booking - Booking document
 * @param {Object} params.service - Service document
 * @param {Object} params.provider - Provider user document
 * @param {Object} params.customer - Customer user document
 * @param {boolean} params.isAuto - Whether this was auto-completed
 * @returns {Promise<void>}
 */
async function sendBookingCompleteNotification({ to, booking, service, provider, customer, isAuto = false }) {
  const { formatBookingDateTime } = require('./helpers');
  const bookingDateTime = formatBookingDateTime(booking.date, booking.startTime, booking.endTime);
  const bookingId = booking._id.toString().slice(-8).toUpperCase();
  const completeMethod = isAuto ? 'automatically marked as complete' : `completed by ${provider.name}`;

  const mailOptions = {
    from: process.env.MAIL_FROM || 'Saheli Plus <no-reply@saheliplus.com>',
    to,
    subject: `Service Completed - ${service.title} - Saheli Plus`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: #fff; margin: 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #E0E0E0; border-top: none; }
          .badge { display: inline-block; background: #2196F3; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .section { background: #E3F2FD; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; padding: 14px 28px; background: #2196F3; color: #fff; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Service Completed</h1>
          </div>
          <div class="content">
            <h2>Hello ${customer.name}!</h2>
            <p>Your booking #${bookingId} for <strong>${service.title}</strong> has been ${completeMethod}.</p>
            <div class="section">
              <p><strong>Service:</strong> ${service.title}</p>
              <p><strong>Provider:</strong> ${provider.name}</p>
              <p><strong>Completed:</strong> ${new Date(booking.actualEndTime).toLocaleString()}</p>
              <p><strong>Status:</strong> <span class="badge">Completed</span></p>
            </div>
            <p>We hope you enjoyed the service! Your feedback helps us improve.</p>
            ${booking.remainingAmount > 0 ? `<p style="color: #FF9800;"><strong>Payment Due:</strong> ₹${booking.remainingAmount.toFixed(2)} remaining balance</p>` : ''}
            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/booking/${booking._id}" class="button">View Booking & Leave Review</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Saheli Plus. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Service Completed - ${service.title}\n\nHello ${customer.name}!\n\nYour booking #${bookingId} for ${service.title} has been ${completeMethod}.\n\nProvider: ${provider.name}\nCompleted: ${new Date(booking.actualEndTime).toLocaleString()}\n\n${booking.remainingAmount > 0 ? `Payment Due: ₹${booking.remainingAmount.toFixed(2)} remaining balance\n\n` : ''}We hope you enjoyed the service!`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Booking complete notification sent to ${to}`);
  } catch (error) {
    console.error('Failed to send booking complete notification:', error.message);
  }
}

/**
 * Send booking cancellation email with refund info
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {Object} params.booking - Booking document
 * @param {Object} params.service - Service document
 * @param {Object} params.provider - Provider user document
 * @param {Object} params.customer - Customer user document
 * @param {Object} params.refundInfo - Refund details {amount, percentage}
 * @returns {Promise<void>}
 */
async function sendBookingCancellationEmail({ to, booking, service, provider, customer, refundInfo = null }) {
  const { formatBookingDateTime } = require('./helpers');
  const bookingDateTime = formatBookingDateTime(booking.date, booking.startTime, booking.endTime);
  const bookingId = booking._id.toString().slice(-8).toUpperCase();
  const cancelledBy = booking.cancelledBy === 'customer' ? 'You' : (booking.cancelledBy === 'provider' ? provider.name : 'System');

  const mailOptions = {
    from: process.env.MAIL_FROM || 'Saheli Plus <no-reply@saheliplus.com>',
    to,
    subject: `Booking Cancelled - ${service.title} - Saheli Plus`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF5722 0%, #E64A19 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: #fff; margin: 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #E0E0E0; border-top: none; }
          .badge { display: inline-block; background: #FF5722; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
          .section { background: #FFF3E0; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .refund-box { background: #E8F5E9; border: 2px solid #4CAF50; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Cancelled</h1>
          </div>
          <div class="content">
            <h2>Hello ${customer.name},</h2>
            <p>Your booking #${bookingId} for <strong>${service.title}</strong> has been cancelled.</p>
            <div class="section">
              <p><strong>Service:</strong> ${service.title}</p>
              <p><strong>Provider:</strong> ${provider.name}</p>
              <p><strong>Was Scheduled:</strong> ${bookingDateTime}</p>
              <p><strong>Cancelled By:</strong> ${cancelledBy}</p>
              ${booking.cancellationReason ? `<p><strong>Reason:</strong> ${booking.cancellationReason}</p>` : ''}
              <p><strong>Status:</strong> <span class="badge">Cancelled</span></p>
            </div>
            ${refundInfo && refundInfo.amount > 0 ? `
            <div class="refund-box">
              <h3 style="color: #4CAF50; margin-top: 0;">💰 Refund Initiated</h3>
              <p style="font-size: 24px; font-weight: bold; color: #333; margin: 10px 0;">₹${refundInfo.amount.toFixed(2)}</p>
              <p style="color: #666;">Refund Percentage: ${refundInfo.percentage}%</p>
              <p style="font-size: 14px; color: #666;">The refund will be processed to your original payment method within 5-7 business days.</p>
            </div>
            ` : `
            <div class="section">
              <p style="color: #FF9800;"><strong>No Refund:</strong> The cancellation was made outside the refund window per the cancellation policy.</p>
            </div>
            `}
            <p>If you have any questions, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Saheli Plus. All rights reserved.</p>
            <p>Questions? Contact us at <a href="mailto:support@saheliplus.com" style="color: #FF5722;">support@saheliplus.com</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Booking Cancelled - ${service.title}\n\nHello ${customer.name},\n\nYour booking #${bookingId} for ${service.title} has been cancelled.\n\nService: ${service.title}\nProvider: ${provider.name}\nWas Scheduled: ${bookingDateTime}\nCancelled By: ${cancelledBy}\n${booking.cancellationReason ? `Reason: ${booking.cancellationReason}\n` : ''}\n${refundInfo && refundInfo.amount > 0 ? `\nREFUND INITIATED\nAmount: ₹${refundInfo.amount.toFixed(2)} (${refundInfo.percentage}%)\nThe refund will be processed within 5-7 business days.` : '\nNo refund applicable per cancellation policy.'}`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Booking cancellation email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send booking cancellation email:', error.message);
  }
}

/**
 * Send booking reminder email
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {Object} params.booking - Booking document
 * @param {Object} params.service - Service document
 * @param {Object} params.provider - Provider user document
 * @param {Object} params.customer - Customer user document
 * @returns {Promise<void>}
 */
async function sendBookingReminderEmail({ to, booking, service, provider, customer }) {
  const { formatBookingDateTime } = require('./helpers');
  const bookingDateTime = formatBookingDateTime(booking.date, booking.startTime, booking.endTime);
  const bookingId = booking._id.toString().slice(-8).toUpperCase();

  const mailOptions = {
    from: process.env.MAIL_FROM || 'Saheli Plus <no-reply@saheliplus.com>',
    to,
    subject: `Reminder: Upcoming Service - ${service.title} - Saheli Plus`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: #fff; margin: 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #E0E0E0; border-top: none; }
          .reminder-box { background: #FFF3E0; border-left: 4px solid #FF9800; padding: 20px; margin: 20px 0; }
          .section { background: #FFFDE7; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; padding: 14px 28px; background: #FF9800; color: #fff; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Upcoming Service Reminder</h1>
          </div>
          <div class="content">
            <h2>Hello ${customer.name}!</h2>
            <div class="reminder-box">
              <p style="font-size: 18px; margin: 0;"><strong>Your service is coming up soon!</strong></p>
            </div>
            <p>This is a friendly reminder about your upcoming booking:</p>
            <div class="section">
              <p><strong>Booking ID:</strong> #${bookingId}</p>
              <p><strong>Service:</strong> ${service.title}</p>
              <p><strong>Provider:</strong> ${provider.name}</p>
              <p><strong>Scheduled:</strong> ${bookingDateTime}</p>
              ${booking.address ? `<p><strong>Address:</strong> ${booking.address}</p>` : ''}
              ${booking.remainingAmount > 0 ? `<p><strong>Remaining Balance:</strong> ₹${booking.remainingAmount.toFixed(2)} (to be paid after service)</p>` : ''}
            </div>
            <p><strong>Things to remember:</strong></p>
            <ul>
              <li>Make sure you're available at the scheduled time</li>
              <li>${provider.name} may contact you before the appointment</li>
              <li>Have any necessary materials or information ready</li>
              ${booking.address ? '<li>Ensure the address is accessible</li>' : ''}
            </ul>
            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/booking/${booking._id}" class="button">View Booking Details</a>
            </div>
            <p>Looking forward to serving you!</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Saheli Plus. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Upcoming Service Reminder - ${service.title}\n\nHello ${customer.name}!\n\nThis is a friendly reminder about your upcoming booking:\n\nBooking ID: #${bookingId}\nService: ${service.title}\nProvider: ${provider.name}\nScheduled: ${bookingDateTime}\n${booking.address ? `Address: ${booking.address}\n` : ''}${booking.remainingAmount > 0 ? `Remaining Balance: ₹${booking.remainingAmount.toFixed(2)}\n` : ''}\nLooking forward to serving you!`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Booking reminder email sent to ${to}`);
  } catch (error) {
    console.error('Failed to send booking reminder email:', error.message);
  }
}

/**
 * Send remaining payment prompt email
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {Object} params.booking - Booking document
 * @param {Object} params.service - Service document
 * @param {Object} params.customer - Customer user document
 * @returns {Promise<void>}
 */
async function sendRemainingPaymentPrompt({ to, booking, service, customer }) {
  const bookingId = booking._id.toString().slice(-8).toUpperCase();

  const mailOptions = {
    from: process.env.MAIL_FROM || 'Saheli Plus <no-reply@saheliplus.com>',
    to,
    subject: `Payment Due - ${service.title} - Saheli Plus`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { color: #fff; margin: 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #E0E0E0; border-top: none; }
          .payment-box { background: #F3E5F5; border: 2px solid #9C27B0; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
          .button { display: inline-block; padding: 14px 28px; background: #9C27B0; color: #fff; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💳 Payment Due</h1>
          </div>
          <div class="content">
            <h2>Hello ${customer.name}!</h2>
            <p>Thank you for using Saheli Plus! Your service for <strong>${service.title}</strong> has been completed.</p>
            <div class="payment-box">
              <h3 style="color: #9C27B0; margin-top: 0;">Remaining Balance Due</h3>
              <p style="font-size: 32px; font-weight: bold; color: #333; margin: 10px 0;">₹${booking.remainingAmount.toFixed(2)}</p>
              <p style="color: #666;">Booking ID: #${bookingId}</p>
            </div>
            <p>Please complete your remaining payment at your earliest convenience.</p>
            <div style="text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/booking/${booking._id}/remaining-payment" class="button">Pay Now</a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">If you've already made the payment, please disregard this email. If you have any questions, contact our support team.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Saheli Plus. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Payment Due - ${service.title}\n\nHello ${customer.name}!\n\nYour service has been completed. Please complete your remaining payment:\n\nAmount Due: ₹${booking.remainingAmount.toFixed(2)}\nBooking ID: #${bookingId}\n\nPay now at: ${process.env.APP_URL || 'http://localhost:3000'}/booking/${booking._id}/remaining-payment`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Remaining payment prompt sent to ${to}`);
  } catch (error) {
    console.error('Failed to send remaining payment prompt:', error.message);
  }
}

module.exports = {
  transporter,
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendBookingConfirmationEmail,
  sendBookingStartNotification,
  sendBookingCompleteNotification,
  sendBookingCancellationEmail,
  sendBookingReminderEmail,
  sendRemainingPaymentPrompt,
  // Review notifications
  sendNewReviewNotification: async function({ to, provider, service, review, customer }) {
    const { formatReviewDate, getStarRatingHTML } = require('./helpers');
    const created = formatReviewDate(review.createdAt);
    const stars = getStarRatingHTML(review.rating);

    const mailOptions = {
      from: process.env.MAIL_FROM || 'Saheli Plus <no-reply@saheliplus.com>',
      to,
      subject: `New Review on ${service.title} - ${review.rating}/5 ⭐`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #F9C5D1 0%, #F6A5C0 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 24px; border: 1px solid #E0E0E0; border-top: none; }
            .review { background: #FFF9F8; border-left: 4px solid #F6A5C0; padding: 16px; border-radius: 6px; }
            .meta { color: #777; font-size: 13px; margin-top: 8px; }
            .button { display: inline-block; padding: 12px 20px; background: #F6A5C0; color: #fff; text-decoration: none; border-radius: 8px; margin-top: 16px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>New Review Received</h2>
            </div>
            <div class="content">
              <p>Hello ${provider.name},</p>
              <p>You received a new review on your service <strong>${service.title}</strong>.</p>
              <div class="review">
                <div>${stars}</div>
                <p style="margin: 8px 0 0 0;">${review.reviewText}</p>
                <div class="meta">by ${customer.name} • ${created}</div>
              </div>
              <a class="button" href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard?role=saheli">View in Dashboard</a>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `New review on ${service.title}\nRating: ${review.rating}/5\nBy: ${customer.name}\nWhen: ${created}\n\n${review.reviewText}\n\nView: ${(process.env.APP_URL || 'http://localhost:3000') + '/dashboard?role=saheli'}`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`New review notification sent to ${to}`);
    } catch (err) {
      console.error('Failed to send new review notification:', err.message);
    }
  },
  sendReviewConfirmation: async function({ to, customer, service, review }) {
    const { formatReviewDate, getStarRatingHTML } = require('./helpers');
    const created = formatReviewDate(review.createdAt);
    const stars = getStarRatingHTML(review.rating);

    const mailOptions = {
      from: process.env.MAIL_FROM || 'Saheli Plus <no-reply@saheliplus.com>',
      to,
      subject: `Thanks for reviewing ${service.title} - ${review.rating}/5 ⭐`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 24px; border: 1px solid #E0E0E0; border-top: none; }
            .review { background: #F9FFF9; border-left: 4px solid #81C784; padding: 16px; border-radius: 6px; }
            .meta { color: #777; font-size: 13px; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Thanks for your review!</h2>
            </div>
            <div class="content">
              <p>Hi ${customer.name},</p>
              <p>Thanks for reviewing <strong>${service.title}</strong>. Here's a copy of your review:</p>
              <div class="review">
                <div>${stars}</div>
                <p style="margin: 8px 0 0 0;">${review.reviewText}</p>
                <div class="meta">Submitted ${created}</div>
              </div>
              <p>You can edit your review within 24 hours if needed.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Thanks for reviewing ${service.title}\nRating: ${review.rating}/5\nSubmitted: ${created}\n\n${review.reviewText}`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Review confirmation email sent to ${to}`);
    } catch (err) {
      console.error('Failed to send review confirmation:', err.message);
    }
  },
  sendProviderReplyNotification: async function({ to, customer, service, provider, review }) {
    const { formatReviewDate } = require('./helpers');
    const repliedAt = formatReviewDate(review.repliedAt || new Date());

    const mailOptions = {
      from: process.env.MAIL_FROM || 'Saheli Plus <no-reply@saheliplus.com>',
      to,
      subject: `${provider.name} replied to your review on ${service.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #BBDEFB 0%, #90CAF9 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #fff; padding: 24px; border: 1px solid #E0E0E0; border-top: none; }
            .box { background: #E3F2FD; padding: 16px; border-radius: 6px; }
            .meta { color: #777; font-size: 13px; margin-top: 8px; }
            .button { display: inline-block; padding: 12px 20px; background: #2196F3; color: #fff; text-decoration: none; border-radius: 8px; margin-top: 16px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Provider replied to your review</h2>
            </div>
            <div class="content">
              <p>Hi ${customer.name},</p>
              <p><strong>${provider.name}</strong> replied to your review on <strong>${service.title}</strong>.</p>
              <div class="box">
                <p style="margin: 0; white-space: pre-line;">${review.providerReply}</p>
                <div class="meta">Replied ${repliedAt}</div>
              </div>
              <a class="button" href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard?role=customer">View conversation</a>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `${provider.name} replied to your review on ${service.title}\n\n${review.providerReply}\n\nReplied ${repliedAt}`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Provider reply notification sent to ${to}`);
    } catch (err) {
      console.error('Failed to send provider reply notification:', err.message);
    }
  }
};

