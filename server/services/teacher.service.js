const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Session = require('../models/Session');
const School = require('../models/School');
const { getActiveSession } = require('../utils/sessionUtils');
const { validateSessionActive } = require('./session.service');
const mongoose = require('mongoose');

// Helper function to validate teacher ownership
// Teachers can only access/modify their own profile (matched by email)
const validateTeacherOwnership = (teacher, userEmail) => {
  if (!teacher) {
    throw new Error('Teacher not found');
  }
  
  if (teacher.email !== userEmail) {
    throw new Error('You can only access your own profile');
  }
  
  return true;
};

// Create a new teacher
// If classId is provided, it must belong to the active session
// Uses atomic operations to ensure only one teacher per class
const createTeacher = async (teacherData) => {
  // Get the active session for the school (throws error if none exists)
  const activeSession = await getActiveSession(teacherData.schoolId);
  
  // Verify the class exists if provided and belongs to school and active session
  if (teacherData.classId) {
    // SECURITY: Filter by schoolId to prevent cross-school access
    const classObj = await Class.findOne({
      _id: teacherData.classId,
      schoolId: teacherData.schoolId // STRICT: Filter by schoolId
    });
    if (!classObj) {
      throw new Error('Class not found');
    }

    // Ensure class belongs to the active session
    if (classObj.sessionId.toString() !== activeSession._id.toString()) {
      throw new Error('Cannot assign teacher to a class from an inactive session');
    }

    // ENFORCE: One teacher per class per session
    // Check if there's already a teacher assigned to this class (application-level check for early feedback)
    const existingTeacherForClass = await Teacher.findOne({
      classId: teacherData.classId,
      status: 'active'
    });

    if (existingTeacherForClass) {
      throw new Error('A teacher is already assigned to this class. Only one teacher per class is allowed.');
    }
  }

  // ENFORCE: One teacher can be assigned to ONLY one class per session
  // Check if this teacher (by email) is already assigned to any class in the active session
  // This prevents a teacher from being assigned to multiple classes in the same session
  if (teacherData.classId && teacherData.email) {
    // Find all classes in the active session
    const activeSessionClasses = await Class.find({
      schoolId: teacherData.schoolId,
      sessionId: activeSession._id
    }).select('_id');

    const activeSessionClassIds = activeSessionClasses.map(c => c._id);

    if (activeSessionClassIds.length > 0) {
      // Check if teacher is already assigned to any class in the active session
      const existingTeacherInSession = await Teacher.findOne({
        email: teacherData.email,
        schoolId: teacherData.schoolId,
        classId: { $in: activeSessionClassIds },
        status: 'active'
      });

      if (existingTeacherInSession) {
        throw new Error('This teacher is already assigned to a class in the active session. A teacher can only be assigned to one class per session.');
      }
    }
  }

  // Check if email is unique for the school
  // Only check active teachers (exclude deleted/inactive)
  const existingTeacher = await Teacher.findOne({
    email: teacherData.email,
    schoolId: teacherData.schoolId,
    status: 'ACTIVE' // Only check active teachers (enum value is uppercase)
  });

  if (existingTeacher) {
    throw new Error('Email already exists for this school');
  }

  try {
  const newTeacher = new Teacher(teacherData);
  await newTeacher.save();
  return newTeacher;
  } catch (error) {
    // Handle MongoDB duplicate key error (database-level enforcement)
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      // Check if it's the classId uniqueness constraint
      if (error.keyPattern && error.keyPattern.classId) {
        throw new Error('A teacher is already assigned to this class. Only one teacher per class is allowed.');
      }
      throw error;
    }
    throw error;
  }
};

