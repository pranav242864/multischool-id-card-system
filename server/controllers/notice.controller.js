const Notice = require('../models/Notice');
const { getSchoolIdForOperation } = require('../utils/getSchoolId');
const { isSuperadmin } = require('../utils/roleGuards');
const asyncHandler = require('../utils/asyncHandler');
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
  const { title, description, attachments, visibleTo, sessionId } = req.body;

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

  const schoolId = getSchoolIdForOperation(req);

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
    sessionId: sessionId || null,
    createdBy: req.user.id,
    status: 'ACTIVE'
  });

  res.status(201).json({
    success: true,
    message: 'Notice created successfully',
    data: notice
  });
});

const getNotices = asyncHandler(async (req, res) => {
  const schoolId = getSchoolIdForOperation(req);
  const { includeArchived } = req.query;

  const query = { schoolId };

  if (includeArchived !== 'true') {
    query.status = 'ACTIVE';
  }

  if (!isSuperadmin(req.user)) {
    query.visibleTo = { $in: [req.user.role] };
  }

  const notices = await Notice.find(query)
    .populate('createdBy', 'name email')
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
  const schoolId = getSchoolIdForOperation(req);

  const notice = await Notice.findOne({
    _id: id,
    schoolId
  })
    .populate('createdBy', 'name email')
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
  }

  res.status(200).json({
    success: true,
    data: notice
  });
});

const updateNotice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description, attachments, visibleTo, sessionId } = req.body;
  const schoolId = getSchoolIdForOperation(req);

  const notice = await Notice.findOne({
    _id: id,
    schoolId
  });

  if (!notice) {
    return res.status(404).json({
      success: false,
      message: 'Notice not found'
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

  if (sessionId !== undefined) {
    notice.sessionId = sessionId || null;
  }

  await notice.save();

  res.status(200).json({
    success: true,
    message: 'Notice updated successfully',
    data: notice
  });
});

const archiveNotice = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const schoolId = getSchoolIdForOperation(req);

  const notice = await Notice.findOne({
    _id: id,
    schoolId
  });

  if (!notice) {
    return res.status(404).json({
      success: false,
      message: 'Notice not found'
    });
  }

  notice.status = 'ARCHIVED';
  await notice.save();

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

