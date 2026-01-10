const Notice = require('../models/Notice');
const { getSchoolIdForOperation, getSchoolIdForFilter } = require('../utils/getSchoolId');
const { isSuperadmin } = require('../utils/roleGuards');
const asyncHandler = require('../utils/asyncHandler');
const { logAudit } = require('../utils/audit.helper');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const noticesUploadDir = path.join(__dirname, '../uploads/notices');
if (!fs.existsSync(noticesUploadDir)) {
  fs.mkdirSync(noticesUploadDir, { recursive: true });
}

// Configure multer for notice attachments
const noticeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(noticesUploadDir)) {
      fs.mkdirSync(noticesUploadDir, { recursive: true });
    }
    cb(null, noticesUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const noticeUpload = multer({
  storage: noticeStorage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, and PNG files are allowed'), false);
    }
  }
});

const createNotice = asyncHandler(async (req, res) => {
  let { title, description, attachments, visibleTo, sessionId, targetAdminIds, targetTeacherIds } = req.body;

  // Parse targetAdminIds if it's a JSON string (from FormData)
  if (targetAdminIds !== undefined && typeof targetAdminIds === 'string') {
    try {
      targetAdminIds = JSON.parse(targetAdminIds);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid targetAdminIds format'
      });
    }
  }

  // Parse targetTeacherIds if it's a JSON string (from FormData)
  if (targetTeacherIds !== undefined && typeof targetTeacherIds === 'string') {
    try {
      targetTeacherIds = JSON.parse(targetTeacherIds);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid targetTeacherIds format'
      });
    }
  }

  // Parse visibleTo if it's a JSON string (from FormData)
  if (visibleTo !== undefined && typeof visibleTo === 'string') {
    try {
      visibleTo = JSON.parse(visibleTo);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid visibleTo format'
      });
    }
  }

  if (!title) {
    return res.status(400).json({
      success: false,
      message: 'Title is required'
    });
  }

  if (!description) {
    return res.status(400).json({
      success: false,
      message: 'Description is required'
    });
  }

  if (!visibleTo || !Array.isArray(visibleTo) || visibleTo.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Visible to is required and must be a non-empty array'
    });
  }

  const validRoles = ['SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'];
  const invalidRoles = visibleTo.filter(role => !validRoles.includes(role));
  if (invalidRoles.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${validRoles.join(', ')}`
    });
  }

  // Validate targetAdminIds if provided (SUPERADMIN -> SCHOOLADMIN)
  if (targetAdminIds !== undefined) {
    if (!Array.isArray(targetAdminIds)) {
      return res.status(400).json({
        success: false,
        message: 'targetAdminIds must be an array'
      });
    }
    // Validate all IDs are valid ObjectIds
    const mongoose = require('mongoose');
    const invalidIds = targetAdminIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid admin IDs: ${invalidIds.join(', ')}`
      });
    }
  }

  // Validate targetTeacherIds if provided (SCHOOLADMIN -> TEACHER)
  if (targetTeacherIds !== undefined) {
    if (!Array.isArray(targetTeacherIds)) {
      return res.status(400).json({
        success: false,
        message: 'targetTeacherIds must be an array'
      });
    }
    // Validate all IDs are valid ObjectIds
    const mongoose = require('mongoose');
    const invalidIds = targetTeacherIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid teacher IDs: ${invalidIds.join(', ')}`
      });
    }
  }

  // Get schoolId for validation and notice creation
  // For SCHOOLADMIN with targetTeacherIds, use req.schoolId set by middleware (from req.user.schoolId)
  // For SUPERADMIN with targetAdminIds, schoolId can be null
  let schoolId = null;
  
  // Check if schoolId is already set by middleware (for SCHOOLADMIN with targetTeacherIds)
  if (req.schoolId) {
    schoolId = req.schoolId;
  } else {
    // Otherwise, try to get schoolId using standard method
    try {
      schoolId = getSchoolIdForOperation(req);
    } catch (err) {
      // If SUPERADMIN and targetAdminIds provided, allow null schoolId
      if (isSuperadmin(req.user) && targetAdminIds && Array.isArray(targetAdminIds) && targetAdminIds.length > 0) {
        schoolId = null; // System-wide notice targeting specific admins
      } else {
        return res.status(400).json({
          success: false,
          message: err.message || 'School ID is required'
        });
      }
    }
  }

  // If SCHOOLADMIN is creating notice with targetTeacherIds, validate teachers belong to their school
  if (!isSuperadmin(req.user) && targetTeacherIds && Array.isArray(targetTeacherIds) && targetTeacherIds.length > 0) {
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required when targeting teachers'
      });
    }

    // Verify all target teachers belong to the admin's school
    const Teacher = require('../models/Teacher');
    const teachers = await Teacher.find({
      userId: { $in: targetTeacherIds },
      schoolId: schoolId
    });

    if (teachers.length !== targetTeacherIds.length) {
      return res.status(403).json({
        success: false,
        message: 'One or more target teachers do not belong to your school'
      });
    }
  }

  // Process uploaded files
  let attachmentUrls = [];
  if (req.files && req.files.length > 0) {
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    attachmentUrls = req.files.map(file => {
      return `${baseUrl}/uploads/notices/${file.filename}`;
    });
  }

  // Combine uploaded files with any existing attachment URLs from body
  const allAttachments = [...attachmentUrls, ...(attachments || [])];

  const notice = await Notice.create({
    title,
    description,
    attachments: allAttachments,
    visibleTo,
    schoolId,
    targetAdminIds: targetAdminIds && Array.isArray(targetAdminIds) ? targetAdminIds : [],
    targetTeacherIds: targetTeacherIds && Array.isArray(targetTeacherIds) ? targetTeacherIds : [],
    sessionId: sessionId || null,
    createdBy: req.user.id,
    status: 'ACTIVE'
  });

  // Audit log: notice created
  await logAudit({
    action: 'CREATE_NOTICE',
    entityType: 'NOTICE',
    entityId: notice._id,
    req,
    metadata: {}
  });

  res.status(201).json({
    success: true,
    message: 'Notice created successfully',
    data: notice
  });
});

const getNotices = asyncHandler(async (req, res) => {
  // Use getSchoolIdForFilter for GET requests - allows SUPERADMIN to get all notices (schoolId = null)
  // For operations (POST/PATCH/DELETE), use getSchoolIdForOperation which requires schoolId
  const schoolId = getSchoolIdForFilter(req);
  const { includeArchived } = req.query;

  // Build query
  const query = {};

  if (includeArchived !== 'true') {
    query.status = 'ACTIVE';
  }

  // SUPERADMIN sees all notices (no additional filtering)
  if (isSuperadmin(req.user)) {
    // For SUPERADMIN, optionally filter by schoolId if provided
    if (schoolId) {
      query.schoolId = schoolId;
    }
  } else {
    // For SCHOOLADMIN and TEACHER: filter by role and visibility conditions
    // Show notice if:
    // 1. Notice was created by current user (SCHOOLADMIN can see their own notices), OR
    // 2. user's ID is in targetAdminIds (specific targeting from SUPERADMIN to SCHOOLADMIN), OR
    // 3. user's ID is in targetTeacherIds (specific targeting from SCHOOLADMIN to TEACHER), OR
    // 4. schoolId matches user's school AND visibleTo includes user's role AND no specific targeting (school-wide notices), OR
    // 5. schoolId is null AND targetAdminIds/targetTeacherIds is empty/not set (system-wide notices - backward compatibility)
    const visibilityConditions = [];
    
    // Condition 1: User created the notice (SCHOOLADMIN can see their own notices, TEACHER cannot create notices so this won't match)
    // Only include for SCHOOLADMIN since TEACHER cannot create notices
    if (req.user.role === 'SCHOOLADMIN') {
      visibilityConditions.push({ createdBy: req.user.id });
    }
    
    // Condition 2: User-specific targeting (user is in targetAdminIds) - for SCHOOLADMIN role
    // This allows SUPERADMIN-created notices with targetAdminIds to be visible to targeted school admins
    if (req.user.role === 'SCHOOLADMIN') {
      const mongoose = require('mongoose');
      // Mongoose's $in operator handles string-to-ObjectId conversion automatically
      // But we'll ensure it's a valid ObjectId format
      if (mongoose.Types.ObjectId.isValid(req.user.id)) {
        visibilityConditions.push({ targetAdminIds: { $in: [req.user.id] } });
      }
    }
    
    // Condition 3: User-specific targeting (user is in targetTeacherIds) - for TEACHER role
    // This allows SCHOOLADMIN-created notices with targetTeacherIds to be visible to targeted teachers
    // Must also check that visibleTo includes 'TEACHER' to ensure proper role matching
    if (req.user.role === 'TEACHER') {
      const mongoose = require('mongoose');
      // Ensure req.user.id is converted to ObjectId for proper matching
      if (mongoose.Types.ObjectId.isValid(req.user.id)) {
        // Use ObjectId constructor to ensure proper type matching, then use $in for array matching
        const teacherObjectId = new mongoose.Types.ObjectId(req.user.id);
        visibilityConditions.push({ 
          targetTeacherIds: { $in: [teacherObjectId] },
          visibleTo: { $in: ['TEACHER'] }
        });
      }
    }
    
    // Condition 4: School-based visibility (schoolId matches user's school) AND visibleTo includes user's role
    // BUT only if there's no specific targeting (targetAdminIds or targetTeacherIds empty/not set)
    // This ensures school-wide notices are visible, but targeted notices are only visible to specific users
    if (schoolId) {
      const schoolWideCondition = {
        schoolId: schoolId,
        visibleTo: { $in: [req.user.role] }
      };
      
      // For SCHOOLADMIN: only show school-wide notices (no targetAdminIds or targetAdminIds is empty)
      // For TEACHER: only show school-wide notices (no targetTeacherIds or targetTeacherIds is empty)
      if (req.user.role === 'SCHOOLADMIN') {
        schoolWideCondition.$and = [
          {
            $or: [
              { targetAdminIds: { $exists: false } },
              { targetAdminIds: { $size: 0 } },
              { targetAdminIds: null }
            ]
          }
        ];
      } else if (req.user.role === 'TEACHER') {
        schoolWideCondition.$and = [
          {
            $or: [
              { targetTeacherIds: { $exists: false } },
              { targetTeacherIds: { $size: 0 } },
              { targetTeacherIds: null }
            ]
          }
        ];
      }
      
      visibilityConditions.push(schoolWideCondition);
    }
    
    // Condition 5: System-wide notices (schoolId is null and no specific targeting)
    // Only show these if they have matching visibleTo role
    // A notice is system-wide if schoolId is null AND both targetAdminIds and targetTeacherIds are empty/null/not set
    visibilityConditions.push({ 
      schoolId: null,
      visibleTo: { $in: [req.user.role] },
      $and: [
        {
          $or: [
            { targetAdminIds: { $exists: false } },
            { targetAdminIds: { $size: 0 } },
            { targetAdminIds: null }
          ]
        },
        {
          $or: [
            { targetTeacherIds: { $exists: false } },
            { targetTeacherIds: { $size: 0 } },
            { targetTeacherIds: null }
          ]
        }
      ]
    });
    
    // Use $or to show notices matching any visibility condition
    query.$or = visibilityConditions;
  }

  const notices = await Notice.find(query)
    .populate('createdBy', 'name email')
    .populate('targetAdminIds', 'name email')
    .populate('targetTeacherIds', 'name email')
    .populate('sessionId', 'sessionName')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: notices.length,
    data: notices
  });
});

const getNoticeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // For SUPERADMIN: allow null schoolId; for others: require schoolId
  let schoolId = null;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (err) {
    if (!isSuperadmin(req.user)) {
      return res.status(400).json({
        success: false,
        message: err.message || 'School ID is required'
      });
    }
    // SUPERADMIN can view notices without schoolId
  }

  const query = { _id: id };
  if (schoolId !== null) {
    query.schoolId = schoolId;
  } else if (!isSuperadmin(req.user)) {
    // For non-SUPERADMIN, must filter by schoolId or check targetAdminIds
    query.$or = [
      { schoolId: req.user.schoolId },
      { targetAdminIds: { $in: [req.user.id] } }
    ];
  }

  const notice = await Notice.findOne(query)
    .populate('createdBy', 'name email')
    .populate('targetAdminIds', 'name email')
    .populate('sessionId', 'sessionName');

  if (!notice) {
    return res.status(404).json({
      success: false,
      message: 'Notice not found'
    });
  }

  if (!isSuperadmin(req.user)) {
    if (!notice.visibleTo.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this notice'
      });
    }
    
    // Additional check: if targetAdminIds is set, user must be in it (unless schoolId matches)
    if (notice.targetAdminIds && notice.targetAdminIds.length > 0) {
      const userInTargets = notice.targetAdminIds.some(
        (adminId) => adminId.toString() === req.user.id.toString()
      );
      const schoolMatches = notice.schoolId && req.user.schoolId && 
        notice.schoolId.toString() === req.user.schoolId.toString();
      if (!userInTargets && !schoolMatches) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view this notice'
        });
      }
    }
  }

  res.status(200).json({
    success: true,
    data: notice
  });
});

const updateNotice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, attachments, visibleTo, sessionId, targetAdminIds } = req.body;
  
  // For SUPERADMIN: schoolId optional; for others: required
  let schoolId = null;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (err) {
    if (!isSuperadmin(req.user)) {
      return res.status(400).json({
        success: false,
        message: err.message || 'School ID is required'
      });
    }
    // SUPERADMIN can update notices without schoolId if they own it
  }

  const query = { _id: id };
  if (schoolId !== null) {
    query.schoolId = schoolId;
  }

  const notice = await Notice.findOne(query);

  if (!notice) {
    return res.status(404).json({
      success: false,
      message: 'Notice not found'
    });
  }

  // For non-SUPERADMIN, ensure they can only update their school's notices
  if (!isSuperadmin(req.user) && notice.schoolId && notice.schoolId.toString() !== req.user.schoolId?.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to update this notice'
    });
  }

  if (title !== undefined) {
    notice.title = title;
  }

  if (description !== undefined) {
    notice.description = description;
  }

  if (attachments !== undefined) {
    notice.attachments = attachments;
  }

  if (visibleTo !== undefined) {
    if (!Array.isArray(visibleTo) || visibleTo.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Visible to must be a non-empty array'
      });
    }

    const validRoles = ['SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'];
    const invalidRoles = visibleTo.filter(role => !validRoles.includes(role));
    if (invalidRoles.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid roles: ${invalidRoles.join(', ')}. Allowed roles: ${validRoles.join(', ')}`
      });
    }

    notice.visibleTo = visibleTo;
  }

  if (targetAdminIds !== undefined) {
    if (!Array.isArray(targetAdminIds)) {
      return res.status(400).json({
        success: false,
        message: 'targetAdminIds must be an array'
      });
    }
    // Validate all IDs are valid ObjectIds
    const mongoose = require('mongoose');
    const invalidIds = targetAdminIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid admin IDs: ${invalidIds.join(', ')}`
      });
    }
    notice.targetAdminIds = targetAdminIds;
  }

  if (sessionId !== undefined) {
    notice.sessionId = sessionId || null;
  }

  await notice.save();

  // Audit log: notice updated
  await logAudit({
    action: 'UPDATE_NOTICE',
    entityType: 'NOTICE',
    entityId: id,
    req,
    metadata: {}
  });

  res.status(200).json({
    success: true,
    message: 'Notice updated successfully',
    data: notice
  });
});

const archiveNotice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // For SUPERADMIN: schoolId optional; for others: required
  let schoolId = null;
  try {
    schoolId = getSchoolIdForOperation(req);
  } catch (err) {
    if (!isSuperadmin(req.user)) {
      return res.status(400).json({
        success: false,
        message: err.message || 'School ID is required'
      });
    }
    // SUPERADMIN can archive notices without schoolId if they own it
  }

  const query = { _id: id };
  if (schoolId !== null) {
    query.schoolId = schoolId;
  }

  const notice = await Notice.findOne(query);

  if (!notice) {
    return res.status(404).json({
      success: false,
      message: 'Notice not found'
    });
  }

  // For non-SUPERADMIN, ensure they can only archive their school's notices
  if (!isSuperadmin(req.user) && notice.schoolId && notice.schoolId.toString() !== req.user.schoolId?.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to archive this notice'
    });
  }

  notice.status = 'ARCHIVED';
  await notice.save();

  // Audit log: notice deleted (archived)
  await logAudit({
    action: 'DELETE_NOTICE',
    entityType: 'NOTICE',
    entityId: id,
    req,
    metadata: {}
  });

  res.status(200).json({
    success: true,
    message: 'Notice archived successfully',
    data: notice
  });
});

module.exports = {
  createNotice: [noticeUpload.array('attachments', 5), createNotice],
  getNotices,
  getNoticeById,
  updateNotice,
  archiveNotice
};

