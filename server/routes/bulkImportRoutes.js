const express = require('express');
const { importExcelData } = require('../controllers/bulkImportController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// @route   POST /api/v1/bulk-import/:entityType
// @desc    Import data from Excel file
// @access  Private - Superadmin and Schooladmin only (Teachers cannot bulk import)
// Teachers are explicitly blocked from all bulk import operations
router.post('/:entityType', roleMiddleware('Superadmin', 'Schooladmin'), importExcelData);

module.exports = router;

