/**
 * Salud (Health) Controller
 * Manages: vacunas, desparasitaciones, tratamientos, consultas veterinarias, lesiones
 */

const db = require('../config/database');
const { Errors } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// ============================================
// ALERTAS DE SALUD
// ============================================

/**
 * Get health alerts for user
 * GET /api/v1/salud/alertas
 */
const getAlertas = async (req, res) => {
  const { dias_anticipacion = 7 } = req.query;

  const { rows } = await db.query(
    'SELECT * FROM alertas_salud($1, $2)',
    [req.userId, parseInt(dias_anticipacion)]
  );

  // Group by priority
  const urgentes = rows.filter(r => r.prioridad === 'urgente');
  const altas = rows.filter(r => r.prioridad === 'alta');
  const normales = rows.filter(r => r.prioridad === 'normal');

  res.json({
    success: true,
    data: {
      alertas: rows,
      resumen: {
        total: rows.length,
        urgentes: urgentes.length,
        altas: altas.length,
        normales: normales.length
      }
    }
  });
};

// ============================================
// VACUNAS
// ============================================

/**
 * List vacunas for user's aves
 * GET /api/v1/salud/vacunas
 */
const listVacunas = async (req, res) => {
  const { page = 1, limit = 20, ave_id, tipo_vacuna, proximas } = req.query;
  const offset = (page - 1) * limit;

  const conditions = ['a.usuario_id = $1', 'a.deleted_at IS NULL'];
  const params = [req.userId];
  let paramIndex = 2;

  if (ave_id) {
    conditions.push(`v.ave_id = $${paramIndex++}`);
    params.push(ave_id);
  }

  if (tipo_vacuna) {
    conditions.push(`v.tipo_vacuna ILIKE $${paramIndex++}`);
    params.push(`%${tipo_vacuna}%`);
  }

  if (proximas === 'true') {
    conditions.push(`v.proxima_dosis IS NOT NULL AND v.proxima_dosis <= CURRENT_DATE + 30`);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await db.query(
    `SELECT COUNT(*) FROM vacunas v
     JOIN aves a ON v.ave_id = a.id
     WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const { rows } = await db.query(
    `SELECT v.*, a.codigo_identidad, a.linea_genetica
     FROM vacunas v
     JOIN aves a ON v.ave_id = a.id
     WHERE ${whereClause}
     ORDER BY v.fecha_aplicacion DESC
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
};

/**
 * Get vacunas for specific ave
 * GET /api/v1/salud/vacunas/ave/:aveId
 */
const getVacunasByAve = async (req, res) => {
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
    `SELECT * FROM vacunas WHERE ave_id = $1 ORDER BY fecha_aplicacion DESC`,
    [aveId]
  );

  // Get upcoming vaccines
  const { rows: proximas } = await db.query(
    `SELECT tipo_vacuna, proxima_dosis,
            (proxima_dosis - CURRENT_DATE) as dias_restantes
     FROM vacunas
     WHERE ave_id = $1 AND proxima_dosis IS NOT NULL AND proxima_dosis >= CURRENT_DATE
     ORDER BY proxima_dosis`,
    [aveId]
  );

  res.json({
    success: true,
    data: {
      ave: ave[0],
      vacunas: rows,
      proximas_vacunas: proximas
    }
  });
};

/**
 * Create vacuna
 * POST /api/v1/salud/vacunas
 */
const createVacuna = async (req, res) => {
  const {
    ave_id,
    tipo_vacuna,
    fecha_aplicacion,
    proxima_dosis,
    veterinario,
    lote_vacuna,
    laboratorio,
    costo,
    notas
  } = req.body;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, codigo_identidad FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [ave_id, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  const { rows } = await db.query(
    `INSERT INTO vacunas (
      ave_id, tipo_vacuna, fecha_aplicacion, proxima_dosis,
      veterinario, lote_vacuna, laboratorio, costo, notas
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      ave_id, tipo_vacuna, fecha_aplicacion, proxima_dosis || null,
      veterinario || null, lote_vacuna || null, laboratorio || null,
      costo || null, notas || null
    ]
  );

  logger.info(`Vacuna created for ave ${ave[0].codigo_identidad} by user ${req.userId}`);

  res.status(201).json({
    success: true,
    message: 'Vacuna registrada exitosamente',
    data: rows[0]
  });
};

/**
 * Update vacuna
 * PUT /api/v1/salud/vacunas/:id
 */
const updateVacuna = async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { rows: existing } = await db.query(
    `SELECT v.id FROM vacunas v
     JOIN aves a ON v.ave_id = a.id
     WHERE v.id = $1 AND a.usuario_id = $2`,
    [id, req.userId]
  );

  if (existing.length === 0) {
    throw Errors.notFound('Vacuna');
  }

  const allowedFields = [
    'tipo_vacuna', 'fecha_aplicacion', 'proxima_dosis', 'veterinario',
    'lote_vacuna', 'laboratorio', 'costo', 'notas'
  ];

  const updateFields = [];
  const values = [];
  let paramIndex = 1;

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
    `UPDATE vacunas SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  res.json({
    success: true,
    message: 'Vacuna actualizada',
    data: rows[0]
  });
};

/**
 * Delete vacuna
 * DELETE /api/v1/salud/vacunas/:id
 */
const deleteVacuna = async (req, res) => {
  const { id } = req.params;

  const { rowCount } = await db.query(
    `DELETE FROM vacunas v
     USING aves a
     WHERE v.id = $1 AND v.ave_id = a.id AND a.usuario_id = $2`,
    [id, req.userId]
  );

  if (rowCount === 0) {
    throw Errors.notFound('Vacuna');
  }

  res.json({
    success: true,
    message: 'Vacuna eliminada'
  });
};

// ============================================
// DESPARASITACIONES
// ============================================

/**
 * List desparasitaciones
 * GET /api/v1/salud/desparasitaciones
 */
const listDesparasitaciones = async (req, res) => {
  const { page = 1, limit = 20, ave_id, proximas } = req.query;
  const offset = (page - 1) * limit;

  const conditions = ['a.usuario_id = $1', 'a.deleted_at IS NULL'];
  const params = [req.userId];
  let paramIndex = 2;

  if (ave_id) {
    conditions.push(`d.ave_id = $${paramIndex++}`);
    params.push(ave_id);
  }

  if (proximas === 'true') {
    conditions.push(`d.proxima_aplicacion IS NOT NULL AND d.proxima_aplicacion <= CURRENT_DATE + 30`);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await db.query(
    `SELECT COUNT(*) FROM desparasitaciones d
     JOIN aves a ON d.ave_id = a.id
     WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const { rows } = await db.query(
    `SELECT d.*, a.codigo_identidad, a.linea_genetica
     FROM desparasitaciones d
     JOIN aves a ON d.ave_id = a.id
     WHERE ${whereClause}
     ORDER BY d.fecha_aplicacion DESC
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
};

/**
 * Get desparasitaciones for specific ave
 * GET /api/v1/salud/desparasitaciones/ave/:aveId
 */
const getDesparasitacionesByAve = async (req, res) => {
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
    `SELECT * FROM desparasitaciones WHERE ave_id = $1 ORDER BY fecha_aplicacion DESC`,
    [aveId]
  );

  res.json({
    success: true,
    data: {
      ave: ave[0],
      desparasitaciones: rows
    }
  });
};

/**
 * Create desparasitacion
 * POST /api/v1/salud/desparasitaciones
 */
const createDesparasitacion = async (req, res) => {
  const {
    ave_id,
    producto,
    principio_activo,
    fecha_aplicacion,
    proxima_aplicacion,
    dosis,
    via_administracion,
    costo,
    notas
  } = req.body;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, codigo_identidad FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [ave_id, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  const { rows } = await db.query(
    `INSERT INTO desparasitaciones (
      ave_id, producto, principio_activo, fecha_aplicacion,
      proxima_aplicacion, dosis, via_administracion, costo, notas
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      ave_id, producto, principio_activo || null, fecha_aplicacion,
      proxima_aplicacion || null, dosis || null, via_administracion || null,
      costo || null, notas || null
    ]
  );

  logger.info(`Desparasitacion created for ave ${ave[0].codigo_identidad} by user ${req.userId}`);

  res.status(201).json({
    success: true,
    message: 'Desparasitación registrada exitosamente',
    data: rows[0]
  });
};

/**
 * Update desparasitacion
 * PUT /api/v1/salud/desparasitaciones/:id
 */
const updateDesparasitacion = async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { rows: existing } = await db.query(
    `SELECT d.id FROM desparasitaciones d
     JOIN aves a ON d.ave_id = a.id
     WHERE d.id = $1 AND a.usuario_id = $2`,
    [id, req.userId]
  );

  if (existing.length === 0) {
    throw Errors.notFound('Desparasitación');
  }

  const allowedFields = [
    'producto', 'principio_activo', 'fecha_aplicacion', 'proxima_aplicacion',
    'dosis', 'via_administracion', 'costo', 'notas'
  ];

  const updateFields = [];
  const values = [];
  let paramIndex = 1;

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
    `UPDATE desparasitaciones SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  res.json({
    success: true,
    message: 'Desparasitación actualizada',
    data: rows[0]
  });
};

/**
 * Delete desparasitacion
 * DELETE /api/v1/salud/desparasitaciones/:id
 */
const deleteDesparasitacion = async (req, res) => {
  const { id } = req.params;

  const { rowCount } = await db.query(
    `DELETE FROM desparasitaciones d
     USING aves a
     WHERE d.id = $1 AND d.ave_id = a.id AND a.usuario_id = $2`,
    [id, req.userId]
  );

  if (rowCount === 0) {
    throw Errors.notFound('Desparasitación');
  }

  res.json({
    success: true,
    message: 'Desparasitación eliminada'
  });
};

// ============================================
// TRATAMIENTOS
// ============================================

/**
 * List tratamientos
 * GET /api/v1/salud/tratamientos
 */
const listTratamientos = async (req, res) => {
  const { page = 1, limit = 20, ave_id, estado } = req.query;
  const offset = (page - 1) * limit;

  const conditions = ['a.usuario_id = $1', 'a.deleted_at IS NULL'];
  const params = [req.userId];
  let paramIndex = 2;

  if (ave_id) {
    conditions.push(`t.ave_id = $${paramIndex++}`);
    params.push(ave_id);
  }

  if (estado) {
    conditions.push(`t.estado = $${paramIndex++}`);
    params.push(estado);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await db.query(
    `SELECT COUNT(*) FROM tratamientos t
     JOIN aves a ON t.ave_id = a.id
     WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const { rows } = await db.query(
    `SELECT t.*, a.codigo_identidad, a.linea_genetica
     FROM tratamientos t
     JOIN aves a ON t.ave_id = a.id
     WHERE ${whereClause}
     ORDER BY t.fecha_inicio DESC
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
};

/**
 * Get tratamientos for specific ave
 * GET /api/v1/salud/tratamientos/ave/:aveId
 */
const getTratamientosByAve = async (req, res) => {
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
    `SELECT * FROM tratamientos WHERE ave_id = $1 ORDER BY fecha_inicio DESC`,
    [aveId]
  );

  // Separate by status
  const en_curso = rows.filter(t => t.estado === 'en_curso');
  const completados = rows.filter(t => t.estado === 'completado');

  res.json({
    success: true,
    data: {
      ave: ave[0],
      tratamientos: rows,
      en_curso,
      completados
    }
  });
};

/**
 * Get single tratamiento
 * GET /api/v1/salud/tratamientos/:id
 */
const getTratamientoById = async (req, res) => {
  const { id } = req.params;

  const { rows } = await db.query(
    `SELECT t.*, a.codigo_identidad, a.linea_genetica
     FROM tratamientos t
     JOIN aves a ON t.ave_id = a.id
     WHERE t.id = $1 AND a.usuario_id = $2`,
    [id, req.userId]
  );

  if (rows.length === 0) {
    throw Errors.notFound('Tratamiento');
  }

  res.json({
    success: true,
    data: rows[0]
  });
};

/**
 * Create tratamiento
 * POST /api/v1/salud/tratamientos
 */
const createTratamiento = async (req, res) => {
  const {
    ave_id,
    diagnostico,
    fecha_inicio,
    fecha_fin,
    veterinario,
    medicamentos,
    costo_total,
    estado = 'en_curso',
    notas
  } = req.body;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, codigo_identidad FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [ave_id, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  const { rows } = await db.query(
    `INSERT INTO tratamientos (
      ave_id, diagnostico, fecha_inicio, fecha_fin,
      veterinario, medicamentos, costo_total, estado, notas
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      ave_id, diagnostico, fecha_inicio, fecha_fin || null,
      veterinario || null, medicamentos ? JSON.stringify(medicamentos) : null,
      costo_total || null, estado, notas || null
    ]
  );

  logger.info(`Tratamiento created for ave ${ave[0].codigo_identidad} by user ${req.userId}`);

  res.status(201).json({
    success: true,
    message: 'Tratamiento registrado exitosamente',
    data: rows[0]
  });
};

/**
 * Update tratamiento
 * PUT /api/v1/salud/tratamientos/:id
 */
const updateTratamiento = async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { rows: existing } = await db.query(
    `SELECT t.id FROM tratamientos t
     JOIN aves a ON t.ave_id = a.id
     WHERE t.id = $1 AND a.usuario_id = $2`,
    [id, req.userId]
  );

  if (existing.length === 0) {
    throw Errors.notFound('Tratamiento');
  }

  const allowedFields = [
    'diagnostico', 'fecha_inicio', 'fecha_fin', 'veterinario',
    'medicamentos', 'costo_total', 'estado', 'notas'
  ];

  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateFields.push(`${field} = $${paramIndex++}`);
      if (field === 'medicamentos') {
        values.push(JSON.stringify(req.body[field]));
      } else {
        values.push(req.body[field]);
      }
    }
  }

  if (updateFields.length === 0) {
    throw Errors.badRequest('No hay campos para actualizar');
  }

  values.push(id);

  const { rows } = await db.query(
    `UPDATE tratamientos SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  res.json({
    success: true,
    message: 'Tratamiento actualizado',
    data: rows[0]
  });
};

/**
 * Delete tratamiento
 * DELETE /api/v1/salud/tratamientos/:id
 */
const deleteTratamiento = async (req, res) => {
  const { id } = req.params;

  const { rowCount } = await db.query(
    `DELETE FROM tratamientos t
     USING aves a
     WHERE t.id = $1 AND t.ave_id = a.id AND a.usuario_id = $2`,
    [id, req.userId]
  );

  if (rowCount === 0) {
    throw Errors.notFound('Tratamiento');
  }

  res.json({
    success: true,
    message: 'Tratamiento eliminado'
  });
};

// ============================================
// CONSULTAS VETERINARIAS
// ============================================

/**
 * List consultas veterinarias
 * GET /api/v1/salud/consultas
 */
const listConsultas = async (req, res) => {
  const { page = 1, limit = 20, ave_id } = req.query;
  const offset = (page - 1) * limit;

  const conditions = ['a.usuario_id = $1', 'a.deleted_at IS NULL'];
  const params = [req.userId];
  let paramIndex = 2;

  if (ave_id) {
    conditions.push(`c.ave_id = $${paramIndex++}`);
    params.push(ave_id);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await db.query(
    `SELECT COUNT(*) FROM consultas_veterinarias c
     JOIN aves a ON c.ave_id = a.id
     WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const { rows } = await db.query(
    `SELECT c.*, a.codigo_identidad, a.linea_genetica
     FROM consultas_veterinarias c
     JOIN aves a ON c.ave_id = a.id
     WHERE ${whereClause}
     ORDER BY c.fecha_consulta DESC
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
};

/**
 * Get consultas for specific ave
 * GET /api/v1/salud/consultas/ave/:aveId
 */
const getConsultasByAve = async (req, res) => {
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
    `SELECT * FROM consultas_veterinarias WHERE ave_id = $1 ORDER BY fecha_consulta DESC`,
    [aveId]
  );

  res.json({
    success: true,
    data: {
      ave: ave[0],
      consultas: rows
    }
  });
};

/**
 * Create consulta veterinaria
 * POST /api/v1/salud/consultas
 */
const createConsulta = async (req, res) => {
  const {
    ave_id,
    fecha_consulta,
    veterinario,
    clinica,
    motivo,
    diagnostico,
    tratamiento_recomendado,
    costo,
    proxima_consulta,
    documentos
  } = req.body;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, codigo_identidad FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [ave_id, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  const { rows } = await db.query(
    `INSERT INTO consultas_veterinarias (
      ave_id, fecha_consulta, veterinario, clinica, motivo,
      diagnostico, tratamiento_recomendado, costo, proxima_consulta, documentos
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      ave_id, fecha_consulta, veterinario || null, clinica || null, motivo,
      diagnostico || null, tratamiento_recomendado || null, costo || null,
      proxima_consulta || null, documentos ? JSON.stringify(documentos) : null
    ]
  );

  logger.info(`Consulta veterinaria created for ave ${ave[0].codigo_identidad} by user ${req.userId}`);

  res.status(201).json({
    success: true,
    message: 'Consulta veterinaria registrada exitosamente',
    data: rows[0]
  });
};

/**
 * Update consulta veterinaria
 * PUT /api/v1/salud/consultas/:id
 */
const updateConsulta = async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { rows: existing } = await db.query(
    `SELECT c.id FROM consultas_veterinarias c
     JOIN aves a ON c.ave_id = a.id
     WHERE c.id = $1 AND a.usuario_id = $2`,
    [id, req.userId]
  );

  if (existing.length === 0) {
    throw Errors.notFound('Consulta veterinaria');
  }

  const allowedFields = [
    'fecha_consulta', 'veterinario', 'clinica', 'motivo',
    'diagnostico', 'tratamiento_recomendado', 'costo', 'proxima_consulta', 'documentos'
  ];

  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateFields.push(`${field} = $${paramIndex++}`);
      if (field === 'documentos') {
        values.push(JSON.stringify(req.body[field]));
      } else {
        values.push(req.body[field]);
      }
    }
  }

  if (updateFields.length === 0) {
    throw Errors.badRequest('No hay campos para actualizar');
  }

  values.push(id);

  const { rows } = await db.query(
    `UPDATE consultas_veterinarias SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  res.json({
    success: true,
    message: 'Consulta actualizada',
    data: rows[0]
  });
};

/**
 * Delete consulta veterinaria
 * DELETE /api/v1/salud/consultas/:id
 */
const deleteConsulta = async (req, res) => {
  const { id } = req.params;

  const { rowCount } = await db.query(
    `DELETE FROM consultas_veterinarias c
     USING aves a
     WHERE c.id = $1 AND c.ave_id = a.id AND a.usuario_id = $2`,
    [id, req.userId]
  );

  if (rowCount === 0) {
    throw Errors.notFound('Consulta veterinaria');
  }

  res.json({
    success: true,
    message: 'Consulta eliminada'
  });
};

// ============================================
// LESIONES (complemento al módulo combates)
// ============================================

/**
 * List all lesiones for user
 * GET /api/v1/salud/lesiones
 */
const listLesiones = async (req, res) => {
  const { page = 1, limit = 20, ave_id, gravedad, sin_recuperar } = req.query;
  const offset = (page - 1) * limit;

  const conditions = ['a.usuario_id = $1', 'a.deleted_at IS NULL'];
  const params = [req.userId];
  let paramIndex = 2;

  if (ave_id) {
    conditions.push(`l.ave_id = $${paramIndex++}`);
    params.push(ave_id);
  }

  if (gravedad) {
    conditions.push(`l.gravedad = $${paramIndex++}`);
    params.push(gravedad);
  }

  if (sin_recuperar === 'true') {
    conditions.push(`l.fecha_recuperacion IS NULL`);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await db.query(
    `SELECT COUNT(*) FROM lesiones l
     JOIN aves a ON l.ave_id = a.id
     WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const { rows } = await db.query(
    `SELECT l.*, a.codigo_identidad, a.linea_genetica,
            c.fecha_combate, c.resultado as combate_resultado
     FROM lesiones l
     JOIN aves a ON l.ave_id = a.id
     LEFT JOIN combates c ON l.combate_id = c.id
     WHERE ${whereClause}
     ORDER BY l.fecha_lesion DESC
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
};

/**
 * Create lesion (standalone, not from combate)
 * POST /api/v1/salud/lesiones
 */
const createLesion = async (req, res) => {
  const {
    ave_id,
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

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, codigo_identidad FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [ave_id, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  const { rows } = await db.query(
    `INSERT INTO lesiones (
      ave_id, tipo_lesion, zona_afectada, gravedad, fecha_lesion,
      tratamiento, fecha_recuperacion, costo_tratamiento, secuelas, notas
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      ave_id, tipo_lesion, zona_afectada || null, gravedad, fecha_lesion,
      tratamiento || null, fecha_recuperacion || null, costo_tratamiento || null,
      secuelas || null, notas || null
    ]
  );

  logger.info(`Lesion created for ave ${ave[0].codigo_identidad} by user ${req.userId}`);

  res.status(201).json({
    success: true,
    message: 'Lesión registrada exitosamente',
    data: rows[0]
  });
};

/**
 * Update lesion (mark as recovered, add treatment, etc)
 * PUT /api/v1/salud/lesiones/:id
 */
const updateLesion = async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { rows: existing } = await db.query(
    `SELECT l.id FROM lesiones l
     JOIN aves a ON l.ave_id = a.id
     WHERE l.id = $1 AND a.usuario_id = $2`,
    [id, req.userId]
  );

  if (existing.length === 0) {
    throw Errors.notFound('Lesión');
  }

  const allowedFields = [
    'tipo_lesion', 'zona_afectada', 'gravedad', 'fecha_lesion',
    'tratamiento', 'fecha_recuperacion', 'costo_tratamiento', 'secuelas', 'notas'
  ];

  const updateFields = [];
  const values = [];
  let paramIndex = 1;

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
    `UPDATE lesiones SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  res.json({
    success: true,
    message: 'Lesión actualizada',
    data: rows[0]
  });
};

// ============================================
// RESUMEN DE SALUD
// ============================================

/**
 * Get health summary for an ave
 * GET /api/v1/salud/ave/:aveId/resumen
 */
const getResumenSaludAve = async (req, res) => {
  const { aveId } = req.params;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, codigo_identidad, linea_genetica, fecha_nacimiento FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [aveId, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  // Get counts and latest records
  const { rows: stats } = await db.query(
    `SELECT
      (SELECT COUNT(*) FROM vacunas WHERE ave_id = $1) as total_vacunas,
      (SELECT COUNT(*) FROM desparasitaciones WHERE ave_id = $1) as total_desparasitaciones,
      (SELECT COUNT(*) FROM tratamientos WHERE ave_id = $1) as total_tratamientos,
      (SELECT COUNT(*) FROM tratamientos WHERE ave_id = $1 AND estado = 'en_curso') as tratamientos_activos,
      (SELECT COUNT(*) FROM consultas_veterinarias WHERE ave_id = $1) as total_consultas,
      (SELECT COUNT(*) FROM lesiones WHERE ave_id = $1) as total_lesiones,
      (SELECT COUNT(*) FROM lesiones WHERE ave_id = $1 AND fecha_recuperacion IS NULL) as lesiones_sin_recuperar,
      (SELECT SUM(costo) FROM vacunas WHERE ave_id = $1) as costo_vacunas,
      (SELECT SUM(costo) FROM desparasitaciones WHERE ave_id = $1) as costo_desparasitaciones,
      (SELECT SUM(costo_total) FROM tratamientos WHERE ave_id = $1) as costo_tratamientos,
      (SELECT SUM(costo) FROM consultas_veterinarias WHERE ave_id = $1) as costo_consultas,
      (SELECT SUM(costo_tratamiento) FROM lesiones WHERE ave_id = $1) as costo_lesiones`,
    [aveId]
  );

  // Get latest vaccine
  const { rows: ultimaVacuna } = await db.query(
    `SELECT tipo_vacuna, fecha_aplicacion, proxima_dosis
     FROM vacunas WHERE ave_id = $1
     ORDER BY fecha_aplicacion DESC LIMIT 1`,
    [aveId]
  );

  // Get latest deworming
  const { rows: ultimaDesparasitacion } = await db.query(
    `SELECT producto, fecha_aplicacion, proxima_aplicacion
     FROM desparasitaciones WHERE ave_id = $1
     ORDER BY fecha_aplicacion DESC LIMIT 1`,
    [aveId]
  );

  // Get upcoming health events
  const { rows: proximos } = await db.query(
    `SELECT 'vacuna' as tipo, tipo_vacuna as descripcion, proxima_dosis as fecha
     FROM vacunas WHERE ave_id = $1 AND proxima_dosis IS NOT NULL AND proxima_dosis >= CURRENT_DATE
     UNION ALL
     SELECT 'desparasitacion' as tipo, producto as descripcion, proxima_aplicacion as fecha
     FROM desparasitaciones WHERE ave_id = $1 AND proxima_aplicacion IS NOT NULL AND proxima_aplicacion >= CURRENT_DATE
     ORDER BY fecha LIMIT 5`,
    [aveId]
  );

  const costoTotal =
    (parseFloat(stats[0].costo_vacunas) || 0) +
    (parseFloat(stats[0].costo_desparasitaciones) || 0) +
    (parseFloat(stats[0].costo_tratamientos) || 0) +
    (parseFloat(stats[0].costo_consultas) || 0) +
    (parseFloat(stats[0].costo_lesiones) || 0);

  res.json({
    success: true,
    data: {
      ave: ave[0],
      estadisticas: {
        ...stats[0],
        costo_total_salud: costoTotal
      },
      ultima_vacuna: ultimaVacuna[0] || null,
      ultima_desparasitacion: ultimaDesparasitacion[0] || null,
      proximos_eventos: proximos
    }
  });
};

module.exports = {
  // Alertas
  getAlertas,
  // Vacunas
  listVacunas,
  getVacunasByAve,
  createVacuna,
  updateVacuna,
  deleteVacuna,
  // Desparasitaciones
  listDesparasitaciones,
  getDesparasitacionesByAve,
  createDesparasitacion,
  updateDesparasitacion,
  deleteDesparasitacion,
  // Tratamientos
  listTratamientos,
  getTratamientosByAve,
  getTratamientoById,
  createTratamiento,
  updateTratamiento,
  deleteTratamiento,
  // Consultas
  listConsultas,
  getConsultasByAve,
  createConsulta,
  updateConsulta,
  deleteConsulta,
  // Lesiones
  listLesiones,
  createLesion,
  updateLesion,
  // Resumen
  getResumenSaludAve
};
