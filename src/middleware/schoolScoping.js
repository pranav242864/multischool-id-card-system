// @desc    School scoping middleware - STEP 4: schoolScoping
// @route   Middleware
// @access  Private
// Requirements:
// - REQUIRE req.user to exist
// - If role === SUPERADMIN → allow
// - Otherwise require req.user.schoolId
// - Attach school filter to req (req.schoolFilter or equivalent)
// - Return error if schoolId missing
const schoolScoping = (req, res, next) => {
  // REQUIRE req.user to exist
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  // If role === SUPERADMIN → allow
  if (req.user.role === 'SUPERADMIN' || req.user.role === 'Superadmin') {
    // SUPERADMIN can access all schools, no filter needed
    req.schoolFilter = {};
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
  req.schoolFilter = { schoolId: req.user.schoolId };

  next();
};

module.exports = schoolScoping;

