const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const { getActiveSession } = require('../utils/sessionUtils');
const asyncHandler = require('../utils/asyncHandler');
const { logAudit } = require('../utils/audit.helper');
const mongoose = require('mongoose');

// Ensure upload directories exist
const ensureUploadDirs = () => {
  const dirs = [
    path.join(__dirname, '../uploads/students'),
    path.join(__dirname, '../uploads/teachers')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Initialize directories on module load
ensureUploadDirs();

// Configure multer for disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { entityType } = req.params;
    let uploadPath;
    
    if (entityType === 'students') {
      uploadPath = path.join(__dirname, '../uploads/students');
    } else if (entityType === 'teachers') {
      uploadPath = path.join(__dirname, '../uploads/teachers');
    } else {
      return cb(new Error('Invalid entity type'), null);
    }
    
    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Use original filename (will be used for mapping)
    // Sanitize filename to prevent directory traversal
    const sanitized = path.basename(file.originalname);
    cb(null, sanitized);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit per file
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];
    const allowedExts = ['.jpg', '.jpeg', '.png'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    const isValidMime = allowedMimes.includes(file.mimetype);
    const isValidExt = allowedExts.includes(ext);
    
    if (isValidMime && isValidExt) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, jpeg, png) are allowed'), false);
    }
  }
});

// Bulk image upload handler
const bulkUploadImages = [
  upload.array('files', 100), // Support up to 100 files
  asyncHandler(async (req, res, next) => {
    const { entityType } = req.params;
    const user = req.user;
    
    // Validate entity type
    if (!['students', 'teachers'].includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type. Must be students or teachers'
      });
    }
    
    // Get schoolId from req.user context
    let schoolId;
    if (user.role === 'SUPERADMIN' || user.role === 'Superadmin') {
      if (!req.query || !req.query.schoolId) {
        return res.status(400).json({
          success: false,
          message: 'School ID is required'
        });
      }
      
      if (!mongoose.Types.ObjectId.isValid(req.query.schoolId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid school ID format'
        });
      }
      
      schoolId = req.query.schoolId;
    } else {
      schoolId = user.schoolId;
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }
    
    const results = {
      total: req.files.length,
      success: 0,
      failed: 0,
      errors: []
    };
    
    // Get base URL for photo URLs (assuming server is running on same host)
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    try {
      if (entityType === 'students') {
        // Get active session for student lookup
        const activeSession = await getActiveSession(schoolId);
        
        // Process each file
        for (const file of req.files) {
          try {
            // Extract admission number from filename (format: admissionNo.ext)
            const filename = path.basename(file.filename);
            const ext = path.extname(filename);
            const admissionNo = path.basename(filename, ext);
            
            console.log(`[BULK_UPLOAD] Processing file:`, {
              originalname: file.originalname,
              filename: file.filename,
              path: file.path,
              size: file.size,
              mimetype: file.mimetype
            });
            
            // Verify file was actually saved
            if (!file.path || !fs.existsSync(file.path)) {
              throw new Error(`File was not saved to disk: ${file.originalname}`);
            }
            
            console.log(`[BULK_UPLOAD] File exists at: ${file.path}`);
            
            // Sanitize admission number (prevent directory traversal)
            if (admissionNo.includes('..') || admissionNo.includes('/') || admissionNo.includes('\\')) {
              throw new Error('Invalid filename format');
            }
            
            // Find student by admissionNo + schoolId + active session
            const student = await Student.findOne({
              admissionNo: admissionNo,
              schoolId: schoolId,
              sessionId: activeSession._id,
              status: 'ACTIVE'
            });
            
            if (!student) {
              throw new Error(`Student with admission number ${admissionNo} not found in active session`);
            }
            
            // Generate public URL
            const photoUrl = `${baseUrl}/uploads/students/${filename}`;
            
            console.log(`[BULK_UPLOAD] Processing student ${admissionNo}`);
            console.log(`[BULK_UPLOAD] Generated photoUrl: ${photoUrl}`);
            console.log(`[BULK_UPLOAD] Filename: ${filename}`);
            console.log(`[BULK_UPLOAD] File path: ${file.path}`);
            
            // Update student photoUrl
            student.photoUrl = photoUrl;
            
            // Validate before saving
            try {
              await student.validate();
              console.log(`[BULK_UPLOAD] Validation passed for ${admissionNo}`);
            } catch (validationError) {
              console.error(`[BULK_UPLOAD] Validation failed for ${admissionNo}:`, validationError.message);
              console.error(`[BULK_UPLOAD] Validation errors:`, validationError.errors);
              throw new Error(`Photo URL validation failed: ${validationError.message}`);
            }
            
            await student.save();
            
            // Verify the photoUrl was actually saved
            const savedStudent = await Student.findById(student._id).select('photoUrl admissionNo');
            console.log(`[BULK_UPLOAD] Saved student ${admissionNo} - photoUrl in DB:`, savedStudent?.photoUrl);
            
            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              filename: file.originalname,
              error: error.message || 'Failed to process image'
            });
            
            // Delete file if student not found or update failed
            try {
              const filePath = path.join(__dirname, '../uploads/students', file.filename);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            } catch (deleteError) {
              // Ignore delete errors
            }
          }
        }
      } else if (entityType === 'teachers') {
        // Process each file
        for (const file of req.files) {
          try {
            // Extract email from filename (format: email.ext)
            const filename = path.basename(file.filename);
            const ext = path.extname(filename);
            const email = path.basename(filename, ext);
            
            // Sanitize email (prevent directory traversal)
            if (email.includes('..') || email.includes('/') || email.includes('\\')) {
              throw new Error('Invalid filename format');
            }
            
            // Find user by email
            const user = await User.findOne({
              email: email.toLowerCase(),
              schoolId: schoolId
            });
            
            if (!user) {
              throw new Error(`User with email ${email} not found`);
            }
            
            // Find teacher by userId + schoolId
            const teacher = await Teacher.findOne({
              userId: user._id,
              schoolId: schoolId,
              status: 'ACTIVE'
            });
            
            if (!teacher) {
              throw new Error(`Teacher with email ${email} not found`);
            }
            
            // Generate public URL
            const photoUrl = `${baseUrl}/uploads/teachers/${filename}`;
            
            // Update teacher photoUrl
            teacher.photoUrl = photoUrl;
            await teacher.save();
            
            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              filename: file.originalname,
              error: error.message || 'Failed to process image'
            });
            
            // Delete file if teacher not found or update failed
            try {
              const filePath = path.join(__dirname, '../uploads/teachers', file.filename);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
              }
            } catch (deleteError) {
              // Ignore delete errors
            }
          }
        }
      }
      
      // Audit log: bulk image upload
      await logAudit({
        action: 'BULK_IMAGE_UPLOAD',
        entityType: entityType.toUpperCase(),
        entityId: null,
        req,
        metadata: { successCount: results.success, failedCount: results.failed }
      });

      res.status(200).json({
        success: true,
        message: `Upload completed: ${results.success} successful, ${results.failed} failed`,
        results: results
      });
    } catch (error) {
      // Clean up all uploaded files on critical error
      req.files.forEach(file => {
        try {
          const uploadDir = entityType === 'students' 
            ? path.join(__dirname, '../uploads/students')
            : path.join(__dirname, '../uploads/teachers');
          const filePath = path.join(uploadDir, file.filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (deleteError) {
          // Ignore delete errors
        }
      });
      
      res.status(500).json({
        success: false,
        message: 'Error processing image uploads'
      });
    }
  })
];

module.exports = {
  bulkUploadImages
};


