# Saheli Plus - Women's Service Marketplace

**Saheli Plus** is a women-centric service marketplace platform that empowers women to offer their professional services and connect with service seekers. The platform creates a trusted community where women can build their businesses, showcase their skills, and access reliable services from other women professionals.

## 🌟 Purpose

Saheli Plus aims to:
- Empower women entrepreneurs and service providers
- **Profile picture upload with validation (JPEG, PNG, WebP, max 5MB)**
- **Verification badge for Sahelis with 3+ completed bookings**
- **Service listing and management for Saheli providers**
- **Comprehensive service creation with pricing, availability, and images**
- **Multiple pricing types: Hourly, Fixed, and Package-based**
- **Role-based dashboards for Saheli providers and Customers**
- **Saheli dashboard with earnings graph, service stats, and booking management**
- **Customer dashboard with booking tracking and payment history**
- **Real-time stats aggregation using MongoDB pipelines**
- **Monthly earnings visualization with Frappe Charts**
- **Booking detail modal with role-specific actions**
- **Responsive dashboard design optimized for all devices**

### Where to view your services (after submitting)
- After a successful create or update, you’ll be redirected to your services dashboard: `/services/my` (login required, Saheli role)
- Public discovery (for anyone):
  - Search: `/services?search=&category=&city=&priceMin=&priceMax=&rating=&availableDate=&sort=&page=`
  - Detail page: `/service/:id`

Tip: From `/services/my`, click a service card’s “View” action to open its public detail page.
- **Weekly availability scheduling with time slots**
- **Multi-image upload for services (max 5 images, 5MB each)**
- **Service status management (Active/Paused)**
- **Homepage with search bar, category cards, and featured services**
- **Advanced search and filtering**
  - Weekly availability calendar
  - Related services recommendations

### Troubleshooting: Can't see your service?
- Make sure you’re logged in as a Saheli and the service was created successfully (no validation errors)
- Check service status: it must be Active (not Paused) to appear publicly
- Clear search filters on `/services` (price range, rating, date, category, city) — filters can hide valid results
- If your service uses Package pricing, ensure you added at least one package and set a sensible base price
- For Onsite/Hybrid services, ensure a service radius is set; missing required fields can block creation
- Verify weekly availability is configured; services without a weekly schedule won’t be created
- Try sorting differently (e.g., newest) and navigate pages via the pagination at the bottom
- **Pagination with query parameter preservation**
- **Responsive design with mobile-first approach**

## 🚀 Technology Stack

This project is built with modern, industry-standard technologies:

- **Backend Framework**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Template Engine**: EJS (Embedded JavaScript)
- **Authentication**: Bcrypt for password hashing
- **Session Management**: Express-session
- **Email Service**: Nodemailer
- **Environment Configuration**: Dotenv

## 📁 Project Structure
│   └── upload.js        # File upload configuration with multer
├── controllers/
│   └── profileController.js # Profile management handlers
├── routes/
│   └── profile.js       # Profile routes
├── views/
│   └── pages/
│       └── profile/     # Profile view templates
├── public/
│   └── uploads/
│       └── profiles/    # Uploaded profile pictures storage
 - **File Uploads**: Multer for multipart/form-data
 - **Unique Filenames**: UUID for profile picture uploads
## 📝 Profile Management

Saheli Plus supports rich user profiles for both service providers (Sahelis) and customers.

### Profile Fields
- **Common fields**: name, email, city, pincode, bio, languages, profile picture
- **Saheli-specific fields**: experienceYears, certifications

### Profile Features
- **Edit profile**: Update bio, languages, experience, certifications, and profile picture
- **Profile picture upload**: JPEG, PNG, WebP only, max 5MB, stored in `public/uploads/profiles/`
- **Verification badge**: Sahelis with 3+ completed bookings get a badge
- **Role-based rendering**: Sahelis see extra fields in profile views


- **Service listing and management for Saheli providers**
- **Comprehensive service creation with pricing, availability, and images**
- **Multiple pricing types: Hourly, Fixed, and Package-based**
- **Weekly availability scheduling with time slots**
- **Multi-image upload for services (max 5 images, 5MB each)**
- **Service status management (Active/Paused)**
- **Category-based service organization with subcategories**
### File Upload Security
- File type validation (whitelist JPEG, PNG, WebP)
- File size limit (5MB)
- Unique filename generation (UUID)
- Server-side validation after multer processing
- Sanitized file paths (no user input in filenames)

