/**
 * School Scoping Middleware
 * 
 * Enforces strict school and session scoping for all requests:
 * 1. Strips schoolId from request body (prevents override attempts)
 * 2. Strips sessionId from request body (prevents override attempts)
 * 3. Ensures schoolId comes from req.user only (JWT token)
 * 4. Ensures sessionId comes from active session only (via service layer)
 * 
 * Usage:
 *   app.use('/api/v1/students', schoolScoping, studentRoutes);
 *   app.use('/api/v1/teachers', schoolScoping, teacherRoutes);
 *   app.use('/api/v1/classes', schoolScoping, classRoutes);
 */

/**
 * Middleware to enforce strict school and session scoping
 * - Removes schoolId from request body if present
 * - Removes sessionId from request body if present
 * - Logs warning if schoolId or sessionId was attempted in body
 * - Ensures schoolId can only come from req.user (JWT token)
 * - Ensures sessionId can only come from active session (via service layer)
 */
const enforceSchoolScoping = (req, res, next) => {
  // Check if schoolId is present in request body
  if (req.body && req.body.schoolId !== undefined) {
    // Log warning for security audit
    console.warn(`[SECURITY] Attempt to set schoolId in request body detected:`, {
      method: req.method,
      path: req.path,
      userId: req.user?.id,
      role: req.user?.role,
      attemptedSchoolId: req.body.schoolId,
      actualSchoolId: req.user?.schoolId
    });

    // Remove schoolId from body - it must come from req.user only
    delete req.body.schoolId;
  }

  // Check if sessionId is present in request body
  // sessionId must come from active session only, not from request body
  if (req.body && req.body.sessionId !== undefined) {
    // Log warning for security audit
    console.warn(`[SECURITY] Attempt to set sessionId in request body detected:`, {
      method: req.method,
      path: req.path,
      userId: req.user?.id,
      role: req.user?.role,
      attemptedSessionId: req.body.sessionId
    });

    // Remove sessionId from body - it must come from active session only
    delete req.body.sessionId;
  }

  // Check if schoolId is present in request params (for non-Superadmin)
  // Superadmin can use query params, but not path params for schoolId
  if (req.params && req.params.schoolId && req.user && req.user.role !== 'Superadmin') {
    // Non-Superadmin users cannot specify schoolId in params
    console.warn(`[SECURITY] Attempt to set schoolId in request params detected:`, {
      method: req.method,
      path: req.path,
      userId: req.user.id,
      role: req.user.role,
      attemptedSchoolId: req.params.schoolId,
      actualSchoolId: req.user.schoolId
    });

    // Don't delete from params as it might be part of the route structure
    // But we'll validate it matches req.user.schoolId in controllers
  }

  next();
};

/**
 * Validation helper to ensure schoolId matches req.user.schoolId
 * Throws error if schoolId doesn't match (for non-Superadmin)
 * 
 * @param {Object} req - Express request object
 * @param {string} providedSchoolId - SchoolId from request (body/params/query)
 * @throws {Error} If schoolId doesn't match req.user.schoolId
 */
const validateSchoolId = (req, providedSchoolId) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  // Superadmin can specify schoolId in query params
  const { isSuperadmin } = require('../utils/roleGuards');
  if (isSuperadmin(req.user)) {
    // Superadmin validation is handled by getSchoolId utility
    return;
  }

  // Non-Superadmin: schoolId must match req.user.schoolId exactly
  if (providedSchoolId && providedSchoolId.toString() !== req.user.schoolId?.toString()) {
    throw new Error('School ID mismatch. You can only access data from your assigned school.');
  }
};

module.exports = {
  enforceSchoolScoping,
  validateSchoolId
};

