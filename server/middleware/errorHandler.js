/**
 * Standardized Error Handler Middleware
 * 
 * Ensures all error responses follow consistent structure:
 * {
 *   success: false,
 *   message: string
 * }
 * 
 * Uses correct HTTP status codes:
 * - 400: Validation errors
 * - 401: Authentication errors
 * - 403: Permission errors
 * - 404: Not found errors
 * - 500: Server errors
 * 
 * Never leaks stack traces to clients - only logs internally
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log error for debugging (server-side only - never sent to client)
  console.error('Error:', {
    message: err.message,
    name: err.name,
    code: err.code,
    path: req.path,
    method: req.method,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'A record with this value already exists'
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
  }

  // JWT errors - Authentication failures
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Use statusCode from error if provided, otherwise default to 500
  const statusCode = err.statusCode || 500;
  
  // Default error response
  // Never expose internal error details or stack traces to client
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 
      ? 'Internal server error' 
      : (err.message || 'An error occurred')
  });
};

module.exports = errorHandler;