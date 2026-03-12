/**
 * Aves (Birds) Controller
 */

const db = require('../config/database');
const { Errors, asyncHandler } = require('../middleware/errorHandler');
const QRCode = require('qrcode');
const logger = require('../config/logger');

/**
 * Auto-calculate composicion_genetica from parents
 * Child = 50% father + 50% mother
 */
async function calcularComposicionDesdePadres(padreId, madreId, userId) {
  const composicion = {};

  if (padreId) {
    const { rows } = await db.query(
      `SELECT composicion_genetica, linea_genetica, es_puro FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL`,
      [padreId, userId]
    );
    if (rows.length > 0) {
      let padreComp = rows[0].composicion_genetica || [];
      if (typeof padreComp === 'string') padreComp = JSON.parse(padreComp);

      // If padre has no composicion but has linea_genetica, treat as pure
      if (padreComp.length === 0 && rows[0].linea_genetica) {
        padreComp = [{ linea: rows[0].linea_genetica, decimal: 1.0 }];
      }

      for (const comp of padreComp) {
        const linea = comp.linea;
        if (!composicion[linea]) composicion[linea] = { decimal: 0, via: [] };
        composicion[linea].decimal += comp.decimal * 0.5;
        composicion[linea].via.push('padre');
      }
    }
  }

  if (madreId) {
    const { rows } = await db.query(
      `SELECT composicion_genetica, linea_genetica, es_puro FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL`,
      [madreId, userId]
    );
    if (rows.length > 0) {
      let madreComp = rows[0].composicion_genetica || [];
      if (typeof madreComp === 'string') madreComp = JSON.parse(madreComp);

      if (madreComp.length === 0 && rows[0].linea_genetica) {
        madreComp = [{ linea: rows[0].linea_genetica, decimal: 1.0 }];
      }

      for (const comp of madreComp) {
        const linea = comp.linea;
        if (!composicion[linea]) composicion[linea] = { decimal: 0, via: [] };
        composicion[linea].decimal += comp.decimal * 0.5;
        composicion[linea].via.push('madre');
      }
    }
  }

  // Convert to array and calculate fractions
  return Object.entries(composicion).map(([linea, data]) => ({
    linea,
    decimal: Math.round(data.decimal * 1000) / 1000,
    fraccion: decimalToFraction(data.decimal),
    via: [...new Set(data.via)].join('+')
  })).sort((a, b) => b.decimal - a.decimal);
}

/**
 * Convert decimal to nearest common fraction
 */
