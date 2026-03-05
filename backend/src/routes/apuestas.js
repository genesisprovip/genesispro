/**
 * Apuestas (Bets) Routes
 * Manages bets within peleas/eventos
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler, Errors } = require('../middleware/errorHandler');
const { validateRequest: validate } = require('../middleware/validator');
const { body, param, query } = require('express-validator');
const db = require('../config/database');

// All routes require authentication
router.use(authenticateJWT);

// ============================================
// Validation Helpers
// ============================================

const uuidParam = (field) => param(field).isUUID().withMessage(`${field} invalido`);

const apuestaValidation = [
  body('pelea_id').notEmpty().isUUID().withMessage('ID de pelea invalido'),
  body('evento_id').notEmpty().isUUID().withMessage('ID de evento invalido'),
  body('apostador_nombre').notEmpty().isLength({ max: 200 }).withMessage('Nombre de apostador requerido'),
  body('apostador_id').optional({ nullable: true }).isUUID().withMessage('ID de apostador invalido'),
  body('contraparte_nombre').optional({ nullable: true }).isLength({ max: 200 }),
  body('contraparte_id').optional({ nullable: true }).isUUID().withMessage('ID de contraparte invalido'),
  body('a_favor_de').notEmpty().isIn(['rojo', 'verde']).withMessage('a_favor_de debe ser rojo o azul'),
  body('monto').notEmpty().isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
  body('momio').optional({ nullable: true }).isFloat().withMessage('Momio invalido'),
  body('notas').optional({ nullable: true }).isLength({ max: 1000 })
];

const apuestaUpdateValidation = [
  body('apostador_nombre').optional().isLength({ max: 200 }),
  body('apostador_id').optional({ nullable: true }).isUUID(),
  body('contraparte_nombre').optional({ nullable: true }).isLength({ max: 200 }),
  body('contraparte_id').optional({ nullable: true }).isUUID(),
  body('a_favor_de').optional().isIn(['rojo', 'verde']),
  body('monto').optional().isFloat({ min: 0.01 }),
  body('momio').optional({ nullable: true }).isFloat(),
  body('notas').optional({ nullable: true }).isLength({ max: 1000 })
];

// ============================================
// GET /evento/:eventoId - List bets for event
// ============================================

/**
 * @route   GET /api/v1/apuestas/evento/:eventoId
 * @desc    List all bets for an event
 * @access  Private
 */
router.get('/evento/:eventoId',
  uuidParam('eventoId'),
  query('estado').optional().isIn(['pendiente', 'ganada', 'perdida', 'cancelada', 'cobrada']),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;
    const { estado } = req.query;

    let sql = `
      SELECT
        a.*,
        p.numero_pelea,
        p.resultado AS pelea_resultado,
        ur.nombre AS registrado_por_nombre
      FROM apuestas a
      LEFT JOIN peleas p ON p.id = a.pelea_id
      LEFT JOIN usuarios ur ON ur.id = a.registrado_por
      WHERE a.evento_id = $1 AND a.estado != 'cancelada'
    `;
    const params = [eventoId];

    if (estado) {
      params.push(estado);
      sql += ` AND a.estado = $${params.length}`;
    }

    sql += ` ORDER BY p.numero_pelea ASC, a.created_at ASC`;

    const { rows } = await db.query(sql, params);
    res.json({ success: true, data: rows });
  })
);

// ============================================
// GET /pelea/:peleaId - List bets for fight
// ============================================

/**
 * @route   GET /api/v1/apuestas/pelea/:peleaId
 * @desc    List all bets for a specific fight
 * @access  Private
 */
router.get('/pelea/:peleaId',
  uuidParam('peleaId'),
  validate,
  asyncHandler(async (req, res) => {
    const { peleaId } = req.params;

    const { rows } = await db.query(
      `SELECT
        a.*,
        p.numero_pelea,
        p.resultado AS pelea_resultado,
        ur.nombre AS registrado_por_nombre
      FROM apuestas a
      LEFT JOIN peleas p ON p.id = a.pelea_id
      LEFT JOIN usuarios ur ON ur.id = a.registrado_por
      WHERE a.pelea_id = $1 AND a.estado != 'cancelada'
      ORDER BY a.created_at ASC`,
      [peleaId]
    );

    res.json({ success: true, data: rows });
  })
);

// ============================================
// GET /balance/:eventoId - Balance summary
// ============================================

