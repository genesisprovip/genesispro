/**
 * Eventos (Palenque) Routes
 * Manages: eventos, participantes, control de peleas
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { Errors } = require('../middleware/errorHandler');
const { validateRequest: validate } = require('../middleware/validator');
const { body, param, query } = require('express-validator');
const db = require('../config/database');
const logger = require('../config/logger');
const { EMPRESARIO_CONFIG } = require('../config/stripe');

/**
 * Verify user has active empresario subscription and hasn't exceeded event limit
 */
async function verificarMembresiaEmpresario(userId) {
  const { rows: [user] } = await db.query(
    `SELECT u.plan_empresario, se.estado
     FROM usuarios u
     LEFT JOIN suscripciones_empresario se ON u.suscripcion_empresario_id = se.id
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId]
  );

  if (!user?.plan_empresario || user.estado !== 'activa') {
    throw Errors.forbidden('Necesitas una membresía de Empresario para crear eventos. Suscríbete desde tu perfil.');
  }

  const config = EMPRESARIO_CONFIG[user.plan_empresario];
  if (!config) {
    throw Errors.forbidden('Plan empresario no válido');
  }

  // Check monthly event limit
  if (config.maxEventosMes !== null) {
    const { rows: [count] } = await db.query(
      `SELECT COUNT(*) FROM eventos_palenque
       WHERE organizador_id = $1
         AND deleted_at IS NULL
         AND date_trunc('month', created_at) = date_trunc('month', NOW())`,
      [userId]
    );

    if (parseInt(count.count) >= config.maxEventosMes) {
      throw Errors.forbidden(`Has alcanzado el límite de ${config.maxEventosMes} eventos este mes. Actualiza a Empresario Pro para eventos ilimitados.`);
    }
  }

  return config;
}

// ============================================
// Validation Schemas
// ============================================

const uuidParam = (field) => param(field).isUUID().withMessage(`${field} inválido`);

const eventoValidation = [
  body('nombre').notEmpty().isLength({ max: 200 }).withMessage('Nombre del evento requerido'),
  body('descripcion').optional().isLength({ max: 1000 }).withMessage('Descripción muy larga'),
  body('fecha').notEmpty().isDate().withMessage('Fecha requerida'),
  body('hora_inicio').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Hora inválida (HH:MM)'),
  body('lugar').optional().isLength({ max: 200 }).withMessage('Lugar muy largo'),
  body('direccion').optional().isLength({ max: 500 }).withMessage('Dirección muy larga'),
  body('tipo_derby').optional().isLength({ max: 100 }).withMessage('Tipo de derby muy largo'),
  body('reglas').optional().isLength({ max: 2000 }).withMessage('Reglas muy largas'),
  body('total_peleas').optional().isInt({ min: 0 }).withMessage('Total de peleas debe ser un número positivo'),
  body('es_publico').optional().isBoolean().withMessage('es_publico debe ser booleano'),
  body('entrada_costo').optional().isFloat({ min: 0 }).withMessage('Costo de entrada debe ser positivo'),
  body('imagen_url').optional().isLength({ max: 500 }).withMessage('URL de imagen muy larga'),
  body('pesaje_abre').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Hora de pesaje inválida (HH:MM)'),
  body('pesaje_cierra').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Hora de pesaje inválida (HH:MM)'),
  body('programa').optional().isLength({ max: 100 }).withMessage('Programa muy largo'),
  body('costo_inscripcion').optional().isInt({ min: 0 }).withMessage('Costo de inscripción debe ser positivo'),
  body('costo_por_pelea').optional().isInt({ min: 0 }).withMessage('Costo por pelea debe ser positivo'),
  body('premio_campeon').optional().isInt({ min: 0 }).withMessage('Premio debe ser positivo'),
  body('costos_extra').optional().isArray().withMessage('Costos extra debe ser un array'),
  body('aves_por_partido').optional().isInt({ min: 1, max: 20 }).withMessage('Aves por partido: 1-20'),
  body('reglas_navaja').optional().isLength({ max: 500 }).withMessage('Reglas de navaja muy largas'),
  body('contacto_organizador').optional().isLength({ max: 300 }).withMessage('Contacto muy largo'),
  body('hora_peleas').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Hora de peleas inválida (HH:MM)'),
  body('ubicacion').optional().isLength({ max: 500 }).withMessage('Ubicación muy larga')
];

const updateEventoValidation = [
  body('nombre').optional().isLength({ max: 200 }).withMessage('Nombre muy largo'),
  body('descripcion').optional().isLength({ max: 1000 }).withMessage('Descripción muy larga'),
  body('fecha').optional().isDate().withMessage('Fecha inválida'),
  body('hora_inicio').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Hora inválida (HH:MM)'),
  body('lugar').optional().isLength({ max: 200 }).withMessage('Lugar muy largo'),
  body('direccion').optional().isLength({ max: 500 }).withMessage('Dirección muy larga'),
  body('tipo_derby').optional().isLength({ max: 100 }).withMessage('Tipo de derby muy largo'),
  body('reglas').optional().isLength({ max: 2000 }).withMessage('Reglas muy largas'),
  body('total_peleas').optional().isInt({ min: 0 }).withMessage('Total de peleas debe ser un número positivo'),
  body('es_publico').optional().isBoolean().withMessage('es_publico debe ser booleano'),
  body('entrada_costo').optional().isFloat({ min: 0 }).withMessage('Costo de entrada debe ser positivo'),
  body('imagen_url').optional().isLength({ max: 500 }).withMessage('URL de imagen muy larga'),
  body('pesaje_abre').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Hora de pesaje inválida (HH:MM)'),
  body('pesaje_cierra').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Hora de pesaje inválida (HH:MM)'),
  body('programa').optional().isLength({ max: 100 }).withMessage('Programa muy largo'),
  body('costo_inscripcion').optional().isInt({ min: 0 }).withMessage('Costo de inscripción debe ser positivo'),
  body('costo_por_pelea').optional().isInt({ min: 0 }).withMessage('Costo por pelea debe ser positivo'),
  body('premio_campeon').optional().isInt({ min: 0 }).withMessage('Premio debe ser positivo'),
  body('costos_extra').optional().isArray().withMessage('Costos extra debe ser un array'),
  body('aves_por_partido').optional().isInt({ min: 1, max: 20 }).withMessage('Aves por partido: 1-20'),
  body('reglas_navaja').optional().isLength({ max: 500 }).withMessage('Reglas de navaja muy largas'),
  body('contacto_organizador').optional().isLength({ max: 300 }).withMessage('Contacto muy largo'),
  body('hora_peleas').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/).withMessage('Hora de peleas inválida (HH:MM)'),
  body('ubicacion').optional().isLength({ max: 500 }).withMessage('Ubicación muy larga')
];

// ============================================
// PUBLIC ROUTES (no auth required)
// ============================================

/**
 * @route   GET /api/v1/eventos/publicos
 * @desc    List public events
 * @access  Public
 */
router.get('/publicos',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      `SELECT COUNT(*) FROM eventos_palenque
       WHERE es_publico = true AND deleted_at IS NULL AND estado != 'cancelado'`
    );
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await db.query(
      `SELECT e.*,
              u.nombre AS organizador_nombre,
              (SELECT COUNT(*) FROM participantes_evento pe WHERE pe.evento_id = e.id) AS total_participantes
       FROM eventos_palenque e
       JOIN usuarios u ON e.organizador_id = u.id
       WHERE e.es_publico = true AND e.deleted_at IS NULL AND e.estado != 'cancelado'
       ORDER BY e.fecha DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  })
);

