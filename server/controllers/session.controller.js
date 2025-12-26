const mongoose = require('mongoose');
const { 
  createSession: createSessionService,
  getSessions: getSessionsService,
  activateSession: activateSessionService,
  deactivateSession: deactivateSessionService
} = require('../services/session.service');
const asyncHandler = require('../utils/asyncHandler');

// Create a new session
const createSession = asyncHandler(async (req, res, next) => {
  const { sessionName, startDate, endDate } = req.body;
  const userId = req.user.id;
  const userSchoolId = req.user.schoolId;

  // Validate required fields
  if (!sessionName || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Session name, start date, and end date are required'
    });
  }

  // Validate ObjectId format if not superadmin
  if (req.user.role !== 'Superadmin' && !userSchoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required for non-superadmin users'
    });
  }

  // Use the user's schoolId for non-superadmin users, or allow schoolId in body for superadmin
  const schoolId = req.user.role === 'Superadmin' ? req.body.schoolId : userSchoolId;

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }

  try {
    const sessionData = {
      sessionName,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      schoolId
    };

    const session = await createSessionService(sessionData);

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: session
    });
  } catch (error) {
    // Handle specific service errors
    if (error.message.includes('Start date must be before end date')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Session name already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

// Get all sessions for a school
const getSessions = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const userSchoolId = req.user.schoolId;
  const { page = 1, limit = 10 } = req.query;

  // Determine schoolId based on user role
  let schoolId;
  if (req.user.role === 'Superadmin') {
    // For superadmin, allow filtering by schoolId in query
    schoolId = req.query.schoolId || userSchoolId;
  } else {
    schoolId = userSchoolId;
  }

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }

  try {
    const result = await getSessionsService(schoolId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.sessions,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
});

// Activate a session
const activateSession = asyncHandler(async (req, res, next) => {
  const { id: sessionId } = req.params;
  const userId = req.user.id;
  const userSchoolId = req.user.schoolId;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format'
    });
  }

  // Determine schoolId based on user role
  const schoolId = req.user.role === 'Superadmin' ? req.body.schoolId : userSchoolId;

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }

  try {
    const session = await activateSessionService(sessionId, schoolId);

    res.status(200).json({
      success: true,
      message: 'Session activated successfully',
      data: session
    });
  } catch (error) {
    if (error.message.includes('Session not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('does not belong to your school')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

// Deactivate a session
const deactivateSession = asyncHandler(async (req, res, next) => {
  const { id: sessionId } = req.params;
  const userId = req.user.id;
  const userSchoolId = req.user.schoolId;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format'
    });
  }

  // Determine schoolId based on user role
  const schoolId = req.user.role === 'Superadmin' ? req.body.schoolId : userSchoolId;

  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }

  try {
    const session = await deactivateSessionService(sessionId, schoolId);

    res.status(200).json({
      success: true,
      message: 'Session deactivated successfully',
      data: session
    });
  } catch (error) {
    if (error.message.includes('Session not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('does not belong to your school')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('already inactive')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

module.exports = {
  createSession,
  getSessions,
  activateSession,
  deactivateSession
};