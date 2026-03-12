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
const logger = require('../config/logger');
const notificationsRouter = require('./notifications');
const { notifyEventoParticipants, sendPushNotification } = notificationsRouter;

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
  body('partido_derby_rojo_id').optional({ nullable: true }).isUUID().withMessage('ID de partido derby rojo invalido'),
  body('partido_derby_verde_id').optional({ nullable: true }).isUUID().withMessage('ID de partido derby verde invalido'),
  body('ave_derby_rojo_id').optional({ nullable: true }).isUUID().withMessage('ID de ave derby roja invalido'),
  body('ave_derby_verde_id').optional({ nullable: true }).isUUID().withMessage('ID de ave derby verde invalido'),
  body('notas').optional({ nullable: true }).isLength({ max: 1000 })
];

const resultadoValidation = [
  body('resultado').notEmpty().isIn(['rojo', 'verde', 'empate', 'tabla', 'cancelada']).withMessage('Resultado invalido'),
  body('duracion_minutos').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Duracion debe ser positiva'),
  body('duracion_segundos').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Duracion en segundos debe ser positiva'),
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
// Helper: notify partidos whose fight is approaching
// Sends notifications at 8, 5, and 3 fights away
// ============================================

async function notifyUpcomingFighters(eventoId, currentPeleaNum, eventoNombre) {
  const alertAt = [8, 5, 3]; // fights away to notify

  for (const offset of alertAt) {
    const upcomingNum = currentPeleaNum + offset;

    // Find the upcoming pelea using partido_derby IDs
    const { rows } = await db.query(`
      SELECT p.numero_pelea, p.anillo_rojo, p.anillo_verde,
        p.partido_derby_rojo_id, p.partido_derby_verde_id
      FROM peleas p
      WHERE p.evento_id = $1 AND p.numero_pelea = $2 AND p.estado = 'programada'
    `, [eventoId, upcomingNum]);

    if (rows.length === 0) continue;

    const pelea = rows[0];
    const msgPrefix = offset === 3 ? '🐓 PREPARA TU GALLO' : '⚔️ Tu pelea se acerca';
    const bodyText = `Pelea #${pelea.numero_pelea} - Faltan ${offset} peleas para tu turno`;

    // Collect user IDs from both partido_derby entries + participantes_evento
    const partidoIds = [];
    if (pelea.partido_derby_rojo_id) partidoIds.push(pelea.partido_derby_rojo_id);
    if (pelea.partido_derby_verde_id) partidoIds.push(pelea.partido_derby_verde_id);

    if (partidoIds.length === 0) continue;

    // Find users linked to these partidos:
    // 1. Direct partido owner (partidos_derby.usuario_id)
    // 2. Users who joined the event with this partido's codigo_acceso
    const { rows: tokenRows } = await db.query(`
      SELECT DISTINCT pt.token FROM push_tokens pt
      WHERE pt.activo = true AND pt.usuario_id IN (
        -- Partido owners
        SELECT pd.usuario_id FROM partidos_derby pd
        WHERE pd.id = ANY($1) AND pd.usuario_id IS NOT NULL
        UNION
        -- Users who joined event as participantes
        SELECT pe.usuario_id FROM participantes_evento pe
        WHERE pe.evento_id = $2
      )
    `, [partidoIds, eventoId]);

    const tokens = tokenRows.map(r => r.token);
    if (tokens.length > 0) {
      await sendPushNotification(tokens, `${msgPrefix} - ${eventoNombre}`, bodyText, {
        tipo: 'pelea_proxima',
        eventoId,
        peleaNumero: pelea.numero_pelea,
        peleasRestantes: offset,
      });
      logger.info(`Notified ${tokens.length} users: fight #${pelea.numero_pelea} is ${offset} away`);
    }
  }
}

// ============================================
// PUBLIC ROUTES (no auth required, read-only)
// ============================================

/**
 * @route   GET /api/v1/peleas/publico/evento/:eventoId
 * @desc    Public read-only list of fights for an event (for visitors)
 * @access  Public
 */
router.get('/publico/evento/:eventoId',
  uuidParam('eventoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;

    const { rows } = await db.query(
      `SELECT
        p.id, p.numero_pelea, p.estado, p.resultado,
        p.peso_rojo, p.peso_verde, p.placa_rojo, p.placa_verde,
        p.anillo_rojo, p.anillo_verde, p.duracion_minutos,
        p.tipo_victoria, p.notas, p.ronda_id, p.hora_inicio,
        rd.numero_ronda,
        ur.nombre AS partido_rojo_nombre,
        ua.nombre AS partido_verde_nombre
      FROM peleas p
      LEFT JOIN usuarios ur ON ur.id = p.partido_rojo_id
      LEFT JOIN usuarios ua ON ua.id = p.partido_verde_id
      LEFT JOIN rondas_derby rd ON rd.id = p.ronda_id
      WHERE p.evento_id = $1
      ORDER BY p.numero_pelea ASC`,
      [eventoId]
    );

    res.json({ success: true, data: rows });
  })
);