/**
 * @route   GET /api/v1/eventos/por-codigo/:codigo
 * @desc    Get event info by access code (public, read-only for visitors)
 * @access  Public
 */
router.get('/por-codigo/:codigo',
  param('codigo').isLength({ min: 4, max: 12 }).withMessage('Código de acceso inválido'),
  validate,
  asyncHandler(async (req, res) => {
    const { codigo } = req.params;

    const { rows } = await db.query(
      `SELECT e.id, e.nombre, e.fecha, e.hora_inicio, e.lugar, e.estado,
              e.total_peleas, e.pelea_actual, e.tipo_derby, e.formato_derby,
              u.nombre AS organizador_nombre
       FROM eventos_palenque e
       JOIN usuarios u ON e.organizador_id = u.id
       WHERE e.codigo_acceso = $1 AND e.deleted_at IS NULL`,
      [codigo.toUpperCase()]
    );

    if (rows.length === 0) {
      throw Errors.notFound('Evento con ese código');
    }

    const evento = rows[0];

    if (evento.estado === 'cancelado') {
      throw Errors.badRequest('Este evento ha sido cancelado');
    }

    res.json({ success: true, data: evento });
  })
);

/**
 * @route   GET /api/v1/eventos/:id/avisos
 * @desc    Public: get announcements for an event
 * @access  Public
 */
