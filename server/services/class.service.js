const Class = require('../models/Class');
const Session = require('../models/Session');
const School = require('../models/School');
const { getActiveSession } = require('../utils/sessionUtils');
const { validateSessionActive } = require('./session.service');
const mongoose = require('mongoose');

// Centralized helper function to check if a class is frozen
// Throws an error with a clear message if the class is frozen
// This ensures consistent freeze checking across all mutation paths
const checkClassNotFrozen = (classObj, operation = 'modify') => {
  if (!classObj) {
    throw new Error('Class not found');
  }

  if (classObj.frozen) {
    const operationMessages = {
      create: 'Cannot create student in a frozen class. Frozen classes cannot be modified.',
      update: 'Cannot update student in a frozen class. Frozen classes cannot be modified.',
      delete: 'Cannot delete student from a frozen class. Frozen classes cannot be modified.',
      promote: 'Cannot promote student from a frozen class',
      assign: 'Cannot assign student to a frozen class',
      modify: 'Cannot modify student in a frozen class. Frozen classes cannot be modified.'
    };
    
    const message = operationMessages[operation] || `Cannot ${operation} student in a frozen class`;
    throw new Error(message);
  }
};

// Helper function to get and validate class, then check if frozen
// Returns the class object if valid and not frozen
// SECURITY: Requires schoolId to enforce strict scoping
const validateClassNotFrozen = async (classId, schoolId, operation = 'modify') => {
  // SECURITY: Filter by schoolId to prevent cross-school access
  // Only check active classes (exclude deleted/inactive)
  const classObj = await Class.findOne({
    _id: classId,
    schoolId: schoolId, // STRICT: Filter by schoolId
    status: 'ACTIVE' // Only check active classes (enum value is uppercase)
  });
  checkClassNotFrozen(classObj, operation);
  return classObj;
};

// Create a new class
// Automatically uses the active session
const createClass = async (classData) => {
  // Get the active session for the school (throws error if none exists)
  const activeSession = await getActiveSession(classData.schoolId);

  // Automatically assign the active session
  classData.sessionId = activeSession._id;

  // Check if class name is unique for the school and active session
  // Only check active classes (exclude deleted/inactive)
  const existingClass = await Class.findOne({
    className: classData.className,
    schoolId: classData.schoolId,
    sessionId: activeSession._id,
    status: 'ACTIVE' // Only check active classes (enum value is uppercase)
  });

  if (existingClass) {
    throw new Error('Class name already exists for this session in your school');
  }

  try {
  const newClass = new Class(classData);
  await newClass.save();
  return newClass;
  } catch (error) {
    // Handle MongoDB duplicate key error (database-level enforcement)
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      // Check if it's the className uniqueness constraint
      if (error.keyPattern) {
        // Check for unique_class_name_per_school_session index
        if (error.keyPattern.className && error.keyPattern.schoolId && error.keyPattern.sessionId) {
          throw new Error('Class name already exists for this session in your school');
        }
        // Fallback for any other unique constraint
        if (error.keyPattern.className || (error.keyPattern.schoolId && error.keyPattern.sessionId)) {
          throw new Error('Class name already exists for this session in your school');
        }
      }
      // Generic duplicate error if pattern doesn't match
      throw new Error('Duplicate entry detected. Class name may already exist for this session in your school.');
    }
    throw error;
  }
};

// Get all classes for a school with optional session filter and pagination
// Automatically filters by active session (sessionId parameter is ignored for consistency)
// For SUPERADMIN: schoolId can be null to get all classes
const getClasses = async (schoolId, sessionId = null, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  
  // Only return active classes (exclude deleted/inactive)
  const filter = { 
    status: 'ACTIVE' // Only show active classes (enum value is uppercase)
  };

  // If schoolId is provided, filter by school and active session
  if (schoolId) {
    // Get the active session for the school (throws error if none exists)
    const activeSession = await getActiveSession(schoolId);
    filter.schoolId = schoolId;
    filter.sessionId = activeSession._id; // Only show classes from active session
  }
  // If schoolId is null (SUPERADMIN without query param), return all active classes
  // Note: This bypasses active session filtering for SUPERADMIN

  const classes = await Class.find(filter)
    .populate('sessionId', 'sessionName startDate endDate activeStatus')
    .populate('schoolId', 'name')
    .sort({ className: 1 }) // Sort by class name alphabetically
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Class.countDocuments(filter);

  return {
    classes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Freeze a class
// Prevents freezing classes from inactive sessions
// SECURITY: Enforces strict school scoping - schoolId must match
const freezeClass = async (classId, schoolId) => {
  // Get the active session for the school (throws error if none exists)
  const activeSession = await getActiveSession(schoolId);
  
  // Verify class exists - MUST filter by schoolId for security
  // Only check active classes (exclude deleted/inactive)
  const classObj = await Class.findOne({
    _id: classId,
    schoolId: schoolId, // STRICT: Filter by schoolId to prevent cross-school access
    status: 'ACTIVE' // Only check active classes (enum value is uppercase)
  });
  
  if (!classObj) {
    // Don't reveal if class exists but belongs to different school
    throw new Error('Class not found');
  }

  // Prevent freezing classes from inactive sessions
  if (classObj.sessionId.toString() !== activeSession._id.toString()) {
    throw new Error('Cannot freeze class from an inactive session');
  }

  // Check if already frozen
  if (classObj.frozen) {
    throw new Error('Class is already frozen');
  }

  classObj.frozen = true;
  await classObj.save();

  return classObj;
};

// Unfreeze a class
// Prevents unfreezing classes from inactive or archived sessions
// SECURITY: Enforces strict school scoping - schoolId must match
const unfreezeClass = async (classId, schoolId) => {
  // Get the active session for the school (throws error if none exists or archived)
  const activeSession = await getActiveSession(schoolId);
  
  // Verify class exists - MUST filter by schoolId for security
  const classObj = await Class.findOne({
    _id: classId,
    schoolId: schoolId // STRICT: Filter by schoolId to prevent cross-school access
  }).populate('sessionId', 'activeStatus archived');
  
  if (!classObj) {
    // Don't reveal if class exists but belongs to different school
    throw new Error('Class not found');
  }

  // Prevent unfreezing classes from inactive or archived sessions
  // When sessionId is populated, it's a Session document, so use ._id to get the ObjectId
  const classSessionId = classObj.sessionId._id ? classObj.sessionId._id.toString() : classObj.sessionId.toString();
  if (classSessionId !== activeSession._id.toString()) {
    // Check if the class's session is archived
    if (classObj.sessionId && classObj.sessionId.archived) {
      throw new Error('Cannot unfreeze class from an archived session. Archived sessions are read-only.');
    }
    throw new Error('Cannot unfreeze class from an inactive session. Only classes in the active session can be unfrozen.');
  }

  // Check if already unfrozen
  if (!classObj.frozen) {
    throw new Error('Class is already unfrozen');
  }

  classObj.frozen = false;
  await classObj.save();

  return classObj;
};

module.exports = {
  createClass,
  getClasses,
  freezeClass,
  unfreezeClass,
  checkClassNotFrozen,
  validateClassNotFrozen
};