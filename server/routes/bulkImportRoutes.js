const express = require('express');
const { importExcelData } = require('../controllers/bulkImportController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/requireRole');
const schoolScoping = require('../middleware/schoolScoping');
const activeSessionMiddleware = require('../middleware/activeSessionMiddleware');

const router = express.Router();

// All routes require authentication, school scoping, role check, and active session
router.use(authMiddleware);
router.use(schoolScoping);
router.use(requireRole('SUPERADMIN', 'SCHOOLADMIN'));
router.use(activeSessionMiddleware);

// @route   POST /api/v1/bulk-import/:entityType
// @desc    Import data from Excel file
// @access  Private - Superadmin and Schooladmin only (Teachers cannot bulk import)
// Teachers are explicitly blocked from all bulk import operations
router.post('/:entityType', importExcelData);

module.exports = router;
