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

  // If role === SUPERADMIN → require req.query.schoolId (except for dashboard-level GET routes)
  if (req.user.role === 'SUPERADMIN' || req.user.role === 'Superadmin') {
    // SUPERADMIN exemption: Allow GET requests to dashboard-level read routes without schoolId
    // These are read-only operations that return aggregated data across all schools
    // Mutations (POST/PATCH/DELETE) still require schoolId to ensure data is scoped correctly
    const isGetRequest = req.method === 'GET';
    
    // Robust URL detection: check multiple sources to handle Express router mounting
    // req.originalUrl contains full path (e.g., /api/v1/schools)
    // req.baseUrl + req.path also works for mounted routers
    const fullPath = req.originalUrl ? req.originalUrl.split('?')[0] : '';
    const constructedPath = req.baseUrl && req.path ? (req.baseUrl + req.path).split('?')[0] : '';
    const urlToCheck = fullPath || constructedPath || req.url?.split('?')[0] || '';
    
    // Dashboard-level read routes that SUPERADMIN can access without schoolId
    const dashboardRoutes = [
      '/api/v1/schools',
      '/api/v1/notices',
      '/api/v1/auth/login-logs',
      '/api/v1/users'
    ];
    
    // Check if this is a dashboard-level GET route
    const isDashboardReadRoute = isGetRequest && 
      dashboardRoutes.some(route => urlToCheck === route || urlToCheck.startsWith(route + '/'));
    
    // For dashboard-level GET routes, allow SUPERADMIN to proceed without schoolId
    // Controllers will handle returning all data (or filtered based on query params if provided)
    if (isDashboardReadRoute) {
      req.schoolId = null;
      req.schoolFilter = {};
      return next();
    }
    
    // Special case: User creation routes have schoolId in req.body, not req.query
    // These routes are: POST /api/v1/users/admin, POST /api/v1/users/teacher, POST /api/v1/users/teacher-admin
    const isUserCreationRoute = req.method === 'POST' && 
      (urlToCheck === '/api/v1/users/admin' || 
       urlToCheck === '/api/v1/users/teacher' || 
       urlToCheck === '/api/v1/users/teacher-admin' ||
       urlToCheck.endsWith('/users/admin') || 
       urlToCheck.endsWith('/users/teacher') ||
       urlToCheck.endsWith('/users/teacher-admin') ||
       urlToCheck.includes('/users/admin') ||
       urlToCheck.includes('/users/teacher') ||
       urlToCheck.includes('/users/teacher-admin'));
    
    if (isUserCreationRoute) {
      // For user creation, schoolId is in req.body, controller will validate it
      // Allow request to proceed - controller handles validation
      req.schoolId = req.body?.schoolId || null;
      req.schoolFilter = req.body?.schoolId ? { schoolId: req.body.schoolId } : {};
      return next();
    }
    
    // For all other routes (including POST/PATCH/DELETE and non-dashboard GET routes),
    // SUPERADMIN must provide schoolId in query parameter to scope the operation
    // This ensures mutations are always scoped to a specific school
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
