const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');
const { getSchoolIdForOperation } = require('../utils/getSchoolId');

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

// @desc    Create new TEACHER user (Superadmin only)
// @route   POST /api/v1/users/teacher
// @access  Private (Superadmin only)
const createTeacherUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, username } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required'
    });
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid email'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters'
    });
  }

  let schoolId;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  try {
    let finalUsername = username || email.split('@')[0].toLowerCase();

    const existingUsername = await User.findOne({ username: finalUsername, schoolId });
    if (existingUsername) {
      let counter = 1;
      let newUsername = `${finalUsername}${counter}`;
      while (await User.findOne({ username: newUsername, schoolId })) {
        counter++;
        newUsername = `${finalUsername}${counter}`;
      }
      finalUsername = newUsername;
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      username: finalUsername,
      passwordHash,
      role: 'TEACHER',
      schoolId,
      status: 'ACTIVE'
    });
  
    res.status(201).json({
      success: true,
      message: 'Teacher user created successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        role: user.role,
        schoolId: user.schoolId,
        status: user.status
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'email' ? 'Email' : 'Username'} already exists`
      });
    }

    return next(error);
  }
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
  deleteUser,
  createTeacherUser
};