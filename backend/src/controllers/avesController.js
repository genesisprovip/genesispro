/**
 * Aves (Birds) Controller
 */

const db = require('../config/database');
const { Errors, asyncHandler } = require('../middleware/errorHandler');
const QRCode = require('qrcode');
const logger = require('../config/logger');

/**
 * List all aves for current user (paginated)
 * GET /api/v1/aves
 */
const list = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    sexo,
    estado,
    linea_genetica,
    sort_by = 'created_at',
    sort_order = 'desc'
  } = req.query;

  const offset = (page - 1) * limit;

  // Build WHERE clause
  const conditions = ['a.usuario_id = $1', 'a.deleted_at IS NULL'];
  const params = [req.userId];
  let paramIndex = 2;

  if (sexo) {
    conditions.push(`a.sexo = $${paramIndex++}`);
    params.push(sexo);
  }

  if (estado) {
    conditions.push(`a.estado = $${paramIndex++}`);
    params.push(estado);
  }

  if (linea_genetica) {
    conditions.push(`a.linea_genetica ILIKE $${paramIndex++}`);
    params.push(`%${linea_genetica}%`);
  }

  const whereClause = conditions.join(' AND ');

  // Validate sort column
  const allowedSortColumns = ['created_at', 'fecha_nacimiento', 'codigo_identidad', 'linea_genetica'];
  const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'created_at';
  const sortDir = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Get total count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM aves a WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get aves with pagination
  const { rows } = await db.query(
    `SELECT
      a.id, a.codigo_identidad, a.sexo, a.fecha_nacimiento,
      a.peso_actual, a.linea_genetica, a.color, a.estado,
      a.disponible_venta, a.disponible_cruces,
      a.created_at,
      f.ruta_archivo as foto_principal,
      (SELECT calcular_edad_ave(a.fecha_nacimiento)).descripcion as edad
    FROM aves a
    LEFT JOIN fotos f ON a.id = f.ave_id AND f.es_principal = true
    WHERE ${whereClause}
    ORDER BY a.${sortColumn} ${sortDir}
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
});

/**
 * Search aves
 * GET /api/v1/aves/search
 */
const search = asyncHandler(async (req, res) => {
  const { q, sexo, estado, linea_genetica, page = 1, limit = 20 } = req.query;

  const offset = (page - 1) * limit;
  const conditions = ['a.usuario_id = $1', 'a.deleted_at IS NULL'];
  const params = [req.userId];
  let paramIndex = 2;

  if (q) {
    conditions.push(`(
      a.codigo_identidad ILIKE $${paramIndex} OR
      a.linea_genetica ILIKE $${paramIndex} OR
      a.color ILIKE $${paramIndex} OR
      a.notas ILIKE $${paramIndex}
    )`);
    params.push(`%${q}%`);
    paramIndex++;
  }

  if (sexo) {
    conditions.push(`a.sexo = $${paramIndex++}`);
    params.push(sexo);
  }

  if (estado) {
    conditions.push(`a.estado = $${paramIndex++}`);
    params.push(estado);
  }

  if (linea_genetica) {
    conditions.push(`a.linea_genetica ILIKE $${paramIndex++}`);
    params.push(`%${linea_genetica}%`);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await db.query(
    `SELECT COUNT(*) FROM aves a WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const { rows } = await db.query(
    `SELECT
      a.id, a.codigo_identidad, a.sexo, a.fecha_nacimiento,
      a.linea_genetica, a.color, a.estado,
      (SELECT calcular_edad_ave(a.fecha_nacimiento)).descripcion as edad
    FROM aves a
    WHERE ${whereClause}
    ORDER BY a.codigo_identidad
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
});

/**
 * Get single ave by ID
 * GET /api/v1/aves/:id
 */
const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await db.query(
    `SELECT
      a.*,
      padre.codigo_identidad as padre_codigo,
      padre.color as padre_color,
      padre.linea_genetica as padre_linea,
      madre.codigo_identidad as madre_codigo,
      madre.color as madre_color,
      madre.linea_genetica as madre_linea,
      (SELECT calcular_edad_ave(a.fecha_nacimiento)).*
    FROM aves a
    LEFT JOIN aves padre ON a.padre_id = padre.id
    LEFT JOIN aves madre ON a.madre_id = madre.id
    WHERE a.id = $1 AND a.usuario_id = $2 AND a.deleted_at IS NULL`,
    [id, req.userId]
  );

  if (rows.length === 0) {
    throw Errors.notFound('Ave');
  }

  const ave = rows[0];

  // Get photos
  const { rows: fotos } = await db.query(
    `SELECT id, ruta_archivo, ruta_thumbnail, descripcion, es_principal, created_at
     FROM fotos WHERE ave_id = $1 ORDER BY es_principal DESC, created_at DESC`,
    [id]
  );

  // Get combat stats if male
  let estadisticasCombate = null;
  if (ave.sexo === 'M') {
    const { rows: stats } = await db.query(
      'SELECT * FROM estadisticas_combates($1)',
      [id]
    );
    if (stats.length > 0) {
      estadisticasCombate = stats[0];
    }
  }

  res.json({
    success: true,
    data: {
      ...ave,
      fotos,
      estadisticas_combate: estadisticasCombate,
      padre: ave.padre_id ? {
        id: ave.padre_id,
        codigo_identidad: ave.padre_codigo,
        color: ave.padre_color,
        linea_genetica: ave.padre_linea
      } : null,
      madre: ave.madre_id ? {
        id: ave.madre_id,
        codigo_identidad: ave.madre_codigo,
        color: ave.madre_color,
        linea_genetica: ave.madre_linea
      } : null
    }
  });
});

/**
 * Get ave by codigo (for QR scan)
 * GET /api/v1/aves/scan/:codigo
 */
const getByCodigo = asyncHandler(async (req, res) => {
  const { codigo } = req.params;

  const { rows } = await db.query(
    `SELECT
      a.id, a.codigo_identidad, a.sexo, a.fecha_nacimiento,
      a.linea_genetica, a.color, a.estado, a.usuario_id,
      (SELECT calcular_edad_ave(a.fecha_nacimiento)).descripcion as edad,
      u.nombre as propietario_nombre
    FROM aves a
    JOIN usuarios u ON a.usuario_id = u.id
    WHERE a.codigo_identidad = $1 AND a.deleted_at IS NULL`,
    [codigo]
  );

  if (rows.length === 0) {
    throw Errors.notFound('Ave');
  }

  const ave = rows[0];
  const isOwner = ave.usuario_id === req.userId;

  // Return limited info if not owner
  res.json({
    success: true,
    data: {
      id: ave.id,
      codigo_identidad: ave.codigo_identidad,
      sexo: ave.sexo,
      fecha_nacimiento: ave.fecha_nacimiento,
      edad: ave.edad,
      linea_genetica: ave.linea_genetica,
      color: ave.color,
      estado: ave.estado,
      propietario: ave.propietario_nombre,
      is_owner: isOwner
    }
  });
});

/**
 * Create new ave
 * POST /api/v1/aves
 */
const create = asyncHandler(async (req, res) => {
  const {
    sexo,
    fecha_nacimiento,
    peso_nacimiento,
    padre_id,
    madre_id,
    linea_genetica,
    color,
    precio_compra,
    notas
  } = req.body;

  // Validate parent sexes if provided
  if (padre_id) {
    const { rows } = await db.query(
      'SELECT sexo FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
      [padre_id, req.userId]
    );
    if (rows.length === 0) {
      throw Errors.notFound('Padre');
    }
    if (rows[0].sexo !== 'M') {
      throw Errors.badRequest('El padre debe ser macho');
    }
  }

  if (madre_id) {
    const { rows } = await db.query(
      'SELECT sexo FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
      [madre_id, req.userId]
    );
    if (rows.length === 0) {
      throw Errors.notFound('Madre');
    }
    if (rows[0].sexo !== 'H') {
      throw Errors.badRequest('La madre debe ser hembra');
    }
  }

  // Generate unique code
  const { rows: codeResult } = await db.query('SELECT generar_codigo_ave() as codigo');
  const codigoIdentidad = codeResult[0].codigo;

  // Create ave
  const { rows } = await db.query(
    `INSERT INTO aves (
      codigo_identidad, usuario_id, sexo, fecha_nacimiento,
      peso_nacimiento, padre_id, madre_id, linea_genetica,
      color, precio_compra, notas
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *`,
    [
      codigoIdentidad, req.userId, sexo, fecha_nacimiento,
      peso_nacimiento || null, padre_id || null, madre_id || null,
      linea_genetica || null, color || null, precio_compra || null, notas || null
    ]
  );

  const ave = rows[0];

  logger.info(`Ave created: ${codigoIdentidad} by user ${req.userId}`);

  res.status(201).json({
    success: true,
    message: 'Ave creada exitosamente',
    data: ave
  });
});

/**
 * Update ave
 * PUT /api/v1/aves/:id
 */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { rows: existing } = await db.query(
    'SELECT id FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [id, req.userId]
  );

  if (existing.length === 0) {
    throw Errors.notFound('Ave');
  }

  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  const allowedFields = [
    'sexo', 'fecha_nacimiento', 'padre_id', 'madre_id',
    'linea_genetica', 'color', 'estado', 'precio_compra',
    'precio_venta', 'disponible_venta', 'disponible_cruces', 'notas'
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

  updateFields.push(`updated_at = NOW()`);
  values.push(id);

  const { rows } = await db.query(
    `UPDATE aves SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  res.json({
    success: true,
    message: 'Ave actualizada',
    data: rows[0]
  });
});

/**
 * Delete ave (soft delete)
 * DELETE /api/v1/aves/:id
 */
const deleteAve = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rowCount } = await db.query(
    `UPDATE aves SET deleted_at = NOW() WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL`,
    [id, req.userId]
  );

  if (rowCount === 0) {
    throw Errors.notFound('Ave');
  }

  logger.info(`Ave deleted: ${id} by user ${req.userId}`);

  res.json({
    success: true,
    message: 'Ave eliminada'
  });
});

