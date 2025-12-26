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

// Connect to database
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
app.use('/health', healthRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/bulk-import', bulkImportRoutes);
app.use('/api', sessionRoutes);
app.use('/api', classRoutes);
app.use('/api', studentRoutes);
app.use('/api', teacherRoutes);

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