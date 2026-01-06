const jwt = require('jsonwebtoken');
const User = require('../models/User');

require('dotenv').config();

// @desc    Protect routes - STEP 2: authMiddleware
// @route   Middleware
// @access  Private
// Requirements:
// - Read Authorization header: "Bearer <token>"
// - Verify token using JWT_SECRET
// - Fetch user from DB
// - Ensure user.status === 'ACTIVE'
// - Attach req.user = { id, role, schoolId }
// - STOP execution and RETURN response on any failure
// - NEVER call next() if authentication fails
const authMiddleware = async (req, res, next) => {
  // Read Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }

  try {
    // Verify token using JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    const decoded = jwt.verify(token, jwtSecret);

    // Verify JWT payload structure
    if (!decoded.user || !decoded.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // Fetch user from DB
    const user = await User.findById(decoded.user.id).select('status role schoolId');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists'
      });
    }

    // Ensure user.status === 'ACTIVE'
    if (user.status !== 'ACTIVE' && user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Attach req.user = { id, role, schoolId }
    req.user = {
      id: user._id.toString(),
      role: user.role,
      schoolId: user.schoolId ? user.schoolId.toString() : null
    };

    // Only call next() if all checks pass
    return next();
  } catch (error) {
    // Handle JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.'
      });
    }

    // Any other error - STOP execution and RETURN response
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// @desc    Role-based access control - STEP 3: requireRole
// @route   Middleware
// @access  Private
// Requirements:
// - Read req.user.role
// - Allow only listed roles
// - Return 403 if role is not allowed
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    // Read req.user.role
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Allow only listed roles
    // Return 403 if role is not allowed
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  requireRole
};