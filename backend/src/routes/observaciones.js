/**
 * GenesisPro - Observaciones de Gallera Routes
 * Notas y observaciones generales del gallero
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler, Errors } = require('../middleware/errorHandler');

router.use(authenticateJWT);

// GET / - List observations (paginated, newest first)
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 30, categoria } = req.query;
  const offset = (page - 1) * limit;

  let whereExtra = '';
  const params = [req.userId, limit, offset];

  if (categoria) {
    whereExtra = ' AND categoria = $4';
    params.push(categoria);
  }

  const { rows } = await db.query(`
    SELECT * FROM observaciones_gallera
    WHERE usuario_id = $1 ${whereExtra}
    ORDER BY fecha DESC, created_at DESC
    LIMIT $2 OFFSET $3
  `, params);

  res.json({ success: true, data: rows });
}));

// POST / - Create observation
router.post('/', asyncHandler(async (req, res) => {
  const { titulo, contenido, categoria, fecha } = req.body;

  if (!contenido?.trim()) throw Errors.badRequest('El contenido es requerido');

  const { rows } = await db.query(
    `INSERT INTO observaciones_gallera (usuario_id, titulo, contenido, categoria, fecha)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [req.userId, titulo?.trim() || null, contenido.trim(), categoria || 'general', fecha || new Date().toISOString().slice(0, 10)]
  );

  res.status(201).json({ success: true, data: rows[0] });
}));

// PUT /:id - Update observation
router.put('/:id', asyncHandler(async (req, res) => {
  const { titulo, contenido, categoria } = req.body;

  const { rows } = await db.query(
    `UPDATE observaciones_gallera SET
       titulo = COALESCE($1, titulo),
       contenido = COALESCE($2, contenido),
       categoria = COALESCE($3, categoria)
     WHERE id = $4 AND usuario_id = $5 RETURNING *`,
    [titulo?.trim(), contenido?.trim(), categoria, req.params.id, req.userId]
  );

  if (rows.length === 0) throw Errors.notFound('Observacion');
  res.json({ success: true, data: rows[0] });
}));

// DELETE /:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await db.query(
    'DELETE FROM observaciones_gallera WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.userId]
  );
  if (rowCount === 0) throw Errors.notFound('Observacion');
  res.json({ success: true, message: 'Observacion eliminada' });
}));

module.exports = router;
