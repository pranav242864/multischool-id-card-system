const mongoose = require('mongoose');
const { 
  createSession: createSessionService,
  getSessions: getSessionsService,
  activateSession: activateSessionService,
  deactivateSession: deactivateSessionService,
  archiveSession: archiveSessionService,
  unarchiveSession: unarchiveSessionService
} = require('../services/session.service');
const asyncHandler = require('../utils/asyncHandler');
const { getSchoolIdForOperation, getSchoolIdForFilter } = require('../utils/getSchoolId');

// Create a new session
const createSession = asyncHandler(async (req, res, next) => {
  const { sessionName, startDate, endDate } = req.body;
  const userId = req.user.id;

  // Validate required fields
  if (!sessionName || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Session name, start date, and end date are required'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  let schoolId;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
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
  const { page = 1, limit = 10 } = req.query;

  // Get schoolId from req.user context (standardized)
  // Superadmin can use query parameter for filtering, others use req.user.schoolId
  let schoolId;
  try {
    schoolId = getSchoolIdForFilter(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
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
  const { schoolId } = req.query;
  const userId = req.user.id;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format'
    });
  }

  // Validate schoolId is provided
  if (!schoolId) {
    return res.status(400).json({
      success: false,
      message: 'schoolId is required'
    });
  }

  // Validate schoolId format
  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid schoolId format'
    });
  }

  try {
    const Session = require('../models/Session');

    // Step 1: Set activeStatus = false for ALL sessions of that school
    await Session.updateMany(
      { schoolId: schoolId },
      { $set: { activeStatus: false } }
    );

    // Step 2: Set activeStatus = true for the given session (_id + schoolId match)
    const session = await Session.findOneAndUpdate(
      {
        _id: sessionId,
        schoolId: schoolId
      },
      {
        $set: { activeStatus: true }
      },
      {
        new: true
      }
    );

    // Return 404 if session not found
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Session activated successfully',
      data: session
    });
  } catch (error) {
    next(error);
  }
});

// Deactivate a session
const deactivateSession = asyncHandler(async (req, res, next) => {
  const { id: sessionId } = req.params;
  const userId = req.user.id;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  let schoolId;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
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

// Archive a session
const archiveSession = asyncHandler(async (req, res, next) => {
  const { id: sessionId } = req.params;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  let schoolId;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  try {
    const session = await archiveSessionService(sessionId, schoolId);

    res.status(200).json({
      success: true,
      message: 'Session archived successfully',
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
    
    if (error.message.includes('Cannot archive an active session')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('already archived')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

// Unarchive a session
const unarchiveSession = asyncHandler(async (req, res, next) => {
  const { id: sessionId } = req.params;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  let schoolId;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  try {
    const session = await unarchiveSessionService(sessionId, schoolId);

    res.status(200).json({
      success: true,
      message: 'Session unarchived successfully',
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
    
    if (error.message.includes('not archived')) {
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
  deactivateSession,
  archiveSession,
  unarchiveSession
};