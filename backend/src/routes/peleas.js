/**
 * Peleas (Fights) Routes
 * Manages individual fights within eventos (cotejos)
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

const peleaValidation = [
  body('evento_id').notEmpty().isUUID().withMessage('ID de evento invalido'),
  body('numero_pelea').notEmpty().isInt({ min: 1 }).withMessage('Numero de pelea requerido'),
  body('partido_rojo_id').optional({ nullable: true }).isUUID().withMessage('ID de partido rojo invalido'),
  body('ave_roja_id').optional({ nullable: true }).isUUID().withMessage('ID de ave roja invalido'),
  body('anillo_rojo').optional({ nullable: true }).isLength({ max: 50 }),
  body('peso_rojo').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Peso rojo debe ser positivo'),
  body('placa_rojo').optional({ nullable: true }).isLength({ max: 50 }),
  body('partido_verde_id').optional({ nullable: true }).isUUID().withMessage('ID de partido verde invalido'),
  body('ave_verde_id').optional({ nullable: true }).isUUID().withMessage('ID de ave verde invalido'),
  body('anillo_verde').optional({ nullable: true }).isLength({ max: 50 }),
  body('peso_verde').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Peso verde debe ser positivo'),
  body('placa_verde').optional({ nullable: true }).isLength({ max: 50 }),
  body('notas').optional({ nullable: true }).isLength({ max: 1000 })
];

const resultadoValidation = [
  body('resultado').notEmpty().isIn(['rojo', 'verde', 'empate', 'tabla', 'cancelada']).withMessage('Resultado invalido'),
  body('duracion_minutos').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Duracion debe ser positiva'),
  body('tipo_victoria').optional({ nullable: true }).isIn(['gallo_huido', 'descalificacion']).withMessage('Tipo de victoria invalido'),
  body('notas').optional({ nullable: true }).isLength({ max: 1000 })
];

// ============================================
// Helper: verify organizer role
// ============================================

async function verifyOrganizador(eventoId, userId, client = null) {
  const queryFn = client ? client.query.bind(client) : db.query;
  const { rows } = await queryFn(
    `SELECT organizador_id FROM eventos_palenque WHERE id = $1 AND estado != 'cancelada'`,
    [eventoId]
  );
  if (rows.length === 0) {
    throw Errors.notFound('Evento');
  }
  if (rows[0].organizador_id !== userId) {
    throw Errors.forbidden('Solo el organizador puede realizar esta accion');
  }
  return rows[0];
}

// ============================================
// GET /evento/:eventoId - List fights for event
// ============================================

/**
 * @route   GET /api/v1/peleas/evento/:eventoId
 * @desc    List all fights for an event ordered by numero_pelea
 * @access  Private
 */
router.get('/evento/:eventoId',
  uuidParam('eventoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;

    const { rows } = await db.query(
      `SELECT
        p.*,
        ur.nombre AS partido_rojo_nombre,
        ua.nombre AS partido_verde_nombre,
        ar.codigo_identidad AS ave_roja_codigo,
        aa.codigo_identidad AS ave_verde_codigo
      FROM peleas p
      LEFT JOIN usuarios ur ON ur.id = p.partido_rojo_id
      LEFT JOIN usuarios ua ON ua.id = p.partido_verde_id
      LEFT JOIN aves ar ON ar.id = p.ave_roja_id
      LEFT JOIN aves aa ON aa.id = p.ave_verde_id
      WHERE p.evento_id = $1
      ORDER BY p.numero_pelea ASC`,
      [eventoId]
    );

    res.json({ success: true, data: rows });
  })
);

// ============================================
// GET /mis-peleas/:eventoId - User's fights
// ============================================

/**
 * @route   GET /api/v1/peleas/mis-peleas/:eventoId
 * @desc    Get user's fights in an event (as partido rojo or verde)
 * @access  Private
 */
router.get('/mis-peleas/:eventoId',
  uuidParam('eventoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;
    const userId = req.userId;

    const { rows } = await db.query(
      `SELECT
        p.*,
        ur.nombre AS partido_rojo_nombre,
        ua.nombre AS partido_verde_nombre,
        ar.codigo_identidad AS ave_roja_codigo,
        aa.codigo_identidad AS ave_verde_codigo
      FROM peleas p
      LEFT JOIN usuarios ur ON ur.id = p.partido_rojo_id
      LEFT JOIN usuarios ua ON ua.id = p.partido_verde_id
      LEFT JOIN aves ar ON ar.id = p.ave_roja_id
      LEFT JOIN aves aa ON aa.id = p.ave_verde_id
      WHERE p.evento_id = $1
        AND (p.partido_rojo_id = $2 OR p.partido_verde_id = $2)
      ORDER BY p.numero_pelea ASC`,
      [eventoId, userId]
    );

    res.json({ success: true, data: rows });
  })
);

// ============================================
// GET /:id - Fight detail
// ============================================

/**
 * @route   GET /api/v1/peleas/:id
 * @desc    Get fight detail with partido and ave info
 * @access  Private
 */