/**
 * @route   GET /api/v1/apuestas/balance/:eventoId
 * @desc    Get balance summary per user for an event
 * @access  Private
 */
router.get('/balance/:eventoId',
  uuidParam('eventoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;

    const { rows } = await db.query(
      `SELECT
        apostador_nombre,
        apostador_id,
        COUNT(*) AS total_apuestas,
        SUM(monto) AS total_apostado,
        SUM(CASE WHEN estado = 'ganada' OR estado = 'cobrada' THEN monto ELSE 0 END) AS total_ganado,
        SUM(CASE WHEN estado = 'perdida' THEN monto ELSE 0 END) AS total_perdido,
        SUM(CASE
          WHEN estado = 'ganada' OR estado = 'cobrada' THEN monto
          WHEN estado = 'perdida' THEN -monto
          ELSE 0
        END) AS balance_neto,
        COUNT(CASE WHEN estado = 'ganada' OR estado = 'cobrada' THEN 1 END) AS apuestas_ganadas,
        COUNT(CASE WHEN estado = 'perdida' THEN 1 END) AS apuestas_perdidas,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) AS apuestas_pendientes,
        COUNT(CASE WHEN estado = 'cobrada' THEN 1 END) AS apuestas_cobradas
      FROM apuestas
      WHERE evento_id = $1 AND estado != 'cancelada'
      GROUP BY apostador_nombre, apostador_id
      ORDER BY balance_neto DESC`,
      [eventoId]
    );

    // Also get totals
    const { rows: totals } = await db.query(
      `SELECT
        COUNT(*) AS total_apuestas,
        COALESCE(SUM(monto), 0) AS monto_total,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) AS pendientes,
        COUNT(CASE WHEN estado = 'ganada' THEN 1 END) AS ganadas,
        COUNT(CASE WHEN estado = 'perdida' THEN 1 END) AS perdidas,
        COUNT(CASE WHEN estado = 'cobrada' THEN 1 END) AS cobradas,
        COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) AS devueltas
      FROM apuestas
      WHERE evento_id = $1 AND estado != 'cancelada'`,
      [eventoId]
    );

    res.json({
      success: true,
      data: {
        por_apostador: rows,
        resumen: totals[0]
      }
    });
  })
);

// ============================================
// GET /mis-apuestas - User's bets
// ============================================

/**
 * @route   GET /api/v1/apuestas/mis-apuestas
 * @desc    Get bets registered by the current user
 * @access  Private
 */
