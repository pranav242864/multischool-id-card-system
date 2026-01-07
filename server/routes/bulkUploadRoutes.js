const express = require('express');
const { bulkUploadImages } = require('../controllers/bulkImageUploadController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const schoolScoping = require('../middleware/schoolScoping');

const router = express.Router();

// All routes require authentication and school scoping
router.use(authMiddleware);
router.use(schoolScoping);
router.use(requireRole('SUPERADMIN', 'SCHOOLADMIN'));

// @route   POST /api/v1/bulk-upload/images/:entityType
// @desc    Bulk upload images for students or teachers
// @access  Private - Superadmin and Schooladmin only
router.post('/images/:entityType', bulkUploadImages);

module.exports = router;