router.get('/:id',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows } = await db.query(
      `SELECT
        p.*,
        ur.nombre AS partido_rojo_nombre,
        ua.nombre AS partido_verde_nombre,
        ar.codigo_identidad AS ave_roja_codigo, ar.color AS ave_roja_color,
        aa.codigo_identidad AS ave_verde_codigo, aa.color AS ave_verde_color,
        e.nombre AS evento_nombre, e.organizador_id
      FROM peleas p
      LEFT JOIN usuarios ur ON ur.id = p.partido_rojo_id
      LEFT JOIN usuarios ua ON ua.id = p.partido_verde_id
      LEFT JOIN aves ar ON ar.id = p.ave_roja_id
      LEFT JOIN aves aa ON aa.id = p.ave_verde_id
      LEFT JOIN eventos_palenque e ON e.id = p.evento_id
      WHERE p.id = $1 AND p.estado != 'cancelada'`,
      [id]
    );

    if (rows.length === 0) {
      throw Errors.notFound('Pelea');
    }

    res.json({ success: true, data: rows[0] });
  })
);

// ============================================
// POST / - Create fight
// ============================================

/**
 * @route   POST /api/v1/peleas
 * @desc    Create a new fight (only organizador)
 * @access  Private
 */
router.post('/',
  peleaValidation,
  validate,
  asyncHandler(async (req, res) => {
    const {
      evento_id, numero_pelea,
      partido_rojo_id, ave_roja_id, anillo_rojo, peso_rojo, placa_rojo,
      partido_verde_id, ave_verde_id, anillo_verde, peso_verde, placa_verde,
      notas
    } = req.body;

    await verifyOrganizador(evento_id, req.userId);

    const { rows } = await db.query(
      `INSERT INTO peleas (
        evento_id, numero_pelea,
        partido_rojo_id, ave_roja_id, anillo_rojo, peso_rojo, placa_rojo,
        partido_verde_id, ave_verde_id, anillo_verde, peso_verde, placa_verde,
        estado, notas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'programada', $13)
      RETURNING *`,
      [
        evento_id, numero_pelea,
        partido_rojo_id || null, ave_roja_id || null, anillo_rojo || null, peso_rojo || null, placa_rojo || null,
        partido_verde_id || null, ave_verde_id || null, anillo_verde || null, peso_verde || null, placa_verde || null,
        notas || null
      ]
    );

    res.status(201).json({ success: true, data: rows[0] });
  })
);

// ============================================
// POST /bulk - Bulk create (full cotejo)
// ============================================

/**
 * @route   POST /api/v1/peleas/bulk
 * @desc    Bulk create fights for a cotejo (transaction)
 * @access  Private
 */
router.post('/bulk',
  body('evento_id').notEmpty().isUUID().withMessage('ID de evento invalido'),
  body('peleas').isArray({ min: 1 }).withMessage('Se requiere al menos una pelea'),
  body('peleas.*.numero_pelea').notEmpty().isInt({ min: 1 }),
  validate,
  asyncHandler(async (req, res) => {
    const { evento_id, peleas } = req.body;

    await verifyOrganizador(evento_id, req.userId);

    const result = await db.transaction(async (client) => {
      const created = [];

      for (const pelea of peleas) {
        const { rows } = await client.query(
          `INSERT INTO peleas (
            evento_id, numero_pelea,
            partido_rojo_id, ave_roja_id, anillo_rojo, peso_rojo, placa_rojo,
            partido_verde_id, ave_verde_id, anillo_verde, peso_verde, placa_verde,
            estado, notas
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'programada', $13)
          RETURNING *`,
          [
            evento_id, pelea.numero_pelea,
            pelea.partido_rojo_id || null, pelea.ave_roja_id || null,
            pelea.anillo_rojo || null, pelea.peso_rojo || null, pelea.placa_rojo || null,
            pelea.partido_verde_id || null, pelea.ave_verde_id || null,
            pelea.anillo_verde || null, pelea.peso_verde || null, pelea.placa_verde || null,
            pelea.notas || null
          ]
        );
        created.push(rows[0]);
      }

      return created;
    });

    res.status(201).json({ success: true, data: result });
  })
);

// ============================================
// PUT /:id - Update fight
// ============================================

/**
 * @route   PUT /api/v1/peleas/:id
 * @desc    Update fight details (only organizador)
 * @access  Private
 */
