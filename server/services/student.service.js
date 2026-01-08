const Student = require('../models/Student');
const Class = require('../models/Class');
const Session = require('../models/Session');
const School = require('../models/School');
const { getActiveSession } = require('../utils/sessionUtils');
const { checkClassNotFrozen, validateClassNotFrozen } = require('./class.service');
const mongoose = require('mongoose');

// Create a new student
const createStudent = async (studentData) => {
  // Get the active session for the school (throws error if none exists)
  const activeSession = await getActiveSession(studentData.schoolId);
  
  // Verify the class exists, belongs to the school, active session, and is not frozen
  // SECURITY: Filter by schoolId to prevent cross-school access
  const classObj = await Class.findOne({
    _id: studentData.classId,
    schoolId: studentData.schoolId // STRICT: Filter by schoolId
  });
  if (!classObj) {
    throw new Error('Class not found');
  }

  // Ensure class belongs to the active session
  if (classObj.sessionId.toString() !== activeSession._id.toString()) {
    throw new Error('Class does not belong to the active session');
  }

  // Centralized freeze check
  checkClassNotFrozen(classObj, 'create');

  // Check if admission number is unique for the school and active session
  // Only check active students (exclude deleted/inactive)
  const existingStudent = await Student.findOne({
    admissionNo: studentData.admissionNo,
    schoolId: studentData.schoolId,
    sessionId: activeSession._id,
    status: 'ACTIVE' // Only check active students (enum value is uppercase)
  });

  if (existingStudent) {
    throw new Error('Admission number already exists for this school in the active session');
  }

  // Automatically assign the active session
  studentData.sessionId = activeSession._id;

  try {
  const newStudent = new Student(studentData);
  await newStudent.save();
  return newStudent;
  } catch (error) {
    // Handle MongoDB duplicate key error (database-level enforcement)
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      // Check if it's the admissionNo uniqueness constraint
      if (error.keyPattern) {
        // Check for unique_admission_no_per_school_session index
        if (error.keyPattern.admissionNo && error.keyPattern.schoolId && error.keyPattern.sessionId) {
          throw new Error('Admission number already exists for this school in the active session');
        }
        // Fallback for any other unique constraint
        if (error.keyPattern.admissionNo || (error.keyPattern.schoolId && error.keyPattern.sessionId)) {
          throw new Error('Admission number already exists for this school in the active session');
        }
      }
      // Generic duplicate error if pattern doesn't match
      throw new Error('Duplicate entry detected. Admission number may already exist for this school in the active session.');
    }
    throw error;
  }
};

