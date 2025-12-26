const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Route files
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const templateRoutes = require('./routes/templateRoutes');
const bulkImportRoutes = require('./routes/bulkImportRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const classRoutes = require('./routes/classRoutes');
const studentRoutes = require('./routes/studentRoutes');
const teacherRoutes = require('./routes/teacherRoutes');

// Connect to database (non-blocking - errors will be handled at runtime)
connectDB().catch(err => {
  console.error('Failed to connect to database:', err.message);
  console.error('Application will start but database operations will fail until connection is established');
});

const app = express();

// Middleware
app.use(helmet()); // Security headers

// Rate limiting
if (env.rateLimitWindowMs && env.rateLimitMax) {
  const limiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    message: {
      success: false,
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
}

// Enable CORS with strict origin validation
if (!env.frontendUrl) {
  console.error('ERROR: FRONTEND_URL environment variable is required for CORS configuration');
  process.exit(1);
}

// Validate FRONTEND_URL does not contain wildcard
if (env.frontendUrl === '*' || env.frontendUrl.includes('*')) {
  console.error('ERROR: FRONTEND_URL cannot contain wildcard (*). Wildcard origins are forbidden.');
  process.exit(1);
}

// Configure CORS with strict origin validation
const corsOptions = {
  origin: env.frontendUrl, // Strictly process.env.FRONTEND_URL
  credentials: true, // Credentials enabled
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
};

app.use(cors(corsOptions));

// Body parser middleware
const bodySizeLimit = env.bodySizeLimit;
if (bodySizeLimit) {
  app.use(express.json({ limit: bodySizeLimit }));
  app.use(express.urlencoded({ extended: true, limit: bodySizeLimit }));
} else {
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
}

// Routes - All routes use /api/v1 base prefix
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/bulk-import', bulkImportRoutes);
app.use('/api/v1', sessionRoutes);
app.use('/api/v1', classRoutes);
app.use('/api/v1', studentRoutes);
app.use('/api/v1', teacherRoutes);

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