router.get('/:id/avisos',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { rows } = await db.query(
      `SELECT id, mensaje, tipo, created_at FROM avisos_evento
       WHERE evento_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ success: true, data: rows });
  })
);

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// All remaining routes require authentication
router.use(authenticateJWT);

// ============================================
// EVENTOS CRUD
// ============================================

/**
 * @route   GET /api/v1/eventos
 * @desc    List events for authenticated user (organizer or participant)
 * @access  Private
 */
router.get('/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('estado').optional().isIn(['programado', 'en_curso', 'finalizado', 'cancelado', 'pausado']),
  validate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, estado } = req.query;
    const offset = (page - 1) * limit;

    const conditions = [
      'e.deleted_at IS NULL',
      '(e.organizador_id = $1 OR pe.usuario_id = $1)'
    ];
    const params = [req.userId];
    let paramIndex = 2;

    if (estado) {
      conditions.push(`e.estado = $${paramIndex++}`);
      params.push(estado);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await db.query(
      `SELECT COUNT(DISTINCT e.id) FROM eventos_palenque e
       LEFT JOIN participantes_evento pe ON pe.evento_id = e.id
       WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const { rows } = await db.query(
      `SELECT DISTINCT e.*,
              u.nombre AS organizador_nombre,
              (SELECT COUNT(*) FROM participantes_evento p2 WHERE p2.evento_id = e.id) AS total_participantes
       FROM eventos_palenque e
       JOIN usuarios u ON e.organizador_id = u.id
       LEFT JOIN participantes_evento pe ON pe.evento_id = e.id
       WHERE ${whereClause}
       ORDER BY e.fecha DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  })
);

/**
 * @route   GET /api/v1/eventos/:id
 * @desc    Get event details with participants count and peleas summary
 * @access  Private
 */
router.get('/:id',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows } = await db.query(
      `SELECT e.*,
              u.nombre AS organizador_nombre,
              u.email AS organizador_email
       FROM eventos_palenque e
       JOIN usuarios u ON e.organizador_id = u.id
       WHERE e.id = $1 AND e.deleted_at IS NULL`,
      [id]
    );

    if (rows.length === 0) {
      throw Errors.notFound('Evento');
    }

    const evento = rows[0];

    // Get participants count by role
    const { rows: participantesCount } = await db.query(
      `SELECT rol, estado, COUNT(*) as cantidad
       FROM participantes_evento
       WHERE evento_id = $1
       GROUP BY rol, estado`,
      [id]
    );

    // Get peleas summary (pelea_actual vs total_peleas)
    const peleasSummary = {
      pelea_actual: evento.pelea_actual,
      total_peleas: evento.total_peleas,
      progreso: evento.total_peleas > 0
        ? Math.round((evento.pelea_actual / evento.total_peleas) * 100)
        : 0
    };

    res.json({
      success: true,
      data: {
        ...evento,
        participantes_resumen: participantesCount,
        peleas_resumen: peleasSummary
      }
    });
  })
);

/**
 * @route   POST /api/v1/eventos
 * @desc    Create event
 * @access  Private
 */
router.post('/',
  eventoValidation,
  validate,
  asyncHandler(async (req, res) => {
    // Verify empresario membership
    const config = await verificarMembresiaEmpresario(req.userId);

    // Check simultaneous active events limit
    if (config.maxEventosSimultaneos !== null) {
      const { rows: [activeCount] } = await db.query(
        `SELECT COUNT(*) FROM eventos_palenque
         WHERE organizador_id = $1
           AND deleted_at IS NULL
           AND estado IN ('programado', 'en_curso')`,
        [req.userId]
      );

      const activeEvents = parseInt(activeCount.count);

      if (activeEvents >= config.maxEventosSimultaneos) {
        // Check if user has extra events available
        const { rows: [userData] } = await db.query(
          'SELECT COALESCE(eventos_extra_disponibles, 0) AS extras FROM usuarios WHERE id = $1',
          [req.userId]
        );

        if (parseInt(userData.extras) > 0) {
          // Consume one extra event credit
          await db.query(
            'UPDATE usuarios SET eventos_extra_disponibles = eventos_extra_disponibles - 1 WHERE id = $1',
            [req.userId]
          );
          logger.info(`User ${req.userId} used an extra event credit. Remaining: ${parseInt(userData.extras) - 1}`);
        } else {
          throw Errors.forbidden(
            `Has alcanzado el limite de ${config.maxEventosSimultaneos} eventos simultaneos activos. ` +
            `Finaliza un evento existente o compra un evento extra ($299 MXN).`
          );
        }
      }
    }

    const {
      nombre, descripcion, fecha, hora_inicio, lugar, direccion, ubicacion,
      tipo_derby, formato_derby, reglas, total_peleas, es_publico, entrada_costo, imagen_url,
      pesaje_abre, pesaje_cierra, programa,
      costo_inscripcion, costo_por_pelea, premio_campeon, costos_extra,
      aves_por_partido, reglas_navaja, contacto_organizador, hora_peleas
    } = req.body;

    // Generate access code
    const { rows: codigoRows } = await db.query('SELECT generar_codigo_acceso()');
    const codigo_acceso = codigoRows[0].generar_codigo_acceso;

    // Create event
    const { rows } = await db.query(
      `INSERT INTO eventos_palenque (
        organizador_id, nombre, descripcion, fecha, hora_inicio, lugar, direccion,
        tipo_derby, formato_derby, reglas, total_peleas, es_publico, entrada_costo, imagen_url,
        pesaje_abre, pesaje_cierra, codigo_acceso, estado,
        costo_inscripcion, costo_por_pelea, premio_campeon, costos_extra,
        aves_por_partido, reglas_navaja, contacto_organizador, hora_peleas
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'programado',
        $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *`,
      [
        req.userId, nombre, descripcion || null, fecha, hora_inicio || null,
        lugar || null, ubicacion || direccion || null, tipo_derby || programa || null,
        formato_derby || 'normal', reglas || null,
        total_peleas || 0, es_publico || false, entrada_costo || null,
        imagen_url || null, pesaje_abre || null, pesaje_cierra || null, codigo_acceso,
        costo_inscripcion || 0, costo_por_pelea || 0, premio_campeon || 0,
        costos_extra ? JSON.stringify(costos_extra) : '[]',
        aves_por_partido || 3, reglas_navaja || null, contacto_organizador || null, hora_peleas || null
      ]
    );

    const evento = rows[0];

    // Insert creator as participant with rol='organizador'
    await db.query(
      `INSERT INTO participantes_evento (evento_id, usuario_id, rol, estado)
       VALUES ($1, $2, 'organizador', 'confirmado')`,
      [evento.id, req.userId]
    );

    logger.info(`Evento created: ${evento.id} by user ${req.userId}`);

    res.status(201).json({
      success: true,
      data: evento
    });
  })
);

/**
 * @route   PUT /api/v1/eventos/:id
 * @desc    Update event (only organizador)
 * @access  Private
 */
router.put('/:id',
  uuidParam('id'),
  updateEventoValidation,
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verify ownership
    const { rows: existing } = await db.query(
      'SELECT id FROM eventos_palenque WHERE id = $1 AND organizador_id = $2 AND deleted_at IS NULL',
      [id, req.userId]
    );

    if (existing.length === 0) {
      throw Errors.notFound('Evento');
    }

    const allowedFields = [
      'nombre', 'descripcion', 'fecha', 'hora_inicio', 'lugar', 'direccion',
      'tipo_derby', 'reglas', 'total_peleas', 'es_publico', 'entrada_costo', 'imagen_url',
      'pesaje_abre', 'pesaje_cierra', 'programa', 'formato_derby',
      'costo_inscripcion', 'costo_por_pelea', 'premio_campeon', 'costos_extra',
      'aves_por_partido', 'reglas_navaja', 'contacto_organizador', 'hora_peleas', 'ubicacion'
    ];

    const updates = [];
    const params = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      throw Errors.badRequest('No hay campos para actualizar');
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await db.query(
      `UPDATE eventos_palenque SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    logger.info(`Evento updated: ${id} by user ${req.userId}`);

    res.json({
      success: true,
      data: rows[0]
    });
  })
);

/**
 * @route   DELETE /api/v1/eventos/:id
 * @desc    Soft delete event (only organizador)
 * @access  Private
 */
router.delete('/:id',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows } = await db.query(
      'UPDATE eventos_palenque SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND organizador_id = $2 AND deleted_at IS NULL RETURNING id',
      [id, req.userId]
    );

    if (rows.length === 0) {
      throw Errors.notFound('Evento');
    }

    logger.info(`Evento soft-deleted: ${id} by user ${req.userId}`);

    res.json({
      success: true,
      message: 'Evento eliminado correctamente'
    });
  })
);

