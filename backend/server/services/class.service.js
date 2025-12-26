const Class = require('../models/Class');
const Session = require('../models/Session');
const School = require('../models/School');
const mongoose = require('mongoose');

// Create a new class
const createClass = async (classData) => {
  // Verify the session exists and is active
  const session = await Session.findById(classData.sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (!session.activeStatus) {
    throw new Error('Cannot create class in an inactive session');
  }

  // Check if class name is unique for the school and session
  const existingClass = await Class.findOne({
    className: classData.className,
    schoolId: classData.schoolId,
    sessionId: classData.sessionId
  });

  if (existingClass) {
    throw new Error('Class name already exists for this session in your school');
  }

  const newClass = new Class(classData);
  await newClass.save();
  return newClass;
};

// Get all classes for a school with optional session filter and pagination
const getClasses = async (schoolId, sessionId = null, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  
  const filter = { schoolId };
  if (sessionId) {
    filter.sessionId = sessionId;
  }

  const classes = await Class.find(filter)
    .populate('sessionId', 'sessionName startDate endDate activeStatus')
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
const freezeClass = async (classId, schoolId) => {
  // Verify class exists and belongs to the school
  const classObj = await Class.findById(classId);
  if (!classObj) {
    throw new Error('Class not found');
  }

  if (classObj.schoolId.toString() !== schoolId.toString()) {
    throw new Error('Class does not belong to your school');
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
const unfreezeClass = async (classId, schoolId) => {
  // Verify class exists and belongs to the school
  const classObj = await Class.findById(classId);
  if (!classObj) {
    throw new Error('Class not found');
  }

  if (classObj.schoolId.toString() !== schoolId.toString()) {
    throw new Error('Class does not belong to your school');
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
  unfreezeClass
};