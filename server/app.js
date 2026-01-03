const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { enforceSchoolScoping } = require('./middleware/schoolScoping');

// Route files
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const templateRoutes = require('./routes/templateRoutes');
const bulkImportRoutes = require('./routes/bulkImportRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const classRoutes = require('./routes/classRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const cardRoutes = require('./routes/cardRoutes');
const schoolRoutes = require('./routes/schoolRoutes');

// Connect to database
// Note: This will throw and exit if connection fails (fail fast)
// Validation should have already checked env vars before this point
connectDB();

const app = express();

// Middleware
app.use(helmet()); // Security headers

// Rate limiting
const limiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(limiter);

// Enable CORS
app.use(cors());

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
// NOTE: Auth routes are mounted WITHOUT middleware - login must be public
app.use('/health', healthRoutes);
// Mount auth routes at both /api/auth and /api/v1/auth for backward compatibility
// CRITICAL: NO middleware applied - login must work without token
app.use('/api/auth', authRoutes); // Public routes: /login, /google, /forgot-password, /reset-password
app.use('/api/v1/auth', authRoutes); // Same routes, versioned
app.use('/api/v1/templates', templateRoutes); // Protected (has authMiddleware in route file)
app.use('/api/v1/bulk-import', bulkImportRoutes); // Protected (has authMiddleware in route file)
app.use('/api', enforceSchoolScoping, sessionRoutes); // Protected + school scoping
app.use('/api', enforceSchoolScoping, classRoutes); // Protected + school scoping
app.use('/api', enforceSchoolScoping, studentRoutes); // Protected + school scoping
app.use('/api', enforceSchoolScoping, teacherRoutes); // Protected + school scoping
app.use('/api/v1/cards', enforceSchoolScoping, cardRoutes); // Protected + school scoping
app.use('/api/v1', schoolRoutes); // Protected (has authMiddleware in route file)

// Handle 404 for undefined routes
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler middleware (should be last)
app.use(errorHandler);

module.exports = app;