/**
 * Get genealogy tree
 * GET /api/v1/aves/:id/genealogia
 */
const getGenealogia = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const depth = req.maxGenealogyDepth || 3;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, codigo_identidad FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [id, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  const { rows } = await db.query(
    'SELECT * FROM obtener_genealogia($1, $2)',
    [id, depth]
  );

  res.json({
    success: true,
    data: {
      ave: {
        id: ave[0].id,
        codigo_identidad: ave[0].codigo_identidad
      },
      ancestros: rows,
      profundidad_max: depth
    }
  });
});

/**
 * Get descendants
 * GET /api/v1/aves/:id/descendencia
 */
const getDescendencia = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, codigo_identidad, sexo FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [id, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  const { rows } = await db.query(
    'SELECT * FROM obtener_descendencia($1, 5)',
    [id]
  );

  // Count by generation
  const hijos = rows.filter(r => r.nivel === 1).length;
  const nietos = rows.filter(r => r.nivel === 2).length;

  res.json({
    success: true,
    data: {
      ave: ave[0],
      descendientes: rows,
      total_hijos: hijos,
      total_nietos: nietos
    }
  });
});

/**
 * Get measurements
 * GET /api/v1/aves/:id/mediciones
 */
const getMediciones = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await db.query(
    `SELECT * FROM mediciones
     WHERE ave_id = $1
     ORDER BY fecha_medicion DESC`,
    [id]
  );

  res.json({
    success: true,
    data: rows
  });
});