function decimalToFraction(decimal) {
  const fractions = [
    [1, 1], [7, 8], [3, 4], [5, 8], [1, 2],
    [3, 8], [1, 4], [1, 8], [1, 16], [3, 16],
    [5, 16], [7, 16], [9, 16], [11, 16], [13, 16], [15, 16]
  ];

  let closest = fractions[0];
  let minDiff = Infinity;

  for (const [num, den] of fractions) {
    const diff = Math.abs(decimal - num / den);
    if (diff < minDiff) {
      minDiff = diff;
      closest = [num, den];
    }
  }

  // If very close to the fraction (within 1%), use it
  if (minDiff < 0.01) {
    return `${closest[0]}/${closest[1]}`;
  }

  // Otherwise try to express as exact fraction with denominator up to 16
  for (let den = 2; den <= 16; den++) {
    const num = Math.round(decimal * den);
    if (Math.abs(num / den - decimal) < 0.001) {
      return `${num}/${den}`;
    }
  }

  return `${Math.round(decimal * 100)}%`;
}

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
      CASE WHEN a.fecha_nacimiento IS NOT NULL THEN
        CASE
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.fecha_nacimiento)) >= 1 THEN
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' año(s), ' || EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' mes(es)'
          WHEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento)) >= 1 THEN
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' mes(es), ' || EXTRACT(DAY FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' día(s)'
          ELSE
            EXTRACT(DAY FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' día(s)'
        END
      ELSE NULL END as edad
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
      CASE WHEN a.fecha_nacimiento IS NOT NULL THEN
        CASE
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.fecha_nacimiento)) >= 1 THEN
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' año(s), ' || EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' mes(es)'
          WHEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento)) >= 1 THEN
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' mes(es), ' || EXTRACT(DAY FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' día(s)'
          ELSE
            EXTRACT(DAY FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' día(s)'
        END
      ELSE NULL END as edad
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
      CASE WHEN a.fecha_nacimiento IS NOT NULL THEN
        CASE
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.fecha_nacimiento)) >= 1 THEN
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' año(s), ' || EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' mes(es)'
          WHEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento)) >= 1 THEN
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' mes(es), ' || EXTRACT(DAY FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' día(s)'
          ELSE
            EXTRACT(DAY FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' día(s)'
        END
      ELSE NULL END as edad,
      CASE WHEN a.fecha_nacimiento IS NOT NULL THEN (EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER * 12 + EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER) ELSE NULL END as total_meses,
      CASE WHEN a.fecha_nacimiento IS NOT NULL THEN (CURRENT_DATE - a.fecha_nacimiento::DATE)::INTEGER ELSE NULL END as total_dias
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
      CASE WHEN a.fecha_nacimiento IS NOT NULL THEN
        CASE
          WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.fecha_nacimiento)) >= 1 THEN
            EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' año(s), ' || EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' mes(es)'
          WHEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento)) >= 1 THEN
            EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' mes(es), ' || EXTRACT(DAY FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' día(s)'
          ELSE
            EXTRACT(DAY FROM AGE(CURRENT_DATE, a.fecha_nacimiento))::INTEGER || ' día(s)'
        END
      ELSE NULL END as edad,
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
    notas,
    composicion_genetica,
    es_puro,
    criadero_origen,
    criador_nombre,
    fecha_adquisicion,
    tipo_adquisicion,
    notas_origen,
    zona,
    sub_zona,
    lote
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

  // Auto-calculate composicion_genetica from parents if not provided
  let finalComposicion = composicion_genetica || [];
  if ((!finalComposicion || finalComposicion.length === 0) && (padre_id || madre_id)) {
    try {
      finalComposicion = await calcularComposicionDesdePadres(padre_id, madre_id, req.userId);
    } catch (e) {
      logger.warn('Could not auto-calculate genetics:', e.message);
    }
  }

  // If es_puro and linea_genetica provided, set composicion to 100%
  if (es_puro && linea_genetica) {
    finalComposicion = [{ linea: linea_genetica, fraccion: '1/1', decimal: 1.0, via: 'puro' }];
  }

  // Create ave
  const { rows } = await db.query(
    `INSERT INTO aves (
      codigo_identidad, usuario_id, sexo, fecha_nacimiento,
      peso_nacimiento, padre_id, madre_id, linea_genetica,
      color, precio_compra, notas,
      composicion_genetica, es_puro, criadero_origen, criador_nombre,
      fecha_adquisicion, tipo_adquisicion, notas_origen,
      zona, sub_zona, lote
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING *`,
    [
      codigoIdentidad, req.userId, sexo, fecha_nacimiento,
      peso_nacimiento || null, padre_id || null, madre_id || null,
      linea_genetica || null, color || null, precio_compra || null, notas || null,
      JSON.stringify(finalComposicion), es_puro || false,
      criadero_origen || null, criador_nombre || null,
      fecha_adquisicion || null, tipo_adquisicion || 'cria_propia', notas_origen || null,
      zona || null, sub_zona || null, lote || null
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
    'precio_venta', 'disponible_venta', 'disponible_cruces', 'notas',
    'es_puro', 'criadero_origen', 'criador_nombre',
    'fecha_adquisicion', 'tipo_adquisicion', 'notas_origen',
    'zona', 'sub_zona', 'lote',
    'motivo_baja', 'fecha_baja', 'observaciones_combate'
  ];

  // Handle JSONB field separately
  if (req.body.composicion_genetica !== undefined) {
    updateFields.push(`composicion_genetica = $${paramIndex++}`);
    values.push(JSON.stringify(req.body.composicion_genetica));
  }

  // If marking as puro with linea_genetica, auto-set composicion
  if (req.body.es_puro && req.body.linea_genetica) {
    const puroComp = [{ linea: req.body.linea_genetica, fraccion: '1/1', decimal: 1.0, via: 'puro' }];
    if (!req.body.composicion_genetica) {
      updateFields.push(`composicion_genetica = $${paramIndex++}`);
      values.push(JSON.stringify(puroComp));
    }
  }

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

/**
 * Generate Pedigree PDF
 * GET /api/v1/aves/:id/pedigree
 */
const getPedigree = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const PDFDocument = require('pdfkit');

  // Get full ave data with parents and grandparents
  const { rows: aveRows } = await db.query(
    `SELECT a.*,
      p.codigo_identidad AS padre_codigo, p.linea_genetica AS padre_linea, p.color AS padre_color,
      p.composicion_genetica AS padre_composicion, p.sexo AS padre_sexo,
      p.criadero_origen AS padre_criadero, p.peso_actual AS padre_peso,
      m.codigo_identidad AS madre_codigo, m.linea_genetica AS madre_linea, m.color AS madre_color,
      m.composicion_genetica AS madre_composicion, m.sexo AS madre_sexo,
      m.criadero_origen AS madre_criadero, m.peso_actual AS madre_peso,
      -- Abuelos paternos
      pp.codigo_identidad AS abuelo_p_codigo, pp.linea_genetica AS abuelo_p_linea,
      pm.codigo_identidad AS abuela_p_codigo, pm.linea_genetica AS abuela_p_linea,
      -- Abuelos maternos
      mp.codigo_identidad AS abuelo_m_codigo, mp.linea_genetica AS abuelo_m_linea,
      mm.codigo_identidad AS abuela_m_codigo, mm.linea_genetica AS abuela_m_linea
    FROM aves a
    LEFT JOIN aves p ON p.id = a.padre_id AND p.deleted_at IS NULL
    LEFT JOIN aves m ON m.id = a.madre_id AND m.deleted_at IS NULL
    LEFT JOIN aves pp ON pp.id = p.padre_id AND pp.deleted_at IS NULL
    LEFT JOIN aves pm ON pm.id = p.madre_id AND pm.deleted_at IS NULL
    LEFT JOIN aves mp ON mp.id = m.padre_id AND mp.deleted_at IS NULL
    LEFT JOIN aves mm ON mm.id = m.madre_id AND mm.deleted_at IS NULL
    WHERE a.id = $1 AND a.usuario_id = $2 AND a.deleted_at IS NULL`,
    [id, req.userId]
  );

  if (aveRows.length === 0) throw Errors.notFound('Ave');
  const ave = aveRows[0];

  // Get siblings (same padre+madre)
  let hermanos = [];
  if (ave.padre_id && ave.madre_id) {
    const { rows } = await db.query(
      `SELECT codigo_identidad, sexo, linea_genetica, color FROM aves
       WHERE padre_id = $1 AND madre_id = $2 AND id != $3 AND deleted_at IS NULL
       ORDER BY fecha_nacimiento ASC LIMIT 10`,
      [ave.padre_id, ave.madre_id, id]
    );
    hermanos = rows;
  }

  // Get children
  const { rows: hijos } = await db.query(
    `SELECT codigo_identidad, sexo, linea_genetica, color, fecha_nacimiento FROM aves
     WHERE (padre_id = $1 OR madre_id = $1) AND deleted_at IS NULL
     ORDER BY fecha_nacimiento ASC LIMIT 20`,
    [id]
  );

  // Get combat record
  const { rows: combates } = await db.query(
    `SELECT resultado, COUNT(*) AS cnt FROM combates
     WHERE ave_id = $1 AND deleted_at IS NULL GROUP BY resultado`,
    [id]
  );
  const record = { victorias: 0, derrotas: 0, empates: 0 };
  combates.forEach(c => {
    if (c.resultado === 'victoria') record.victorias = parseInt(c.cnt);
    else if (c.resultado === 'derrota') record.derrotas = parseInt(c.cnt);
    else if (c.resultado === 'empate') record.empates = parseInt(c.cnt);
  });
  const totalCombates = record.victorias + record.derrotas + record.empates;
  const pctVictorias = totalCombates > 0 ? Math.round(record.victorias / totalCombates * 100) : 0;

  // Parse composicion
  let composicion = ave.composicion_genetica || [];
  if (typeof composicion === 'string') composicion = JSON.parse(composicion);

  // Generate PDF
  const doc = new PDFDocument({ size: 'LETTER', margin: 40 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=pedigree_${ave.codigo_identidad}.pdf`);
  doc.pipe(res);

  const W = doc.page.width - 80; // usable width
  const GREEN = '#10B981';
  const GOLD = '#F59E0B';
  const RED = '#EF4444';
  const DARK = '#0F172A';
  const GRAY = '#64748B';

  // ═══ HEADER ═══
  doc.rect(0, 0, doc.page.width, 80).fill(DARK);
  doc.fontSize(24).fill('#FFFFFF').text('GENESISPRO', 40, 25, { continued: true })
     .fontSize(14).fill(GOLD).text('  PEDIGREE', { continued: false });
  doc.fontSize(9).fill('#94A3B8').text('Certificado de Genealogía', 40, 55);
  doc.fontSize(9).fill('#94A3B8').text(new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }), doc.page.width - 200, 55, { width: 160, align: 'right' });

  let y = 100;

  // ═══ AVE PRINCIPAL ═══
  doc.roundedRect(40, y, W, 85, 8).lineWidth(2).stroke(GREEN);
  doc.fontSize(18).fill(DARK).text(ave.codigo_identidad, 55, y + 12);
  doc.fontSize(10).fill(GRAY).text(`${ave.sexo === 'M' ? 'Macho' : 'Hembra'}  ·  ${ave.color || '-'}  ·  ${ave.linea_genetica || '-'}`, 55, y + 35);

  const fechaNac = ave.fecha_nacimiento ? new Date(ave.fecha_nacimiento).toLocaleDateString('es-MX') : '-';
  doc.fontSize(9).fill(GRAY).text(`Nacimiento: ${fechaNac}   ·   Peso: ${ave.peso_actual ? ave.peso_actual + 'kg' : '-'}`, 55, y + 52);

  if (ave.criadero_origen || ave.criador_nombre) {
    doc.fontSize(9).fill(GRAY).text(`Origen: ${ave.criador_nombre || ''} ${ave.criadero_origen ? '· ' + ave.criadero_origen : ''}`, 55, y + 66);
  }

  y += 100;

  // ═══ COMPOSICIÓN GENÉTICA ═══
  if (composicion.length > 0) {
    doc.fontSize(12).fill(DARK).text('COMPOSICIÓN GENÉTICA', 40, y);
    y += 20;

    const barColors = [GREEN, GOLD, '#6366F1', RED, '#8B5CF6', '#EC4899'];
    composicion.forEach((comp, i) => {
      const barWidth = Math.max(comp.decimal * (W - 160), 4);
      const barColor = barColors[i % barColors.length];

      doc.rect(40, y, barWidth, 14).fill(barColor);
      doc.fontSize(9).fill(DARK).text(`${comp.linea}`, barWidth + 50, y + 2, { width: 100 });
      doc.fontSize(9).fill(GRAY).text(`${comp.fraccion}  (${Math.round(comp.decimal * 100)}%)`, W - 60, y + 2, { width: 100, align: 'right' });
      y += 20;
    });

    y += 5;
  }

  // ═══ ÁRBOL GENEALÓGICO ═══
  doc.fontSize(12).fill(DARK).text('ÁRBOL GENEALÓGICO', 40, y);
  y += 22;

  const colW = W / 4;
  const boxH = 42;

  // Helper to draw a pedigree box
  function drawBox(x, yPos, label, codigo, linea, color) {
    const isM = label.includes('Abuelo') || label === 'Padre';
    const borderColor = codigo ? (isM ? '#3B82F6' : '#EC4899') : '#CBD5E1';
    doc.roundedRect(x, yPos, colW - 8, boxH, 4).lineWidth(1).stroke(borderColor);
    doc.fontSize(7).fill(GRAY).text(label, x + 4, yPos + 3, { width: colW - 16 });
    doc.fontSize(9).fill(DARK).text(codigo || '---', x + 4, yPos + 14, { width: colW - 16 });
    doc.fontSize(7).fill(GRAY).text(linea || '', x + 4, yPos + 28, { width: colW - 16 });
  }

  // Grandparents (col 1)
  drawBox(40, y, 'Abuelo Paterno', ave.abuelo_p_codigo, ave.abuelo_p_linea);
  drawBox(40, y + boxH + 6, 'Abuela Paterna', ave.abuela_p_codigo, ave.abuela_p_linea);
  drawBox(40, y + (boxH + 6) * 2, 'Abuelo Materno', ave.abuelo_m_codigo, ave.abuelo_m_linea);
  drawBox(40, y + (boxH + 6) * 3, 'Abuela Materna', ave.abuela_m_codigo, ave.abuela_m_linea);

  // Parents (col 2)
  const parentY1 = y + (boxH + 6) * 0.5 - boxH / 2 + 3;
  const parentY2 = y + (boxH + 6) * 2.5 - boxH / 2 + 3;
  drawBox(40 + colW, parentY1, 'Padre', ave.padre_codigo, ave.padre_linea);
  drawBox(40 + colW, parentY2, 'Madre', ave.madre_codigo, ave.madre_linea);

  // Ave (col 3) - centered
  const aveBoxY = y + (boxH + 6) * 1.5 - boxH / 2 + 3;
  doc.roundedRect(40 + colW * 2, aveBoxY, colW - 8, boxH + 8, 4).lineWidth(2).stroke(GREEN);
  doc.fontSize(7).fill(GREEN).text('AVE', 40 + colW * 2 + 4, aveBoxY + 3, { width: colW - 16 });
  doc.fontSize(11).fill(DARK).text(ave.codigo_identidad, 40 + colW * 2 + 4, aveBoxY + 15, { width: colW - 16 });
  doc.fontSize(7).fill(GRAY).text(`${ave.linea_genetica || ''} · ${ave.color || ''}`, 40 + colW * 2 + 4, aveBoxY + 32, { width: colW - 16 });

  // Children summary (col 4)
  if (hijos.length > 0) {
    const hijosY = aveBoxY - 10;
    doc.fontSize(8).fill(DARK).text(`Descendencia (${hijos.length})`, 40 + colW * 3, hijosY);
    hijos.slice(0, 6).forEach((h, i) => {
      doc.fontSize(7).fill(GRAY).text(
        `${h.sexo === 'M' ? '♂' : '♀'} ${h.codigo_identidad} · ${h.linea_genetica || '-'}`,
        40 + colW * 3, hijosY + 14 + i * 12, { width: colW - 8 }
      );
    });
    if (hijos.length > 6) {
      doc.fontSize(7).fill(GRAY).text(`+${hijos.length - 6} más...`, 40 + colW * 3, hijosY + 14 + 72);
    }
  }

  // Draw connection lines
  const lineColor = '#CBD5E1';
  doc.strokeColor(lineColor).lineWidth(0.5);

  // Grandparents → Parents lines
  [0, 1].forEach(i => {
    const gx = 40 + colW - 8;
    const gy = y + (boxH + 6) * i + boxH / 2;
    doc.moveTo(gx, gy).lineTo(40 + colW, parentY1 + boxH / 2).stroke();
  });
  [2, 3].forEach(i => {
    const gx = 40 + colW - 8;
    const gy = y + (boxH + 6) * i + boxH / 2;
    doc.moveTo(gx, gy).lineTo(40 + colW, parentY2 + boxH / 2).stroke();
  });

  // Parents → Ave lines
  doc.moveTo(40 + colW * 2 - 8, parentY1 + boxH / 2).lineTo(40 + colW * 2, aveBoxY + (boxH + 8) / 2).stroke();
  doc.moveTo(40 + colW * 2 - 8, parentY2 + boxH / 2).lineTo(40 + colW * 2, aveBoxY + (boxH + 8) / 2).stroke();

  // Ave → Children line
  if (hijos.length > 0) {
    doc.moveTo(40 + colW * 3 - 8, aveBoxY + (boxH + 8) / 2).lineTo(40 + colW * 3, aveBoxY + (boxH + 8) / 2).stroke();
  }

  y += (boxH + 6) * 4 + 15;

  // ═══ HERMANOS ═══
  if (hermanos.length > 0) {
    doc.fontSize(12).fill(DARK).text('HERMANOS', 40, y);
    y += 18;
    doc.fontSize(8).fill(GRAY);
    hermanos.forEach(h => {
      doc.text(`${h.sexo === 'M' ? '♂' : '♀'} ${h.codigo_identidad}  ·  ${h.linea_genetica || '-'}  ·  ${h.color || '-'}`, 55, y);
      y += 13;
    });
    y += 5;
  }

  // ═══ RECORD DE COMBATES ═══
  if (totalCombates > 0) {
    doc.fontSize(12).fill(DARK).text('RECORD DE COMBATES', 40, y);
    y += 20;
    doc.fontSize(14).fill(GREEN).text(`${record.victorias}V`, 55, y, { continued: true })
       .fill(GRAY).text(' - ', { continued: true })
       .fill(RED).text(`${record.derrotas}D`, { continued: true })
       .fill(GRAY).text(' - ', { continued: true })
       .fill(GOLD).text(`${record.empates}T`, { continued: true })
       .fill(GRAY).fontSize(10).text(`   (${pctVictorias}% victorias de ${totalCombates} combates)`, { continued: false });
    y += 25;
  }

  // ═══ ORIGEN ═══
  if (ave.criadero_origen || ave.criador_nombre || ave.notas_origen) {
    doc.fontSize(12).fill(DARK).text('ORIGEN', 40, y);
    y += 18;
    if (ave.criador_nombre) { doc.fontSize(9).fill(GRAY).text(`Criador: ${ave.criador_nombre}`, 55, y); y += 13; }
    if (ave.criadero_origen) { doc.fontSize(9).fill(GRAY).text(`Criadero: ${ave.criadero_origen}`, 55, y); y += 13; }
    if (ave.tipo_adquisicion) {
      const tipoLabels = { cria_propia: 'Cría Propia', compra: 'Compra', regalo: 'Regalo', intercambio: 'Intercambio' };
      doc.fontSize(9).fill(GRAY).text(`Tipo: ${tipoLabels[ave.tipo_adquisicion] || ave.tipo_adquisicion}`, 55, y); y += 13;
    }
    if (ave.fecha_adquisicion) {
      doc.fontSize(9).fill(GRAY).text(`Fecha: ${new Date(ave.fecha_adquisicion).toLocaleDateString('es-MX')}`, 55, y); y += 13;
    }
    if (ave.notas_origen) { doc.fontSize(8).fill(GRAY).text(ave.notas_origen, 55, y, { width: W - 30 }); y += 20; }
  }

  // ═══ FOOTER ═══
  const footerY = doc.page.height - 50;
  doc.rect(0, footerY, doc.page.width, 50).fill(DARK);
  doc.fontSize(8).fill('#94A3B8').text('Generado por GenesisPro · genesispro.vip · Documento informativo', 40, footerY + 12);
  doc.fontSize(7).fill('#475569').text(`ID: ${ave.id} · ${ave.codigo_identidad}`, 40, footerY + 28);

  doc.end();
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
  getQRCode,
  getPedigree
};
