const express = require('express');
const { healthCheck } = require('../controllers/healthController');

const router = express.Router();

router.route('/').get(healthCheck);

module.exports = router;