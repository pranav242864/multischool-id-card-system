const mongoose = require('mongoose');
const { 
  createClass: createClassService,
  getClasses: getClassesService,
  freezeClass: freezeClassService,
  unfreezeClass: unfreezeClassService
} = require('../services/class.service');
const asyncHandler = require('../utils/asyncHandler');
const { getSchoolIdForOperation, getSchoolIdForFilter } = require('../utils/getSchoolId');

// Create a new class
const createClass = asyncHandler(async (req, res, next) => {
  const { className } = req.body;
  const userId = req.user.id;

  // SECURITY: Reject any attempt to set schoolId in request body
  // schoolId must come from req.user only (enforced by middleware, but double-check here)
  if (req.body.schoolId !== undefined) {
    return res.status(403).json({
      success: false,
      message: 'Cannot set schoolId in request body. School ID is determined from your authentication token.'
    });
  }

  // Validate required fields (sessionId is no longer required - will use active session)
  if (!className) {
    return res.status(400).json({
      success: false,
      message: 'Class name is required'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  // Non-Superadmin: schoolId comes from JWT token only
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
    // sessionId will be automatically set by the service to the active session
    const classData = {
      className,
      schoolId
    };

    const newClass = await createClassService(classData);

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: newClass
    });
  } catch (error) {
    // Handle specific service errors
    if (error.message.includes('Session not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('No active session found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Class name already exists')) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }
    
    // Handle MongoDB duplicate key error (database-level enforcement)
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      return res.status(409).json({
        success: false,
        message: 'Class name already exists for this session in your school'
      });
    }

    next(error);
  }
});

// Get all classes for a school
const getClasses = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { sessionId, page = 1, limit = 10 } = req.query;

  // Validate ObjectId format for sessionId if provided
  if (sessionId && !mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format'
    });
  }

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
    const result = await getClassesService(schoolId, sessionId, parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.classes,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
});

// Freeze a class
const freezeClass = asyncHandler(async (req, res, next) => {
  const { id: classId } = req.params;
  const userId = req.user.id;

  // SECURITY: Reject any attempt to set schoolId in request body
  if (req.body && req.body.schoolId !== undefined) {
    return res.status(403).json({
      success: false,
      message: 'Cannot set schoolId in request body. School ID is determined from your authentication token.'
    });
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid class ID format'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  // Non-Superadmin: schoolId comes from JWT token only
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
    const classObj = await freezeClassService(classId, schoolId);

    res.status(200).json({
      success: true,
      message: 'Class frozen successfully',
      data: classObj
    });
  } catch (error) {
    if (error.message.includes('Class not found')) {
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
    
    if (error.message.includes('No active session found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Cannot freeze class from an inactive session')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('already frozen')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

// Unfreeze a class
const unfreezeClass = asyncHandler(async (req, res, next) => {
  const { id: classId } = req.params;
  const userId = req.user.id;

  // SECURITY: Reject any attempt to set schoolId in request body
  if (req.body && req.body.schoolId !== undefined) {
    return res.status(403).json({
      success: false,
      message: 'Cannot set schoolId in request body. School ID is determined from your authentication token.'
    });
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid class ID format'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  // Non-Superadmin: schoolId comes from JWT token only
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
    const classObj = await unfreezeClassService(classId, schoolId);

    res.status(200).json({
      success: true,
      message: 'Class unfrozen successfully',
      data: classObj
    });
  } catch (error) {
    if (error.message.includes('Class not found')) {
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
    
    if (error.message.includes('No active session found')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('Cannot unfreeze class from an inactive session')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('already unfrozen')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

module.exports = {
  createClass,
  getClasses,
  freezeClass,
  unfreezeClass
};