// ============================================
// EVENT FLOW CONTROL
// ============================================

/**
 * @route   POST /api/v1/eventos/:id/iniciar
 * @desc    Start event (estado='en_curso', pelea_actual=1)
 * @access  Private (organizador only)
 */
router.post('/:id/iniciar',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT id, estado, total_peleas FROM eventos_palenque
       WHERE id = $1 AND organizador_id = $2 AND deleted_at IS NULL`,
      [id, req.userId]
    );

    if (existing.length === 0) {
      throw Errors.notFound('Evento');
    }

    if (existing[0].estado !== 'programado') {
      throw Errors.badRequest('Solo se puede iniciar un evento programado');
    }

    const { rows } = await db.query(
      `UPDATE eventos_palenque SET estado = 'en_curso', pelea_actual = 1, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    logger.info(`Evento started: ${id} by user ${req.userId}`);

    res.json({
      success: true,
      data: rows[0]
    });
  })
);

/**
 * @route   POST /api/v1/eventos/:id/siguiente-pelea
 * @desc    Advance pelea_actual. If > total_peleas, finalize event.
 * @access  Private (organizador only)
 */
router.post('/:id/siguiente-pelea',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT id, estado, pelea_actual, total_peleas FROM eventos_palenque
       WHERE id = $1 AND organizador_id = $2 AND deleted_at IS NULL`,
      [id, req.userId]
    );

    if (existing.length === 0) {
      throw Errors.notFound('Evento');
    }

    if (existing[0].estado !== 'en_curso') {
      throw Errors.badRequest('El evento debe estar en curso');
    }

    // Check current fight has a result before advancing
    const { rows: peleaActual } = await db.query(
      `SELECT id, estado, resultado FROM peleas
       WHERE evento_id = $1 AND numero_pelea = $2`,
      [id, existing[0].pelea_actual]
    );

    if (peleaActual.length > 0) {
      const pelea = peleaActual[0];
      if (pelea.estado === 'en_curso') {
        throw Errors.badRequest('La pelea actual está en curso. Registra el resultado antes de avanzar.');
      }
      if (pelea.estado === 'programada') {
        throw Errors.badRequest('La pelea actual no se ha iniciado. Inicia la pelea o regístrala antes de avanzar.');
      }
    }

    const nuevaPelea = existing[0].pelea_actual + 1;

    // Check if there are more fights
    const { rows: siguientes } = await db.query(
      `SELECT id FROM peleas WHERE evento_id = $1 AND numero_pelea = $2`,
      [id, nuevaPelea]
    );

    if (siguientes.length === 0) {
      throw Errors.badRequest('No hay más peleas programadas. Genera un nuevo sorteo o finaliza el evento manualmente.');
    }

    const { rows } = await db.query(
      `UPDATE eventos_palenque SET pelea_actual = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [nuevaPelea, id]
    );

    logger.info(`Evento next fight: ${id} -> pelea ${nuevaPelea}`);

    res.json({
      success: true,
      data: rows[0]
    });
  })
);

