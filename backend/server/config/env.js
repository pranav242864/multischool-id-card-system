const dotenv = require('dotenv');

// Load environment variables from .env file (optional - doesn't fail if .env is missing)
dotenv.config();

module.exports = {
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  frontendUrl: process.env.FRONTEND_URL,
  rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : undefined,
  rateLimitMax: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : undefined,
  bodySizeLimit: process.env.BODY_SIZE_LIMIT,
  fileUploadSizeLimit: process.env.FILE_UPLOAD_SIZE_LIMIT,
};