const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Health check endpoint
// @route   GET /api/v1/health
// @access  Public
const healthCheck = asyncHandler(async (req, res) => {
  // Simple health check response
  res.status(200).json({
    status: "ok"
  });
});

module.exports = {
  healthCheck,
};