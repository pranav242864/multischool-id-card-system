const multer = require('multer');
const { parseExcelFile } = require('../utils/excelParser');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcryptjs');

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
// @access  Private
exports.importExcelData = [
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const { entityType } = req.params;
    const user = req.user;
    
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
          const mappedData = mapRowToModel(rowData, headers, entityType, user.schoolId);

          if (entityType === 'student') {
            // Import student
            // Note: classId and sessionId should be provided in Excel
            // These are required fields in the Student model
            if (!mappedData.classId) {
              throw new Error('Class ID is required');
            }
            if (!mappedData.sessionId) {
              throw new Error('Session ID is required');
            }
            const student = await Student.create(mappedData);
            results.success++;
          } else if (entityType === 'teacher') {
            // Import teacher
            // Ensure schoolId is set from user's school
            if (!mappedData.schoolId && user.schoolId) {
              mappedData.schoolId = user.schoolId;
            }
            if (!mappedData.schoolId) {
              throw new Error('School ID is required');
            }
            const teacher = await Teacher.create(mappedData);
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
            if (!mappedData.schoolId && user.schoolId) {
              mappedData.schoolId = user.schoolId;
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
      console.error('Excel import error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing Excel file',
        error: error.message
      });
    }
  })
];

