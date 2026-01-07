const AuditLog = require('../models/AuditLog');

/**
 * Log audit event
 * Fire-and-forget: Never throws errors, never blocks execution
 * @param {Object} params
 * @param {String} params.action - Action name (e.g. CREATE_STUDENT, DELETE_TEACHER, LOGIN)
 * @param {String} params.entityType - Entity type (STUDENT, TEACHER, NOTICE, TEMPLATE, USER)
 * @param {String} params.entityId - Entity ID (optional)
 * @param {String} params.schoolId - School ID
 * @param {Object} params.user - User object with id and role
 * @param {Object} params.req - Express request object
 * @param {String} params.status - SUCCESS or FAILED (default: SUCCESS)
 * @param {String} params.errorMessage - Error message if status is FAILED (optional)
 * @param {Object} params.metadata - Additional metadata (optional)
 */
async function logAuditEvent({
  action,
  entityType,
  entityId = null,
  schoolId,
  user,
  req,
  status = 'SUCCESS',
  errorMessage = null,
  metadata = {}
}) {
  try {
    // Extract user information
    const performedBy = user?.id || user?._id;
    const role = user?.role;

    if (!performedBy || !role) {
      console.error('[AuditLog] Missing user information:', { performedBy, role });
      return;
    }

    // Extract IP address
    let ipAddress = req?.ip || req?.connection?.remoteAddress;
    if (req?.headers && req.headers['x-forwarded-for']) {
      ipAddress = req.headers['x-forwarded-for'].split(',')[0].trim();
    }
    if (!ipAddress) {
      ipAddress = 'unknown';
    }

    // Extract user agent
    const userAgent = req?.headers?.['user-agent'] || 'unknown';

    // Create audit log entry
    await AuditLog.create({
      action,
      entityType,
      entityId: entityId || null,
      schoolId,
      performedBy,
      role,
      metadata,
      ipAddress,
      userAgent,
      status,
      errorMessage: errorMessage || null,
      createdAt: new Date()
    });
  } catch (error) {
    // Never throw - audit logging must not block main flow
    console.error('[AuditLog] Failed to log audit event:', {
      action,
      entityType,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

module.exports = {
  logAuditEvent
};

