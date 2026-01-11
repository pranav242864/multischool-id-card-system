const User = require('../models/User');
const School = require('../models/School');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { getSchoolIdForOperation } = require('../utils/getSchoolId');
const { checkSchoolNotFrozen } = require('../utils/schoolUtils');
const { getActiveSession } = require('../utils/sessionUtils');

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
    // Explicitly convert to ObjectId for consistent querying
    filter.schoolId = new mongoose.Types.ObjectId(schoolId);
  }
  if (role) {
    filter.role = role;
  }
  
  const users = await User.find(filter)
    .select('-passwordHash')
    .populate('schoolId', 'name address contactEmail')
    .sort({ createdAt: -1 }); // Sort by newest first
  
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

// @desc    Create new TEACHER user (School admin only - uses req.user.schoolId)
// @route   POST /api/v1/users/teacher-for-school
// @access  Private (School admin only)
const createTeacherUserForSchool = asyncHandler(async (req, res, next) => {
  const { name, email, password, username, mobile, classId, photoUrl } = req.body;

  // Get schoolId from authenticated user (school admin's school)
  let schoolId;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Validate required fields
  if (!name || !email || !password || !mobile) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, password, and mobile are required'
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

  // Validate school exists
  const school = await School.findById(schoolId);
  if (!school) {
    return res.status(400).json({
      success: false,
      message: 'School not found'
    });
  }

  // Check if school is frozen
  if (school.frozen) {
    return res.status(403).json({
      success: false,
      message: 'Cannot create teachers for a frozen school'
    });
  }

  // Check for duplicate email in User model (check ALL users, not just ACTIVE)
  // MongoDB unique index will reject if ANY user (including DISABLED) has this email+schoolId
  const existingUserEmail = await User.findOne({ 
    email: email.toLowerCase(), 
    schoolId
  });
  if (existingUserEmail) {
    // If the existing user is ACTIVE, prevent creation
    if (existingUserEmail.status === 'ACTIVE') {
      return res.status(409).json({
        success: false,
        message: 'Email already exists for this school'
      });
    }
    // If DISABLED user exists, we still can't create because of unique index
    return res.status(409).json({
      success: false,
      message: 'Email already exists for this school (user may be disabled)'
    });
  }

  try {
    // Generate username if not provided
    let finalUsername = username || email.split('@')[0].toLowerCase();

    // Check for duplicate username (check ALL users, not just ACTIVE)
    // MongoDB unique index will reject if ANY user (including DISABLED) has this username+schoolId
    const existingUsername = await User.findOne({ 
      username: finalUsername, 
      schoolId
    });
    if (existingUsername) {
      // If ACTIVE or DISABLED user exists, generate new username to avoid unique index violation
      let counter = 1;
      let newUsername = `${finalUsername}${counter}`;
      while (await User.findOne({ 
        username: newUsername, 
        schoolId
      })) {
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
    // Note: Teacher model doesn't have email field, email is stored in User model
    const teacherData = {
      name: name.trim(),
      userId: user._id,
      mobile: mobile.trim(),
      schoolId,
      status: 'ACTIVE'
    };

    if (classId) {
      // Validate classId format
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        // Delete the user we just created since teacher creation will fail
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          success: false,
          message: 'Invalid class ID format'
        });
      }

      // Get active session for validation
      const activeSession = await getActiveSession(schoolId);

      // Verify the class exists and belongs to the school and active session
      const classObj = await Class.findOne({
        _id: classId,
        schoolId: schoolId
      });

      if (!classObj) {
        // Delete the user we just created
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Ensure class belongs to the active session
      if (classObj.sessionId.toString() !== activeSession._id.toString()) {
        // Delete the user we just created
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          success: false,
          message: 'Cannot assign teacher to a class from an inactive session'
        });
      }

      // Check if a teacher is already assigned to this class (one teacher per class)
      const existingTeacherForClass = await Teacher.findOne({
        classId: classId,
        status: 'ACTIVE'
      });

      if (existingTeacherForClass) {
        // Delete the user we just created
        await User.findByIdAndDelete(user._id);
        return res.status(409).json({
          success: false,
          message: 'A teacher is already assigned to this class. Only one teacher per class is allowed.'
        });
      }

      teacherData.classId = classId;
    }

    if (photoUrl) {
      teacherData.photoUrl = photoUrl.trim();
    }

    // Create Teacher record
    let teacher;
    try {
      teacher = await Teacher.create(teacherData);
    } catch (error) {
      // If teacher creation fails, delete the user we created
      await User.findByIdAndDelete(user._id);
      
      // Handle duplicate key errors (schoolId + classId unique constraint)
      if (error.code === 11000 || error.codeName === 'DuplicateKey') {
        const duplicateFields = Object.keys(error.keyPattern || {});
        if (duplicateFields.includes('schoolId') && duplicateFields.includes('classId')) {
          return res.status(409).json({
            success: false,
            message: 'A teacher is already assigned to this class. Only one teacher per class is allowed.'
          });
        }
        // Other unique constraint violations
        return res.status(409).json({
          success: false,
          message: 'Duplicate entry detected. Please check your input.'
        });
      }
      throw error;
    }
  
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
    // Handle duplicate key errors (email or username from User.create)
    if (error.code === 11000 || error.codeName === 'DuplicateKey') {
      const duplicateFields = Object.keys(error.keyPattern || {});
      let errorMessage = 'Duplicate entry detected';
      
      if (duplicateFields.length > 0) {
        const fieldMessages = duplicateFields.map(field => {
          if (field === 'email' || (typeof field === 'string' && field.includes('email'))) {
            return 'Email';
          }
          if (field === 'username' || (typeof field === 'string' && field.includes('username'))) {
            return 'Username';
          }
          return field;
        });
        
        if (fieldMessages.length > 1) {
          errorMessage = `${fieldMessages.join(' and ')} already exist`;
        } else {
          errorMessage = `${fieldMessages[0]} already exists`;
        }
      }
      
      return res.status(409).json({
        success: false,
        message: errorMessage
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

    // Handle other errors (like active session not found, etc.)
    if (error.message) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return next(error);
  }
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private
const updateUser = asyncHandler(async (req, res, next) => {
  const { id: userId } = req.params;
  const updateData = req.body;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  let schoolId;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Find user and verify it belongs to the correct school
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // SECURITY: Verify user belongs to the correct school (for non-SUPERADMIN users)
  if (user.role !== 'SUPERADMIN' && user.schoolId) {
    const userSchoolId = user.schoolId.toString();
    if (userSchoolId !== schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'User does not belong to your school'
      });
    }

    // Check if school is frozen
    try {
      await checkSchoolNotFrozen(userSchoolId, 'update');
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // SECURITY: Prevent changing role and schoolId
  if (updateData.role !== undefined) {
    return res.status(403).json({
      success: false,
      message: 'Cannot change user role. Role is immutable.'
    });
  }

  if (updateData.schoolId !== undefined && user.role !== 'SUPERADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Cannot change schoolId. School ID is immutable for non-superadmin users.'
    });
  }

  // Remove fields that shouldn't be updated directly
  delete updateData.role;
  if (user.role !== 'SUPERADMIN') {
    delete updateData.schoolId;
  }

  // Update user
  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true
  }).select('-passwordHash');

  res.status(200).json({
    success: true,
    message: 'User updated successfully',
    data: updatedUser
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private (Super Admin only)
const deleteUser = asyncHandler(async (req, res, next) => {
  const { id: userId } = req.params;

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user ID format'
    });
  }

  // Get schoolId from req.user context (standardized)
  // Superadmin must provide schoolId in query parameter
  let schoolId;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Find user and verify it belongs to the correct school
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  // SECURITY: Verify user belongs to the correct school (for non-SUPERADMIN users)
  if (user.role !== 'SUPERADMIN' && user.schoolId) {
    const userSchoolId = user.schoolId.toString();
    if (userSchoolId !== schoolId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'User does not belong to your school'
      });
    }

    // Check if school is frozen
    try {
      await checkSchoolNotFrozen(userSchoolId, 'delete');
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Prevent deleting SUPERADMIN users
  if (user.role === 'SUPERADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Cannot delete SUPERADMIN users'
    });
  }

  // Delete user
  await User.findByIdAndDelete(userId);
  
  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
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
  createTeacherUserAdmin,
  createTeacherUserForSchool
};