/**
 * Add measurement
 * POST /api/v1/aves/:id/mediciones
 */
const addMedicion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { fecha_medicion, peso, altura_cm, longitud_espolon_cm, circunferencia_pata_cm, notas } = req.body;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [id, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  const { rows } = await db.query(
    `INSERT INTO mediciones (ave_id, fecha_medicion, peso, altura_cm, longitud_espolon_cm, circunferencia_pata_cm, notas)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, fecha_medicion, peso, altura_cm, longitud_espolon_cm, circunferencia_pata_cm, notas]
  );

  res.status(201).json({
    success: true,
    message: 'Medición registrada',
    data: rows[0]
  });
});

/**
 * Get QR Code
 * GET /api/v1/aves/:id/qr
 */
const getQRCode = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { rows } = await db.query(
    'SELECT codigo_identidad FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [id, req.userId]
  );

  if (rows.length === 0) {
    throw Errors.notFound('Ave');
  }

  const codigo = rows[0].codigo_identidad;
  const qrUrl = `${process.env.API_URL}/api/v1/aves/scan/${codigo}`;

  // Generate QR as base64
  const qrBase64 = await QRCode.toDataURL(qrUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  res.json({
    success: true,
    data: {
      codigo_identidad: codigo,
      qr_url: qrUrl,
      qr_image: qrBase64
    }
  });
});

module.exports = {
  list,
  search,
  getById,
  getByCodigo,
  create,
  update,
  delete: deleteAve,
  getGenealogia,
  getDescendencia,
  getMediciones,
  addMedicion,
  getQRCode
};