router.get('/mis-apuestas',
  query('evento_id').optional().isUUID(),
  query('estado').optional().isIn(['pendiente', 'ganada', 'perdida', 'cancelada', 'cobrada']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { evento_id, estado } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT
        a.*,
        p.numero_pelea,
        p.resultado AS pelea_resultado,
        e.nombre AS evento_nombre
      FROM apuestas a
      LEFT JOIN peleas p ON p.id = a.pelea_id
      LEFT JOIN eventos_palenque e ON e.id = a.evento_id
      WHERE a.registrado_por = $1 AND a.estado != 'cancelada'
    `;
    const params = [userId];

    if (evento_id) {
      params.push(evento_id);
      sql += ` AND a.evento_id = $${params.length}`;
    }

    if (estado) {
      params.push(estado);
      sql += ` AND a.estado = $${params.length}`;
    }

    sql += ` ORDER BY a.created_at DESC`;

    // Count total
    const countSql = sql.replace(/SELECT[\s\S]+?FROM/, 'SELECT COUNT(*) AS total FROM');
    const { rows: countRows } = await db.query(countSql, params);
    const total = parseInt(countRows[0].total);

    // Add pagination
    params.push(limit, offset);
    sql += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const { rows } = await db.query(sql, params);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  })
);

// ============================================
// POST / - Register bet
// ============================================

/**
 * @route   POST /api/v1/apuestas
 * @desc    Register a new bet (registrado_por = current user)
 * @access  Private
 */
router.post('/',
  apuestaValidation,
  validate,
  asyncHandler(async (req, res) => {
    const {
      pelea_id, evento_id,
      apostador_nombre, apostador_id,
      contraparte_nombre, contraparte_id,
      a_favor_de, monto, momio, notas
    } = req.body;

    // Verify the pelea exists and belongs to the evento
    const { rows: peleaRows } = await db.query(
      `SELECT id, estado FROM peleas WHERE id = $1 AND evento_id = $2 AND estado != 'cancelada'`,
      [pelea_id, evento_id]
    );
    if (peleaRows.length === 0) {
      throw Errors.notFound('Pelea');
    }
    if (peleaRows[0].estado === 'finalizada') {
      throw Errors.badRequest('No se puede apostar en una pelea finalizada');
    }

    const { rows } = await db.query(
      `INSERT INTO apuestas (
        pelea_id, evento_id, registrado_por,
        apostador_nombre, apostador_id,
        contraparte_nombre, contraparte_id,
        a_favor_de, monto, momio, estado, notas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pendiente', $11)
      RETURNING *`,
      [
        pelea_id, evento_id, req.userId,
        apostador_nombre, apostador_id || null,
        contraparte_nombre || null, contraparte_id || null,
        a_favor_de, monto, momio || null, notas || null
      ]
    );

    res.status(201).json({ success: true, data: rows[0] });
  })
);

// ============================================
// PUT /:id - Update bet
// ============================================

/**
 * @route   PUT /api/v1/apuestas/:id
 * @desc    Update bet (only registrado_por, only if pendiente)
 * @access  Private
 */
router.put('/:id',
  uuidParam('id'),
  apuestaUpdateValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT * FROM apuestas WHERE id = $1 AND estado != 'cancelada'`,
      [id]
    );
    if (existing.length === 0) {
      throw Errors.notFound('Apuesta');
    }

    const apuesta = existing[0];

    if (apuesta.registrado_por !== req.userId) {
      throw Errors.forbidden('Solo quien registro la apuesta puede modificarla');
    }

    if (apuesta.estado !== 'pendiente') {
      throw Errors.badRequest('Solo se pueden modificar apuestas pendientes');
    }

    const {
      apostador_nombre, apostador_id,
      contraparte_nombre, contraparte_id,
      a_favor_de, monto, momio, notas
    } = req.body;

    const { rows } = await db.query(
      `UPDATE apuestas SET
        apostador_nombre = COALESCE($1, apostador_nombre),
        apostador_id = COALESCE($2, apostador_id),
        contraparte_nombre = COALESCE($3, contraparte_nombre),
        contraparte_id = COALESCE($4, contraparte_id),
        a_favor_de = COALESCE($5, a_favor_de),
        monto = COALESCE($6, monto),
        momio = COALESCE($7, momio),
        notas = COALESCE($8, notas),
        updated_at = NOW()
      WHERE id = $9 AND estado != 'cancelada'
      RETURNING *`,
      [
        apostador_nombre, apostador_id,
        contraparte_nombre, contraparte_id,
        a_favor_de, monto, momio, notas, id
      ]
    );

    res.json({ success: true, data: rows[0] });
  })
);

// ============================================
// DELETE /:id - Cancel bet
// ============================================

/**
 * @route   DELETE /api/v1/apuestas/:id
 * @desc    Cancel/delete bet (only registrado_por or organizador)
 * @access  Private
 */
router.delete('/:id',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT a.*, e.organizador_id
      FROM apuestas a
      LEFT JOIN eventos_palenque e ON e.id = a.evento_id
      WHERE a.id = $1 AND a.estado != 'cancelada'`,
      [id]
    );
    if (existing.length === 0) {
      throw Errors.notFound('Apuesta');
    }

    const apuesta = existing[0];

    // Only registrado_por or evento organizador can delete
    if (apuesta.registrado_por !== req.userId && apuesta.organizador_id !== req.userId) {
      throw Errors.forbidden('Solo quien registro la apuesta o el organizador puede cancelarla');
    }

    await db.query(
      `UPDATE apuestas SET estado = 'cancelada', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    res.json({ success: true, data: { message: 'Apuesta cancelada correctamente' } });
  })
);

// ============================================
// POST /:id/cobrada - Mark as collected
// ============================================

/**
 * @route   POST /api/v1/apuestas/:id/cobrada
 * @desc    Mark bet as collected (only if ganada)
 * @access  Private
 */
router.post('/:id/cobrada',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT * FROM apuestas WHERE id = $1 AND estado != 'cancelada'`,
      [id]
    );
    if (existing.length === 0) {
      throw Errors.notFound('Apuesta');
    }

    if (existing[0].estado !== 'ganada') {
      throw Errors.badRequest('Solo se pueden cobrar apuestas ganadas');
    }

    const { rows } = await db.query(
      `UPDATE apuestas SET estado = 'cobrada', updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
      [id]
    );

    res.json({ success: true, data: rows[0] });
  })
);

module.exports = router;
