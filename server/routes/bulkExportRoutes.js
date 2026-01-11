const express = require('express');
const { exportExcelData } = require('../controllers/bulkImportController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const schoolScoping = require('../middleware/schoolScoping');
const activeSessionMiddleware = require('../middleware/activeSessionMiddleware');

const router = express.Router();

// All routes require authentication, school scoping, role check
router.use(authMiddleware);
router.use(schoolScoping);
router.use(requireRole('SUPERADMIN', 'SCHOOLADMIN'));

// @route   GET /api/v1/bulk-export/:entityType
// @desc    Export data to Excel file
// @access  Private - Superadmin and Schooladmin only
// Note: activeSessionMiddleware is applied conditionally - it will set req.activeSession for student exports
// For SUPERADMIN, it may bypass if schoolId is null, but controller will fetch it if needed
router.get('/:entityType', activeSessionMiddleware, exportExcelData);

module.exports = router;
