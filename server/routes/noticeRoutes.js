const express = require('express');
const {
  createNotice,
  getNotices,
  getNoticeById,
  updateNotice,
  archiveNotice
} = require('../controllers/notice.controller');
const authMiddleware = require('../middleware/authMiddleware');
const schoolScoping = require('../middleware/schoolScoping');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(authMiddleware);
router.use(schoolScoping);

// Apply multer middleware (from createNotice array) and handler
// createNotice is exported as an array [multerMiddleware, handler], Express handles arrays automatically
// Teachers can only read notices (GET), they cannot create/update/archive
router.post('/', requireRole('SUPERADMIN', 'SCHOOLADMIN'), ...createNotice);
router.get('/', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), getNotices);
router.get('/:id', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), getNoticeById);
router.patch('/:id', requireRole('SUPERADMIN', 'SCHOOLADMIN'), updateNotice);
router.patch('/:id/archive', requireRole('SUPERADMIN', 'SCHOOLADMIN'), archiveNotice);

module.exports = router;

