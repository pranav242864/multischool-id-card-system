const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Session = require('../models/Session');
const School = require('../models/School');
const mongoose = require('mongoose');

// Create a new teacher
const createTeacher = async (teacherData) => {
  // Verify the class exists if provided
  if (teacherData.classId) {
    const classObj = await Class.findById(teacherData.classId);
    if (!classObj) {
      throw new Error('Class not found');
    }

    // Verify the session exists and is active
    const session = await Session.findById(classObj.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.activeStatus) {
      throw new Error('Cannot assign teacher to a class in an inactive session');
    }

    // Check if there's already a teacher assigned to this class
    const existingTeacher = await Teacher.findOne({
      classId: teacherData.classId,
      status: 'active'
    });

    if (existingTeacher) {
      throw new Error('A teacher is already assigned to this class. Only one teacher per class is allowed.');
    }
  }

  // Check if email is unique for the school
  const existingTeacher = await Teacher.findOne({
    email: teacherData.email,
    schoolId: teacherData.schoolId
  });

  if (existingTeacher) {
    throw new Error('Email already exists for this school');
  }

  const newTeacher = new Teacher(teacherData);
  await newTeacher.save();
  return newTeacher;
};

// Get all teachers for a school with optional class filter and pagination
const getTeachers = async (schoolId, classId = null, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  
  const filter = { schoolId };
  if (classId) {
    filter.classId = classId;
  }

  const teachers = await Teacher.find(filter)
    .populate('classId', 'className frozen sessionId')
    .populate('schoolId', 'name')
    .sort({ name: 1 }) // Sort by teacher name
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Teacher.countDocuments(filter);

  return {
    teachers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Update a teacher
const updateTeacher = async (teacherId, updateData, schoolId) => {
  // Verify teacher exists and belongs to the school
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new Error('Teacher not found');
  }

  if (teacher.schoolId.toString() !== schoolId.toString()) {
    throw new Error('Teacher does not belong to your school');
  }

  // Check if email is being updated and if it's unique
  if (updateData.email && updateData.email !== teacher.email) {
    const existingTeacher = await Teacher.findOne({
      email: updateData.email,
      schoolId: schoolId,
      _id: { $ne: teacherId } // Exclude current teacher from check
    });

    if (existingTeacher) {
      throw new Error('Email already exists for this school');
    }
  }

  // If classId is being updated, verify the class exists and is in an active session
  if (updateData.classId && updateData.classId !== teacher.classId) {
    const classObj = await Class.findById(updateData.classId);
    if (!classObj) {
      throw new Error('Class not found');
    }

    // Verify the session exists and is active
    const session = await Session.findById(classObj.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!session.activeStatus) {
      throw new Error('Cannot assign teacher to a class in an inactive session');
    }

    // Check if there's already a teacher assigned to this class
    const existingTeacher = await Teacher.findOne({
      classId: updateData.classId,
      status: 'active',
      _id: { $ne: teacherId } // Exclude current teacher from check
    });

    if (existingTeacher) {
      throw new Error('A teacher is already assigned to this class. Only one teacher per class is allowed.');
    }
  }

  // Update the teacher
  Object.assign(teacher, updateData);
  await teacher.save();

  return teacher;
};

// Delete a teacher (soft delete by setting status to inactive)
const deleteTeacher = async (teacherId, schoolId) => {
  // Verify teacher exists and belongs to the school
  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new Error('Teacher not found');
  }

  if (teacher.schoolId.toString() !== schoolId.toString()) {
    throw new Error('Teacher does not belong to your school');
  }

  // Instead of hard deleting, set status to inactive
  teacher.status = 'inactive';
  await teacher.save();

  return { message: 'Teacher deactivated successfully' };
};

module.exports = {
  createTeacher,
  getTeachers,
  updateTeacher,
  deleteTeacher
};