/**
 * @route   POST /api/v1/eventos/:id/finalizar
 * @desc    End event
 * @access  Private (organizador only)
 */
router.post('/:id/finalizar',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT id, estado FROM eventos_palenque
       WHERE id = $1 AND organizador_id = $2 AND deleted_at IS NULL`,
      [id, req.userId]
    );

    if (existing.length === 0) {
      throw Errors.notFound('Evento');
    }

    if (!['en_curso', 'pausado'].includes(existing[0].estado)) {
      throw Errors.badRequest('Solo se puede finalizar un evento en curso o pausado');
    }

    // Verify no pending fights
    const { rows: pendientes } = await db.query(
      `SELECT COUNT(*) AS cnt FROM peleas
       WHERE evento_id = $1 AND estado IN ('programada', 'en_curso')`,
      [id]
    );
    if (parseInt(pendientes[0].cnt) > 0) {
      throw Errors.badRequest(`No se puede finalizar: hay ${pendientes[0].cnt} pelea(s) sin resultado.`);
    }

    const { rows } = await db.query(
      `UPDATE eventos_palenque SET estado = 'finalizado', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    logger.info(`Evento finalized: ${id} by user ${req.userId}`);

    res.json({
      success: true,
      data: rows[0]
    });
  })
);

/**
 * @route   POST /api/v1/eventos/:id/pausar
 * @desc    Toggle pause on event
 * @access  Private (organizador only)
 */
