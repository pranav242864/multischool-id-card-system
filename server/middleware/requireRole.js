// Role-based access control middleware
// Allows access only to specified roles

const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
      // requireAuth MUST run before this
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
  
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: `Role '${req.user.role}' is not authorized to access this route`
        });
      }
  
      next();
    };
  };
  
  module.exports = requireRole;
  