### Example URLs
- `/profile/view` - View your profile
- `/profile/edit` - Edit your profile

All profile routes require authentication.

### Service Management Structure
```
SaheliP/
├── controllers/
│   ├── serviceController.js # Service CRUD handlers
│   └── publicController.js  # Public service discovery handlers
├── routes/
│   ├── services.js      # Protected service management routes
│   └── index.js         # Public routes (homepage, search, detail)
├── utils/
│   ├── constants.js     # Service categories and enums
│   └── helpers.js       # Pagination, query building, calculations
├── views/
│   ├── pages/
│   │   ├── services/    # Service management templates (Saheli)
│   │   │   ├── search.ejs   # Public search page
│   │   │   └── detail.ejs   # Public service detail page
│   │   └── index.ejs    # Public homepage
│   ├── partials/
│   │   ├── service-card.ejs  # Reusable service card
│   │   └── pagination.ejs    # Reusable pagination component
├── public/
│   ├── uploads/
│   │   └── services/    # Uploaded service images storage
│   ├── js/
│   │   ├── service-form.js   # Service form client-side logic
│   │   ├── my-services.js    # My services page interactions
│   │   ├── home.js           # Homepage interactions
│   │   ├── search.js         # Search page filters and interactions
│   │   └── service-detail.js # Detail page gallery and interactions
│   └── styles/
│       ├── service.css  # Service management styles
│       ├── home.css     # Homepage styles
│       ├── search.css   # Search page styles
│       └── detail.css   # Service detail styles
```

## 🛠️ Service Management

Saheli Plus enables Saheli providers to create, manage, and showcase their services with rich details, images, and flexible pricing.

### Service Fields
- **Mandatory**: title, category, description, pricing type, base price, city, availability, mode
- **Optional**: subcategory, service radius, travel fee, weekend premium, advance percentage, images, certifications

### Pricing Types
- **Hourly**: Price per hour of service
- **Fixed**: Single price for entire service
- **Package**: Multiple package options with different prices and durations

### Availability System
- **Weekly schedule**: Customizable time slots per day
- **Unavailable dates**: Specific days off
- **Max bookings per day** and **advance booking limits**

### Service Modes
- **Onsite**: Service provided at customer location
- **Online**: Service provided remotely
- **Hybrid**: Both onsite and online options available

### Service Categories
- **Beauty & Personal Care** (7 subcategories)
- **Tutoring & Skill Classes** (6 subcategories)
- **Tailoring & Fashion** (4 subcategories)
- **Event & Occasion Services** (4 subcategories)

### Service Image Upload
- **File types**: JPEG, PNG, WebP only
- **File size**: Max 5MB per image
- **Max images**: 5 per service
- **Storage**: Local filesystem in `public/uploads/services/`
- **Filename**: UUID-based for uniqueness
- **Image management**: First image is primary/thumbnail, images can be added/removed during edit, old images are deleted when service is updated or deleted

## 🔗 Service Routes

### Private Routes (Protected - Saheli Only)
All service management routes require authentication and Saheli role. Ownership verification is enforced for edit/update/delete operations.

- `GET /services/add` - Add new service form (Saheli only)
- `POST /services` - Create service (Saheli only)
- `GET /services/my` - View my services (Saheli only)
- `GET /services/:id` - View single service (owner only)
- `GET /services/:id/edit` - Edit service form (owner only)
- `PUT /services/:id` - Update service (owner only)
- `DELETE /services/:id` - Delete service (owner only)
- `PATCH /services/:id/toggle` - Toggle service status (owner only)

**Example URLs:**
- `/services/add` - Add new service
- `/services/my` - Manage my services
- `/services/:id/edit` - Edit service

**Role-based access:** Saheli only. Ownership verification for service management.

### Public Routes (No Authentication Required)
Public service discovery routes accessible to all visitors.

- `GET /` - Homepage with search, categories, and featured services
- `GET /services?query=...&category=...&city=...&minPrice=...&maxPrice=...&minRating=...&date=...&sort=...&page=...` - Search and filter services
- `GET /service/:id` - View service detail page