router.post('/:id/pausar',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT id, estado FROM eventos_palenque
       WHERE id = $1 AND organizador_id = $2 AND deleted_at IS NULL`,
      [id, req.userId]
    );

    if (existing.length === 0) {
      throw Errors.notFound('Evento');
    }

    let nuevoEstado;
    if (existing[0].estado === 'en_curso') {
      nuevoEstado = 'pausado';
    } else if (existing[0].estado === 'pausado') {
      nuevoEstado = 'en_curso';
    } else {
      throw Errors.badRequest('Solo se puede pausar/reanudar un evento en curso o pausado');
    }

    const { rows } = await db.query(
      `UPDATE eventos_palenque SET estado = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [nuevoEstado, id]
    );

    logger.info(`Evento ${nuevoEstado}: ${id} by user ${req.userId}`);

    res.json({
      success: true,
      data: rows[0],
      message: nuevoEstado === 'pausado' ? 'Evento pausado' : 'Evento reanudado'
    });
  })
);

// ============================================
// PARTICIPANTES
// ============================================

/**
 * @route   POST /api/v1/eventos/unirse
 * @desc    Join event by codigo_acceso
 * @access  Private
 */
router.post('/unirse',
  body('codigo').notEmpty().isLength({ min: 8, max: 8 }).withMessage('Código de acceso requerido (8 caracteres)'),
  body('rol').optional().isIn(['juez', 'partido', 'espectador']).withMessage('Rol inválido'),
  validate,
  asyncHandler(async (req, res) => {
    const { codigo, rol = 'espectador' } = req.body;

    // Find event by access code
    const { rows: eventos } = await db.query(
      `SELECT id, nombre, estado FROM eventos_palenque
       WHERE codigo_acceso = $1 AND deleted_at IS NULL`,
      [codigo]
    );

    if (eventos.length === 0) {
      throw Errors.notFound('Evento con ese código');
    }

    const evento = eventos[0];

    if (evento.estado === 'cancelado') {
      throw Errors.badRequest('Este evento ha sido cancelado');
    }

    // Check if already a participant
    const { rows: existingParticipant } = await db.query(
      'SELECT id FROM participantes_evento WHERE evento_id = $1 AND usuario_id = $2',
      [evento.id, req.userId]
    );

    if (existingParticipant.length > 0) {
      throw Errors.conflict('Ya eres participante de este evento');
    }

    const { rows } = await db.query(
      `INSERT INTO participantes_evento (evento_id, usuario_id, rol, estado)
       VALUES ($1, $2, $3, 'pendiente')
       RETURNING *`,
      [evento.id, req.userId, rol]
    );

    logger.info(`User ${req.userId} joined evento ${evento.id} as ${rol}`);

    res.status(201).json({
      success: true,
      data: {
        participante: rows[0],
        evento: {
          id: evento.id,
          nombre: evento.nombre,
          estado: evento.estado
        }
      }
    });
  })
);

/**
 * @route   GET /api/v1/eventos/:id/participantes
 * @desc    List participants with user info
 * @access  Private
 */
