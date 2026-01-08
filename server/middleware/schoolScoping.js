// @desc    School scoping middleware - STEP 4: schoolScoping
// @route   Middleware
// @access  Private
// Requirements:
// - REQUIRE req.user to exist
// - If role === SUPERADMIN → require req.query.schoolId
// - Otherwise require req.user.schoolId
// - Attach school filter to req (req.schoolFilter or equivalent)
// - Return error if schoolId missing
const mongoose = require('mongoose');

const schoolScoping = (req, res, next) => {
  // REQUIRE req.user to exist
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // If role === SUPERADMIN → require req.query.schoolId (except for school management routes)
  if (req.user.role === 'SUPERADMIN' || req.user.role === 'Superadmin') {
    // Check if this is a school management route (GET/POST /schools without :id)
    // Path can be '/schools' (router context) or '/api/v1/schools' (full path)
    // Exclude routes with IDs like '/schools/:id' which would be '/schools/69578dbc...'
    const pathMatch = req.path.match(/^\/schools$/);
    const isSchoolManagementRoute = pathMatch !== null || req.path === '/api/v1/schools';
    
    // For school management routes, allow SUPERADMIN to proceed without schoolId
    if (isSchoolManagementRoute) {
      // Don't set req.schoolId or req.schoolFilter for school management routes
      // Controllers handle school operations directly
      return next();
    }
    
    // For all other routes, require schoolId query parameter
    if (!req.query || !req.query.schoolId) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required for this operation'
      });
    }

    // Validate schoolId as Mongo ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.query.schoolId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid school ID format'
      });
    }

    // Assign to req.schoolId and create filter
    req.schoolId = req.query.schoolId;
    req.schoolFilter = { schoolId: req.query.schoolId };
    return next();
  }

  // Otherwise require req.user.schoolId
  if (!req.user.schoolId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: school ID is required'
    });
  }

  // Attach school filter to req (req.schoolFilter or equivalent)
  req.schoolId = req.user.schoolId;
  req.schoolFilter = { schoolId: req.user.schoolId };

  next();
};

module.exports = schoolScoping;