// Get all students for a school with optional class filter and pagination
// Automatically filters by active session
const getStudents = async (schoolId, classId = null, page = 1, limit = 10) => {
  // Get the active session for the school (throws error if none exists)
  const activeSession = await getActiveSession(schoolId);
  
  const skip = (page - 1) * limit;
  
  // Build filter with active session constraint
  // Only return active students (exclude deleted/inactive)
  let filter = {
    schoolId: schoolId,
    sessionId: activeSession._id, // Only show students from active session
      status: 'ACTIVE' // Only show active students (enum value is uppercase)
  };
  
  if (classId) {
    // Verify the class belongs to the school and active session
    // SECURITY: Filter by schoolId to prevent cross-school access
    const classObj = await Class.findOne({
      _id: classId,
      schoolId: schoolId // STRICT: Filter by schoolId
    });
    if (!classObj) {
      throw new Error('Class does not belong to your school');
    }
    
    if (classObj.sessionId.toString() !== activeSession._id.toString()) {
      throw new Error('Class does not belong to the active session');
    }
    
    filter.classId = classId;
  } else {
    // Find all classes for the school and active session
    // Only return active classes (exclude deleted/inactive)
    const classIds = await Class.find({ 
      schoolId: schoolId,
      sessionId: activeSession._id,
      status: 'active' // Only show active classes
    }).select('_id');
    const classIdList = classIds.map(c => c._id);
    
    if (classIdList.length > 0) {
      filter.classId = { $in: classIdList };
    } else {
      // No classes in active session, return empty result
      filter.classId = { $in: [] };
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
// Prevents updates to students from inactive or archived sessions
// For Teacher role: Validates teacher is assigned to the student's class
// SECURITY: Enforces strict school scoping - schoolId must match
const updateStudent = async (studentId, updateData, schoolId, userRole = null) => {
  // SECURITY: Remove schoolId from updateData if present - it cannot be changed
  if (updateData.schoolId !== undefined) {
    delete updateData.schoolId;
  }

  // Get the active session for the school (throws error if none exists or archived)
  const activeSession = await getActiveSession(schoolId);
  
  // Verify student exists - MUST filter by schoolId for security
  // Only check active students (exclude deleted/inactive)
  const student = await Student.findOne({
    _id: studentId,
    schoolId: schoolId, // STRICT: Filter by schoolId to prevent cross-school access
    status: 'ACTIVE' // Only check active students (enum value is uppercase)
  }).populate('sessionId', 'activeStatus archived');
  
  if (!student) {
    // Don't reveal if student exists but belongs to different school
    throw new Error('Student not found');
  }

  // Prevent modifications to students from inactive sessions
  // When sessionId is populated, it's a Session document, so use ._id to get the ObjectId
  const studentSessionId = student.sessionId._id ? student.sessionId._id.toString() : student.sessionId.toString();
  if (studentSessionId !== activeSession._id.toString()) {
    // Check if the student's session is archived
    if (student.sessionId && student.sessionId.archived) {
      throw new Error('Cannot modify student from an archived session. Archived sessions are read-only.');
    }
    throw new Error('Cannot modify student from an inactive session. Only students in the active session can be modified.');
  }

  // Verify the class exists, belongs to school and active session, and is not frozen
  // SECURITY: Filter by schoolId to prevent cross-school access
  const classObj = await Class.findOne({
    _id: student.classId,
    schoolId: schoolId // STRICT: Filter by schoolId
  });
  if (!classObj) {
    throw new Error('Class not found');
  }

  // Ensure class belongs to active session
  if (classObj.sessionId.toString() !== activeSession._id.toString()) {
    throw new Error('Class does not belong to the active session');
  }

  // Centralized freeze check for current class
  checkClassNotFrozen(classObj, 'update');

  // If classId is being updated, verify the new class belongs to school, active session and is not frozen
  if (updateData.classId && updateData.classId.toString() !== student.classId.toString()) {
    // SECURITY: Filter by schoolId to prevent cross-school access
    const newClassObj = await Class.findOne({
      _id: updateData.classId,
      schoolId: schoolId // STRICT: Filter by schoolId
    });
    if (!newClassObj) {
      throw new Error('Class not found');
    }
    if (newClassObj.sessionId.toString() !== activeSession._id.toString()) {
      throw new Error('Cannot assign student to a class from an inactive session');
    }
    // Centralized freeze check for new class
    checkClassNotFrozen(newClassObj, 'assign');
  }

  // Check if admission number is being updated and if it's unique within active session
  if (updateData.admissionNo && updateData.admissionNo !== student.admissionNo) {
    // Only check active students (exclude deleted/inactive)
    const existingStudent = await Student.findOne({
      admissionNo: updateData.admissionNo,
      schoolId: schoolId,
      sessionId: activeSession._id,
      status: 'ACTIVE', // Only check active students (enum value is uppercase)
      _id: { $ne: student._id } // Exclude current student from check
    });

    if (existingStudent) {
      throw new Error('Admission number already exists for this school in the active session');
    }
  }

  // SECURITY: Prevent changing sessionId - students belong to exactly one session
  // sessionId cannot be changed after creation (promotion creates new records instead)
  if (updateData.sessionId !== undefined) {
    // Even if it matches active session, remove it to prevent confusion
    // The sessionId is determined by the student's existing record, not by update data
    delete updateData.sessionId;
  }

  // Ensure sessionId remains unchanged - students belong to exactly one session
  // The student's sessionId is immutable and determined at creation time
  // If student is in active session, they can be updated
  // If student is in inactive session, they cannot be updated (already checked above)

  // Update the student
  Object.assign(student, updateData);
  
  try {
  await student.save();
  return student;
  } catch (error) {
    // Handle MongoDB duplicate key error (database-level enforcement)
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      // Check if it's the admissionNo uniqueness constraint
      if (error.keyPattern) {
        // Check for unique_admission_no_per_school_session index
        if (error.keyPattern.admissionNo && error.keyPattern.schoolId && error.keyPattern.sessionId) {
          throw new Error('Admission number already exists for this school in the active session');
        }
        // Fallback for any other unique constraint
        if (error.keyPattern.admissionNo || (error.keyPattern.schoolId && error.keyPattern.sessionId)) {
          throw new Error('Admission number already exists for this school in the active session');
        }
      }
      // Generic duplicate error if pattern doesn't match
      throw new Error('Duplicate entry detected. Admission number may already exist for this school in the active session.');
    }
    throw error;
  }
};

// Delete a student (soft delete by setting status)
// Prevents deletion of students from inactive or archived sessions
// SECURITY: Enforces strict school scoping - schoolId must match
const deleteStudent = async (studentId, schoolId) => {
  // Get the active session for the school (throws error if none exists or archived)
  const activeSession = await getActiveSession(schoolId);
  
  // Verify student exists - MUST filter by schoolId for security
  // Only check active students (exclude deleted/inactive)
  const student = await Student.findOne({
    _id: studentId,
    schoolId: schoolId, // STRICT: Filter by schoolId to prevent cross-school access
    status: 'ACTIVE' // Only check active students (enum value is uppercase)
  }).populate('sessionId', 'activeStatus archived');
  
  if (!student) {
    // Don't reveal if student exists but belongs to different school
    throw new Error('Student not found');
  }

  // Prevent deletion of students from inactive or archived sessions
  // When sessionId is populated, it's a Session document, so use ._id to get the ObjectId
  const studentSessionId = student.sessionId._id ? student.sessionId._id.toString() : student.sessionId.toString();
  
  if (studentSessionId !== activeSession._id.toString()) {
    // Check if the student's session is archived
    if (student.sessionId && student.sessionId.archived) {
      throw new Error('Cannot delete student from an archived session. Archived sessions are read-only.');
    }
    throw new Error('Cannot delete student from an inactive session. Only students in the active session can be deleted.');
  }

  // Verify the class exists and is not frozen
  // Use centralized freeze check with schoolId for security
  await validateClassNotFrozen(student.classId, schoolId, 'delete');

  // Delete the student (hard delete)
  await Student.findByIdAndDelete(studentId);

  return { message: 'Student deleted successfully' };
};

module.exports = {
  createStudent,
  getStudents,
  updateStudent,
  deleteStudent
};