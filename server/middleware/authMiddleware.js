const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const { isSuperadmin, isTeacher } = require('../utils/roleGuards');

// Note: dotenv should already be loaded in server.js
// Use env.jwtSecret instead of process.env.JWT_SECRET for consistency

// @desc    Protect routes
// @route   Middleware
// @access  Private
// Validates JWT token and enforces edge case checks:
// - Expired tokens are rejected with specific error
// - Disabled users are rejected even with valid token
// - Deleted users are rejected even with valid token
// - Role changes are detected (token role must match database role)
const authMiddleware = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token (this will throw TokenExpiredError if expired)
      // env.jwtSecret should be validated at startup, but check here as fallback
      if (!env.jwtSecret) {
        return res.status(500).json({
          success: false,
          message: 'Server configuration error: JWT_SECRET not configured'
        });
      }
      const decoded = jwt.verify(token, env.jwtSecret);

      // Edge case validation: Verify user still exists and is active
      const user = await User.findById(decoded.user.id).select('status role schoolId');
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User account no longer exists'
        });
      }

      // Edge case validation: Check if user is disabled
      if (user.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: 'Account is inactive. Please contact an administrator.'
        });
      }

      // Edge case validation: Verify role hasn't changed (token role must match database role)
      if (user.role !== decoded.user.role) {
        return res.status(401).json({
          success: false,
          message: 'Your account role has changed. Please log in again.'
        });
      }

      // Edge case validation: Verify schoolId hasn't changed for non-superadmin users
      if (!isSuperadmin({ role: user.role })) {
        const tokenSchoolId = decoded.user.schoolId ? decoded.user.schoolId.toString() : null;
        const dbSchoolId = user.schoolId ? user.schoolId.toString() : null;
        
        if (tokenSchoolId !== dbSchoolId) {
          return res.status(401).json({
            success: false,
            message: 'Your school assignment has changed. Please log in again.'
          });
        }
      }

      // Attach user data to request (use database values, not token values)
      // Standardized structure: id, role, schoolId (null for Superadmin)
      req.user = {
        id: user._id.toString(), // Ensure string format
        role: user.role, // 'Superadmin', 'Schooladmin', or 'Teacher'
        schoolId: user.schoolId ? user.schoolId.toString() : null // null for Superadmin, string for others
      };
      
      next();
    } catch (error) {
      // Handle specific JWT errors
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
      
      console.error('Auth middleware error:', error);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// @desc    Role-based access control
// @route   Middleware
// @access  Private
const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`
      });
    }

    next();
  };
};

// @desc    Block teachers from delete operations (defense-in-depth)
// @route   Middleware
// @access  Private
// This middleware explicitly blocks teachers from DELETE operations
// Teachers can create and update students in their assigned class (when not frozen)
// It serves as an additional security layer beyond roleMiddleware
const blockTeachersFromDeletes = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // Block teachers from DELETE operations only
  if (isTeacher(req.user) && req.method === 'DELETE') {
    return res.status(403).json({
      success: false,
      message: 'Teachers cannot delete students. Only administrators can delete students.'
    });
  }

  next();
};

module.exports = {
  authMiddleware,
  roleMiddleware,
  blockTeachersFromMutations: blockTeachersFromDeletes, // Keep old name for backward compatibility
  blockTeachersFromDeletes
};