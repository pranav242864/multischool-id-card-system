const Student = require('../models/Student');
const Class = require('../models/Class');
const Session = require('../models/Session');
const School = require('../models/School');
const mongoose = require('mongoose');

// Create a new student
const createStudent = async (studentData) => {
  // Verify the class exists
  const classObj = await Class.findById(studentData.classId);
  if (!classObj) {
    throw new Error('Class not found');
  }

  // Verify the session exists and is active
  const session = await Session.findById(studentData.sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  if (!session.activeStatus) {
    throw new Error('Cannot create student in an inactive session');
  }

  // Check if class is frozen
  if (classObj.frozen) {
    throw new Error('Cannot create student in a frozen class');
  }

  // Check if admission number is unique for the school
  const existingStudent = await Student.findOne({
    admissionNo: studentData.admissionNo,
    schoolId: studentData.schoolId
  });

  if (existingStudent) {
    throw new Error('Admission number already exists for this school');
  }

  const newStudent = new Student(studentData);
  await newStudent.save();
  return newStudent;
};

// Get all students for a school with optional class filter and pagination
const getStudents = async (schoolId, classId = null, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  
  // Find classes for the school first to ensure proper scoping
  let filter = {};
  
  if (classId) {
    // Verify the class belongs to the school
    const classObj = await Class.findById(classId);
    if (!classObj || classObj.schoolId.toString() !== schoolId.toString()) {
      throw new Error('Class does not belong to your school');
    }
    
    filter = { classId: classId, schoolId: schoolId };
  } else {
    // Find all classes for the school
    const classIds = await Class.find({ schoolId: schoolId }).select('_id');
    const classIdList = classIds.map(c => c._id);
    
    if (classIdList.length > 0) {
      filter = { classId: { $in: classIdList }, schoolId: schoolId };
    } else {
      filter = { schoolId: schoolId };
    }
  }

  const students = await Student.find(filter)
    .populate('classId', 'className frozen')
    .populate('sessionId', 'sessionName activeStatus')
    .sort({ admissionNo: 1 }) // Sort by admission number
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Student.countDocuments(filter);

  return {
    students,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

// Update a student
const updateStudent = async (studentId, updateData, schoolId) => {
  // Verify student exists
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  // Verify the student belongs to the school
  if (student.schoolId.toString() !== schoolId.toString()) {
    throw new Error('Student does not belong to your school');
  }

  // Verify the class exists
  const classObj = await Class.findById(student.classId);
  if (!classObj) {
    throw new Error('Class not found');
  }

  // Check if class is frozen - if frozen, updates are not allowed
  if (classObj.frozen) {
    throw new Error('Cannot update student in a frozen class');
  }

  // Check if admission number is being updated and if it's unique
  if (updateData.admissionNo && updateData.admissionNo !== student.admissionNo) {
    const existingStudent = await Student.findOne({
      admissionNo: updateData.admissionNo,
      schoolId: schoolId
    });

    if (existingStudent) {
      throw new Error('Admission number already exists for this school');
    }
  }

  // Update the student
  Object.assign(student, updateData);
  await student.save();

  return student;
};

// Delete a student (soft delete by setting status)
const deleteStudent = async (studentId, schoolId) => {
  // Verify student exists
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Student not found');
  }

  // Verify the student belongs to the school
  if (student.schoolId.toString() !== schoolId.toString()) {
    throw new Error('Student does not belong to your school');
  }

  // Verify the class exists
  const classObj = await Class.findById(student.classId);
  if (!classObj) {
    throw new Error('Class not found');
  }

  // Check if class is frozen - if frozen, deletion is not allowed
  if (classObj.frozen) {
    throw new Error('Cannot delete student from a frozen class');
  }

  // In this implementation, we'll delete the student
  await Student.findByIdAndDelete(studentId);

  return { message: 'Student deleted successfully' };
};

module.exports = {
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent
};