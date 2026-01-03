const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private (Super Admin only)
const getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find();
  
  res.status(200).json({
    success: true,
    count: users.length,
    data: users
  });
});

// @desc    Get single user
// @route   GET /api/v1/users/:id
// @access  Private
const getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Create new user
// @route   POST /api/v1/users
// @access  Private (Super Admin only)
const createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body);
  
  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private
const updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private (Super Admin only)
const deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'User not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: {}
  });
});

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
};