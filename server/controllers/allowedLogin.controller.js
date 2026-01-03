const mongoose = require('mongoose');
const AllowedLogin = require('../models/AllowedLogin');
const School = require('../models/School');
const asyncHandler = require('../utils/asyncHandler');
const { isSuperadmin } = require('../utils/roleGuards');

// @desc    Get login permissions for a school
// @route   GET /api/v1/auth/login-permissions/:schoolId
// @access  Private (Superadmin, Schooladmin)
// 
// For Superadmin: schoolId comes from req.params (can access any school)
// For Schooladmin: schoolId comes from req.user.schoolId (own school only)
const getLoginPermissions = asyncHandler(async (req, res, next) => {
  const { schoolId: paramSchoolId } = req.params;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(paramSchoolId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid school ID format'
    });
  }

  // Determine effective schoolId
  // Superadmin uses schoolId from params, others use their own schoolId
  const effectiveSchoolId = isSuperadmin(req.user) ? paramSchoolId : req.user.schoolId;

  if (!effectiveSchoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }

  // Verify school exists
    // Only check active schools (exclude deleted/inactive)
    const school = await School.findOne({
      _id: effectiveSchoolId,
      status: 'active'
    });
  if (!school) {
    return res.status(404).json({
      success: false,
      message: 'School not found'
    });
  }

  // Verify school ownership (for non-superadmin)
  if (!isSuperadmin(req.user) && school._id.toString() !== req.user.schoolId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only view login permissions for your own school'
    });
  }

  // Get or create AllowedLogin record
  let allowedLogin = await AllowedLogin.findOne({ schoolId: effectiveSchoolId });

  // If not found, create default record
  if (!allowedLogin) {
    allowedLogin = await AllowedLogin.create({
      schoolId: effectiveSchoolId,
      allowSchoolAdmin: true,
      allowTeacher: true,
      allowTeacherCardGeneration: false
    });
  }

  res.status(200).json({
    success: true,
    data: {
      schoolId: allowedLogin.schoolId,
      allowSchoolAdmin: allowedLogin.allowSchoolAdmin,
      allowTeacher: allowedLogin.allowTeacher,
      allowTeacherCardGeneration: allowedLogin.allowTeacherCardGeneration,
      updatedAt: allowedLogin.updatedAt
    }
  });
});

// @desc    Update login permissions for a school
// @route   PATCH /api/v1/auth/login-permissions/:schoolId
// @access  Private (Superadmin, Schooladmin)
// 
// For Superadmin: schoolId comes from req.params (can update any school)
// For Schooladmin: schoolId comes from req.user.schoolId (own school only)
const updateLoginPermissions = asyncHandler(async (req, res, next) => {
  const { schoolId: paramSchoolId } = req.params;
  const { allowSchoolAdmin, allowTeacher, allowTeacherCardGeneration } = req.body;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(paramSchoolId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid school ID format'
    });
  }

  // Determine effective schoolId
  // Superadmin uses schoolId from params, others use their own schoolId
  const effectiveSchoolId = isSuperadmin(req.user) ? paramSchoolId : req.user.schoolId;

  if (!effectiveSchoolId) {
    return res.status(400).json({
      success: false,
      message: 'School ID is required'
    });
  }

  // Verify school exists
    // Only check active schools (exclude deleted/inactive)
    const school = await School.findOne({
      _id: effectiveSchoolId,
      status: 'active'
    });
  if (!school) {
    return res.status(404).json({
      success: false,
      message: 'School not found'
    });
  }

  // Verify school ownership (for non-superadmin)
  if (!isSuperadmin(req.user) && school._id.toString() !== req.user.schoolId.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only update login permissions for your own school'
    });
  }

  // Validate at least one field is provided
  if (allowSchoolAdmin === undefined && allowTeacher === undefined && allowTeacherCardGeneration === undefined) {
    return res.status(400).json({
      success: false,
      message: 'At least one permission field must be provided'
    });
  }

  // Build update object
  const updateData = {};
  if (allowSchoolAdmin !== undefined) {
    updateData.allowSchoolAdmin = allowSchoolAdmin;
  }
  if (allowTeacher !== undefined) {
    updateData.allowTeacher = allowTeacher;
  }
  if (allowTeacherCardGeneration !== undefined) {
    updateData.allowTeacherCardGeneration = allowTeacherCardGeneration;
  }

  // Get or create AllowedLogin record
  let allowedLogin = await AllowedLogin.findOne({ schoolId: effectiveSchoolId });

  if (!allowedLogin) {
    // Create new record with provided values and defaults
    allowedLogin = await AllowedLogin.create({
      schoolId: effectiveSchoolId,
      allowSchoolAdmin: allowSchoolAdmin !== undefined ? allowSchoolAdmin : true,
      allowTeacher: allowTeacher !== undefined ? allowTeacher : true,
      allowTeacherCardGeneration: allowTeacherCardGeneration !== undefined ? allowTeacherCardGeneration : false
    });
  } else {
    // Update existing record
    Object.assign(allowedLogin, updateData);
    await allowedLogin.save();
  }

  res.status(200).json({
    success: true,
    message: 'Login permissions updated successfully',
    data: {
      schoolId: allowedLogin.schoolId,
      allowSchoolAdmin: allowedLogin.allowSchoolAdmin,
      allowTeacher: allowedLogin.allowTeacher,
      allowTeacherCardGeneration: allowedLogin.allowTeacherCardGeneration,
      updatedAt: allowedLogin.updatedAt
    }
  });
});

// @desc    Get login permissions for all schools (Superadmin only)
// @route   GET /api/v1/auth/login-permissions
// @access  Private (Superadmin only)
const getAllLoginPermissions = asyncHandler(async (req, res, next) => {
  // Only Superadmin can view all schools' permissions
  if (!isSuperadmin(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'Only Superadmin can view all schools\' login permissions'
    });
  }

  const { page = 1, limit = 10, schoolId } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Build query
  const query = {};
  if (schoolId) {
    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid school ID format'
      });
    }
    query.schoolId = schoolId;
  }

  const allowedLogins = await AllowedLogin.find(query)
    .populate('schoolId', 'name')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await AllowedLogin.countDocuments(query);

  res.status(200).json({
    success: true,
    data: allowedLogins.map(al => ({
      schoolId: al.schoolId,
      schoolName: al.schoolId?.name || null,
      allowSchoolAdmin: al.allowSchoolAdmin,
      allowTeacher: al.allowTeacher,
      allowTeacherCardGeneration: al.allowTeacherCardGeneration,
      updatedAt: al.updatedAt
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

module.exports = {
  getLoginPermissions,
  updateLoginPermissions,
  getAllLoginPermissions
};

