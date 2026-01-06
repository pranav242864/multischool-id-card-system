const multer = require('multer');
const { parseExcelFile } = require('../utils/excelParser');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Class = require('../models/Class');
const { getActiveSession } = require('../utils/sessionUtils');
const { createStudent: createStudentService } = require('../services/student.service');
const { createTeacher: createTeacherService } = require('../services/teacher.service');
const { checkClassNotFrozen } = require('../services/class.service');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Configure multer for file uploads (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  }
});

// Field mapping from Excel headers to database fields
const getFieldMapping = (entityType) => {
  const commonMappings = {
    'Student Name': 'name',
    'Name': 'name',
    'Admission Number': 'admissionNo',
    'Admission No': 'admissionNo',
    'Class': 'class',
    "Father's Name": 'fatherName',
    'Father Name': 'fatherName',
    "Mother's Name": 'motherName',
    'Mother Name': 'motherName',
    'Date of Birth': 'dob',
    'DOB': 'dob',
    'Mobile Number': 'mobile',
    'Mobile': 'mobile',
    'Phone Number': 'phone',
    'Phone': 'phone',
    'Email': 'email',
    'Address': 'address',
    'Photo URL': 'photoUrl',
    'Photo': 'photoUrl',
    'Aadhaar Number': 'aadhaar',
    'Aadhaar': 'aadhaar',
    'Blood Group': 'bloodGroup',
    'Username': 'username',
    'Password': 'password',
    'School ID': 'schoolId',
    'School': 'schoolId',
    'Class ID': 'classId',
  };

  return commonMappings;
};

// Map Excel row data to database model format
const mapRowToModel = (rowData, headers, entityType, userSchoolId) => {
  const fieldMapping = getFieldMapping(entityType);
  const mappedData = {};

  headers.forEach(header => {
    const dbField = fieldMapping[header];
    if (dbField && rowData[header] !== undefined && rowData[header] !== '') {
      mappedData[dbField] = rowData[header];
    }
  });

  // Entity-specific processing
  if (entityType === 'student') {
    // Convert date strings to Date objects
    if (mappedData.dob) {
      mappedData.dob = new Date(mappedData.dob);
    }
    // Set required fields if missing (will be handled by validation)
    if (!mappedData.classId) {
      // Note: classId should be provided or mapped from class name
      // For now, we'll require it in the Excel
    }
  } else if (entityType === 'teacher') {
    mappedData.schoolId = userSchoolId || mappedData.schoolId;
    mappedData.status = mappedData.status || 'active';
  } else if (entityType === 'admin') {
    mappedData.role = 'Schooladmin';
    mappedData.status = mappedData.status || 'active';
    // Hash password if provided
    if (mappedData.password) {
      // Password will be hashed before saving
    }
  }

  return mappedData;
};

