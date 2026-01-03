const School = require('../models/School');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Session = require('../models/Session');
const mongoose = require('mongoose');

/**
 * Delete a school using soft delete strategy
 * Sets status='inactive' on school and all related entities:
 * - Students
 * - Teachers
 * - Classes
 * - Sessions
 * - Users (except Superadmin)
 * 
 * This ensures:
 * - No active data references deleted school
 * - Data is preserved for audit/recovery
 * - All queries filter by status='active' to exclude deleted data
 */
const deleteSchool = async (schoolId) => {
  // Verify school exists
  const school = await School.findById(schoolId);
  if (!school) {
    throw new Error('School not found');
  }

  // Check if school is already inactive
  if (school.status === 'inactive') {
    throw new Error('School is already deleted');
  }

  // Use transaction to ensure atomicity
  const dbSession = await mongoose.startSession();
  
  try {
    await dbSession.withTransaction(async () => {
      // Step 1: Set school status to inactive
      school.status = 'inactive';
      await school.save({ session: dbSession });

      // Step 2: Set all students to inactive
      await Student.updateMany(
        { schoolId: schoolId },
        { $set: { status: 'inactive' } },
        { session: dbSession }
      );

      // Step 3: Set all teachers to inactive
      await Teacher.updateMany(
        { schoolId: schoolId },
        { $set: { status: 'inactive' } },
        { session: dbSession }
      );

      // Step 4: Set all classes to inactive
      await Class.updateMany(
        { schoolId: schoolId },
        { $set: { status: 'inactive' } },
        { session: dbSession }
      );

      // Step 5: Set all sessions to inactive
      await Session.updateMany(
        { schoolId: schoolId },
        { $set: { status: 'inactive' } },
        { session: dbSession }
      );

      // Step 6: Set all users (except Superadmin) to inactive
      // Superadmin users don't have schoolId, so they won't be affected
      await User.updateMany(
        { 
          schoolId: schoolId,
          role: { $ne: 'Superadmin' } // Don't affect Superadmin users
        },
        { $set: { status: 'inactive' } },
        { session: dbSession }
      );
    });

    return { 
      message: 'School deleted successfully. All related data has been marked as inactive.',
      schoolId: schoolId
    };
  } catch (error) {
    // If transaction is not supported, fall back to non-transactional approach
    if (error.message && (
      error.message.includes('Transaction numbers are only allowed on a replica set') ||
      error.message.includes('not supported') ||
      error.codeName === 'TransactionTooLarge' ||
      error.codeName === 'NoSuchTransaction'
    )) {
      await dbSession.endSession();
      
      // Fallback: Non-transactional soft delete
      // Set school status to inactive
      school.status = 'inactive';
      await school.save();

      // Set all related entities to inactive
      await Student.updateMany(
        { schoolId: schoolId },
        { $set: { status: 'inactive' } }
      );

      await Teacher.updateMany(
        { schoolId: schoolId },
        { $set: { status: 'inactive' } }
      );

      await Class.updateMany(
        { schoolId: schoolId },
        { $set: { status: 'inactive' } }
      );

      await Session.updateMany(
        { schoolId: schoolId },
        { $set: { status: 'inactive' } }
      );

      await User.updateMany(
        { 
          schoolId: schoolId,
          role: { $ne: 'Superadmin' }
        },
        { $set: { status: 'inactive' } }
      );

      return { 
        message: 'School deleted successfully. All related data has been marked as inactive.',
        schoolId: schoolId
      };
    }
    
    throw error;
  } finally {
    await dbSession.endSession();
  }
};

/**
 * Get all schools (only active schools)
 */
const getSchools = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  
  // Only return active schools
  const filter = { status: 'active' };
  
  const schools = await School.find(filter)
    .sort({ name: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await School.countDocuments(filter);

  return {
    schools,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get a school by ID (only if active)
 */
const getSchoolById = async (schoolId) => {
  const school = await School.findOne({
    _id: schoolId,
    status: 'active' // Only return active schools
  });
  
  if (!school) {
    throw new Error('School not found or has been deleted');
  }
  
  return school;
};

module.exports = {
  deleteSchool,
  getSchools,
  getSchoolById
};