// All remaining routes require authentication
router.use(authenticateJWT);

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
        rd.numero_ronda,
        ur.nombre AS partido_rojo_nombre,
        ua.nombre AS partido_verde_nombre,
        ar.codigo_identidad AS ave_roja_codigo,
        aa.codigo_identidad AS ave_verde_codigo,
        pdr.nombre AS derby_partido_rojo_nombre,
        pdv.nombre AS derby_partido_verde_nombre
      FROM peleas p
      LEFT JOIN rondas_derby rd ON rd.id = p.ronda_id
      LEFT JOIN usuarios ur ON ur.id = p.partido_rojo_id
      LEFT JOIN usuarios ua ON ua.id = p.partido_verde_id
      LEFT JOIN aves ar ON ar.id = p.ave_roja_id
      LEFT JOIN aves aa ON aa.id = p.ave_verde_id
      LEFT JOIN partidos_derby pdr ON pdr.id = p.partido_derby_rojo_id
      LEFT JOIN partidos_derby pdv ON pdv.id = p.partido_derby_verde_id
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
      partido_derby_rojo_id, partido_derby_verde_id,
      ave_derby_rojo_id, ave_derby_verde_id,
      notas
    } = req.body;

    await verifyOrganizador(evento_id, req.userId);

    // Auto-fill data from aves_derby/partidos_derby when manual mode IDs are provided
    let finalAnilloRojo = anillo_rojo || null;
    let finalPesoRojo = peso_rojo || null;
    let finalPlacaRojo = placa_rojo || null;
    let finalAveDerbyRojoId = ave_derby_rojo_id || null;
    let finalPartidoDerbyRojoId = partido_derby_rojo_id || null;

    let finalAnilloVerde = anillo_verde || null;
    let finalPesoVerde = peso_verde || null;
    let finalPlacaVerde = placa_verde || null;
    let finalAveDerbyVerdeId = ave_derby_verde_id || null;
    let finalPartidoDerbyVerdeId = partido_derby_verde_id || null;

    // If ave_derby IDs provided, look up ave + partido data
    if (ave_derby_rojo_id) {
      const { rows: aveData } = await db.query(
        `SELECT a.anillo, a.peso, a.placa, a.partido_id, p.nombre AS partido_nombre, p.usuario_id
         FROM aves_derby a JOIN partidos_derby p ON p.id = a.partido_id
         WHERE a.id = $1`, [ave_derby_rojo_id]
      );
      if (aveData.length > 0) {
        const a = aveData[0];
        if (!finalAnilloRojo) finalAnilloRojo = a.anillo;
        if (!finalPesoRojo) finalPesoRojo = a.peso || null;
        if (!finalPlacaRojo) finalPlacaRojo = a.partido_nombre;
        if (!finalPartidoDerbyRojoId) finalPartidoDerbyRojoId = a.partido_id;
      }
    } else if (partido_derby_rojo_id && !finalPlacaRojo) {
      const { rows: pData } = await db.query(
        `SELECT nombre FROM partidos_derby WHERE id = $1`, [partido_derby_rojo_id]
      );
      if (pData.length > 0) finalPlacaRojo = pData[0].nombre;
    }

    if (ave_derby_verde_id) {
      const { rows: aveData } = await db.query(
        `SELECT a.anillo, a.peso, a.placa, a.partido_id, p.nombre AS partido_nombre, p.usuario_id
         FROM aves_derby a JOIN partidos_derby p ON p.id = a.partido_id
         WHERE a.id = $1`, [ave_derby_verde_id]
      );
      if (aveData.length > 0) {
        const a = aveData[0];
        if (!finalAnilloVerde) finalAnilloVerde = a.anillo;
        if (!finalPesoVerde) finalPesoVerde = a.peso || null;
        if (!finalPlacaVerde) finalPlacaVerde = a.partido_nombre;
        if (!finalPartidoDerbyVerdeId) finalPartidoDerbyVerdeId = a.partido_id;
      }
    } else if (partido_derby_verde_id && !finalPlacaVerde) {
      const { rows: pData } = await db.query(
        `SELECT nombre FROM partidos_derby WHERE id = $1`, [partido_derby_verde_id]
      );
      if (pData.length > 0) finalPlacaVerde = pData[0].nombre;
    }

    const { rows } = await db.query(
      `INSERT INTO peleas (
        evento_id, numero_pelea,
        partido_rojo_id, ave_roja_id, anillo_rojo, peso_rojo, placa_rojo,
        partido_verde_id, ave_verde_id, anillo_verde, peso_verde, placa_verde,
        ave_roja_derby_id, ave_verde_derby_id,
        partido_derby_rojo_id, partido_derby_verde_id,
        estado, notas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'programada', $17)
      RETURNING *`,
      [
        evento_id, numero_pelea,
        partido_rojo_id || null, ave_roja_id || null, finalAnilloRojo, finalPesoRojo, finalPlacaRojo,
        partido_verde_id || null, ave_verde_id || null, finalAnilloVerde, finalPesoVerde, finalPlacaVerde,
        finalAveDerbyRojoId, finalAveDerbyVerdeId,
        finalPartidoDerbyRojoId, finalPartidoDerbyVerdeId,
        notas || null
      ]
    );

    // Update total_peleas on evento
    await db.query(
      `UPDATE eventos_palenque SET
        total_peleas = (SELECT COUNT(*) FROM peleas WHERE evento_id = $1),
        updated_at = NOW()
      WHERE id = $1`,
      [evento_id]
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
        // Auto-fill from aves_derby if provided
        let anilloRojo = pelea.anillo_rojo || null;
        let pesoRojo = pelea.peso_rojo || null;
        let placaRojo = pelea.placa_rojo || null;
        let aveDerbyRojoId = pelea.ave_derby_rojo_id || null;
        let partidoDerbyRojoId = pelea.partido_derby_rojo_id || null;

        let anilloVerde = pelea.anillo_verde || null;
        let pesoVerde = pelea.peso_verde || null;
        let placaVerde = pelea.placa_verde || null;
        let aveDerbyVerdeId = pelea.ave_derby_verde_id || null;
        let partidoDerbyVerdeId = pelea.partido_derby_verde_id || null;

        if (pelea.ave_derby_rojo_id) {
          const { rows: a } = await client.query(
            `SELECT a.anillo, a.peso, a.partido_id, p.nombre AS partido_nombre
             FROM aves_derby a JOIN partidos_derby p ON p.id = a.partido_id WHERE a.id = $1`,
            [pelea.ave_derby_rojo_id]
          );
          if (a.length > 0) {
            if (!anilloRojo) anilloRojo = a[0].anillo;
            if (!pesoRojo) pesoRojo = a[0].peso || null;
            if (!placaRojo) placaRojo = a[0].partido_nombre;
            if (!partidoDerbyRojoId) partidoDerbyRojoId = a[0].partido_id;
          }
        }

        if (pelea.ave_derby_verde_id) {
          const { rows: a } = await client.query(
            `SELECT a.anillo, a.peso, a.partido_id, p.nombre AS partido_nombre
             FROM aves_derby a JOIN partidos_derby p ON p.id = a.partido_id WHERE a.id = $1`,
            [pelea.ave_derby_verde_id]
          );
          if (a.length > 0) {
            if (!anilloVerde) anilloVerde = a[0].anillo;
            if (!pesoVerde) pesoVerde = a[0].peso || null;
            if (!placaVerde) placaVerde = a[0].partido_nombre;
            if (!partidoDerbyVerdeId) partidoDerbyVerdeId = a[0].partido_id;
          }
        }

        const { rows } = await client.query(
          `INSERT INTO peleas (
            evento_id, numero_pelea,
            partido_rojo_id, ave_roja_id, anillo_rojo, peso_rojo, placa_rojo,
            partido_verde_id, ave_verde_id, anillo_verde, peso_verde, placa_verde,
            ave_roja_derby_id, ave_verde_derby_id,
            partido_derby_rojo_id, partido_derby_verde_id,
            estado, notas
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'programada', $17)
          RETURNING *`,
          [
            evento_id, pelea.numero_pelea,
            pelea.partido_rojo_id || null, pelea.ave_roja_id || null, anilloRojo, pesoRojo, placaRojo,
            pelea.partido_verde_id || null, pelea.ave_verde_id || null, anilloVerde, pesoVerde, placaVerde,
            aveDerbyRojoId, aveDerbyVerdeId,
            partidoDerbyRojoId, partidoDerbyVerdeId,
            pelea.notas || null
          ]
        );
        created.push(rows[0]);
      }

      // Update total_peleas
      await client.query(
        `UPDATE eventos_palenque SET
          total_peleas = (SELECT COUNT(*) FROM peleas WHERE evento_id = $1),
          updated_at = NOW()
        WHERE id = $1`,
        [evento_id]
      );

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
      partido_derby_rojo_id, partido_derby_verde_id,
      ave_derby_rojo_id, ave_derby_verde_id,
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
        partido_derby_rojo_id = COALESCE($15, partido_derby_rojo_id),
        partido_derby_verde_id = COALESCE($16, partido_derby_verde_id),
        ave_roja_derby_id = COALESCE($17, ave_roja_derby_id),
        ave_verde_derby_id = COALESCE($18, ave_verde_derby_id),
        updated_at = NOW()
      WHERE id = $14 AND estado != 'cancelada'
      RETURNING *`,
      [
        numero_pelea, partido_rojo_id, ave_roja_id, anillo_rojo, peso_rojo, placa_rojo,
        partido_verde_id, ave_verde_id, anillo_verde, peso_verde, placa_verde,
        estado, notas, id,
        partido_derby_rojo_id, partido_derby_verde_id,
        ave_derby_rojo_id, ave_derby_verde_id
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

    // Enforce sequence: no fight can start if a previous one is still en_curso
    const { rows: activeFights } = await db.query(
      `SELECT numero_pelea FROM peleas
       WHERE evento_id = $1 AND estado = 'en_curso' AND id != $2`,
      [pelea.evento_id, id]
    );
    if (activeFights.length > 0) {
      throw Errors.badRequest(`No se puede iniciar: la pelea ${activeFights[0].numero_pelea} aún está en curso`);
    }

    // Enforce sequence: all previous fights must be finalizada or cancelada
    const { rows: pendingPrevious } = await db.query(
      `SELECT numero_pelea FROM peleas
       WHERE evento_id = $1 AND numero_pelea < $2 AND estado = 'programada'`,
      [pelea.evento_id, pelea.numero_pelea]
    );
    if (pendingPrevious.length > 0) {
      throw Errors.badRequest(`No se puede iniciar: la pelea ${pendingPrevious[0].numero_pelea} aún no se ha realizado`);
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
    const { resultado, duracion_minutos, duracion_segundos, tipo_victoria, notas } = req.body;

    // Support both duracion_segundos (preferred) and duracion_minutos (legacy)
    const totalSeconds = duracion_segundos != null ? duracion_segundos : (duracion_minutos != null ? Math.round(duracion_minutos * 60) : null);
    const duracionMinutosValue = totalSeconds != null ? Math.round(totalSeconds / 60) : null;

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

    if (pelea.estado !== 'en_curso') {
      throw Errors.badRequest('La pelea debe estar en curso para registrar resultado');
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
        [resultado, duracionMinutosValue, tipo_victoria || null, notas, id]
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

      // Auto-generate financial charges for this fight result
      if (resultado === 'rojo' || resultado === 'verde') {
        try {
          const { rows: [ev] } = await client.query(
            `SELECT costo_por_pelea FROM eventos_palenque WHERE id = $1`,
            [pelea.evento_id]
          );

          const costoPelea = ev && parseFloat(ev.costo_por_pelea) > 0 ? parseFloat(ev.costo_por_pelea) : 0;

          if (costoPelea > 0) {
            // Check if charges already exist for this fight
            const { rows: existingCharges } = await client.query(
              `SELECT concepto FROM pagos_evento WHERE pelea_id = $1 AND estado != 'cancelado'`,
              [id]
            );
            const existingConcepts = new Set(existingCharges.map(e => e.concepto));

            const ganadorId = resultado === 'rojo' ? pelea.partido_derby_rojo_id : pelea.partido_derby_verde_id;
            const perdedorId = resultado === 'rojo' ? pelea.partido_derby_verde_id : pelea.partido_derby_rojo_id;

            // Get partido names
            const ganadorNombre = resultado === 'rojo'
              ? (updated[0].placa_rojo || updated[0].anillo_rojo || 'Rojo')
              : (updated[0].placa_verde || updated[0].anillo_verde || 'Verde');
            const perdedorNombre = resultado === 'rojo'
              ? (updated[0].placa_verde || updated[0].anillo_verde || 'Verde')
              : (updated[0].placa_rojo || updated[0].anillo_rojo || 'Rojo');

            // Winner: egreso (organizer pays winner)
            if (!existingConcepts.has('pelea_ganada')) {
              await client.query(
                `INSERT INTO pagos_evento (evento_id, partido_id, partido_nombre, concepto, tipo, monto, estado, pelea_id, notas)
                 VALUES ($1, $2, $3, 'pelea_ganada', 'egreso', $4, 'pendiente', $5, $6)`,
                [pelea.evento_id, ganadorId, ganadorNombre, costoPelea, id, `Pelea ${pelea.numero_pelea} - Ganador`]
              );
            }

            // Loser: ingreso (loser pays organizer)
            if (!existingConcepts.has('pelea_perdida')) {
              await client.query(
                `INSERT INTO pagos_evento (evento_id, partido_id, partido_nombre, concepto, tipo, monto, estado, pelea_id, notas)
                 VALUES ($1, $2, $3, 'pelea_perdida', 'ingreso', $4, 'pendiente', $5, $6)`,
                [pelea.evento_id, perdedorId, perdedorNombre, costoPelea, id, `Pelea ${pelea.numero_pelea} - Perdedor`]
              );
            }

            logger.info(`Auto-generated fight charges for pelea ${pelea.numero_pelea} (costo: ${costoPelea})`);
          }
        } catch (finError) {
          logger.error('Error auto-generating fight charges:', finError);
          // Don't fail the result registration if charges fail
        }
      }

      // Update puntos for winning partido_derby
      if (resultado === 'rojo' || resultado === 'verde') {
        const winningPartidoId = resultado === 'rojo'
          ? updated[0].partido_derby_rojo_id
          : updated[0].partido_derby_verde_id;

        if (winningPartidoId) {
          await client.query(
            `UPDATE partidos_derby SET puntos = COALESCE(puntos, 0) + 1 WHERE id = $1`,
            [winningPartidoId]
          );
          logger.info(`Updated puntos +1 for partido_derby ${winningPartidoId}`);
        }
      } else if (resultado === 'empate' || resultado === 'tabla') {
        // Tablas: both get 0.5 points (or 0 depending on rules - using 0 for now)
        logger.info(`Tablas result for pelea ${pelea.numero_pelea}, no puntos awarded`);
      }

      return updated[0];
    });

    // Send push notification to event participants (fire-and-forget)
    try {
      const { rows: eventoRows } = await db.query(
        `SELECT nombre FROM eventos_palenque WHERE id = $1`,
        [pelea.evento_id]
      );
      const eventoNombre = eventoRows.length > 0 ? eventoRows[0].nombre : 'Evento';

      // Format duration as MM:SS from seconds
      let duracionStr = '';
      if (totalSeconds != null) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        duracionStr = ` en ${mins}:${String(secs).padStart(2, '0')}`;
      }

      let bodyText;
      if (resultado === 'rojo') {
        bodyText = `Gana ROJO${duracionStr}`;
      } else if (resultado === 'verde') {
        bodyText = `Gana VERDE${duracionStr}`;
      } else if (resultado === 'empate' || resultado === 'tabla') {
        bodyText = `TABLAS${duracionStr}`;
      } else {
        bodyText = `Pelea cancelada`;
      }

      notifyEventoParticipants(
        pelea.evento_id,
        `Pelea #${pelea.numero_pelea} - ${eventoNombre}`,
        bodyText,
        { tipo: 'resultado_pelea', peleaId: id, resultado }
      ).catch(err => logger.error('Error sending fight result notification:', err));

      // Notify partidos whose fights are coming up (8, 5, 3 fights away)
      notifyUpcomingFighters(pelea.evento_id, pelea.numero_pelea, eventoNombre)
        .catch(err => logger.error('Error sending upcoming fight notifications:', err));
    } catch (notifError) {
      logger.error('Error preparing fight result notification:', notifError);
    }

    res.json({ success: true, data: result });
  })
);

