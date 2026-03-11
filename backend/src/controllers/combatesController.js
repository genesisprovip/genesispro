/**
 * Combates (Fights) Controller
 */

const db = require('../config/database');
const { Errors } = require('../middleware/errorHandler');
const logger = require('../config/logger');

/**
 * List all combates for current user (paginated)
 * GET /api/v1/combates
 */
const list = async (req, res) => {
  const {
    page = 1,
    limit = 20,
    resultado,
    tipo_combate,
    ave_id,
    fecha_desde,
    fecha_hasta,
    sort_by = 'fecha_combate',
    sort_order = 'desc'
  } = req.query;

  const offset = (page - 1) * limit;

  const conditions = [
    'a.usuario_id = $1',
    'c.deleted_at IS NULL',
    'a.deleted_at IS NULL'
  ];
  const params = [req.userId];
  let paramIndex = 2;

  if (resultado) {
    conditions.push(`c.resultado = $${paramIndex++}`);
    params.push(resultado);
  }

  if (tipo_combate) {
    conditions.push(`c.tipo_combate = $${paramIndex++}`);
    params.push(tipo_combate);
  }

  if (ave_id) {
    conditions.push(`c.macho_id = $${paramIndex++}`);
    params.push(ave_id);
  }

  if (fecha_desde) {
    conditions.push(`c.fecha_combate >= $${paramIndex++}`);
    params.push(fecha_desde);
  }

  if (fecha_hasta) {
    conditions.push(`c.fecha_combate <= $${paramIndex++}`);
    params.push(fecha_hasta);
  }

  const whereClause = conditions.join(' AND ');

  // Validate sort column
  const allowedSortColumns = ['fecha_combate', 'resultado', 'duracion_minutos', 'created_at'];
  const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'fecha_combate';
  const sortDir = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*)
     FROM combates c
     JOIN aves a ON c.macho_id = a.id
     WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get combates with pagination
  const { rows } = await db.query(
    `SELECT
      c.id, c.fecha_combate, c.ubicacion, c.resultado,
      c.duracion_minutos, c.peso_combate, c.tipo_combate,
      c.oponente_codigo, c.oponente_linea, c.lesiones,
      c.notas, c.created_at,
      a.id as ave_id, a.codigo_identidad, a.linea_genetica, a.color
    FROM combates c
    JOIN aves a ON c.macho_id = a.id
    WHERE ${whereClause}
    ORDER BY c.${sortColumn} ${sortDir}
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
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  });
};

/**
 * Get single combate by ID
 * GET /api/v1/combates/:id
 */
const getById = async (req, res) => {
  const { id } = req.params;

  const { rows } = await db.query(
    `SELECT
      c.*,
      a.codigo_identidad, a.linea_genetica, a.color,
      a.usuario_id
    FROM combates c
    JOIN aves a ON c.macho_id = a.id
    WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [id]
  );

  if (rows.length === 0) {
    throw Errors.notFound('Combate');
  }

  const combate = rows[0];

  // Verify ownership
  if (combate.usuario_id !== req.userId) {
    throw Errors.forbidden('No tienes permiso para ver este combate');
  }

  // Get medios (photos/videos)
  const { rows: medios } = await db.query(
    `SELECT id, tipo, ruta_archivo, ruta_thumbnail, duracion_segundos, created_at
     FROM combate_medios
     WHERE combate_id = $1
     ORDER BY created_at`,
    [id]
  );

  // Get lesiones associated with this combat
  const { rows: lesiones } = await db.query(
    `SELECT id, tipo_lesion, zona_afectada, gravedad, fecha_lesion,
            tratamiento, fecha_recuperacion, dias_recuperacion, costo_tratamiento
     FROM lesiones
     WHERE combate_id = $1
     ORDER BY fecha_lesion`,
    [id]
  );

  res.json({
    success: true,
    data: {
      ...combate,
      ave: {
        id: combate.macho_id,
        codigo_identidad: combate.codigo_identidad,
        linea_genetica: combate.linea_genetica,
        color: combate.color
      },
      medios,
      lesiones
    }
  });
};

/**
 * Get combates for specific ave
 * GET /api/v1/combates/ave/:aveId
 */