router.get('/:id/participantes',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verify event exists
    const { rows: evento } = await db.query(
      'SELECT id FROM eventos_palenque WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (evento.length === 0) {
      throw Errors.notFound('Evento');
    }

    const { rows } = await db.query(
      `SELECT pe.id, pe.evento_id, pe.usuario_id, pe.rol, pe.estado,
              pe.numero_partido, pe.created_at,
              u.nombre, u.email
       FROM participantes_evento pe
       JOIN usuarios u ON pe.usuario_id = u.id
       WHERE pe.evento_id = $1
       ORDER BY pe.rol, pe.created_at`,
      [id]
    );

    res.json({
      success: true,
      data: rows
    });
  })
);

/**
 * @route   PUT /api/v1/eventos/:id/participantes/:participanteId
 * @desc    Update participant (only organizador)
 * @access  Private
 */
router.put('/:id/participantes/:participanteId',
  uuidParam('id'),
  uuidParam('participanteId'),
  body('estado').optional().isIn(['pendiente', 'confirmado', 'rechazado']).withMessage('Estado inválido'),
  body('rol').optional().isIn(['organizador', 'juez', 'partido', 'espectador']).withMessage('Rol inválido'),
  body('numero_partido').optional().isInt({ min: 1 }).withMessage('Número de partido debe ser positivo'),
  validate,
  asyncHandler(async (req, res) => {
    const { id, participanteId } = req.params;

    // Verify user is organizador of this event
    const { rows: evento } = await db.query(
      'SELECT id FROM eventos_palenque WHERE id = $1 AND organizador_id = $2 AND deleted_at IS NULL',
      [id, req.userId]
    );

    if (evento.length === 0) {
      throw Errors.notFound('Evento');
    }

    const allowedFields = ['estado', 'rol', 'numero_partido'];
    const updates = [];
    const params = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        params.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      throw Errors.badRequest('No hay campos para actualizar');
    }

    params.push(participanteId);
    params.push(id);

    const { rows } = await db.query(
      `UPDATE participantes_evento SET ${updates.join(', ')}
       WHERE id = $${paramIndex++} AND evento_id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (rows.length === 0) {
      throw Errors.notFound('Participante');
    }

    logger.info(`Participante ${participanteId} updated in evento ${id} by user ${req.userId}`);

    res.json({
      success: true,
      data: rows[0]
    });
  })
);

// ============================================
// AVISOS (Announcements)
// ============================================

/**
 * @route   POST /api/v1/eventos/:id/avisos
 * @desc    Send announcement to everyone in the event
 * @access  Private (organizer only)
 */
router.post('/:id/avisos',
  uuidParam('id'),
  body('mensaje').notEmpty().isLength({ max: 500 }).withMessage('Mensaje requerido (max 500 caracteres)'),
  body('tipo').optional().isIn(['general', 'urgente', 'info']).withMessage('Tipo invalido'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Verify organizer
    const { rows: ev } = await db.query(
      `SELECT organizador_id FROM eventos_palenque WHERE id = $1 AND deleted_at IS NULL`, [id]
    );
    if (ev.length === 0) throw Errors.notFound('Evento');
    if (ev[0].organizador_id !== req.userId) throw Errors.forbidden('Solo el organizador puede enviar avisos');

    const { mensaje, tipo } = req.body;

    const { rows } = await db.query(
      `INSERT INTO avisos_evento (evento_id, mensaje, tipo) VALUES ($1, $2, $3) RETURNING *`,
      [id, mensaje, tipo || 'general']
    );

    res.status(201).json({ success: true, data: rows[0] });
  })
);

/**
 * @route   DELETE /api/v1/eventos/:id/avisos/:avisoId
 * @desc    Delete an announcement
 * @access  Private (organizer only)
 */
router.delete('/:id/avisos/:avisoId',
  uuidParam('id'),
  uuidParam('avisoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { id, avisoId } = req.params;

    const { rows: ev } = await db.query(
      `SELECT organizador_id FROM eventos_palenque WHERE id = $1 AND deleted_at IS NULL`, [id]
    );
    if (ev.length === 0) throw Errors.notFound('Evento');
    if (ev[0].organizador_id !== req.userId) throw Errors.forbidden('Solo el organizador');

    await db.query(`DELETE FROM avisos_evento WHERE id = $1 AND evento_id = $2`, [avisoId, id]);
    res.json({ success: true, data: { message: 'Aviso eliminado' } });
  })
);

module.exports = router;