**Search & Filter Options:**
- **Search**: Keyword search across title, description, and provider name
- **Category**: Filter by service category
- **City**: Filter by service location
- **Price Range**: Min and max price filters
- **Rating**: Minimum rating filter (1-5 stars)
- **Date**: Check availability on specific date
- **Sort**: relevance, price_asc, price_desc, rating, newest

**Pagination:** 12 services per page with query parameter preservation

## 🎨 Public Service Discovery Features

### Homepage (`/`)
- **Search Bar**: Search services by keywords with category filter
- **Category Cards**: Browse all 4 main categories with service counts
- **Featured Services**: Top 6 active services sorted by rating

### Search Page (`/services`)
- **Filter Panel**: 
  - Search input
  - Category dropdown
  - City filter
  - Price range (min/max)
  - Star rating selector (1-5 stars)
  - Date picker for availability
  - Sort options (relevance, price, rating, newest)
- **Results Grid**: Responsive grid of service cards (1/2/3 columns)
- **Pagination**: Navigate through results with preserved filters
- **Empty State**: Helpful message when no results found

### Service Detail Page (`/service/:id`)
- **Image Gallery**: 
  - Main image with zoom on hover
  - Thumbnail navigation
  - Lightbox viewer with keyboard navigation (ESC, arrow keys)
- **Provider Card**:
  - Profile picture or avatar placeholder
  - Name, city, verification badge
  - Languages, experience
  - Bio description
- **Pricing Section**:
  - Package cards for package-based pricing
  - Pricing breakdown for hourly/fixed
  - Cancellation policy
- **Availability Calendar**: Weekly schedule with time slots
- **Related Services**: Horizontal scroll of similar services
- **CTA Buttons**: Book Now and Contact Provider (login required)
- **Breadcrumb Navigation**: Easy navigation back to search/homepage
├── middleware/          # Custom Express middleware
│   └── (auth, validation, error handlers - future)
├── models/              # Mongoose schema definitions
│   └── (User, Service, Booking, Review - future)
├── routes/              # Express route definitions
│   └── index.js         # Main route aggregator
├── utils/               # Helper functions and utilities
│   └── (email, validators, etc. - future)
├── views/               # EJS templates
│   ├── layouts/         # Base layout templates
│   │   └── main.ejs     # Main layout structure
│   ├── partials/        # Reusable components
│   │   ├── header.ejs   # Header navigation
│   │   └── footer.ejs   # Footer section
│   └── pages/           # Full page templates
│       └── index.ejs    # Homepage
├── public/              # Static assets
│   ├── styles/          # CSS files
│   │   └── main.css     # Main stylesheet (pastel pink theme)
│   ├── js/              # Client-side JavaScript
│   │   └── main.js      # Main client script
│   ├── images/          # Static images
│   └── uploads/         # User-generated content
├── .env.example         # Environment variables template
├── .gitignore           # Git ignore rules
├── package.json         # Project dependencies
├── server.js            # Application entry point
└── README.md            # Project documentation
```

## 📦 Installation

Follow these steps to set up the project locally:

### 1. Clone the repository
```bash
git clone https://github.com/prakrati007/SaheliP.git
cd SaheliP
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env` file in the root directory by copying the example file:
```bash
copy .env.example .env
```

Then edit the `.env` file and configure the following variables:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/saheli-plus
SESSION_SECRET=your-secure-random-string-here
NODE_ENV=development
```

### 4. Start MongoDB
Ensure MongoDB is running on your system. If using local MongoDB:
```bash
mongod
```

Or use MongoDB Atlas for cloud hosting.

### 5. Run the application
```bash
# Production mode
npm start

# Development mode with auto-restart
npm run dev
```

The application will be available at `http://localhost:3000`

## 🔧 Environment Variables

