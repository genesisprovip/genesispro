const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');

router.use(authenticateJWT);

router.get('/dashboard', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM v_dashboard_usuario WHERE usuario_id = $1',
    [req.userId]
  );

  res.json({
    success: true,
    data: rows[0] || {
      total_aves: 0,
      total_machos: 0,
      total_hembras: 0,
      total_combates: 0,
      total_victorias: 0
    }
  });
}));

module.exports = router;
