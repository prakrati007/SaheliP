# Saheli Plus - API Routes Reference

## Authentication Routes (`/auth`)

### Public Routes (Guest Only)

| Method | Endpoint | Description | Middleware | Handler |
|--------|----------|-------------|------------|---------|
| GET | `/auth/signup` | Role selection page | isGuest | renderSignupChoice |
| GET | `/auth/signup/saheli` | Saheli signup form | isGuest | renderSignupSaheli |
| GET | `/auth/signup/customer` | Customer signup form | isGuest | renderSignupCustomer |
| GET | `/auth/login` | Login page (password/OTP tabs) | isGuest | renderLogin |
| POST | `/auth/signup/saheli` | Handle Saheli signup | isGuest, validateSignup | signupSaheli |
| POST | `/auth/signup/customer` | Handle Customer signup | isGuest, validateSignup | signupCustomer |
| POST | `/auth/login/password` | Password-based login | isGuest, validateLogin | loginPassword |
| POST | `/auth/login/otp` | Request login OTP | isGuest | loginOtp |

### Public Routes (No Auth Required)

| Method | Endpoint | Description | Middleware | Handler |
|--------|----------|-------------|------------|---------|
| GET | `/auth/verify-otp` | OTP verification page | - | renderVerifyOtp |
| POST | `/auth/verify-otp` | Verify email OTP | validateOtp | verifyOtp |
| POST | `/auth/verify-login-otp` | Verify login OTP | validateOtp | verifyLoginOtp |
| POST | `/auth/resend-otp` | Resend OTP | - | resendOtp |

### Protected Routes (Auth Required)

| Method | Endpoint | Description | Middleware | Handler |
|--------|----------|-------------|------------|---------|
| POST | `/auth/logout` | Logout user | isAuthenticated | logout |

---

## Main Routes (`/`)

| Method | Endpoint | Description | Controller |
|--------|----------|-------------|------------|
| GET | `/` | Homepage | routes/index.js |
| GET | `/health` | Health check API | server.js (inline) |

---

## Future Routes (Phase 3+)

### Dashboard Routes (To Be Implemented)
- GET `/dashboard` - Role-specific dashboard (Saheli/Customer)
- GET `/profile` - User profile page
- POST `/profile/update` - Update profile
- POST `/profile/picture` - Upload profile picture

### Service Routes (To Be Implemented)
- GET `/services` - Browse services
- GET `/services/:id` - View service details
- POST `/services/create` - Create new service (Saheli only)
- PUT `/services/:id` - Update service (Saheli only)
- DELETE `/services/:id` - Delete service (Saheli only)

### Booking Routes (To Be Implemented)
- GET `/bookings` - View bookings
- POST `/bookings/create` - Create booking (Customer only)
- PUT `/bookings/:id/status` - Update booking status
- DELETE `/bookings/:id` - Cancel booking

### Review Routes (To Be Implemented)
- GET `/reviews` - View reviews
- POST `/reviews/create` - Create review
- PUT `/reviews/:id` - Update review
- DELETE `/reviews/:id` - Delete review

### Password Reset Routes (To Be Implemented)
- GET `/auth/forgot-password` - Forgot password form
- POST `/auth/forgot-password` - Request password reset OTP
- GET `/auth/reset-password` - Reset password form
- POST `/auth/reset-password` - Reset password with OTP

---

## Request/Response Examples

### Signup Saheli
**Request:**
```http
POST /auth/signup/saheli
Content-Type: application/x-www-form-urlencoded

name=Jane Doe&email=jane@example.com&password=SecurePass123&city=Mumbai&pincode=400001&role=saheli
```

**Success Response:**
```http
HTTP/1.1 302 Found
Location: /auth/verify-otp?email=jane@example.com&token=abc123...
```

### Verify OTP
**Request:**
```http
POST /auth/verify-otp
Content-Type: application/x-www-form-urlencoded

email=jane@example.com&otp=123456&token=abc123...
```

**Success Response:**
```http
HTTP/1.1 302 Found
Location: /dashboard?role=saheli
Set-Cookie: connect.sid=s%3A...; Path=/; HttpOnly
```

### Password Login
**Request:**
```http
POST /auth/login/password
Content-Type: application/x-www-form-urlencoded

email=jane@example.com&password=SecurePass123
```

**Success Response:**
```http
HTTP/1.1 302 Found
Location: /dashboard?role=saheli
Set-Cookie: connect.sid=s%3A...; Path=/; HttpOnly
```

### OTP Login
**Request:**
```http
POST /auth/login/otp
Content-Type: application/json

{
  "email": "jane@example.com"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "A verification code has been sent to your email",
  "token": "abc123...",
  "email": "jane@example.com"
}
```

### Resend OTP
**Request:**
```http
POST /auth/resend-otp
Content-Type: application/json

{
  "email": "jane@example.com"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "A new verification code has been sent to your email",
  "token": "xyz789..."
}
```

**Rate Limited Response:**
```json
{
  "success": false,
  "message": "Please wait 45 seconds before requesting a new code"
}
```

### Logout
**Request:**
```http
POST /auth/logout
```

**Success Response:**
```http
HTTP/1.1 302 Found
Location: /?message=You have been logged out successfully
Set-Cookie: connect.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT
```

---

## Session Structure

```javascript
req.session.user = {
  id: ObjectId("..."),      // MongoDB user _id
  name: "Jane Doe",         // User's full name
  email: "jane@example.com", // User's email
  role: "saheli"            // User role (saheli | customer)
}
```

**Available in Templates:**
```ejs
<% if (locals.user) { %>
  <p>Welcome, <%= user.name %>!</p>
  <p>Role: <%= user.role %></p>
<% } %>
```

---

## Error Handling

### Validation Errors
- Rendered on same page with error messages
- Form data preserved for user convenience
- HTTP 400 Bad Request

### Authentication Errors
- Generic error messages (prevent user enumeration)
- HTTP 400 Bad Request for invalid credentials
- HTTP 401 Unauthorized for missing auth
- HTTP 403 Forbidden for insufficient permissions

### Server Errors
- Logged to console (implement proper logging in production)
- Generic error message to user
- HTTP 500 Internal Server Error

---

## Middleware Chain Examples

### Signup Route:
```
Request → isGuest → validateSignup → signupSaheli → Response
```

### Login Route:
```
Request → isGuest → validateLogin → loginPassword → Response
```

### Protected Route:
```
Request → isAuthenticated → routeHandler → Response
```

### Role-Specific Route (Future):
```
Request → isAuthenticated → requireRole('saheli') → routeHandler → Response
```

---

This reference guide provides a comprehensive overview of all authentication routes, request/response formats, and middleware chains in the Saheli Plus application.