The following environment variables are required:

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port number | `3000` |
| `MONGO_URI` | MongoDB connection string (REQUIRED) | `mongodb://localhost:27017/saheli-plus` |
| `SESSION_SECRET` | Secret key for session encryption | `your-secure-random-string` |
| `NODE_ENV` | Application environment | `development` or `production` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (587 for STARTTLS, 465 for SSL) | `587` |
| `SMTP_SECURE` | Use SSL/TLS (true for 465, false for 587) | `false` |
| `SMTP_USER` | SMTP authentication username | `your-email@example.com` |
| `SMTP_PASS` | SMTP password or app-specific password | `your-app-password` |
| `MAIL_FROM` | Sender email address and name | `Saheli Plus <no-reply@saheliplus.com>` |
| `OTP_PEPPER` | Secret key for OTP hashing (security) | Generate with crypto.randomBytes |
| `BCRYPT_ROUNDS` | Bcrypt cost factor for password hashing | `12` (recommended) |
| `APP_URL` | Application URL for email templates | `http://localhost:3000` |

**Email Configuration Notes:**
- For Gmail: Use [App Passwords](https://support.google.com/accounts/answer/185833) instead of your regular password
- For SendGrid/Mailgun: Use your API key as the password
- Generate secure OTP_PEPPER: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

## 🔐 Authentication Flow

### Signup Process
1. User selects role (Saheli or Customer) on signup choice page
2. Fills registration form (name, email, password, city, pincode)
3. Server validates input and checks if email already exists
4. Password is hashed using bcrypt with cost factor 12
5. User account created with `verified: false` status
6. 6-digit OTP generated and hashed with HMAC-SHA256
7. OTP sent to user's email via Nodemailer
8. User redirected to OTP verification page
9. User enters OTP (10-minute expiry, 5 attempt limit)
10. Server performs constant-time comparison of OTP hash
11. On success: User marked as verified, session created with regenerated ID
12. Welcome email sent, user redirected to dashboard

### Login Options

**Password Login:**
1. User enters email and password
2. Server finds user and verifies password using bcrypt
3. If email not verified, generates OTP and redirects to verification
4. If verified, creates session with regenerated ID
5. Redirects to role-specific dashboard

**OTP Login:**
1. User enters email only
2. Server generates 6-digit OTP for login_otp purpose
3. OTP sent to email
4. User redirected to OTP verification page
5. User enters OTP
6. Server verifies OTP, creates session
7. Redirects to dashboard

### Session Management
- Session data stored server-side with express-session
- 24-hour session expiry (configurable)
- Session ID regenerated on login/logout to prevent fixation attacks
- HttpOnly cookies prevent XSS attacks
- Secure cookies enabled in production (HTTPS only)
- `setLocals` middleware makes user available to all EJS templates

### Security Features
- **Password Security**: Bcrypt with cost factor 12 (~200ms per hash)
- **OTP Security**: 10-minute expiry, 5 attempt limit, HMAC-SHA256 hashing with pepper
- **Constant-time Comparison**: Prevents timing attacks on OTP verification
- **Session Security**: HttpOnly cookies, session regeneration, trust proxy for production
- **Generic Error Messages**: Prevents user enumeration attacks
- **Rate Limiting**: 60-second cooldown on OTP resend requests

## 🎨 Design Theme

Saheli Plus features a warm and welcoming pastel pink color palette:

- **Primary Pink**: `#F9C5D1` - Main brand color
- **Secondary Blush**: `#F6A5C0` - Accent color for buttons and highlights
- **Accent Peach**: `#FFB6A3` - Complementary accent
- **Background Ivory**: `#FFF9F8` - Soft background color
- **Text Charcoal**: `#333333` - Primary text color

## 🛣️ Development Roadmap

### Phase 1: Foundation Setup ✅
- Project initialization
- Express.js server setup
- MongoDB connection
- EJS template system
- Pastel pink theme implementation

### Phase 2: Authentication System ✅
- User registration (Saheli and Customer roles)
- Email OTP verification
- Password and OTP login options
- Session management
- Email service integration
- Security implementations (bcrypt, constant-time comparison, rate limiting)

### Phase 3: User Profile Management ✅
- Profile viewing and editing
- Profile picture upload
- Role-based profile fields (experience, certifications for Sahelis)
- Verification badges for active Sahelis

### Phase 4: Service Management (Saheli Dashboard) ✅
- Service creation with rich details
- Multiple pricing models (Hourly, Fixed, Package)
- Weekly availability scheduling
- Multi-image upload per service
- Service status management (Active/Paused)
- Category and subcategory organization
- My Services dashboard

### Phase 5: Public Service Discovery ✅ (Current)
- Dynamic homepage with search and categories
- Advanced search with filters (category, city, price, rating, date)
- Service detail pages with image gallery
- Related services recommendations
- Pagination with query preservation
- Responsive design for all screen sizes
- Client-side interactions (lightbox, filters, smooth scroll)

### Phase 6: Booking System (Coming Soon)
- Service booking workflow
- Payment integration
- Booking management for customers
- Booking fulfillment for Sahelis
- Calendar integration
- Notifications

### Phase 7: Reviews & Ratings (Coming Soon)
- Review submission
- Rating system
- Provider reputation management
- Review moderation

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Contact

For questions or support, please contact the project maintainers.

---

**Built with ❤️ for empowering women entrepreneurs**

## 📊 Dashboard System

Saheli Plus features role-based dashboards providing comprehensive insights and management capabilities for both providers and customers.

### Dashboard Access
- **Single route**: `/dashboard` (requires authentication)
- **Role-based rendering**: Automatically shows Saheli dashboard for providers, Customer dashboard for customers
- **Automatic redirect**: After login, users are redirected to their appropriate dashboard
- **Header navigation**: Dashboard link appears in header navigation for quick access

### Saheli Dashboard Sections

#### 1. Overview Stats
- **Total Bookings**: All-time booking count
- **Completed Services**: Successfully completed bookings
- **Total Earnings**: Sum of all FullyPaid bookings (₹)
- **Pending Earnings**: Remaining balance from AdvancePaid bookings (₹)

#### 2. My Services Summary
- **Service counts**: Total services, active services, paused services
- **Average rating**: Calculated across all provider's services
- **Top services**: Display top 3 services by view count
- **Quick actions**: Links to add new service or manage existing services

#### 3. Earnings Overview
- **Monthly earnings chart**: Line chart showing last 6 months of earnings using Frappe Charts
- **Transaction table**: Last 10 FullyPaid bookings with service, customer, amount, and date
- **Clickable rows**: Click any transaction to view full booking details

#### 4. Bookings Management
- **Quick stats**: Count of Confirmed and InProgress bookings
- **Upcoming bookings**: Next 5 bookings with service details and quick actions
- **Provider actions**: Start Service, Complete Service, View Details buttons
- **Link**: View all bookings on dedicated booking management page

#### 5. Reviews Summary (Placeholder)
- Placeholder section for future review system integration
- Shows message indicating feature is coming soon

### Customer Dashboard Sections

#### 1. Overview Stats
- **Active Bookings**: Count of Confirmed + InProgress bookings
- **Services Received**: Count of Completed bookings
- **Total Spent**: Sum of all FullyPaid bookings (₹)
- **Pending Payments**: Count of bookings with remaining balance due

#### 2. Find Services Widget
- **Quick search form**: Inline search with service and city inputs
- **Pre-filled city**: Uses customer's city from profile
- **Category quick links**: One-click access to popular categories (Beauty, Tutoring, Tailoring, Events)

#### 3. My Bookings (Tabbed Interface)
- **Upcoming tab**: Confirmed and InProgress bookings with date/time, provider info, and actions
- **Completed tab**: Completed bookings with payment status and Pay Remaining option
- **Cancelled tab**: Cancelled bookings with cancellation details and refund information
- **Booking cards**: Rich display with service image, provider details, and status badges
- **Customer actions**: Cancel booking, Pay Remaining, View Details, Rate & Review (placeholder)

#### 4. Payment History
- **Recent payments table**: Last 10 transactions with service, provider, amount, type, and status
- **Payment type**: Shows "Advance" or "Full Payment" based on transaction
- **Clickable rows**: Click any payment to view full booking details

### Data Aggregation

**Booking Stats**:
- MongoDB aggregation pipelines for efficient stat calculation
- Bookings grouped by status (Pending, Confirmed, InProgress, Completed, Cancelled)
- Bookings grouped by payment status (Pending, AdvancePaid, FullyPaid, Refunded)
- Real-time data (no caching in MVP)

**Earnings Calculation** (Saheli):
- **Total Earnings**: Sum of totalAmount from all FullyPaid bookings
- **Pending Earnings**: Sum of remainingAmount from all AdvancePaid bookings (service completed, awaiting remaining payment)
- **Monthly Breakdown**: Earnings grouped by year/month for last 6 months
- **Transaction History**: List of FullyPaid bookings with service, customer, amount, date

**Service Stats** (Saheli):
- Total services count
- Active services (isActive=true, isPaused=false)
- Paused services (isPaused=true)
- Average rating calculated across provider's services where reviewCount > 0

### Chart Visualization

**Library**: Frappe Charts (MIT license, 11KB, no dependencies)
- **Chart Type**: Line chart for monthly earnings trend
- **Data**: Last 6 months of earnings data
- **Styling**: Pastel pink theme (#F6A5C0 for line)
- **Responsive**: Chart adapts to container width
- **Interactivity**: Hover tooltips show exact amounts in Indian Rupees (₹)
- **CDN loading**: Chart library loaded from CDN only on Saheli dashboard

### Booking Management

**Provider View**:
- Shows customer information (name, email, city)
- Service details with pricing breakdown
- Payment status and transaction details
- Lifecycle actions: Start Service, Complete Service, Cancel Booking

**Customer View**:
- Shows provider information (name, email, city, verification badge)
- Service details with pricing breakdown
- Payment status and history
- Customer actions: Cancel Booking, Pay Remaining Balance, Rate & Review (placeholder)

**Booking Detail Modal**:
- Shared component with role-specific content and actions
- Comprehensive booking information display
- Status-dependent action buttons
- AJAX-based modal loading with smooth animations

### Dashboard Routes

- **`GET /dashboard`** - Role-based dashboard (requires authentication)
  - Saheli users see provider dashboard
  - Customer users see customer dashboard
  - Role determined from session

### Dashboard Files Structure

```
controllers/
  └── dashboardController.js        # Dashboard rendering and data aggregation
views/
  └── pages/
      └── dashboard/
          ├── saheli.ejs            # Saheli dashboard view
          └── customer.ejs          # Customer dashboard view
  └── partials/
      ├── stats-card.ejs            # Reusable stats card component
      └── booking-detail-modal.ejs  # Booking detail modal (role-aware)
public/
  └── styles/
      └── dashboard.css             # Dashboard-specific styles
  └── js/
      ├── saheli-dashboard.js       # Saheli dashboard interactions and chart rendering
      └── customer-dashboard.js     # Customer dashboard interactions
```

### Dependencies

- **frappe-charts** (^1.6.2) - Lightweight chart library for earnings visualization
- Note: Loaded from CDN in production, can be installed via npm for offline development

### Notes

- Dashboard is the default landing page after login
- Stats are calculated in real-time (no caching in MVP)
- Earnings only count FullyPaid bookings (both advance and remaining collected)
- Pending earnings show remaining balances from AdvancePaid bookings (service completed, remaining payment due)
- Reviews section is placeholder (actual implementation in next phase)
- Booking detail modal works for both roles with different actions based on status
- All monetary values formatted in Indian Rupees (₹) with proper locale formatting
- Monthly earnings chart shows trend over last 6 months
- Dashboard design follows pastel pink theme with responsive layouts

## 🧾 Booking System

The booking flow enables customers to reserve a time slot and pay an advance using Razorpay:

1. Customer opens a service detail page and clicks "Book This Service"
2. A booking modal opens with date/time selection (based on provider availability)
3. The system validates slot availability in real-time
4. The customer provides a service address (for onsite/hybrid) and optional notes
5. Price is calculated, including weekend premium and travel fee
6. The customer proceeds to payment via Razorpay checkout (advance only)
7. On success, the booking is confirmed and emails are sent to both parties
8. Unpaid bookings are auto-cancelled after 15 minutes

Statuses: Pending → Confirmed → Cancelled

Slot conflicts are prevented using atomic MongoDB operations and compound indexes.

## 💳 Payment Integration (Razorpay)

- Server-side order creation using `utils/razorpay.js`
- Client-side checkout using Razorpay's hosted script
- Payment signature verification on the server
- Webhook handling for payment status updates
- Advance payment calculation based on service.advancePercentage

Payment statuses: Pending, AdvancePaid, FullyPaid, Refunded

Security:
- Keys are read from environment variables; secrets never exposed to the client
- All verifications are performed server-side
- Use HTTPS in production

### Environment Variables

- `RAZORPAY_KEY_ID` - Razorpay API Key ID (test/live)
- `RAZORPAY_KEY_SECRET` - Razorpay API Key Secret (server-only)
- `RAZORPAY_WEBHOOK_SECRET` - Webhook signature secret (server-only)

See `.env.example` for setup notes and security guidance.

### Testing Payments

- Use Razorpay test keys (Dashboard → Settings → API Keys)
- Test with Razorpay’s test card numbers (see Razorpay docs)
- Simulate success/failure via test mode
- Test webhooks using Razorpay dashboard webhook tools

## 🧭 Booking Routes

- `POST /booking` - Create booking (customer only)
- `POST /booking/payment/verify` - Verify payment (customer only)
- `POST /booking/:id/cancel` - Cancel booking (customer only)
- `GET /booking/:id` - Get booking details (customer or provider)
- `POST /booking/webhook/razorpay` - Razorpay webhook (public)

Authentication is required for all except the webhook.

## ⭐ Review & Rating System

Saheli Plus includes a comprehensive review and rating system allowing customers to share feedback after completed services and providers to reply, building trust and transparency.

### Features

- **Customer Reviews**: Rate services 1–5 stars with text feedback and optional images
- **Provider Replies**: Providers can respond to reviews on their services
- **24-Hour Edit Window**: Customers can edit/delete reviews within 24 hours (if provider hasn't replied)
- **Service Rating Recalculation**: Service `averageRating` and `reviewCount` update automatically
- **Email Notifications**: New review notifications for providers, confirmation for customers, reply notifications
- **Review Images**: Customers can attach one image per review (JPEG/PNG/WebP, max 5MB)
- **One Review Per Booking**: Each booking can be reviewed only once
- **Editable Reviews**: Reviews marked as edited when updated, edit window preserved
- **Provider Reply Lock**: Once a provider replies, the customer can no longer edit/delete (preserves conversation context)

### Review Routes

**Customer Actions:**
- `POST /reviews` - Create a review (authenticated customer, for completed bookings)
- `POST /reviews/add` - Alias for `POST /reviews` (backward compatibility)
- `PUT /reviews/:id` - Update a review (owner within 24h, no provider reply yet)
- `DELETE /reviews/:id` - Delete a review (owner within 24h)

**Provider Actions:**
- `PATCH /reviews/:id/reply` - Add provider reply to a review (authenticated provider, owns the service)
- `PATCH /reviews/reply/:reviewId` - Alias for `PATCH /reviews/:id/reply` (alternate path)
- `GET /reviews/provider` - Get own reviews (authenticated provider)

**Public Actions:**
- `GET /reviews/service/:serviceId` - Get reviews for a service (public, supports pagination and sorting)

### Review Workflow

**Customer Side:**
1. Customer completes a booking (`status: Completed`)
2. Customer dashboard or booking detail modal shows "Rate & Review" button
3. Customer clicks button → review modal opens with booking pre-filled
4. Customer selects star rating (1–5), writes review (20–1000 chars), optionally uploads image
5. On submit → booking marked as reviewed, service rating recalculated, emails sent
6. Within 24h (and no provider reply yet), customer can edit/delete via review actions

**Provider Side:**
1. Provider receives email notification of new review
2. Provider dashboard shows recent reviews with "Reply" button
3. Provider clicks "Reply" → reply modal opens
4. Provider writes reply (max 500 chars) and submits
5. Reply saved, customer receives email notification
6. Once replied, customer can no longer edit/delete the review

**Public Display:**
- Service detail page shows all reviews with pagination and sort options (newest, oldest, highest, lowest)
- Stars rendered as visual icons, review images displayed with lightbox
- Provider replies shown inline below each review

### Review Model Fields

```javascript
{
  serviceId: ObjectId,        // Service being reviewed
  providerId: ObjectId,       // Provider who offered the service
  customerId: ObjectId,       // Customer who wrote the review
  bookingId: ObjectId,        // Booking reference (unique)
  rating: Number,             // 1–5 stars
  reviewText: String,         // 20–1000 characters
  reviewImage: String,        // Path to uploaded image (optional)
  providerReply: String,      // Provider's response (optional, max 500)
  repliedAt: Date,            // When provider replied
  isEdited: Boolean,          // True if review was edited
  editableUntil: Date,        // 24 hours from creation
  createdAt: Date,
  updatedAt: Date
}
```

### Validation & Constraints

- **Rating**: Required, integer 1–5
- **Review Text**: Required, 20–1000 characters
- **Review Image**: Optional, JPEG/PNG/WebP, max 5MB
- **Provider Reply**: Optional, max 500 characters
- **Edit Window**: 24 hours from creation
- **Edit Lock**: No editing after provider reply
- **One Per Booking**: Each booking can only have one review

### Email Notifications

- **New Review Notification** → Provider receives email with customer name, rating, and review text
- **Review Confirmation** → Customer receives email confirming review submission
- **Provider Reply Notification** → Customer receives email when provider replies to their review

### Security & Ownership

- Customers can only review their own completed bookings
- Only the review owner can edit/delete (within 24h and no reply)
- Only the service provider can reply to reviews on their services
- All ownership checks enforced server-side via middleware (`ensureReviewOwner`, `ensureReviewProvider`)
- Review images validated for type and size before storage

### UI Integration

**Customer Dashboard:**
- Completed bookings show "Rate & Review" button (enabled if not reviewed)
- Button opens review modal pre-filled with `bookingId`
- Modal includes star input, text area, and image upload

**Provider Dashboard:**
- Recent reviews section displays last 5 reviews with star ratings
- Each review has "Reply" button (if not already replied)
- Reply modal allows provider to write a response

**Service Detail Page:**
- Reviews section below service details
- Sort by newest/oldest/highest/lowest rating
- Pagination controls (5 reviews per page)
- Review cards show customer name, date, rating, text, image (if any)
- Provider replies displayed inline with reply date

**Booking Detail Modal:**
- Review CTA shown for completed bookings not yet reviewed
- Opens review modal when clicked

### Files Structure

```
models/
  └── Review.js                  # Review schema with hooks and statics
controllers/
  └── reviewController.js        # Review CRUD and reply handlers
routes/
  └── reviews.js                 # Review routes with aliases
middleware/
  ├── upload.js                  # Review image upload (multer)
  ├── validation.js              # Review validation rules
  └── auth.js                    # Review ownership checks
utils/
  ├── helpers.js                 # Review formatting utilities
  └── emailService.js            # Review email notifications
views/
  └── partials/
      ├── review-card.ejs        # Review display component
      ├── review-form-modal.ejs  # Create/edit review modal
      └── provider-reply-modal.ejs # Provider reply modal
public/
  ├── styles/
  │   └── reviews.css            # Review UI styles
  ├── js/
  │   └── reviews.js             # Review modal logic and AJAX
  └── uploads/
      └── reviews/               # Review images storage
```

### Testing Reviews

**As Customer:**
1. Complete a booking (set status to 'Completed' in DB or via provider action)
2. Go to customer dashboard → Completed tab
3. Click "Rate & Review" on a completed booking
4. Submit review with rating, text, and optional image
5. Verify review appears on service detail page and provider dashboard
6. Try editing within 24h (should work), wait for provider reply, then try editing (should fail)

**As Provider:**
1. Go to provider dashboard → Recent Reviews section
2. Click "Reply" on a review
3. Submit reply and verify it appears on the review card
4. Check customer receives email notification

**Public Viewing:**
1. Visit any service detail page: `/service/:id`
2. Scroll to "Customer Reviews" section
3. Test sorting (newest, highest, lowest, oldest)
4. Test pagination if there are >5 reviews
5. Verify stars, images, and provider replies render correctly

### Notes

- Reviews are soft-linked to bookings; deleting a review unlinks it from the booking
- Service rating recalculation is atomic and runs on review save/delete
- All review actions return JSON responses for AJAX integration
- Review images stored in `public/uploads/reviews/` with UUID filenames
- Edit window enforced via `editableUntil` field (set to `createdAt + 24h`)
- Provider replies are immutable once submitted (no edit/delete for replies in MVP)
- Review system is fully decoupled; can be extended with moderation, abuse reporting, etc.

