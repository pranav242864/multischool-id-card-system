// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log error for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    if (!res.headersSent) {
      return res.status(400).json({
        success: false,
        error: 'Resource not found',
        message: 'Invalid ID format'
      });
    }
    return;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    if (!res.headersSent) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate field value entered',
        message: 'A record with this value already exists'
      });
    }
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    if (!res.headersSent) {
      const message = Object.values(err.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: message
      });
    }
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    if (!res.headersSent) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }
    return;
  }

  if (err.name === 'TokenExpiredError') {
    if (!res.headersSent) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Token expired'
      });
    }
    return;
  }

  // Default error - ensure JSON response
  if (!res.headersSent) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.name || 'Server Error',
      message: err.message || 'Internal Server Error'
    });
  }
};

module.exports = errorHandler;