const getByAve = async (req, res) => {
  const { aveId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, sexo, codigo_identidad FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [aveId, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  if (ave[0].sexo !== 'M') {
    throw Errors.badRequest('Solo los machos tienen registro de combates');
  }

  // Get count
  const countResult = await db.query(
    'SELECT COUNT(*) FROM combates WHERE macho_id = $1 AND deleted_at IS NULL',
    [aveId]
  );
  const total = parseInt(countResult.rows[0].count);

  // Get combates
  const { rows } = await db.query(
    `SELECT
      id, fecha_combate, ubicacion, resultado, duracion_minutos,
      peso_combate, tipo_combate, oponente_codigo, oponente_linea,
      lesiones, notas, created_at
    FROM combates
    WHERE macho_id = $1 AND deleted_at IS NULL
    ORDER BY fecha_combate DESC
    LIMIT $2 OFFSET $3`,
    [aveId, limit, offset]
  );

  res.json({
    success: true,
    data: {
      ave: ave[0],
      combates: rows
    },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
};

/**
 * Get combat statistics for an ave
 * GET /api/v1/combates/ave/:aveId/stats
 */
const getStatsByAve = async (req, res) => {
  const { aveId } = req.params;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, sexo, codigo_identidad, linea_genetica FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [aveId, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  if (ave[0].sexo !== 'M') {
    throw Errors.badRequest('Solo los machos tienen estadísticas de combate');
  }

  // Get stats using the database function
  const { rows } = await db.query(
    'SELECT * FROM estadisticas_combates($1)',
    [aveId]
  );

  const stats = rows[0] || {
    total_combates: 0,
    victorias: 0,
    empates: 0,
    derrotas: 0,
    porcentaje_victorias: 0,
    porcentaje_empates: 0,
    porcentaje_derrotas: 0,
    duracion_promedio: null,
    duracion_minima: null,
    duracion_maxima: null,
    racha_actual: 0,
    racha_actual_tipo: null,
    mejor_racha_victorias: 0,
    ultimo_combate: null
  };

  res.json({
    success: true,
    data: {
      ave: ave[0],
      estadisticas: stats
    }
  });
};

/**
 * Get ranking of fighters
 * GET /api/v1/combates/ranking
 */
const getRanking = async (req, res) => {
  const { limit = 10 } = req.query;

  const { rows } = await db.query(
    'SELECT * FROM ranking_peleadores($1, $2)',
    [req.userId, Math.min(parseInt(limit), 50)]
  );

  res.json({
    success: true,
    data: rows
  });
};

/**
 * Get global statistics
 * GET /api/v1/combates/stats
 */
const getGlobalStats = async (req, res) => {
  const { fecha_desde, fecha_hasta } = req.query;

  let dateCondition = '';
  const params = [req.userId];
  let paramIndex = 2;

  if (fecha_desde) {
    dateCondition += ` AND c.fecha_combate >= $${paramIndex++}`;
    params.push(fecha_desde);
  }

  if (fecha_hasta) {
    dateCondition += ` AND c.fecha_combate <= $${paramIndex++}`;
    params.push(fecha_hasta);
  }

  const { rows } = await db.query(
    `SELECT
      COUNT(*) as total_combates,
      COUNT(*) FILTER (WHERE c.resultado = 'victoria') as victorias,
      COUNT(*) FILTER (WHERE c.resultado = 'empate') as empates,
      COUNT(*) FILTER (WHERE c.resultado = 'derrota') as derrotas,
      ROUND(
        (COUNT(*) FILTER (WHERE c.resultado = 'victoria')::DECIMAL /
        NULLIF(COUNT(*)::DECIMAL, 0) * 100), 2
      ) as porcentaje_victorias,
      COUNT(DISTINCT c.macho_id) as aves_combatientes,
      ROUND(AVG(c.duracion_minutos)::DECIMAL, 2) as duracion_promedio,
      COUNT(*) FILTER (WHERE c.tipo_combate = 'oficial') as combates_oficiales,
      COUNT(*) FILTER (WHERE c.tipo_combate = 'entrenamiento') as combates_entrenamiento,
      COUNT(*) FILTER (WHERE c.tipo_combate = 'amistoso') as combates_amistosos
    FROM combates c
    JOIN aves a ON c.macho_id = a.id
    WHERE a.usuario_id = $1
      AND c.deleted_at IS NULL
      AND a.deleted_at IS NULL
      ${dateCondition}`,
    params
  );

  // Get monthly stats
  const { rows: mensual } = await db.query(
    `SELECT
      TO_CHAR(c.fecha_combate, 'YYYY-MM') as mes,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE c.resultado = 'victoria') as victorias
    FROM combates c
    JOIN aves a ON c.macho_id = a.id
    WHERE a.usuario_id = $1
      AND c.deleted_at IS NULL
      AND a.deleted_at IS NULL
      AND c.fecha_combate >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY TO_CHAR(c.fecha_combate, 'YYYY-MM')
    ORDER BY mes`,
    [req.userId]
  );

  res.json({
    success: true,
    data: {
      resumen: rows[0],
      historico_mensual: mensual
    }
  });
};

/**
 * Create new combate
 * POST /api/v1/combates
 */
const create = async (req, res) => {
  const {
    macho_id,
    fecha_combate,
    ubicacion,
    resultado,
    duracion_minutos,
    peso_combate,
    oponente_codigo,
    oponente_info,
    oponente_linea,
    tipo_combate = 'oficial',
    lesiones,
    notas
  } = req.body;

  // Verify ownership and that it's a male
  const { rows: ave } = await db.query(
    'SELECT id, sexo, codigo_identidad FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [macho_id, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  if (ave[0].sexo !== 'M') {
    throw Errors.badRequest('Solo los machos pueden tener combates registrados');
  }

  // Create combate
  const { rows } = await db.query(
    `INSERT INTO combates (
      macho_id, fecha_combate, ubicacion, resultado, duracion_minutos,
      peso_combate, oponente_codigo, oponente_info, oponente_linea,
      tipo_combate, lesiones, notas
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      macho_id, fecha_combate, ubicacion || null, resultado,
      duracion_minutos || null, peso_combate || null,
      oponente_codigo || null, oponente_info || null, oponente_linea || null,
      tipo_combate, lesiones || null, notas || null
    ]
  );

  const combate = rows[0];

  // If ave died in combat, update its estado
  const { ave_murio, motivo_baja } = req.body;
  if (ave_murio && resultado === 'derrota') {
    await db.query(
      `UPDATE aves SET estado = 'muerto', motivo_baja = $1, fecha_baja = $2, updated_at = NOW() WHERE id = $3`,
      [motivo_baja || 'Murio en combate', fecha_combate || new Date().toISOString().slice(0, 10), macho_id]
    );
    logger.info(`Ave ${ave[0].codigo_identidad} marked as dead (combat) by user ${req.userId}`);
  }

  logger.info(`Combate created: ${combate.id} for ave ${ave[0].codigo_identidad} by user ${req.userId}`);

  res.status(201).json({
    success: true,
    message: ave_murio ? 'Combate registrado. Ave marcada como fallecida.' : 'Combate registrado exitosamente',
    data: {
      ...combate,
      ave: {
        id: ave[0].id,
        codigo_identidad: ave[0].codigo_identidad
      }
    }
  });
};

/**
 * Update combate
 * PUT /api/v1/combates/:id
 */
const update = async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { rows: existing } = await db.query(
    `SELECT c.id
     FROM combates c
     JOIN aves a ON c.macho_id = a.id
     WHERE c.id = $1 AND a.usuario_id = $2 AND c.deleted_at IS NULL`,
    [id, req.userId]
  );

  if (existing.length === 0) {
    throw Errors.notFound('Combate');
  }

  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'fecha_combate', 'ubicacion', 'resultado', 'duracion_minutos',
    'peso_combate', 'oponente_codigo', 'oponente_info', 'oponente_linea',
    'tipo_combate', 'lesiones', 'notas'
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateFields.push(`${field} = $${paramIndex++}`);
      values.push(req.body[field]);
    }
  }

  if (updateFields.length === 0) {
    throw Errors.badRequest('No hay campos para actualizar');
  }

  values.push(id);

  const { rows } = await db.query(
    `UPDATE combates SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  logger.info(`Combate updated: ${id} by user ${req.userId}`);

  res.json({
    success: true,
    message: 'Combate actualizado',
    data: rows[0]
  });
};

/**
 * Delete combate (soft delete)
 * DELETE /api/v1/combates/:id
 */
const deleteCombate = async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { rows: existing } = await db.query(
    `SELECT c.id
     FROM combates c
     JOIN aves a ON c.macho_id = a.id
     WHERE c.id = $1 AND a.usuario_id = $2 AND c.deleted_at IS NULL`,
    [id, req.userId]
  );

  if (existing.length === 0) {
    throw Errors.notFound('Combate');
  }

  await db.query(
    'UPDATE combates SET deleted_at = NOW() WHERE id = $1',
    [id]
  );

  logger.info(`Combate deleted: ${id} by user ${req.userId}`);

  res.json({
    success: true,
    message: 'Combate eliminado'
  });
};

/**
 * Add lesion to combate
 * POST /api/v1/combates/:id/lesiones
 */
const addLesion = async (req, res) => {
  const { id } = req.params;
  const {
    tipo_lesion,
    zona_afectada,
    gravedad,
    fecha_lesion,
    tratamiento,
    fecha_recuperacion,
    costo_tratamiento,
    secuelas,
    notas
  } = req.body;

  // Verify ownership and get ave_id
  const { rows: combate } = await db.query(
    `SELECT c.id, c.macho_id
     FROM combates c
     JOIN aves a ON c.macho_id = a.id
     WHERE c.id = $1 AND a.usuario_id = $2 AND c.deleted_at IS NULL`,
    [id, req.userId]
  );

  if (combate.length === 0) {
    throw Errors.notFound('Combate');
  }

  const { rows } = await db.query(
    `INSERT INTO lesiones (
      ave_id, combate_id, tipo_lesion, zona_afectada, gravedad,
      fecha_lesion, tratamiento, fecha_recuperacion, costo_tratamiento,
      secuelas, notas
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      combate[0].macho_id, id, tipo_lesion, zona_afectada || null,
      gravedad, fecha_lesion, tratamiento || null,
      fecha_recuperacion || null, costo_tratamiento || null,
      secuelas || null, notas || null
    ]
  );

  logger.info(`Lesion added to combate ${id} by user ${req.userId}`);

  res.status(201).json({
    success: true,
    message: 'Lesión registrada',
    data: rows[0]
  });
};

/**
 * Get lesiones for an ave
 * GET /api/v1/combates/ave/:aveId/lesiones
 */
const getLesionesByAve = async (req, res) => {
  const { aveId } = req.params;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, codigo_identidad FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [aveId, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  const { rows } = await db.query(
    `SELECT
      l.*,
      c.fecha_combate, c.resultado, c.ubicacion as combate_ubicacion
    FROM lesiones l
    LEFT JOIN combates c ON l.combate_id = c.id
    WHERE l.ave_id = $1
    ORDER BY l.fecha_lesion DESC`,
    [aveId]
  );

  // Summary stats
  const { rows: stats } = await db.query(
    `SELECT
      COUNT(*) as total_lesiones,
      COUNT(*) FILTER (WHERE gravedad = 'leve') as leves,
      COUNT(*) FILTER (WHERE gravedad = 'moderada') as moderadas,
      COUNT(*) FILTER (WHERE gravedad = 'grave') as graves,
      ROUND(AVG(dias_recuperacion)::DECIMAL, 1) as promedio_dias_recuperacion,
      SUM(costo_tratamiento) as costo_total
    FROM lesiones
    WHERE ave_id = $1`,
    [aveId]
  );

  res.json({
    success: true,
    data: {
      ave: ave[0],
      lesiones: rows,
      resumen: stats[0]
    }
  });
};

module.exports = {
  list,
  getById,
  getByAve,
  getStatsByAve,
  getRanking,
  getGlobalStats,
  create,
  update,
  delete: deleteCombate,
  addLesion,
  getLesionesByAve
};
