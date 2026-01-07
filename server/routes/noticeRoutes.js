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

router.post('/', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), createNotice);
router.get('/', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), getNotices);
router.get('/:id', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), getNoticeById);
router.patch('/:id', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), updateNotice);
router.patch('/:id/archive', requireRole('SUPERADMIN', 'SCHOOLADMIN', 'TEACHER'), archiveNotice);

module.exports = router;

