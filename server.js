const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');
const connectDB = require('./config/database');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
const fs = require('fs');
connectDB();

// Trust proxy for secure cookies behind reverse proxy (production)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Webhook route with raw body (must be before express.json())
const bookingController = require('./controllers/bookingController');
app.post('/booking/webhook/razorpay', express.raw({ type: 'application/json' }), bookingController.handleWebhook);

// Middleware configuration
// Parse JSON request bodies
app.use(express.json());
// Ensure uploads directories exist

try {
  const uploadsDir = path.join(__dirname, 'public', 'uploads');
  const profilesDir = path.join(uploadsDir, 'profiles');
  const servicesDir = path.join(uploadsDir, 'services');
  const reviewsDir = path.join(uploadsDir, 'reviews');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(profilesDir)) fs.mkdirSync(profilesDir, { recursive: true });
  if (!fs.existsSync(servicesDir)) fs.mkdirSync(servicesDir, { recursive: true });
  if (!fs.existsSync(reviewsDir)) fs.mkdirSync(reviewsDir, { recursive: true });
  console.log('Uploads directories ensured.');
} catch (err) {
  console.error('Error creating uploads directories:', err);
}

// Parse URL-encoded request bodies (form data)
app.use(express.urlencoded({ extended: true }));

// Method override for PUT/DELETE from forms
app.use(methodOverride('_method'));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'saheli-plus-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
    },
  })
);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS as view engine
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Set locals middleware (makes session user available to all views)
const { setLocals } = require('./middleware/auth');
app.use(setLocals);

// Flash message middleware (maps query params to alert locals)
const flashMiddleware = require('./middleware/flash');
app.use(flashMiddleware);

// Import and mount service routes
const serviceRoutes = require('./routes/services');
app.use('/services', serviceRoutes);

// Import routes
const indexRouter = require('./routes/index');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const bookingRoutes = require('./routes/booking');
const reviewRoutes = require('./routes/reviews');

// Mount routes
app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/booking', bookingRoutes);
app.use('/reviews', reviewRoutes);
app.use('/', indexRouter);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Visit: http://localhost:${PORT}`);
});

// Initialize cron jobs for booking lifecycle
try {
  const { initCronJobs } = require('./utils/cronJobs');
  initCronJobs();
  console.log('Cron jobs initialized');
} catch (err) {
  console.error('Failed to initialize cron jobs:', err);
}

// Export app for potential testing
module.exports = app;