router.put('/:id',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Get the fight first
    const { rows: existing } = await db.query(
      `SELECT * FROM peleas WHERE id = $1 AND estado != 'cancelada'`,
      [id]
    );
    if (existing.length === 0) {
      throw Errors.notFound('Pelea');
    }

    await verifyOrganizador(existing[0].evento_id, req.userId);

    const {
      numero_pelea, partido_rojo_id, ave_roja_id, anillo_rojo, peso_rojo, placa_rojo,
      partido_verde_id, ave_verde_id, anillo_verde, peso_verde, placa_verde,
      estado, notas
    } = req.body;

    const current = existing[0];

    const { rows } = await db.query(
      `UPDATE peleas SET
        numero_pelea = COALESCE($1, numero_pelea),
        partido_rojo_id = COALESCE($2, partido_rojo_id),
        ave_roja_id = COALESCE($3, ave_roja_id),
        anillo_rojo = COALESCE($4, anillo_rojo),
        peso_rojo = COALESCE($5, peso_rojo),
        placa_rojo = COALESCE($6, placa_rojo),
        partido_verde_id = COALESCE($7, partido_verde_id),
        ave_verde_id = COALESCE($8, ave_verde_id),
        anillo_verde = COALESCE($9, anillo_verde),
        peso_verde = COALESCE($10, peso_verde),
        placa_verde = COALESCE($11, placa_verde),
        estado = COALESCE($12, estado),
        notas = COALESCE($13, notas),
        updated_at = NOW()
      WHERE id = $14 AND estado != 'cancelada'
      RETURNING *`,
      [
        numero_pelea, partido_rojo_id, ave_roja_id, anillo_rojo, peso_rojo, placa_rojo,
        partido_verde_id, ave_verde_id, anillo_verde, peso_verde, placa_verde,
        estado, notas, id
      ]
    );

    res.json({ success: true, data: rows[0] });
  })
);

// ============================================
// POST /:id/iniciar - Start fight
// ============================================

/**
 * @route   POST /api/v1/peleas/:id/iniciar
 * @desc    Start a fight and update evento.pelea_actual
 * @access  Private
 */
router.post('/:id/iniciar',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT * FROM peleas WHERE id = $1 AND estado != 'cancelada'`,
      [id]
    );
    if (existing.length === 0) {
      throw Errors.notFound('Pelea');
    }

    const pelea = existing[0];
    await verifyOrganizador(pelea.evento_id, req.userId);

    if (pelea.estado !== 'programada') {
      throw Errors.badRequest('La pelea ya fue iniciada o finalizada');
    }

    const result = await db.transaction(async (client) => {
      // Update fight status and start time
      const { rows: updated } = await client.query(
        `UPDATE peleas SET
          estado = 'en_curso',
          hora_inicio = NOW(),
          updated_at = NOW()
        WHERE id = $1
        RETURNING *`,
        [id]
      );

      // Update evento.pelea_actual
      await client.query(
        `UPDATE eventos_palenque SET
          pelea_actual = $1,
          updated_at = NOW()
        WHERE id = $2`,
        [pelea.numero_pelea, pelea.evento_id]
      );

      return updated[0];
    });

    res.json({ success: true, data: result });
  })
);

// ============================================
// POST /:id/resultado - Record result
// ============================================

/**
 * @route   POST /api/v1/peleas/:id/resultado
 * @desc    Record fight result and mark as finalizada
 * @access  Private
 */
router.post('/:id/resultado',
  uuidParam('id'),
  resultadoValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { resultado, duracion_minutos, tipo_victoria, notas } = req.body;

    const { rows: existing } = await db.query(
      `SELECT * FROM peleas WHERE id = $1 AND estado != 'cancelada'`,
      [id]
    );
    if (existing.length === 0) {
      throw Errors.notFound('Pelea');
    }

    const pelea = existing[0];
    await verifyOrganizador(pelea.evento_id, req.userId);

    if (pelea.estado === 'finalizada') {
      throw Errors.badRequest('La pelea ya tiene resultado');
    }

    const result = await db.transaction(async (client) => {
      const { rows: updated } = await client.query(
        `UPDATE peleas SET
          estado = 'finalizada',
          resultado = $1,
          duracion_minutos = $2,
          tipo_victoria = $3,
          notas = COALESCE($4, notas),
          hora_fin = NOW(),
          updated_at = NOW()
        WHERE id = $5
        RETURNING *`,
        [resultado, duracion_minutos || null, tipo_victoria || null, notas, id]
      );

      // Update related bets: mark as ganada/perdida based on resultado
      if (resultado === 'rojo' || resultado === 'verde') {
        await client.query(
          `UPDATE apuestas SET
            estado = CASE
              WHEN a_favor_de = $1 THEN 'ganada'
              ELSE 'perdida'
            END,
            updated_at = NOW()
          WHERE pelea_id = $2 AND estado = 'pendiente'`,
          [resultado, id]
        );
      } else {
        // empate/tabla/cancelada -> cancelar apuestas
        await client.query(
          `UPDATE apuestas SET
            estado = 'cancelada',
            updated_at = NOW()
          WHERE pelea_id = $1 AND estado = 'pendiente'`,
          [id]
        );
      }

      return updated[0];
    });

    res.json({ success: true, data: result });
  })
);

// ============================================
// DELETE /:id - Delete fight
// ============================================

/**
 * @route   DELETE /api/v1/peleas/:id
 * @desc    Soft delete a fight (only organizador)
 * @access  Private
 */
router.delete('/:id',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT * FROM peleas WHERE id = $1 AND estado != 'cancelada'`,
      [id]
    );
    if (existing.length === 0) {
      throw Errors.notFound('Pelea');
    }

    await verifyOrganizador(existing[0].evento_id, req.userId);

    await db.query(
      `DELETE FROM peleas WHERE id = $1`,
      [id]
    );

    res.json({ success: true, data: { message: 'Pelea eliminada correctamente' } });
  })
);

module.exports = router;
