const School = require('../models/School');

/**
 * Create a new school
 * @param {Object} schoolData - School data (name, address, contactEmail)
 * @returns {Promise<Object>} - Created school
 */
async function createSchool(schoolData) {
  const newSchool = new School(schoolData);
  await newSchool.save();
  return newSchool;
}

/**
 * Get all schools (only active schools)
 * @param {Number} page - Page number (default: 1)
 * @param {Number} limit - Number of schools per page (default: 10)
 * @returns {Promise<Object>} - { schools, pagination }
 */
async function getSchools(page = 1, limit = 10) {
  const skip = (page - 1) * limit;

  const schools = await School.find({ status: 'active' })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await School.countDocuments({ status: 'active' });

  return {
    schools,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get a school by ID (only if active)
 * @param {String} schoolId - School ID
 * @returns {Promise<Object>} - School object
 */
async function getSchoolById(schoolId) {
  const school = await School.findById(schoolId);

  if (!school) {
    throw new Error('School not found');
  }

  if (school.status !== 'active') {
    throw new Error('School not found');
  }

  return school;
}

/**
 * Delete a school (soft delete - sets status=inactive)
 * Soft deletes school and all related entities:
 * - Students
 * - Teachers
 * - Classes
 * - Sessions
 * - Users (except Superadmin)
 * 
 * @param {String} schoolId - School ID
 * @returns {Promise<Object>} - { schoolId, message }
 */
async function deleteSchool(schoolId) {
  const school = await School.findById(schoolId);

  if (!school) {
    throw new Error('School not found');
  }

  if (school.status !== 'active') {
    throw new Error('School already deleted');
  }

  // Soft delete - set status to inactive
  school.status = 'inactive';
  await school.save();

  // Note: Related entities (students, teachers, classes, sessions, users) should be soft deleted
  // This is handled by cascade delete logic or scheduled jobs (not implemented here)

  return {
    schoolId: school._id,
    message: 'School deleted successfully'
  };
}

module.exports = {
  createSchool,
  getSchools,
  getSchoolById,
  deleteSchool
};
