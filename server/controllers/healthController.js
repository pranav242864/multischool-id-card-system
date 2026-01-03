const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Health check endpoint
// @route   GET /health
// @access  Public
const healthCheck = asyncHandler(async (req, res) => {
  // Simple health check response
  res.status(200).json({
    status: "OK"
  });
});

module.exports = {
  healthCheck,
};