// @desc    Import data from Excel file
// @route   POST /api/v1/bulk-import/:entityType
// @access  Private - Superadmin and Schooladmin only
// Teachers are explicitly blocked from all bulk import operations
exports.importExcelData = [
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { entityType } = req.params;
    const user = req.user;
    
    // Additional defense-in-depth: Explicitly block teachers
    const { isTeacher } = require('../utils/roleGuards');
    if (isTeacher(user)) {
      return res.status(403).json({
        success: false,
        message: 'Teachers cannot perform bulk import operations. Only read access is permitted.'
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!['student', 'teacher', 'admin'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type. Must be student, teacher, or admin'
      });
    }

    // Resolve schoolId based on user role
    let schoolId;
    if (user.role === 'SUPERADMIN' || user.role === 'Superadmin') {
      // SUPERADMIN must provide schoolId in query parameter
      if (!req.query || !req.query.schoolId) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required'
        });
      }
      
      // Validate schoolId as Mongo ObjectId
      if (!mongoose.Types.ObjectId.isValid(req.query.schoolId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid school ID format'
        });
      }
      
      schoolId = req.query.schoolId;
    } else {
      // Non-SUPERADMIN: use schoolId from user
      schoolId = user.schoolId;
    }

    try {
      // Parse Excel file
      const { headers, data } = await parseExcelFile(req.file.buffer);

      if (data.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Excel file contains no data rows'
        });
      }

      const results = {
        total: data.length,
        success: 0,
        failed: 0,
        errors: []
      };

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const rowData = data[i];
        const rowNumber = i + 2; // +2 because row 1 is header, and arrays are 0-indexed

        try {
          const mappedData = mapRowToModel(rowData, headers, entityType, schoolId);

          if (entityType === 'student') {
            // Import student
            // Note: classId should be provided in Excel
            // sessionId will be automatically set to the active session
            if (!mappedData.classId) {
              throw new Error('Class ID is required');
            }
            
            // Get the active session for the school
            const activeSession = await getActiveSession(schoolId || mappedData.schoolId);
            
            // Verify the class belongs to the active session and is not frozen
            const classObj = await Class.findById(mappedData.classId);
            if (!classObj) {
              throw new Error('Class not found');
            }
            if (classObj.sessionId.toString() !== activeSession._id.toString()) {
              throw new Error('Class does not belong to the active session');
            }
            
            // Centralized freeze check - fail fast before attempting to create
            checkClassNotFrozen(classObj, 'create');
            
            // Set schoolId and sessionId automatically
            mappedData.schoolId = classObj.schoolId;
            mappedData.sessionId = activeSession._id;
            
            // Use the service to create student (which will also validate and enforce active session)
            const student = await createStudentService(mappedData);
            results.success++;
          } else if (entityType === 'teacher') {
            // Import teacher
            if (!mappedData.email) {
              throw new Error('Email is required');
            }

            if (!mappedData.name) {
              throw new Error('Name is required');
            }

            if (!mappedData.mobile) {
              throw new Error('Mobile is required');
            }

            if (!mappedData.schoolId && schoolId) {
              mappedData.schoolId = schoolId;
            }
            if (!mappedData.schoolId) {
              throw new Error('School ID is required');
            }

            const existingUser = await User.findOne({ 
              email: mappedData.email.toLowerCase(),
              schoolId: mappedData.schoolId
            });

            if (existingUser) {
              throw new Error('User already exists');
            }

            let finalUsername = mappedData.email.split('@')[0].toLowerCase();
            const existingUsername = await User.findOne({ username: finalUsername, schoolId: mappedData.schoolId });
            if (existingUsername) {
              let counter = 1;
              let newUsername = `${finalUsername}${counter}`;
              while (await User.findOne({ username: newUsername, schoolId: mappedData.schoolId })) {
                counter++;
                newUsername = `${finalUsername}${counter}`;
              }
              finalUsername = newUsername;
            }

            const defaultPassword = 'Teacher123!';
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

            const createdUser = await User.create({
              name: mappedData.name.trim(),
              email: mappedData.email.toLowerCase(),
              username: finalUsername,
              passwordHash,
              role: 'TEACHER',
              schoolId: mappedData.schoolId,
              status: 'ACTIVE'
            });

            const userId = createdUser._id;

            const teacherData = {
              name: mappedData.name,
              mobile: mappedData.mobile,
              email: mappedData.email,
              userId: userId,
              schoolId: mappedData.schoolId,
              status: 'ACTIVE'
            };

            if (mappedData.photoUrl) {
              teacherData.photoUrl = mappedData.photoUrl;
            }

            if (mappedData.classId) {
              teacherData.classId = mappedData.classId;
            }

            const activeSession = await getActiveSession(mappedData.schoolId);

            if (mappedData.classId) {
              const classObj = await Class.findById(mappedData.classId);
              if (!classObj) {
                await User.findByIdAndDelete(userId);
                throw new Error('Class not found');
              }
              if (classObj.sessionId.toString() !== activeSession._id.toString()) {
                await User.findByIdAndDelete(userId);
                throw new Error('Class does not belong to the active session');
              }
            }

            const teacher = await createTeacherService(teacherData);
            results.success++;
          } else if (entityType === 'admin') {
            // Import admin (create User with Schooladmin role)
            // Hash password
            if (mappedData.password) {
              const saltRounds = 10;
              mappedData.passwordHash = await bcrypt.hash(mappedData.password, saltRounds);
              delete mappedData.password;
            } else {
              // Generate default password if not provided
              const defaultPassword = mappedData.username || mappedData.email.split('@')[0];
              const saltRounds = 10;
              mappedData.passwordHash = await bcrypt.hash(defaultPassword, saltRounds);
            }
            
            // Ensure schoolId is set
            if (!mappedData.schoolId && schoolId) {
              mappedData.schoolId = schoolId;
            }

            const admin = await User.create(mappedData);
            results.success++;
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            data: rowData,
            error: error.message || 'Validation error'
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Import completed: ${results.success} successful, ${results.failed} failed`,
        results: results
      });

    } catch (error) {
      // Log error server-side only (never sent to client)
      console.error('Excel import error:', {
        message: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      res.status(500).json({
        success: false,
        message: 'Error processing Excel file'
      });
    }
  })
];