// Get all teachers for a school with optional class filter and pagination
// Automatically filters to only show teachers assigned to classes in the active session
// For teachers, only returns their own profile
const getTeachers = async (schoolId, classId = null, page = 1, limit = 10, userRole = null, userEmail = null) => {
  // Get the active session for the school (throws error if none exists)
  const activeSession = await getActiveSession(schoolId);
  
  // For Teacher role, enforce ownership - only return their own profile
  if (userRole === 'Teacher' && userEmail) {
    const teacher = await Teacher.findOne({
      schoolId: schoolId,
      email: userEmail
    }).populate('classId', 'className frozen sessionId')
      .populate('schoolId', 'name');
    
    if (!teacher) {
      return {
        teachers: [],
        pagination: {
          page: 1,
          limit: 1,
          total: 0,
          pages: 0
        }
      };
    }
    
    // Verify teacher's class belongs to active session if they have a class
    if (teacher.classId) {
      if (teacher.classId.sessionId.toString() !== activeSession._id.toString()) {
        // Teacher's class is not in active session, return empty result
        return {
          teachers: [],
          pagination: {
            page: 1,
            limit: 1,
            total: 0,
            pages: 0
          }
        };
      }
    }
    
    return {
      teachers: [teacher],
      pagination: {
        page: 1,
        limit: 1,
        total: 1,
        pages: 1
      }
    };
  }
  
  const skip = (page - 1) * limit;
  
  // Build filter - only teachers assigned to classes in the active session
  // Only return active teachers (exclude deleted/inactive)
  const filter = { 
    schoolId,
    status: 'active' // Only show active teachers
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
      // Only show teachers assigned to classes in the active session
      filter.classId = { $in: classIdList };
    } else {
      // No classes in active session, return empty result
      filter.classId = { $in: [] };
    }
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
// Prevents updates that would assign teacher to classes from inactive sessions
// Enforces strict ownership validation for teachers
// SECURITY: Enforces strict school scoping - schoolId must match
const updateTeacher = async (teacherId, updateData, schoolId, userRole = null, userEmail = null) => {
  // SECURITY: Remove schoolId from updateData if present - it cannot be changed
  if (updateData.schoolId !== undefined) {
    delete updateData.schoolId;
  }

  // Get the active session for the school (throws error if none exists)
  const activeSession = await getActiveSession(schoolId);
  
  // Verify teacher exists - MUST filter by schoolId for security
  // Only check active teachers (exclude deleted/inactive)
  const teacher = await Teacher.findOne({
    _id: teacherId,
    schoolId: schoolId, // STRICT: Filter by schoolId to prevent cross-school access
    status: 'ACTIVE' // Only check active teachers (enum value is uppercase)
  });
  
  if (!teacher) {
    // Don't reveal if teacher exists but belongs to different school
    throw new Error('Teacher not found');
  }

  // For Teacher role: Enforce strict ownership - teachers can only update their own profile
  if (userRole === 'Teacher' && userEmail) {
    validateTeacherOwnership(teacher, userEmail);
    
    // Teachers cannot change their class assignment
    if (updateData.classId && updateData.classId.toString() !== (teacher.classId?.toString() || '')) {
      throw new Error('You cannot change your class assignment. Only administrators can assign teachers to classes.');
    }
  }

  // If teacher has a class, verify it belongs to school and active session
  if (teacher.classId) {
    // SECURITY: Filter by schoolId to prevent cross-school access
    const currentClassObj = await Class.findOne({
      _id: teacher.classId,
      schoolId: schoolId, // STRICT: Filter by schoolId
      status: 'active' // Only check active classes
    }).populate('sessionId', 'activeStatus archived');
    
    if (!currentClassObj) {
      throw new Error('Class not found');
    }
    
    if (currentClassObj.sessionId.toString() !== activeSession._id.toString()) {
      // Check if the class's session is archived
      if (currentClassObj.sessionId && currentClassObj.sessionId.archived) {
        throw new Error('Cannot modify teacher assigned to a class from an archived session. Archived sessions are read-only.');
      }
      throw new Error('Cannot modify teacher assigned to a class from an inactive session. Only teachers in the active session can be modified.');
    }
  }

  // Check if email is being updated and if it's unique
  if (updateData.email && updateData.email !== teacher.email) {
    // Only check active teachers (exclude deleted/inactive)
    const existingTeacher = await Teacher.findOne({
      email: updateData.email,
      schoolId: schoolId,
      status: 'active', // Only check active teachers
      _id: { $ne: teacherId } // Exclude current teacher from check
    });

    if (existingTeacher) {
      throw new Error('Email already exists for this school');
    }
  }

  // If classId is being updated, handle atomic reassignment
  if (updateData.classId && updateData.classId.toString() !== (teacher.classId?.toString() || '')) {
    // SECURITY: Filter by schoolId to prevent cross-school access
    const classObj = await Class.findOne({
      _id: updateData.classId,
      schoolId: schoolId // STRICT: Filter by schoolId
    });
    if (!classObj) {
      throw new Error('Class not found');
    }

    // Ensure class belongs to the active session
    if (classObj.sessionId.toString() !== activeSession._id.toString()) {
      throw new Error('Cannot assign teacher to a class from an inactive session');
    }

    // ENFORCE: One teacher per class per session
    // Check if there's already a teacher assigned to this class (application-level check for early feedback)
    // Only check active teachers (exclude deleted/inactive)
    const existingTeacherForClass = await Teacher.findOne({
      classId: updateData.classId,
      status: 'active', // Only check active teachers
      _id: { $ne: teacher._id } // Exclude current teacher from check
    });

    if (existingTeacherForClass) {
      throw new Error('A teacher is already assigned to this class. Only one teacher per class is allowed.');
    }

    // ENFORCE: One teacher can be assigned to ONLY one class per session
    // Check if this teacher (by email) is already assigned to a different class in the active session
    // This prevents duplicate assignments while allowing reassignment (changing from Class A to Class B)
    // Find all classes in the active session
    const activeSessionClasses = await Class.find({
      schoolId: schoolId,
      sessionId: activeSession._id
    }).select('_id');

    const activeSessionClassIds = activeSessionClasses.map(c => c._id);

    if (activeSessionClassIds.length > 0) {
      // Check if teacher (by email) is already assigned to a different class in the active session
      // We check by email to identify the same teacher across different Teacher records
      // Only check active teachers (exclude deleted/inactive)
      const existingTeacherInSession = await Teacher.findOne({
        email: teacher.email, // Same teacher (by email)
        schoolId: schoolId,
        classId: { $in: activeSessionClassIds },
        status: 'active', // Only check active teachers
        _id: { $ne: teacher._id } // Exclude current teacher record from check
      });

      // If teacher is already assigned to a different class in the active session, block the assignment
      // This prevents duplicate assignments: teacher@school.com cannot be assigned to both ClassA and ClassB
      // Reassignment (changing from ClassA to ClassB) is handled by the atomic operation below
      if (existingTeacherInSession) {
        throw new Error('This teacher is already assigned to a class in the active session. A teacher can only be assigned to one class per session.');
      }
    }

    // Use atomic operation to safely reassign teacher to class
    // First, unassign any existing teacher from the target class atomically
    // Then assign the current teacher to the class
    const dbSession = await mongoose.startSession();
    
    try {
      let updatedTeacher;
      
      await dbSession.withTransaction(async () => {
        // Step 1: Atomically unassign any existing active teacher from the target class
        await Teacher.updateMany(
          {
            classId: updateData.classId,
            status: 'active',
            _id: { $ne: teacher._id } // Exclude current teacher
          },
          {
            $set: { classId: null } // Unassign by setting classId to null
          },
          {
            session: dbSession
          }
        );

        // Step 2: Update the current teacher with the new classId atomically
        // Use findOneAndUpdate to ensure atomicity
        updatedTeacher = await Teacher.findByIdAndUpdate(
          teacherId,
          {
            $set: { classId: updateData.classId }
          },
          {
            new: true,
            session: dbSession
          }
        );

        if (!updatedTeacher) {
          throw new Error('Teacher not found');
        }
      });

      // Apply other updates (excluding classId which was already updated)
      const otherUpdates = { ...updateData };
      delete otherUpdates.classId;
      
      if (Object.keys(otherUpdates).length > 0) {
        Object.assign(updatedTeacher, otherUpdates);
        await updatedTeacher.save();
      }

      return updatedTeacher;
    } catch (error) {
      // If transaction is not supported, fall back to non-transactional approach
      if (error.message && (
        error.message.includes('Transaction numbers are only allowed on a replica set') ||
        error.message.includes('not supported') ||
        error.codeName === 'TransactionTooLarge' ||
        error.codeName === 'NoSuchTransaction'
      )) {
        await dbSession.endSession();
        
        // Fallback: Non-transactional atomic reassignment
        // Step 1: Unassign existing teacher from target class
        await Teacher.updateMany(
          {
            classId: updateData.classId,
            status: 'active',
            _id: { $ne: teacher._id }
          },
          {
            $set: { classId: null }
          }
        );

        // Step 2: Update current teacher (unique index will prevent duplicates if race condition occurs)
  Object.assign(teacher, updateData);
        
        try {
  await teacher.save();
          return teacher;
        } catch (saveError) {
          // Handle duplicate key error (database-level enforcement)
          if (saveError.code === 11000 || saveError.codeName === 'DuplicateKey') {
            if (saveError.keyPattern && saveError.keyPattern.classId) {
              throw new Error('A teacher is already assigned to this class. Only one teacher per class is allowed.');
            }
            throw saveError;
          }
          throw saveError;
        }
      }
      
      // Handle duplicate key error from transaction
      if (error.code === 11000 || error.codeName === 'DuplicateKey') {
        if (error.keyPattern && error.keyPattern.classId) {
          throw new Error('A teacher is already assigned to this class. Only one teacher per class is allowed.');
        }
        throw error;
      }
      
      throw error;
    } finally {
      await dbSession.endSession();
    }
  } else {
    // No classId change, just update other fields
    Object.assign(teacher, updateData);
    
    try {
      await teacher.save();
  return teacher;
    } catch (error) {
      // Handle duplicate key error (shouldn't happen if classId isn't changing, but just in case)
      if (error.code === 11000 || error.codeName === 'DuplicateKey') {
        if (error.keyPattern && error.keyPattern.classId) {
          throw new Error('A teacher is already assigned to this class. Only one teacher per class is allowed.');
        }
        throw error;
      }
      throw error;
    }
  }
};

// Delete a teacher (soft delete by setting status to inactive)
// Prevents deactivation of teachers assigned to classes from inactive sessions
// SECURITY: Enforces strict school scoping - schoolId must match
const deleteTeacher = async (teacherId, schoolId) => {
  // Get the active session for the school (throws error if none exists)
  const activeSession = await getActiveSession(schoolId);
  
  // Verify teacher exists - MUST filter by schoolId for security
  // Only check active teachers (exclude deleted/inactive)
  const teacher = await Teacher.findOne({
    _id: teacherId,
    schoolId: schoolId, // STRICT: Filter by schoolId to prevent cross-school access
    status: 'ACTIVE' // Only check active teachers (enum value is uppercase)
  });
  
  if (!teacher) {
    // Don't reveal if teacher exists but belongs to different school
    throw new Error('Teacher not found');
  }

  // If teacher has a class, verify it belongs to school and active session
  if (teacher.classId) {
    // SECURITY: Filter by schoolId to prevent cross-school access
    const classObj = await Class.findOne({
      _id: teacher.classId,
      schoolId: schoolId, // STRICT: Filter by schoolId
      status: 'active' // Only check active classes
    }).populate('sessionId', 'activeStatus archived');
    
    if (!classObj) {
      throw new Error('Class not found');
    }
    
    if (classObj.sessionId.toString() !== activeSession._id.toString()) {
      // Check if the class's session is archived
      if (classObj.sessionId && classObj.sessionId.archived) {
        throw new Error('Cannot delete teacher assigned to a class from an archived session. Archived sessions are read-only.');
      }
      throw new Error('Cannot delete teacher assigned to a class from an inactive session. Only teachers in the active session can be deleted.');
    }
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