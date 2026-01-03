const { deleteSchool, getSchools, getSchoolById } = require('../services/school.service');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const { isSuperadmin } = require('../utils/roleGuards');

/**
 * Get all schools (only active schools)
 * @route GET /api/v1/schools
 * @access Private - Superadmin only
 */
const getAllSchools = asyncHandler(async (req, res, next) => {
  // Only Superadmin can view all schools
  if (!isSuperadmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Only Superadmin can view all schools'
    });
  }

  const { page = 1, limit = 10 } = req.query;

  try {
    const result = await getSchools(parseInt(page), parseInt(limit));

    res.status(200).json({
      success: true,
      data: result.schools,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a school by ID (only if active)
 * @route GET /api/v1/schools/:id
 * @access Private - Superadmin only
 */
const getSchool = asyncHandler(async (req, res, next) => {
  // Only Superadmin can view individual schools
  if (!isSuperadmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Only Superadmin can view school details'
    });
  }

  const { id: schoolId } = req.params;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid school ID format'
    });
  }

  try {
    const school = await getSchoolById(schoolId);

    res.status(200).json({
      success: true,
      data: school
    });
  } catch (error) {
    if (error.message.includes('School not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
});

/**
 * Delete a school (soft delete - sets status=inactive)
 * Soft deletes school and all related entities:
 * - Students
 * - Teachers
 * - Classes
 * - Sessions
 * - Users (except Superadmin)
 * 
 * @route DELETE /api/v1/schools/:id
 * @access Private - Superadmin only
 */
const deleteSchoolController = asyncHandler(async (req, res, next) => {
  // Only Superadmin can delete schools
  if (!isSuperadmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Only Superadmin can delete schools'
    });
  }

  const { id: schoolId } = req.params;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid school ID format'
    });
  }

  try {
    const result = await deleteSchool(schoolId);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        schoolId: result.schoolId
      }
    });
  } catch (error) {
    if (error.message.includes('School not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('already deleted')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

module.exports = {
  getAllSchools,
  getSchool,
  deleteSchool: deleteSchoolController
};


