const Student = require('../models/Student');
const Class = require('../models/Class');
const Session = require('../models/Session');
const { getActiveSession, getSessionById } = require('./session.service');
const { checkClassNotFrozen } = require('./class.service');
const mongoose = require('mongoose');

/**
 * Promote students from one session to another
 * - Source session must be inactive (historical)
 * - Target session must be active
 * - Students are moved to the new session with new admission numbers or preserved
 * - Original students remain in source session (historical record)
 */
const promoteStudents = async (sourceSessionId, targetSessionId, studentIds, schoolId, options = {}) => {
  const {
    preserveAdmissionNumbers = false, // If true, tries to preserve admission numbers
    targetClassId = null, // Optional: assign all promoted students to a specific class
    skipFrozenCheck = false // For bulk operations, skip individual frozen checks
  } = options;

  // Validate sessions
  const sourceSession = await getSessionById(sourceSessionId, schoolId);
  const targetSession = await getSessionById(targetSessionId, schoolId);

  // Source session must be inactive (historical)
  if (sourceSession.activeStatus) {
    throw new Error('Cannot promote students from an active session. Please deactivate the source session first.');
  }

  // Target session must be active
  if (!targetSession.activeStatus) {
    throw new Error('Target session must be active to promote students');
  }

  // Cannot promote from archived session (read-only)
  if (sourceSession.archived) {
    throw new Error('Cannot promote students from an archived session');
  }

  // Build query for students to promote
  const studentQuery = {
    schoolId: schoolId,
    sessionId: sourceSessionId
  };

  if (studentIds && Array.isArray(studentIds) && studentIds.length > 0) {
    // Validate all student IDs
    const invalidIds = studentIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid student ID format: ${invalidIds.join(', ')}`);
    }
    studentQuery._id = { $in: studentIds };
  }

  // Find students to promote
  const studentsToPromote = await Student.find(studentQuery)
    .populate('classId', 'className frozen sessionId');

  if (studentsToPromote.length === 0) {
    throw new Error('No students found to promote');
  }

  // Validate target class if provided
  let targetClass = null;
  if (targetClassId) {
    // SECURITY: Filter by schoolId and sessionId for strict scoping
    targetClass = await Class.findOne({
      _id: targetClassId,
      schoolId: schoolId, // STRICT: Filter by schoolId
      sessionId: targetSessionId // STRICT: Filter by target session
    });
    if (!targetClass) {
      throw new Error('Target class not found');
    }
    // Check if target class is frozen
    if (!skipFrozenCheck) {
      checkClassNotFrozen(targetClass, 'promote');
    }
  }

  // Use transaction for atomic promotion
  const dbSession = await mongoose.startSession();
  const promotedStudents = [];
  const errors = [];

  try {
    await dbSession.withTransaction(async () => {
      for (const student of studentsToPromote) {
        try {
          // Check if source class is frozen (unless skipped)
          if (!skipFrozenCheck && student.classId && student.classId.frozen) {
            errors.push({
              studentId: student._id,
              studentName: student.name,
              error: 'Cannot promote student from a frozen class'
            });
            continue;
          }

          // Determine target class
          let finalTargetClassId = targetClassId || student.classId._id;

          // If using original class, verify it exists in target session or find equivalent
          if (!targetClassId) {
            // Try to find equivalent class in target session
            // Only check active classes (exclude deleted/inactive)
            const equivalentClass = await Class.findOne({
              schoolId: schoolId,
              sessionId: targetSessionId,
              className: student.classId.className,
              status: 'active' // Only check active classes
            }).session(dbSession);

            if (equivalentClass) {
              finalTargetClassId = equivalentClass._id;
              // Check if equivalent class is frozen
              if (!skipFrozenCheck && equivalentClass.frozen) {
                errors.push({
                  studentId: student._id,
                  studentName: student.name,
                  error: `Target class ${equivalentClass.className} is frozen`
                });
                continue;
              }
            } else {
              // No equivalent class found, skip this student
              errors.push({
                studentId: student._id,
                studentName: student.name,
                error: `No equivalent class found in target session for ${student.classId.className}`
              });
              continue;
            }
          }

          // Determine admission number
          let newAdmissionNo = student.admissionNo;
          if (!preserveAdmissionNumbers) {
            // Generate new admission number or use existing with session suffix
            // For now, we'll check if admission number exists in target session
            const existingStudent = await Student.findOne({
              admissionNo: student.admissionNo,
              schoolId: schoolId,
              sessionId: targetSessionId
            }).session(dbSession);

            if (existingStudent) {
              // Admission number already exists, append session identifier
              newAdmissionNo = `${student.admissionNo}-${targetSession.sessionName.substring(0, 4)}`;
            }
          } else {
            // Check if admission number already exists in target session
            const existingStudent = await Student.findOne({
              admissionNo: student.admissionNo,
              schoolId: schoolId,
              sessionId: targetSessionId
            }).session(dbSession);

            if (existingStudent) {
              errors.push({
                studentId: student._id,
                studentName: student.name,
                error: `Admission number ${student.admissionNo} already exists in target session`
              });
              continue;
            }
          }

          // Create new student record in target session
          const promotedStudent = new Student({
            admissionNo: newAdmissionNo,
            name: student.name,
            dob: student.dob,
            fatherName: student.fatherName,
            motherName: student.motherName,
            mobile: student.mobile,
            address: student.address,
            aadhaar: student.aadhaar,
            photoUrl: student.photoUrl,
            classId: finalTargetClassId,
            sessionId: targetSessionId,
            schoolId: schoolId
          });

          await promotedStudent.save({ session: dbSession });
          promotedStudents.push(promotedStudent);
        } catch (error) {
          errors.push({
            studentId: student._id,
            studentName: student.name,
            error: error.message || 'Unknown error during promotion'
          });
        }
      }
    });

    return {
      success: true,
      promotedCount: promotedStudents.length,
      totalCount: studentsToPromote.length,
      promotedStudents,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    // Handle transaction errors
    if (error.message && (
      error.message.includes('Transaction') ||
      error.message.includes('replica set') ||
      error.message.includes('not supported')
    )) {
      // Fallback to non-transactional promotion
      console.warn('MongoDB transactions not supported, falling back to non-transactional promotion');
      
      for (const student of studentsToPromote) {
        try {
          // Similar logic but without transaction
          // (Simplified version - in production, implement full non-transactional logic)
          throw new Error('Non-transactional promotion not fully implemented. Please use a MongoDB replica set.');
        } catch (err) {
          errors.push({
            studentId: student._id,
            studentName: student.name,
            error: err.message
          });
        }
      }

      return {
        success: false,
        promotedCount: 0,
        totalCount: studentsToPromote.length,
        promotedStudents: [],
        errors
      };
    }
    throw error;
  } finally {
    await dbSession.endSession();
  }
};

/**
 * Get students from a specific session (for historical viewing)
 * Supports both active and archived sessions
 */
const getStudentsBySession = async (sessionId, schoolId, classId = null, page = 1, limit = 10) => {
  // Validate session exists and belongs to school
  const session = await getSessionById(sessionId, schoolId);

  const skip = (page - 1) * limit;

  // Build filter
  const filter = {
    schoolId: schoolId,
    sessionId: sessionId
  };

  if (classId) {
    // Verify class belongs to the session
    // SECURITY: Filter by schoolId and sessionId for strict scoping
    const classObj = await Class.findOne({
      _id: classId,
      schoolId: schoolId, // STRICT: Filter by schoolId
      sessionId: sessionId // STRICT: Filter by sessionId
    });
    if (!classObj) {
      throw new Error('Class does not belong to your school or the specified session');
    }
    filter.classId = classId;
  }

  const students = await Student.find(filter)
    .populate('classId', 'className frozen sessionId')
    .populate('sessionId', 'sessionName activeStatus archived')
    .sort({ admissionNo: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Student.countDocuments(filter);

  return {
    students,
    session: {
      id: session._id,
      name: session.sessionName,
      active: session.activeStatus,
      archived: session.archived
    },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

module.exports = {
  promoteStudents,
  getStudentsBySession
};

