const User = require('../models/User');
const School = require('../models/School');
const Teacher = require('../models/Teacher');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { getSchoolIdForOperation } = require('../utils/getSchoolId');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private (Super Admin only)
const getUsers = asyncHandler(async (req, res, next) => {
  const { schoolId, role } = req.query;
  
  // Build filter
  const filter = {};
  if (schoolId) {
    if (!mongoose.Types.ObjectId.isValid(schoolId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid school ID format'
      });
    }
    filter.schoolId = schoolId;
  }
  if (role) {
    filter.role = role;
  }
  
  const users = await User.find(filter).select('-passwordHash');
  
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

// @desc    Create new SCHOOLADMIN user (Superadmin only)
// @route   POST /api/v1/users/admin
// @access  Private (Superadmin only)
const createSchoolAdminUser = asyncHandler(async (req, res, next) => {
  const { name, email, password, username, schoolId } = req.body;

  // Validate required fields
  if (!name || !email || !password || !schoolId) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, password, and schoolId are required'
    });
  }

  // Validate email format
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid email'
    });
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters'
    });
  }

  // Validate schoolId format
  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid school ID format'
    });
  }

  // Validate school exists
  const school = await School.findById(schoolId);
  if (!school) {
    return res.status(400).json({
      success: false,
      message: 'School not found'
    });
  }

  // Check for duplicate email (within the same school)
  const existingEmail = await User.findOne({ email: email.toLowerCase(), schoolId });
  if (existingEmail) {
    return res.status(409).json({
      success: false,
      message: 'Email already exists for this school'
    });
  }

  try {
    // Generate username if not provided
    let finalUsername = username || email.split('@')[0].toLowerCase();

    // Check for duplicate username (within the same school)
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

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with SCHOOLADMIN role
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      username: finalUsername,
      passwordHash,
      role: 'SCHOOLADMIN',
      schoolId,
      status: 'ACTIVE'
    });
  
    res.status(201).json({
      success: true,
      message: 'School admin user created successfully',
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
    // Handle duplicate key errors (email or username)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(409).json({
        success: false,
        message: `${field === 'email' ? 'Email' : 'Username'} already exists`
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    return next(error);
  }
});

// @desc    Create new TEACHER user (Superadmin only)
// @route   POST /api/v1/users/teacher-admin
// @access  Private (Superadmin only)
const createTeacherUserAdmin = asyncHandler(async (req, res, next) => {
  const { name, email, password, username, schoolId, mobile } = req.body;

  // Validate required fields
  if (!name || !email || !password || !schoolId) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, password, and schoolId are required'
    });
  }

  // Validate email format
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid email'
    });
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters'
    });
  }

  // Validate schoolId format
  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid school ID format'
    });
  }

  // Validate school exists
  const school = await School.findById(schoolId);
  if (!school) {
    return res.status(400).json({
      success: false,
      message: 'School not found'
    });
  }

  // Check for duplicate email (within the same school)
  const existingEmail = await User.findOne({ email: email.toLowerCase(), schoolId });
  if (existingEmail) {
    return res.status(409).json({
      success: false,
      message: 'Email already exists for this school'
    });
  }

  try {
    // Generate username if not provided
    let finalUsername = username || email.split('@')[0].toLowerCase();

    // Check for duplicate username (within the same school)
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

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with TEACHER role
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      username: finalUsername,
      passwordHash,
      role: 'TEACHER',
      schoolId,
      status: 'ACTIVE'
    });

    // Create Teacher record linked to the User
    const teacher = await Teacher.create({
      name: name.trim(),
      email: email.toLowerCase(),
      userId: user._id,
      mobile: mobile.trim(),
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
        status: user.status,
        teacherId: teacher._id
      }
    });
  } catch (error) {
    // Handle duplicate key errors (email or username)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(409).json({
        success: false,
        message: `${field === 'email' ? 'Email' : 'Username'} already exists`
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
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
  createTeacherUser,
  createSchoolAdminUser,
  createTeacherUserAdmin
};