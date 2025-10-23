# Payment Integration Testing Guide

This guide walks you through testing the complete booking and payment flow with Razorpay integration.

---

## Prerequisites

### 1. Razorpay Account Setup
- Log in to [Razorpay Dashboard](https://dashboard.razorpay.com/)
- Navigate to **Settings** → **API Keys** → copy your **Key ID** and **Key Secret**
- Add them to your `.env` file:
  ```
  RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
  RAZORPAY_KEY_SECRET=your_secret_key_here
  RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
  ```

### 2. Webhook Configuration (for local testing)
- Install ngrok: `npm install -g ngrok` or download from [ngrok.com](https://ngrok.com/)
- Start your server: `npm run dev` (runs on port 3000)
- In a separate terminal, run: `ngrok http 3000`
- Copy the HTTPS forwarding URL (e.g., `https://abc123.ngrok.io`)
- In Razorpay Dashboard → **Settings** → **Webhooks**:
  - Click **Create New Webhook**
  - **Webhook URL**: `https://abc123.ngrok.io/booking/webhook/razorpay`
  - **Secret**: Copy the generated secret to your `.env` as `RAZORPAY_WEBHOOK_SECRET`
  - **Events**: Enable these events:
    - `payment.authorized`
    - `payment.captured`
    - `payment.failed`
    - `order.paid`
    - `refund.created`
    - `refund.processed`

### 3. Database & Email Service
- Ensure MongoDB is running and connected
- Verify email service (nodemailer) is configured in `.env`
- Check server logs on startup for:
  ```
  ✓ MongoDB Connected
  ✓ Email service is ready
  ✓ Server is running on port 3000
  ```

---

## Test Scenarios

### Scenario 1: Complete Customer Booking Flow (Recommended)

**Step 1: Create Test Accounts**
1. Go to `http://localhost:3000/auth/signup`
2. Sign up as a **Saheli**:
   - Name: Test Provider
   - Email: provider@test.com
   - Password: Test@123
   - City: Mumbai
   - Pincode: 400001
3. Verify email with OTP sent to your inbox
4. Log out
5. Sign up as a **Customer**:
   - Name: Test Customer
   - Email: customer@test.com
   - Password: Test@123
   - City: Mumbai
   - Pincode: 400001
6. Verify email with OTP

**Step 2: Create a Service (as Saheli)**
1. Log in as `provider@test.com` (Saheli)
2. Navigate to **Dashboard** → **My Services** → **Create Service**
3. Fill in service details:
   - Title: "Home Cleaning Service"
   - Category: "Cleaning"
   - Mode: "Onsite" (or "Hybrid" or "Online")
   - Pricing Type: "Hourly"
   - Base Price: 500
   - Advance Percentage: 30 (requires 30% advance payment)
   - Service Radius: 10 km (if Onsite/Hybrid)
   - City: Mumbai
   - Description: "Professional home cleaning"
4. Set weekly schedule (e.g., Monday-Friday, 9:00 AM - 5:00 PM)
5. Save service and ensure it's **Active** (not paused)

**Step 3: Book the Service (as Customer)**

**Method A: Standard Flow (after redirect fix)**
1. Log out from Saheli account
2. Go to homepage `http://localhost:3000/`
3. Browse services or search for "Home Cleaning Service"
4. Click on the service card
5. You should land on the service detail page at `/service/<serviceId>`
6. If not logged in, click **Login to Book**
   - This will redirect you to `/auth/login?returnTo=/service/<serviceId>`
   - Log in as `customer@test.com`
   - After successful login, you should be redirected back to the service detail page
7. Click **Book This Service** button
8. Booking modal opens

**Method B: Direct Navigation (workaround if redirect doesn't work)**
1. Log in as `customer@test.com` first
2. Get a service ID:
   - As Saheli, go to "My Services" and copy the service ID from the URL or card
   - OR query MongoDB: `db.services.findOne({ isActive: true })` and copy `_id`
3. Navigate directly to: `http://localhost:3000/service/<paste-service-id-here>`
4. You should see the service detail page with **Book This Service** button
5. Click **Book This Service** button
6. Booking modal opens

**Step 4: Fill Booking Details**
1. In the booking modal:
   - **Date**: Choose today or a future date
   - **Time Slot**: Select an available slot (e.g., "9:00 AM - 10:00 AM")
     - Booked slots are disabled and grayed out
   - **Duration**: Enter hours (e.g., 2)
   - **Address**: Provide full address if serviceType is Onsite or Hybrid
     - e.g., "123 Main Street, Andheri, Mumbai, 400058"
   - **Notes**: Optional special instructions
2. Click **Continue to Payment**

**Step 5: Verify Pricing Summary**
- Base price is calculated: `basePrice * duration`
- Travel fee added (if applicable)
- Weekend premium applied (if booking on Saturday/Sunday)
- **Advance Amount** (e.g., 30% of total)
- **Remaining Amount** to be paid later

**Step 6: Complete Payment via Razorpay**
1. Click **Pay Now** button
2. Razorpay Checkout modal opens
3. **Test Mode Credentials** (use Razorpay test cards):
   - **Card Number**: `4111 1111 1111 1111`
   - **Expiry**: Any future date (e.g., `12/25`)
   - **CVV**: Any 3 digits (e.g., `123`)
   - **Name**: Any name
4. Click **Pay**
5. Payment is processed
6. You should be redirected to the **Booking Confirmation** page at `/booking/:bookingId/confirmation`

**Step 7: Verify Booking Confirmation Page**
- Booking ID and status ("Pending" or "Confirmed")
- Service details
- Provider details
- Selected date, time slot, and duration
- Pricing breakdown
- Payment status
- Address (if Onsite/Hybrid)
- Confirmation email sent to customer

**Step 8: Verify Database Records**
1. Open MongoDB:
   ```bash
   mongosh
   use saheliplus
   db.bookings.find().pretty()
   ```
2. Confirm booking document has:
   - `status: "Pending"` (if advance payment) or `"Confirmed"` (if full payment)
   - `paymentStatus: "Advance Paid"` or `"Paid"`
   - `totalAmount`, `advanceAmount`, `remainingAmount`
   - `razorpayOrderId`, `razorpayPaymentId`
   - `expiresAt` (24 hours from creation for Pending bookings)

**Step 9: Verify Razorpay Dashboard**
1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com/app/payments)
2. You should see the payment under **Payments** → **All Payments**
3. Status: "Captured"
4. Amount matches advance amount
5. Order ID matches booking's `razorpayOrderId`

**Step 10: Verify Webhook Delivery (if configured)**
1. Check ngrok web interface: `http://127.0.0.1:4040`
2. You should see POST requests to `/booking/webhook/razorpay`
3. Response status: 200 OK
4. Check server logs for webhook processing:
   ```
   ✓ Webhook signature verified
   ✓ Payment captured for booking <bookingId>
   ```

---

### Scenario 2: Check Slot Availability

**Test Real-Time Availability API**
1. Log in as customer
2. Navigate to a service detail page
3. Open browser DevTools → Network tab
4. Open booking modal
5. Select a date
6. Observe XHR request to `/booking/availability/<serviceId>?date=YYYY-MM-DD`
7. Response shows:
   ```json
   {
     "success": true,
     "availableSlots": [
       { "start": "09:00", "end": "10:00", "booked": false },
       { "start": "10:00", "end": "11:00", "booked": true }
     ]
   }
   ```
8. Booked slots should be disabled in the UI

**Test Multiple Bookings on Same Slot**
1. Create two bookings for the same slot at the same time (use two browsers/incognito windows)
2. Only one should succeed due to MongoDB transaction-based atomic slot reservation
3. The other should receive error: "Selected time slot is no longer available"

---

### Scenario 3: Payment Failure Handling

**Test Failed Payment**
1. Follow Scenario 1 steps 1-5
2. At Razorpay Checkout, use a test card that fails:
   - **Card Number**: `4000 0000 0000 0002` (Declined card)
   - **Expiry**: Any future date
   - **CVV**: Any 3 digits
3. Click **Pay**
4. Payment fails
5. Verify:
   - User sees error notification: "Payment failed. Please try again."
   - Booking is **not created** in database
   - Razorpay Dashboard shows payment status as "Failed"

**Test User Cancels Payment**
1. Follow Scenario 1 steps 1-5
2. At Razorpay Checkout, click **X** or **Cancel**
3. Modal closes
4. User can retry by clicking **Pay Now** again

---

### Scenario 4: Expired Booking Cleanup

**Test Automatic Expiry**
1. Create a booking with advance payment (status: "Pending")
2. Check database:
   ```javascript
   db.bookings.findOne({ _id: ObjectId("your-booking-id") })
   // expiresAt should be 24 hours from createdAt
   ```
3. Manually set `expiresAt` to past date:
   ```javascript
   db.bookings.updateOne(
     { _id: ObjectId("your-booking-id") },
     { $set: { expiresAt: new Date(Date.now() - 1000) } }
   )
   ```
4. Wait for periodic cleanup (runs every 6 hours) or restart server to trigger immediate cleanup
5. Verify booking status changes to "Cancelled" and cancellation reason is set

**Test Expired Booking Excluded from Availability**
1. Create a booking and expire it (as above)
2. Navigate to the same service and open booking modal
3. Select the same date
4. The previously booked slot should now be available again

---

### Scenario 5: Payment Operations (Advance, Complete, Refund)

**Test Advance Payment**
1. Complete Scenario 1 (advance payment: 30%)
2. Booking status: "Pending"
3. `paymentStatus: "Advance Paid"`

**Test Complete Payment**
1. As customer, navigate to `/booking/<bookingId>` (booking details page)
2. Click **Pay Remaining Amount** button
3. Razorpay Checkout opens with `remainingAmount`
4. Pay using test card
5. Verify:
   - `paymentStatus` → "Paid"
   - `status` → "Confirmed"
   - `razorpayPaymentId` updated with new payment ID

**Test Refund (as Saheli)**
1. Log in as Saheli
2. Navigate to **Dashboard** → **Bookings**
3. Find a completed booking
4. Click **Cancel & Refund** button
5. Confirm cancellation
6. Verify:
   - Booking status → "Cancelled"
   - Refund initiated in Razorpay Dashboard
   - Customer receives refund email (if implemented)

---

## API-Based Testing (Alternative Method)

If the UI flow has issues, you can test the backend APIs directly using Postman or cURL.

### 1. Create Booking via API
```bash
# Log in first to get session cookie
curl -X POST http://localhost:3000/auth/login/password \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@test.com","password":"Test@123","role":"customer"}' \
  -c cookies.txt

# Create booking
curl -X POST http://localhost:3000/booking \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "serviceId": "SERVICE_ID_HERE",
    "date": "2024-01-20",
    "timeSlot": {"start": "09:00", "end": "10:00"},
    "duration": 2,
    "address": "123 Main Street, Mumbai",
    "notes": "Please bring cleaning supplies"
  }'
```

### 2. Check Availability via API
```bash
curl -X GET "http://localhost:3000/booking/availability/SERVICE_ID_HERE?date=2024-01-20" \
  -b cookies.txt
```

### 3. Verify Payment via API
```bash
curl -X POST http://localhost:3000/booking/payment/verify \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "razorpay_order_id": "order_xxxxx",
    "razorpay_payment_id": "pay_xxxxx",
    "razorpay_signature": "signature_xxxxx",
    "bookingId": "BOOKING_ID_HERE"
  }'
```

---

## Troubleshooting

### Issue: "Cannot find module 'razorpay'"
**Solution**: Install dependencies
```bash
npm install
```

### Issue: "RAZORPAY_KEY_ID is not defined"
**Solution**: Ensure `.env` file has Razorpay keys
```bash
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_key_here
```

### Issue: "Webhook signature verification failed"
**Solution**:
1. Ensure `RAZORPAY_WEBHOOK_SECRET` is set in `.env`
2. Verify ngrok URL matches webhook URL in Razorpay Dashboard
3. Check webhook route uses `express.raw()` middleware (already configured)

### Issue: "Service detail page not loading after login"
**Solution** (implemented in this update):
1. The login controller now captures `returnTo` query parameter
2. After successful password or OTP login/verification, user is redirected to `returnTo` URL
3. Ensure service detail link includes: `/auth/login?returnTo=/service/<serviceId>`

**Workaround**: Navigate directly to `/service/<serviceId>` while logged in

### Issue: "Booking slot already taken" race condition
**Solution**: Already handled via MongoDB transactions in `reserveSlot` static method

### Issue: "Payment captured but booking not updated"
**Solution**:
1. Check webhook is configured and hitting your server
2. Verify webhook signature secret matches
3. Check server logs for webhook processing errors
4. Manually update booking:
   ```javascript
   db.bookings.updateOne(
     { razorpayOrderId: "order_xxxxx" },
     { $set: { paymentStatus: "Advance Paid", status: "Pending" } }
   )
   ```

---

## Test Checklist

- [ ] Razorpay keys configured in `.env`
- [ ] Webhook configured with ngrok URL
- [ ] Server running and DB/email connected
- [ ] Saheli account created and service published
- [ ] Customer account created and verified
- [ ] Service detail page accessible at `/service/:id`
- [ ] Booking modal opens with correct data
- [ ] Slot availability API returns correct slots
- [ ] Booked slots are disabled in UI
- [ ] Payment succeeds with test card
- [ ] Booking confirmation page displays
- [ ] Database booking record correct
- [ ] Razorpay Dashboard shows payment
- [ ] Webhook received and processed
- [ ] Email confirmation sent
- [ ] Expired bookings cleaned up
- [ ] Failed payment handled gracefully
- [ ] Refund flow works (if applicable)

---

## Expected Results Summary

| Step | Expected Result |
|------|----------------|
| Service Creation | Service appears in homepage/search |
| Login with returnTo | Redirects to service detail after auth |
| Booking Modal | Shows pricing, slots, and availability |
| Slot Selection | Booked slots are disabled |
| Payment Initiation | Razorpay Checkout opens |
| Payment Success | Redirects to confirmation page |
| Booking Status | "Pending" (advance) or "Confirmed" (full) |
| Database Record | Booking with correct payment details |
| Razorpay Dashboard | Payment captured |
| Webhook | POST to `/booking/webhook/razorpay` returns 200 |
| Email | Confirmation email sent |
| Availability | Booked slot excluded from future searches |
| Expiry | Pending bookings auto-cancelled after 24h |

---

## Next Steps After Testing

1. **Production Deployment**:
   - Replace test keys with live Razorpay keys
   - Use a production domain instead of ngrok
   - Update webhook URL to production endpoint

2. **Additional Features**:
   - Implement messaging between customer and provider
   - Add review/rating system
   - Build notifications (email + in-app)
   - Add booking history filters and search

3. **Security Enhancements**:
   - Rate limiting on booking endpoints
   - CAPTCHA on payment pages
   - Implement fraud detection rules in Razorpay

4. **Monitoring**:
   - Set up logging (Winston/Bunyan)
   - Monitor webhook failures
   - Track payment success rates
   - Alert on failed transactions

---

**Happy Testing! 🚀**
