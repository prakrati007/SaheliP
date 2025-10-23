# 🧪 Complete Payment Lifecycle Testing Guide

## Table of Contents
1. [Environment Setup](#1-environment-setup)
2. [Test User Accounts](#2-test-user-accounts)
3. [Provider Booking Management UI](#3-provider-booking-management-ui)
4. [Lifecycle State Transitions](#4-lifecycle-state-transitions)
5. [Refund Policy Testing](#5-refund-policy-testing)
6. [Remaining Payment Flow](#6-remaining-payment-flow)
7. [Email Notifications](#7-email-notifications)
8. [Cron Job Automation](#8-cron-job-automation)
9. [Common Issues & Solutions](#9-common-issues--solutions)

---

## 1. Environment Setup

### Start the Application

```bash
# Terminal 1: Start MongoDB (if not running)
mongod

# Terminal 2: Start the application
npm run dev
```

The server should start on `http://localhost:3000` and you should see:
```
✅ Server is running on port 3000
✅ MongoDB connected successfully
✅ Email service is ready
✅ Razorpay initialized successfully
✅ Cron jobs initialized
```

### Verify Cron Jobs Are Running

Check the console logs every 1-5 minutes:
- `[CRON] Cleaned X expired bookings` (every 5 min)
- `[CRON] Auto-started X bookings` (every 1 min)
- `[CRON] Auto-completed X bookings` (every 2 min)
- `[CRON] Sent X reminders` (every 5 min)

---

## 2. Test User Accounts

### Create Test Users

**Saheli (Provider) Account:**
```
Email: provider@test.com
Password: Test@1234
Role: saheli
City: Mumbai
```

**Customer Account:**
```
Email: customer@test.com
Password: Test@1234
Role: customer
City: Mumbai
```

### Steps to Create:
1. Navigate to `http://localhost:3000/auth/signup`
2. Fill in details with role selection
3. Verify email OTP (check console logs for OTP code)
4. Complete profile setup

---

## 3. Provider Booking Management UI

### Access Provider Bookings Page

1. **Login as Saheli user** (`provider@test.com`)
2. Click **"My Bookings"** in the navigation menu
3. Or navigate directly to: `http://localhost:3000/booking/provider/list`

### Expected Features:

#### Filter Tabs
- ✅ **All** - Shows all bookings
- ✅ **Confirmed** - Ready to start
- ✅ **In Progress** - Currently active
- ✅ **Completed** - Finished services
- ✅ **Cancelled** - Cancelled bookings

#### Booking Card Information
Each card displays:
- Booking ID (e.g., #A3B4C5D6)
- Status badge with color coding
- Service title and category
- Customer name and email
- Date and time schedule
- Address (for onsite services)
- Payment summary (total, advance paid, remaining)

#### Available Actions (Based on Status)

**For Confirmed Bookings:**
- 🟢 **Start Service** - Marks booking as InProgress
- 🔴 **Cancel** - Cancels with full refund

**For InProgress Bookings:**
- 🟢 **Mark Complete** - Completes service, triggers remaining payment

**All Bookings:**
- 🔵 **View Details** - Opens full booking page

### Test Scenario: Provider Actions Flow

```
1. Create a booking as customer (advance payment completed)
   Status: Pending → Confirmed

2. Login as provider → Go to "My Bookings"
   ✅ Booking appears in "Confirmed" tab

3. Click "Start Service" (within 30 min of scheduled time)
   ✅ Status changes to "InProgress"
   ✅ Customer receives "Service Started" email
   ✅ Toast notification shows success

4. Click "Mark Complete"
   ✅ Status changes to "Completed"
   ✅ Customer receives "Service Completed" email
   ✅ Customer receives "Payment Due" email (if remaining balance)
   ✅ Provider stats increment (completedBookingsCount)

5. Try to start a booking BEFORE scheduled time
   ✅ Error: "Service can only be started from [time] onwards"
```

---

## 4. Lifecycle State Transitions

### Complete Booking Lifecycle

```
┌─────────┐    Advance Payment    ┌───────────┐
│ Pending ├──────────────────────>│ Confirmed │
└─────────┘                       └─────┬─────┘
                                        │
     ┌──────────────────────────────────┘
     │ Start Service (Manual/Auto)
     │
     ▼
┌────────────┐   Complete (Manual/Auto)   ┌───────────┐
│ InProgress ├───────────────────────────>│ Completed │
└────────────┘                            └───────────┘
     │
     │ Cancel
     ▼
┌───────────┐
│ Cancelled │
└───────────┘
```

### Test Each Transition

#### Pending → Confirmed
```bash
1. Customer books service
2. Completes Razorpay payment
3. Verify payment signature
→ Status: Confirmed, PaymentStatus: AdvancePaid
```

#### Confirmed → InProgress (Manual)
```bash
1. Provider clicks "Start Service" (after scheduled time - 30 min grace)
2. Check booking status in database
→ Status: InProgress, actualStartTime: [timestamp], startedBy: 'provider'
```

#### Confirmed → InProgress (Auto)
```bash
1. Wait 15 minutes after scheduled start time
2. Cron job runs processAutoStart()
→ Status: InProgress, startedBy: 'system'
→ Email sent to customer
```

#### InProgress → Completed (Manual)
```bash
1. Provider clicks "Mark Complete"
2. Check booking status
→ Status: Completed, actualEndTime: [timestamp], completedBy: 'provider'
→ Remaining payment email sent
```

#### InProgress → Completed (Auto)
```bash
1. Wait 30 minutes after scheduled end time
2. Cron job runs processAutoComplete()
→ Status: Completed, completedBy: 'system'
→ Provider completedBookingsCount incremented
→ Emails sent to customer
```

#### Any → Cancelled
```bash
# By Customer
1. Customer cancels before service date
2. Refund calculated based on hours until start
→ Status: Cancelled, cancelledBy: 'customer'
→ Refund processed via Razorpay
→ Cancellation emails sent

# By Provider
1. Provider clicks "Cancel" with reason
2. Full advance refund processed
→ Status: Cancelled, cancelledBy: 'provider'
→ 100% refund, emails sent
```

---

## 5. Refund Policy Testing

### Default Multi-Tier Refund Policy

Test cancellations at different times before the booking:

#### Test 1: >= 48 Hours Before
```bash
Booking: Tomorrow 3:00 PM
Cancel: Today 1:00 PM (50 hours before)
Expected: 100% refund of advance (₹200)
```

**Steps:**
1. Create booking for 50+ hours in future
2. Customer cancels immediately
3. Check `booking.refundAmount` and `booking.refundPercentage`
4. Verify Razorpay refund created
5. Check cancellation email shows "100%"

#### Test 2: 24-48 Hours Before
```bash
Booking: Tomorrow 3:00 PM
Cancel: Today 5:00 PM (34 hours before)
Expected: 75% refund (₹150)
```

#### Test 3: 12-24 Hours Before
```bash
Booking: Tomorrow 3:00 PM
Cancel: Tomorrow 5:00 AM (22 hours before)
Expected: 50% refund (₹100)
```

#### Test 4: 6-12 Hours Before
```bash
Booking: Tomorrow 3:00 PM
Cancel: Tomorrow 5:00 AM (10 hours before)
Expected: 25% refund (₹50)
```

#### Test 5: < 6 Hours Before
```bash
Booking: Tomorrow 3:00 PM
Cancel: Tomorrow 10:00 AM (5 hours before)
Expected: 0% refund (₹0)
```

### Custom Policy Parsing Test

Add a cancellation policy to your service:

```javascript
// In MongoDB or via service creation form
{
  cancellationPolicy: "Full refund 24 hours before. 50% refund up to 12 hours."
}
```

**Test:**
1. Cancel 30 hours before → Expect 100%
2. Cancel 18 hours before → Expect 50%
3. Cancel 6 hours before → Expect 0%

### Verify Refund Processing

```bash
# Check MongoDB
db.bookings.findOne({ _id: ObjectId("...") })

# Look for:
{
  status: "Cancelled",
  cancelledBy: "customer",
  cancellationReason: "...",
  refundAmount: 150,
  refundPercentage: 75,
  refundedAt: ISODate("..."),
  refundId: "rfnd_...",
  paymentStatus: "Refunded" // if full advance refunded
}
```

---

## 6. Remaining Payment Flow

### Test Complete Remaining Payment

#### Setup: Create a Completed Booking
```bash
1. Customer books service (advance paid: ₹200)
2. Provider starts service (or auto-start)
3. Provider completes service (or auto-complete)
→ Customer receives "Payment Due" email
```

#### Access Remaining Payment Page
```bash
Method 1: Email link
- Click "Pay Now" button in "Payment Due" email
- Opens: http://localhost:3000/booking/[id]/remaining-payment

Method 2: Direct navigation
- Navigate to booking details page
- Click "Pay Remaining Balance" button (if implemented)

Method 3: URL
- http://localhost:3000/booking/[bookingId]/remaining-payment
```

#### Complete Payment Flow
```bash
1. Page loads with:
   ✅ Booking summary
   ✅ Amount due prominently displayed (₹600)
   ✅ Payment breakdown (Total: ₹800, Advance: ₹200, Remaining: ₹600)

2. Click "Pay Now" button
   ✅ Creates Razorpay order via POST /booking/:id/remaining/order
   ✅ Razorpay Checkout modal opens

3. Enter test card details:
   Card: 4111 1111 1111 1111
   CVV: 123
   Expiry: Any future date
   Name: Test User

4. Complete payment
   ✅ Verifies via POST /booking/payment/remaining/verify
   ✅ booking.paymentStatus → 'FullyPaid'
   ✅ booking.remainingPaidAt set
   ✅ booking.remainingRazorpayPaymentId set
   ✅ Redirects to booking details with success message
```

#### Verify in Database
```javascript
db.bookings.findOne({ _id: ObjectId("...") })

// Expected:
{
  paymentStatus: "FullyPaid",
  remainingAmount: 600,
  remainingPaidAt: ISODate("..."),
  remainingRazorpayOrderId: "order_...",
  remainingRazorpayPaymentId: "pay_..."
}
```

---

## 7. Email Notifications

### Email Testing Setup

Check your `.env` file for SMTP configuration:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=Saheli Plus <no-reply@saheliplus.com>
```

**For Gmail:** Use an [App Password](https://support.google.com/accounts/answer/185833)

### Email Types to Test

#### 1. Booking Start Notification
**Trigger:** Provider clicks "Start Service" OR auto-start after 15 min grace

**To:** Customer email

**Content Check:**
- ✅ Subject: "Service Started - [Service Name]"
- ✅ Booking ID and service name
- ✅ Provider name
- ✅ "Service is now underway" message
- ✅ Remaining balance amount

#### 2. Booking Complete Notification
**Trigger:** Provider clicks "Mark Complete" OR auto-complete after 30 min grace

**To:** Customer email

**Content Check:**
- ✅ Subject: "Service Completed - [Service Name]"
- ✅ Completion timestamp
- ✅ "Leave Review" CTA button
- ✅ Payment due notice (if remaining)

#### 3. Remaining Payment Prompt
**Trigger:** Same as completion (sent together)

**To:** Customer email

**Content Check:**
- ✅ Subject: "Payment Due - [Service Name]"
- ✅ Large amount due display
- ✅ "Pay Now" button linking to /booking/:id/remaining-payment
- ✅ Booking ID reference

#### 4. Booking Cancellation Email
**Trigger:** Customer OR provider cancels

**To:** Customer AND Provider emails

**Content Check:**
- ✅ Subject: "Booking Cancelled - [Service Name]"
- ✅ Cancelled by whom
- ✅ Cancellation reason
- ✅ Refund box showing amount and percentage
- ✅ "5-7 business days" refund timeline
- ✅ OR "No refund" notice if 0%

#### 5. Booking Reminder Email
**Trigger:** Cron job ~1 hour before service

**To:** Customer AND Provider emails

**Content Check:**
- ✅ Subject: "Reminder: Upcoming Service - [Service Name]"
- ✅ Scheduled date/time
- ✅ Address (if applicable)
- ✅ "Things to remember" checklist
- ✅ "View Booking Details" button

### Email Testing Commands

```bash
# Send test booking confirmation (in Node.js console or route)
const { sendBookingConfirmationEmail } = require('./utils/emailService');
await sendBookingConfirmationEmail({
  to: 'customer@test.com',
  booking: bookingDoc,
  service: serviceDoc,
  provider: providerDoc,
  customer: customerDoc
});

# Check console logs for email status
# ✅ "Booking confirmation email sent to customer@test.com"
# ❌ "Failed to send confirmation email: [error]"
```

---

## 8. Cron Job Automation

### View Cron Job Logs

Keep the server terminal open and watch for:

```bash
# Every 5 minutes
[CRON] Cleaned 3 expired bookings

# Every 1 minute
[CRON] Auto-started 1 bookings

# Every 2 minutes
[CRON] Auto-completed 2 bookings

# Every 5 minutes
[CRON] Sent 5 reminders
```

### Test Auto-Start

**Setup:**
1. Create a booking for exactly 10 minutes from now
2. Complete advance payment (status: Confirmed)
3. Wait for scheduled time + 15 minutes (grace period)
4. Watch console logs

**Expected After ~16 Minutes:**
```bash
[CRON] processAutoStart called
[CRON] Auto-started 1 bookings
Auto-start email sent to customer@test.com
```

**Verify in Database:**
```javascript
{
  status: "InProgress",
  actualStartTime: ISODate("..."),
  startedBy: "system"
}
```

### Test Auto-Complete

**Setup:**
1. Use the booking from auto-start test
2. Wait for scheduled end time + 30 minutes (grace period)
3. Watch console logs

**Expected:**
```bash
[CRON] processAutoComplete called
Provider stat update: completedBookingsCount incremented
Auto-complete email sent to customer@test.com
Remaining payment prompt sent to customer@test.com
[CRON] Auto-completed 1 bookings
```

**Verify in Database:**
```javascript
{
  status: "Completed",
  actualEndTime: ISODate("..."),
  completedBy: "system"
}

// Provider user document
{
  completedBookingsCount: 1 // incremented
}
```

### Test Reminders

**Setup:**
1. Create booking for exactly 65 minutes from now
2. Complete payment (status: Confirmed)
3. Wait ~60 minutes
4. Watch for reminder cron

**Expected After ~60 Min:**
```bash
[CRON] sendBookingReminders called
Booking reminder email sent to customer@test.com
Booking reminder email sent to provider@test.com
[CRON] Sent 1 reminders
```

**Verify in Database:**
```javascript
{
  reminderSent: true,
  reminderSentAt: ISODate("...")
}
```

### Test Expired Booking Cleanup

**Setup:**
1. Create booking but DON'T complete payment
2. Wait 16 minutes (15 min expiry + 1 min cron)
3. Watch console

**Expected:**
```bash
[CRON] Cleaned up expired booking: [bookingId]
[CRON] Cleaned 1 expired booking(s)
```

**Verify:**
```javascript
{
  status: "Cancelled",
  cancelledBy: "system",
  cancellationReason: "Payment not completed within 15 minutes"
}
```

---

## 9. Common Issues & Solutions

### Issue: Cron Jobs Not Running

**Symptoms:** No `[CRON]` logs in console

**Solutions:**
1. Check `server.js` has `initCronJobs()` call
2. Verify `node-cron` is installed: `npm list node-cron`
3. Check for errors in `utils/cronJobs.js`
4. Restart server: `npm run dev`

### Issue: Emails Not Sending

**Symptoms:** "Failed to send email" in logs

**Solutions:**
1. Check `.env` SMTP configuration
2. For Gmail: Enable "Less secure app access" or use App Password
3. Test SMTP connection:
   ```javascript
   const nodemailer = require('nodemailer');
   const transporter = nodemailer.createTransport({...});
   transporter.verify((error, success) => {
     console.log(error || 'SMTP Ready');
   });
   ```
4. Check firewall/antivirus blocking port 587

### Issue: "Service can only be started from [time] onwards"

**Cause:** Time gating prevents starting too early

**Solutions:**
1. Wait until 30 minutes before scheduled start
2. OR temporarily disable check in `startBooking()` for testing:
   ```javascript
   // Comment out time check
   // if (new Date() < earlyStartThreshold) { ... }
   ```

### Issue: Razorpay Payment Fails

**Symptoms:** "Invalid signature" or payment not captured

**Solutions:**
1. Verify Razorpay keys in `.env`:
   ```env
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=...
   ```
2. Use test mode keys (starts with `rzp_test_`)
3. Use test card: `4111 1111 1111 1111`
4. Check webhook signature verification in `handleWebhook()`

### Issue: "Cannot GET /booking/provider/list"

**Cause:** Route order issue - `/:id` catching before `/provider/list`

**Solution:** Route is already fixed in `routes/booking.js` with specific routes before param routes

### Issue: Refund Amount is 0 When It Should Be Higher

**Cause:** Cancellation policy parsing or time calculation issue

**Debug:**
```javascript
// Add console.log in utils/helpers.js → calculateRefundAmount
console.log('Hours until booking:', hours);
console.log('Parsed policy:', percentage);
console.log('Calculated refund:', amount);
```

**Check:**
1. `booking.date` and `booking.startTime` are correct
2. `getHoursUntilBooking()` returns positive number
3. `service.cancellationPolicy` string is valid

### Issue: Provider Stats Not Updating

**Cause:** User model doesn't have `completedBookingsCount` field

**Solution:**
```javascript
// In MongoDB or user model
db.users.updateMany(
  { role: 'saheli' },
  { $set: { completedBookingsCount: 0 } }
);

// Or add to User schema if missing
completedBookingsCount: { type: Number, default: 0 }
```

---

## Quick Test Checklist

Use this for rapid verification:

- [ ] Server starts without errors
- [ ] Can create Saheli and Customer accounts
- [ ] Service creation works
- [ ] Booking with Razorpay payment succeeds
- [ ] Provider sees booking in "My Bookings"
- [ ] Can start service (manual)
- [ ] Can complete service (manual)
- [ ] Completion sends remaining payment email
- [ ] Remaining payment page loads and payment works
- [ ] Customer cancellation calculates correct refund
- [ ] Provider cancellation gives 100% refund
- [ ] Reminder emails sent ~1 hour before
- [ ] Auto-start works 15 min after scheduled time
- [ ] Auto-complete works 30 min after end time
- [ ] Expired bookings cleaned up after 15 min

---

## Advanced Testing

### Load Testing Cron Jobs

```javascript
// Create multiple test bookings at once
for (let i = 0; i < 10; i++) {
  // Create booking starting in 5 minutes
  // Create booking starting in 65 minutes (for reminders)
}

// Watch cron process multiple bookings in one cycle
```

### Test Concurrent Actions

```javascript
// Two providers try to start same booking
// Expected: Second request fails with "Not your booking"

// Customer and provider cancel simultaneously
// Expected: First one succeeds, second fails with "Already cancelled"
```

### Test Email Queue

```javascript
// Trigger multiple emails rapidly
// Verify all are sent without blocking
// Check email rate limits aren't exceeded
```

---

## Testing Summary

**Total Test Scenarios:** 30+
**Estimated Testing Time:** 2-3 hours (including wait times for cron jobs)
**Critical Path:** 
1. Create accounts → 2. Book service → 3. Start → 4. Complete → 5. Pay remaining

**Success Criteria:**
✅ All lifecycle transitions work
✅ Emails sent at correct times
✅ Refunds calculated accurately
✅ Cron jobs run without errors
✅ UI responsive and functional
✅ No console errors

---

## Need Help?

**Check Logs:**
```bash
# Server logs
npm run dev

# MongoDB logs
mongod --logpath /path/to/mongodb.log

# Check specific booking
db.bookings.find({ _id: ObjectId("...") }).pretty()
```

**Common Debugging:**
```javascript
// Add to any controller
console.log('DEBUG:', JSON.stringify(booking, null, 2));
console.log('User session:', req.session.user);
console.log('Request body:', req.body);
```

Happy Testing! 🚀