// ============================================
// POST /:id/corregir-resultado - Correct a fight result with audit trail
// ============================================

/**
 * @route   POST /api/v1/peleas/:id/corregir-resultado
 * @desc    Correct a finalized fight result. Reverts puntos/finanzas and applies new ones.
 *          Requires mandatory 'motivo' field for audit trail.
 * @access  Private (organizador only)
 */
router.post('/:id/corregir-resultado',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { resultado: nuevoResultado, motivo } = req.body;

    if (!nuevoResultado || !['rojo', 'verde', 'tabla'].includes(nuevoResultado)) {
      throw Errors.badRequest('Resultado debe ser: rojo, verde o tabla');
    }
    if (!motivo || motivo.trim().length < 5) {
      throw Errors.badRequest('Motivo de corrección es obligatorio (mínimo 5 caracteres)');
    }

    // Get the fight
    const { rows: existing } = await db.query(
      `SELECT * FROM peleas WHERE id = $1 AND estado != 'cancelada'`,
      [id]
    );
    if (existing.length === 0) throw Errors.notFound('Pelea');

    const pelea = existing[0];
    await verifyOrganizador(pelea.evento_id, req.userId);

    if (pelea.estado !== 'finalizada') {
      throw Errors.badRequest('Solo se pueden corregir peleas finalizadas');
    }

    const resultadoAnterior = pelea.resultado;
    if (resultadoAnterior === nuevoResultado) {
      throw Errors.badRequest('El nuevo resultado es igual al actual');
    }

    // Get user name for audit
    const { rows: [user] } = await db.query(
      'SELECT nombre FROM usuarios WHERE id = $1', [req.userId]
    );

    const result = await db.transaction(async (client) => {
      // 1. Revert old puntos
      if (resultadoAnterior === 'rojo' || resultadoAnterior === 'verde') {
        const oldWinnerId = resultadoAnterior === 'rojo'
          ? pelea.partido_derby_rojo_id
          : pelea.partido_derby_verde_id;
        if (oldWinnerId) {
          await client.query(
            `UPDATE partidos_derby SET puntos = GREATEST(0, COALESCE(puntos, 0) - 1) WHERE id = $1`,
            [oldWinnerId]
          );
          logger.info(`[Correccion] Reverted -1 punto from partido_derby ${oldWinnerId}`);
        }
      }

      // 2. Apply new puntos
      if (nuevoResultado === 'rojo' || nuevoResultado === 'verde') {
        const newWinnerId = nuevoResultado === 'rojo'
          ? pelea.partido_derby_rojo_id
          : pelea.partido_derby_verde_id;
        if (newWinnerId) {
          await client.query(
            `UPDATE partidos_derby SET puntos = COALESCE(puntos, 0) + 1 WHERE id = $1`,
            [newWinnerId]
          );
          logger.info(`[Correccion] Applied +1 punto to partido_derby ${newWinnerId}`);
        }
      }

      // 3. Revert old finanzas charges for this fight
      await client.query(
        `DELETE FROM pagos_evento WHERE pelea_id = $1 AND concepto IN ('pelea_ganada', 'pelea_perdida')`,
        [id]
      );

      // 4. Apply new finanzas charges if applicable
      if (nuevoResultado === 'rojo' || nuevoResultado === 'verde') {
        const { rows: [ev] } = await client.query(
          `SELECT costo_por_pelea FROM eventos_palenque WHERE id = $1`,
          [pelea.evento_id]
        );
        const costoPelea = ev && parseFloat(ev.costo_por_pelea) > 0 ? parseFloat(ev.costo_por_pelea) : 0;

        if (costoPelea > 0) {
          const ganadorId = nuevoResultado === 'rojo' ? pelea.partido_derby_rojo_id : pelea.partido_derby_verde_id;
          const perdedorId = nuevoResultado === 'rojo' ? pelea.partido_derby_verde_id : pelea.partido_derby_rojo_id;
          const ganadorNombre = nuevoResultado === 'rojo'
            ? (pelea.placa_rojo || pelea.anillo_rojo || 'Rojo')
            : (pelea.placa_verde || pelea.anillo_verde || 'Verde');
          const perdedorNombre = nuevoResultado === 'rojo'
            ? (pelea.placa_verde || pelea.anillo_verde || 'Verde')
            : (pelea.placa_rojo || pelea.anillo_rojo || 'Rojo');

          await client.query(
            `INSERT INTO pagos_evento (evento_id, partido_id, partido_nombre, concepto, tipo, monto, estado, pelea_id, notas)
             VALUES ($1, $2, $3, 'pelea_ganada', 'egreso', $4, 'pendiente', $5, $6)`,
            [pelea.evento_id, ganadorId, ganadorNombre, costoPelea, id, `Pelea ${pelea.numero_pelea} - Ganador (corregido)`]
          );
          await client.query(
            `INSERT INTO pagos_evento (evento_id, partido_id, partido_nombre, concepto, tipo, monto, estado, pelea_id, notas)
             VALUES ($1, $2, $3, 'pelea_perdida', 'ingreso', $4, 'pendiente', $5, $6)`,
            [pelea.evento_id, perdedorId, perdedorNombre, costoPelea, id, `Pelea ${pelea.numero_pelea} - Perdedor (corregido)`]
          );
        }
      }

      // 5. Update the fight result
      const { rows: updated } = await client.query(
        `UPDATE peleas SET resultado = $1, notas = COALESCE(notas, '') || $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [nuevoResultado, ` [Corregido: ${resultadoAnterior}→${nuevoResultado} - ${motivo.trim()}]`, id]
      );

      // 6. Update apuestas
      if (nuevoResultado === 'rojo' || nuevoResultado === 'verde') {
        await client.query(
          `UPDATE apuestas SET
            estado = CASE WHEN a_favor_de = $1 THEN 'ganada' ELSE 'perdida' END,
            updated_at = NOW()
          WHERE pelea_id = $2 AND estado IN ('pendiente', 'ganada', 'perdida')`,
          [nuevoResultado, id]
        );
      } else {
        await client.query(
          `UPDATE apuestas SET estado = 'cancelada', updated_at = NOW()
           WHERE pelea_id = $1 AND estado IN ('pendiente', 'ganada', 'perdida')`,
          [id]
        );
      }

      // 7. Write audit log
      await client.query(
        `INSERT INTO audit_log (evento_id, usuario_id, usuario_nombre, accion, entidad, entidad_id, datos_anteriores, datos_nuevos, motivo)
         VALUES ($1, $2, $3, 'corregir_resultado', 'pelea', $4, $5, $6, $7)`,
        [
          pelea.evento_id, req.userId, user?.nombre || 'Desconocido',
          id,
          JSON.stringify({ resultado: resultadoAnterior, numero_pelea: pelea.numero_pelea }),
          JSON.stringify({ resultado: nuevoResultado, numero_pelea: pelea.numero_pelea }),
          motivo.trim()
        ]
      );

      return updated[0];
    });

    logger.info(`[Correccion] Pelea ${pelea.numero_pelea}: ${resultadoAnterior} → ${nuevoResultado} by user ${req.userId}. Motivo: ${motivo}`);

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
