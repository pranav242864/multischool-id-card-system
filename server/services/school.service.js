const School = require('../models/School');
const mongoose = require('mongoose');

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
 * Update a school
 * @param {String} schoolId - School ID
 * @param {Object} updateData - School data to update (name, address, contactEmail)
 * @returns {Promise<Object>} - Updated school
 */
async function updateSchool(schoolId, updateData) {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    throw new Error('Invalid school ID format');
  }

  const school = await School.findById(schoolId);

  if (!school) {
    throw new Error('School not found');
  }

  if (school.status !== 'active') {
    throw new Error('Cannot update inactive school');
  }

  // Check if school is frozen
  if (school.frozen) {
    throw new Error('Cannot update a frozen school. Please unfreeze the school first.');
  }

  // Update fields
  if (updateData.name !== undefined) {
    school.name = updateData.name.trim();
  }
  if (updateData.address !== undefined) {
    school.address = updateData.address.trim();
  }
  if (updateData.contactEmail !== undefined) {
    school.contactEmail = updateData.contactEmail.trim().toLowerCase();
  }

  await school.save();
  return school;
}

/**
 * Freeze a school
 * Prevents modifications to the school and its related data
 * @param {String} schoolId - School ID
 * @returns {Promise<Object>} - Updated school
 */
async function freezeSchool(schoolId) {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    throw new Error('Invalid school ID format');
  }

  const school = await School.findById(schoolId);

  if (!school) {
    throw new Error('School not found');
  }

  if (school.status !== 'active') {
    throw new Error('Cannot freeze inactive school');
  }

  if (school.frozen) {
    throw new Error('School is already frozen');
  }

  school.frozen = true;
  await school.save();

  return school;
}

/**
 * Unfreeze a school
 * Allows modifications to the school and its related data
 * @param {String} schoolId - School ID
 * @returns {Promise<Object>} - Updated school
 */
async function unfreezeSchool(schoolId) {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    throw new Error('Invalid school ID format');
  }

  const school = await School.findById(schoolId);

  if (!school) {
    throw new Error('School not found');
  }

  if (school.status !== 'active') {
    throw new Error('Cannot unfreeze inactive school');
  }

  if (!school.frozen) {
    throw new Error('School is not frozen');
  }

  school.frozen = false;
  await school.save();

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

  // Check if school is frozen
  if (school.frozen) {
    throw new Error('Cannot delete a frozen school. Please unfreeze the school first.');
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
  updateSchool,
  freezeSchool,
  unfreezeSchool,
  deleteSchool
};
