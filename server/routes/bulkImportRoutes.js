const express = require('express');
const { importExcelData } = require('../controllers/bulkImportController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// @route   POST /api/v1/bulk-import/:entityType
// @desc    Import data from Excel file
// @access  Private
router.post('/:entityType', importExcelData);

module.exports = router;

