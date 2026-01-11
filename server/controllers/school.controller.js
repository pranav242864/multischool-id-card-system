const { createSchool, deleteSchool, getSchools, getSchoolById, updateSchool, freezeSchool, unfreezeSchool } = require('../services/school.service');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');
const { isSuperadmin } = require('../utils/roleGuards');

/**
 * Create a new school
 * @route POST /api/v1/schools
 * @access Private - Superadmin only
 */
const createSchoolController = asyncHandler(async (req, res, next) => {
  const { name, address, contactEmail } = req.body;

  // Validate required fields
  if (!name || !address || !contactEmail) {
    return res.status(400).json({
      success: false,
      message: 'Name, address, and contact email are required'
    });
  }

  try {
    const schoolData = {
      name,
      address,
      contactEmail
    };

    const newSchool = await createSchool(schoolData);

    res.status(201).json({
      success: true,
      message: 'School created successfully',
      data: newSchool
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get all schools (only active schools)
 * @route GET /api/v1/schools
 * @access Private - Superadmin only
 */
const getAllSchools = asyncHandler(async (req, res, next) => {
  // Role check is enforced by requireRole middleware in routes
  // This additional check provides defense-in-depth
  if (!isSuperadmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only Superadmin can view all schools'
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
  // Role check is enforced by requireRole middleware in routes
  // This additional check provides defense-in-depth
  if (!isSuperadmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only Superadmin can view school details'
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
 * Update a school
 * @route PUT /api/v1/schools/:id
 * @access Private - Superadmin only
 */
const updateSchoolController = asyncHandler(async (req, res, next) => {
  // Role check is enforced by requireRole middleware in routes
  // This additional check provides defense-in-depth
  if (!isSuperadmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only Superadmin can update schools'
    });
  }

  const { id: schoolId } = req.params;
  const { name, address, contactEmail } = req.body;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid school ID format'
    });
  }

  // Build update data object
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (address !== undefined) updateData.address = address;
  if (contactEmail !== undefined) updateData.contactEmail = contactEmail;

  // Check if at least one field is provided
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one field (name, address, contactEmail) must be provided for update'
    });
  }

  try {
    const updatedSchool = await updateSchool(schoolId, updateData);

    res.status(200).json({
      success: true,
      message: 'School updated successfully',
      data: updatedSchool
    });
  } catch (error) {
    if (error.message.includes('School not found') || error.message.includes('Invalid school ID format')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('inactive school')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

/**
 * Freeze a school
 * @route PATCH /api/v1/schools/:id/freeze
 * @access Private - Superadmin only
 */
const freezeSchoolController = asyncHandler(async (req, res, next) => {
  // Role check is enforced by requireRole middleware in routes
  if (!isSuperadmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only Superadmin can freeze schools'
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
    const frozenSchool = await freezeSchool(schoolId);

    res.status(200).json({
      success: true,
      message: 'School frozen successfully',
      data: frozenSchool
    });
  } catch (error) {
    if (error.message.includes('School not found') || error.message.includes('Invalid school ID format')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('inactive school') || error.message.includes('already frozen')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

/**
 * Unfreeze a school
 * @route PATCH /api/v1/schools/:id/unfreeze
 * @access Private - Superadmin only
 */
const unfreezeSchoolController = asyncHandler(async (req, res, next) => {
  // Role check is enforced by requireRole middleware in routes
  if (!isSuperadmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only Superadmin can unfreeze schools'
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
    const unfrozenSchool = await unfreezeSchool(schoolId);

    res.status(200).json({
      success: true,
      message: 'School unfrozen successfully',
      data: unfrozenSchool
    });
  } catch (error) {
    if (error.message.includes('School not found') || error.message.includes('Invalid school ID format')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message.includes('inactive school') || error.message.includes('not frozen')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

/**
 * Delete a school (hard delete - permanently removes from database)
 * Permanently deletes school from the database.
 * Note: Related entities are not automatically deleted.
 * 
 * @route DELETE /api/v1/schools/:id
 * @access Private - Superadmin only
 */
const deleteSchoolController = asyncHandler(async (req, res, next) => {
  // Role check is enforced by requireRole middleware in routes
  // This additional check provides defense-in-depth
  if (!isSuperadmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Only Superadmin can delete schools'
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
    
    if (error.message.includes('already deleted') || error.message.includes('frozen school')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
});

module.exports = {
  createSchool: createSchoolController,
  getAllSchools,
  getSchool,
  updateSchool: updateSchoolController,
  freezeSchool: freezeSchoolController,
  unfreezeSchool: unfreezeSchoolController,
  deleteSchool: deleteSchoolController
};


