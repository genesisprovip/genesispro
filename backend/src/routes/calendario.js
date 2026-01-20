const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(authenticateJWT);

router.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Módulo de calendario en desarrollo', data: [] });
}));

module.exports = router;
