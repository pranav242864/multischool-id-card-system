const dotenv = require('dotenv');

// Load environment variables from .env file
// This should be called before any process.env access
dotenv.config();

// Support both MONGO_URI and MONGODB_URI (common aliases)
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

// Export environment configuration
// Note: Required vars (MONGO_URI, JWT_SECRET) should be validated before this module is used
// Use validateEnv() from validateEnv.js for validation
module.exports = {
  port: parseInt(process.env.PORT) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: mongoUri, // Will be undefined if not set - validation should catch this
  jwtSecret: jwtSecret, // Will be undefined if not set - validation should catch this
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
};