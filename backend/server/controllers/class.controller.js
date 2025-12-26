const mongoose = require('mongoose');
const { 
  createClass: createClassService,
  getClasses: getClassesService,
  freezeClass: freezeClassService,
  unfreezeClass: unfreezeClassService
} = require('../services/class.service');
const asyncHandler = require('../utils/asyncHandler');

// Create a new class
const createClass = asyncHandler(async (req, res, next) => {
  const { className, sessionId } = req.body;
  const userId = req.user.id;
  const userSchoolId = req.user.schoolId;

  // Validate required fields
  if (!className || !sessionId) {
    return res.status(400).json({
      success: false,
      message: 'Class name and session ID are required'
    });
  }

  // Validate ObjectId format for sessionId
  if (!mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format'
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
    const classData = {
      className,
      sessionId,
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
    
    if (error.message.includes('Cannot create class in an inactive session')) {
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

    next(error);
  }
});

// Get all classes for a school
const getClasses = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const userSchoolId = req.user.schoolId;
  const { sessionId, page = 1, limit = 10 } = req.query;

  // Validate ObjectId format for sessionId if provided
  if (sessionId && !mongoose.Types.ObjectId.isValid(sessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format'
    });
  }

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
  const userSchoolId = req.user.schoolId;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid class ID format'
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
  const userSchoolId = req.user.schoolId;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid class ID format'
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