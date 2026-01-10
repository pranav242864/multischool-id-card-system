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
const { isSuperadmin } = require('../utils/roleGuards');

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
    
    // Special case: School creation route - no schoolId needed (school doesn't exist yet)
    const isSchoolCreationRoute = req.method === 'POST' && 
      (urlToCheck === '/api/v1/schools' || 
       urlToCheck.endsWith('/schools') ||
       urlToCheck.includes('/schools') && !urlToCheck.includes('/schools/'));
    
    if (isSchoolCreationRoute) {
      // For school creation, no schoolId is needed (school is being created)
      req.schoolId = null;
      req.schoolFilter = {};
      return next();
    }
    
    // Special case: Template creation route - schoolId can come from req.body
    const isTemplateCreationRoute = req.method === 'POST' && 
      (urlToCheck === '/api/v1/templates' || 
       urlToCheck.endsWith('/templates') ||
       urlToCheck.includes('/templates') && !urlToCheck.includes('/templates/'));
    
    if (isTemplateCreationRoute) {
      // For template creation, schoolId can be in req.body (for Superadmin) or will come from JWT (for School Admin)
      // If schoolId is in body but not in query, copy it to query so getSchoolIdForOperation can find it
      if (req.body?.schoolId && !req.query?.schoolId) {
        req.query.schoolId = req.body.schoolId;
      }
      // Controller will validate and use getSchoolIdForOperation which checks query
      req.schoolId = req.query?.schoolId || req.body?.schoolId || null;
      req.schoolFilter = req.query?.schoolId || req.body?.schoolId ? { schoolId: req.query?.schoolId || req.body?.schoolId } : {};
      return next();
    }
    
    // Special case: Template routes (GET/PATCH/DELETE) - For Superadmin, no schoolId required
    // Controller will validate template ownership and extract schoolId from the template itself
    // Match GET/PATCH/DELETE to paths like /api/v1/templates/:id (exclude special routes)
    const allPaths = [urlToCheck, fullPath, constructedPath].filter(Boolean);
    const hasTemplatePath = allPaths.some(path => path.includes('/templates/'));
    const isSpecialRoute = allPaths.some(path => 
      path.includes('/templates/active') || 
      path.includes('/templates/download-excel') ||
      path.endsWith('/download-excel')
    );
    const isTemplateByIdRoute = (req.method === 'GET' || req.method === 'PATCH' || req.method === 'DELETE') && 
      hasTemplatePath && 
      !isSpecialRoute;
    
    if (isTemplateByIdRoute) {
      // For Superadmin template operations (get/update/delete), no schoolId is required
      // Controller will check template ownership and use the template's schoolId
      req.schoolId = null;
      req.schoolFilter = {};
      return next();
    }
    
    // Special case: Notice operations - For Superadmin, schoolId is optional
    // Notice creation: When targetAdminIds are provided, notice is system-wide targeting specific admins
    // Notice update/archive: SUPERADMIN can operate on notices they created (schoolId can be null)
    const isNoticeRoute = 
      (urlToCheck === '/api/v1/notices' || 
       urlToCheck.endsWith('/notices') ||
       urlToCheck.includes('/notices'));
    
    if (isNoticeRoute) {
      // For notice creation (POST)
      if (req.method === 'POST') {
        // Check if this is a FormData request (multipart/form-data)
        // FormData requests are parsed by multer middleware which runs after this middleware
        // For SUPERADMIN, allow FormData requests to proceed - controller will validate targetAdminIds after multer parses it
        // For SCHOOLADMIN, allow FormData requests to proceed - controller will validate targetTeacherIds after multer parses it
        const contentType = req.headers['content-type'] || '';
        const isFormDataRequest = contentType.includes('multipart/form-data');
        
        if (isFormDataRequest && (isSuperadmin(req.user) || req.user.role === 'SCHOOLADMIN')) {
          // For FormData requests from SUPERADMIN or SCHOOLADMIN, allow to proceed
          // Multer will parse the FormData, then controller will check targetAdminIds/targetTeacherIds
          if (isSuperadmin(req.user)) {
            req.schoolId = null;
            req.schoolFilter = {};
          } else if (req.user.role === 'SCHOOLADMIN') {
            // For SCHOOLADMIN, set req.schoolId from req.user.schoolId (from JWT token)
            if (!req.user.schoolId) {
              return res.status(403).json({
                success: false,
                message: 'Access denied: school ID is required'
              });
            }
            req.schoolId = req.user.schoolId;
            req.schoolFilter = { schoolId: req.user.schoolId };
          }
          return next();
        }
        
        // For JSON requests, check targetAdminIds/targetTeacherIds in body (already parsed by express.json)
        let targetAdminIds = req.body?.targetAdminIds;
        if (typeof targetAdminIds === 'string') {
          try {
            targetAdminIds = JSON.parse(targetAdminIds);
          } catch (e) {
            // If parsing fails, treat as empty
            targetAdminIds = [];
          }
        }
        
        let targetTeacherIds = req.body?.targetTeacherIds;
        if (typeof targetTeacherIds === 'string') {
          try {
            targetTeacherIds = JSON.parse(targetTeacherIds);
          } catch (e) {
            // If parsing fails, treat as empty
            targetTeacherIds = [];
          }
        }
        
        // SUPERADMIN: If targetAdminIds are provided, allow notice creation without schoolId
        // Controller will handle validation and set schoolId to null for system-wide notices
        if (isSuperadmin(req.user) && targetAdminIds && Array.isArray(targetAdminIds) && targetAdminIds.length > 0) {
          req.schoolId = null;
          req.schoolFilter = {};
          return next();
        }
        
        // SCHOOLADMIN: If targetTeacherIds are provided, use schoolId from req.user.schoolId
        // Controller will validate that teachers belong to their school
        if (req.user.role === 'SCHOOLADMIN' && targetTeacherIds && Array.isArray(targetTeacherIds) && targetTeacherIds.length > 0) {
          // Set req.schoolId from req.user.schoolId (from JWT token)
          if (!req.user.schoolId) {
            return res.status(403).json({
              success: false,
              message: 'Access denied: school ID is required'
            });
          }
          req.schoolId = req.user.schoolId;
          req.schoolFilter = { schoolId: req.user.schoolId };
          return next();
        }
        
        // If schoolId is provided in query, use it
        if (req.query?.schoolId) {
          req.schoolId = req.query.schoolId;
          req.schoolFilter = { schoolId: req.query.schoolId };
          return next();
        }
        
        // For notice creation without targetAdminIds/targetTeacherIds, require schoolId
        return res.status(400).json({
          success: false,
          message: 'School ID is required for this operation. Alternatively, provide targetAdminIds (SUPERADMIN) or targetTeacherIds (SCHOOLADMIN) to create a targeted notice.'
        });
      }
      
      // For notice update/archive (PATCH) - SUPERADMIN can operate without schoolId
      // Controller will check ownership
      if (req.method === 'PATCH') {
        req.schoolId = req.query?.schoolId || null;
        req.schoolFilter = req.query?.schoolId ? { schoolId: req.query.schoolId } : {};
        return next();
      }
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

  // For notice routes, schoolId should already be set by the notice-specific logic above
  // Skip the default logic if schoolId is already set (for notices with targetAdminIds/targetTeacherIds)
  if (req.schoolId !== undefined) {
    // schoolId was already set by notice-specific logic, just ensure schoolFilter is set
    if (req.schoolId === null) {
      req.schoolFilter = {};
    } else {
      req.schoolFilter = { schoolId: req.schoolId };
    }
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
