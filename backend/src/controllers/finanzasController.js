/**
 * Finanzas (Finances) Controller
 * Manages: transacciones, categorias, dashboard, ROI
 */

const db = require('../config/database');
const { Errors } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// ============================================
// CATEGORÍAS
// ============================================

/**
 * Get all transaction categories
 * GET /api/v1/finanzas/categorias
 */
const getCategorias = async (req, res) => {
  const { tipo } = req.query;

  let query = 'SELECT * FROM categorias_transaccion WHERE activa = true';
  const params = [];

  if (tipo) {
    query += ' AND tipo = $1';
    params.push(tipo);
  }

  query += ' ORDER BY orden, nombre';

  const { rows } = await db.query(query, params);

  // Group by type
  const ingresos = rows.filter(c => c.tipo === 'ingreso');
  const egresos = rows.filter(c => c.tipo === 'egreso');

  res.json({
    success: true,
    data: {
      todas: rows,
      ingresos,
      egresos
    }
  });
};

// ============================================
// TRANSACCIONES
// ============================================

/**
 * List transacciones for user (paginated)
 * GET /api/v1/finanzas/transacciones
 */
const listTransacciones = async (req, res) => {
  const {
    page = 1,
    limit = 20,
    tipo,
    categoria_id,
    ave_id,
    fecha_desde,
    fecha_hasta,
    sort_by = 'fecha',
    sort_order = 'desc'
  } = req.query;

  const offset = (page - 1) * limit;

  const conditions = ['t.usuario_id = $1', 't.deleted_at IS NULL'];
  const params = [req.userId];
  let paramIndex = 2;

  if (tipo) {
    conditions.push(`t.tipo = $${paramIndex++}`);
    params.push(tipo);
  }

  if (categoria_id) {
    conditions.push(`t.categoria_id = $${paramIndex++}`);
    params.push(categoria_id);
  }

  if (ave_id) {
    conditions.push(`t.ave_id = $${paramIndex++}`);
    params.push(ave_id);
  }

  if (fecha_desde) {
    conditions.push(`t.fecha >= $${paramIndex++}`);
    params.push(fecha_desde);
  }

  if (fecha_hasta) {
    conditions.push(`t.fecha <= $${paramIndex++}`);
    params.push(fecha_hasta);
  }

  const whereClause = conditions.join(' AND ');

  // Validate sort
  const allowedSortColumns = ['fecha', 'monto', 'created_at'];
  const sortColumn = allowedSortColumns.includes(sort_by) ? sort_by : 'fecha';
  const sortDir = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Count
  const countResult = await db.query(
    `SELECT COUNT(*) FROM transacciones t WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  // Get transactions
  const { rows } = await db.query(
    `SELECT
      t.*,
      c.nombre as categoria_nombre,
      c.icono as categoria_icono,
      c.color as categoria_color,
      a.codigo_identidad as ave_codigo,
      a.linea_genetica as ave_linea
    FROM transacciones t
    JOIN categorias_transaccion c ON t.categoria_id = c.id
    LEFT JOIN aves a ON t.ave_id = a.id
    WHERE ${whereClause}
    ORDER BY t.${sortColumn} ${sortDir}
    LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  // Calculate totals for filtered results
  const { rows: totals } = await db.query(
    `SELECT
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0) as total_ingresos,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0) as total_egresos
    FROM transacciones t
    WHERE ${whereClause}`,
    params.slice(0, paramIndex - 2)
  );

  res.json({
    success: true,
    data: rows,
    totales: {
      ingresos: parseFloat(totals[0].total_ingresos),
      egresos: parseFloat(totals[0].total_egresos),
      balance: parseFloat(totals[0].total_ingresos) - parseFloat(totals[0].total_egresos)
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
 * Get single transaccion
 * GET /api/v1/finanzas/transacciones/:id
 */
const getTransaccionById = async (req, res) => {
  const { id } = req.params;

  const { rows } = await db.query(
    `SELECT
      t.*,
      c.nombre as categoria_nombre,
      c.icono as categoria_icono,
      c.color as categoria_color,
      a.codigo_identidad as ave_codigo,
      a.linea_genetica as ave_linea
    FROM transacciones t
    JOIN categorias_transaccion c ON t.categoria_id = c.id
    LEFT JOIN aves a ON t.ave_id = a.id
    WHERE t.id = $1 AND t.usuario_id = $2 AND t.deleted_at IS NULL`,
    [id, req.userId]
  );

  if (rows.length === 0) {
    throw Errors.notFound('Transacción');
  }

  res.json({
    success: true,
    data: rows[0]
  });
};

/**
 * Get transacciones for specific ave
 * GET /api/v1/finanzas/transacciones/ave/:aveId
 */
const getTransaccionesByAve = async (req, res) => {
  const { aveId } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, codigo_identidad, linea_genetica FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [aveId, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  const countResult = await db.query(
    'SELECT COUNT(*) FROM transacciones WHERE ave_id = $1 AND deleted_at IS NULL',
    [aveId]
  );
  const total = parseInt(countResult.rows[0].count);

  const { rows } = await db.query(
    `SELECT
      t.*,
      c.nombre as categoria_nombre,
      c.icono as categoria_icono,
      c.color as categoria_color
    FROM transacciones t
    JOIN categorias_transaccion c ON t.categoria_id = c.id
    WHERE t.ave_id = $1 AND t.deleted_at IS NULL
    ORDER BY t.fecha DESC
    LIMIT $2 OFFSET $3`,
    [aveId, limit, offset]
  );

  // Totals for this ave
  const { rows: totals } = await db.query(
    `SELECT
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0) as total_ingresos,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0) as total_egresos
    FROM transacciones
    WHERE ave_id = $1 AND deleted_at IS NULL`,
    [aveId]
  );

  res.json({
    success: true,
    data: {
      ave: ave[0],
      transacciones: rows,
      totales: {
        ingresos: parseFloat(totals[0].total_ingresos),
        egresos: parseFloat(totals[0].total_egresos),
        balance: parseFloat(totals[0].total_ingresos) - parseFloat(totals[0].total_egresos)
      }
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
 * Create transaccion
 * POST /api/v1/finanzas/transacciones
 */
const createTransaccion = async (req, res) => {
  const {
    categoria_id,
    ave_id,
    tipo,
    monto,
    fecha,
    descripcion,
    metodo_pago,
    comprobante,
    tags
  } = req.body;

  // Verify category exists and matches tipo
  const { rows: categoria } = await db.query(
    'SELECT id, nombre, tipo FROM categorias_transaccion WHERE id = $1 AND activa = true',
    [categoria_id]
  );

  if (categoria.length === 0) {
    throw Errors.notFound('Categoría');
  }

  if (categoria[0].tipo !== tipo) {
    throw Errors.badRequest(`La categoría "${categoria[0].nombre}" es de tipo ${categoria[0].tipo}, no ${tipo}`);
  }

  // Verify ave ownership if provided
  if (ave_id) {
    const { rows: ave } = await db.query(
      'SELECT id FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
      [ave_id, req.userId]
    );
    if (ave.length === 0) {
      throw Errors.notFound('Ave');
    }
  }

  const { rows } = await db.query(
    `INSERT INTO transacciones (
      usuario_id, ave_id, categoria_id, tipo, monto, fecha,
      descripcion, metodo_pago, comprobante, tags
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      req.userId, ave_id || null, categoria_id, tipo, monto, fecha,
      descripcion || null, metodo_pago || null, comprobante || null,
      tags ? JSON.stringify(tags) : null
    ]
  );

  logger.info(`Transaccion created: ${tipo} $${monto} by user ${req.userId}`);

  res.status(201).json({
    success: true,
    message: 'Transacción registrada exitosamente',
    data: {
      ...rows[0],
      categoria_nombre: categoria[0].nombre
    }
  });
};

/**
 * Update transaccion
 * PUT /api/v1/finanzas/transacciones/:id
 */
const updateTransaccion = async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { rows: existing } = await db.query(
    'SELECT id FROM transacciones WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [id, req.userId]
  );

  if (existing.length === 0) {
    throw Errors.notFound('Transacción');
  }

  const allowedFields = [
    'categoria_id', 'ave_id', 'monto', 'fecha',
    'descripcion', 'metodo_pago', 'comprobante', 'tags'
  ];

  const updateFields = [];
  const values = [];
  let paramIndex = 1;

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateFields.push(`${field} = $${paramIndex++}`);
      if (field === 'tags') {
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
    `UPDATE transacciones SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  res.json({
    success: true,
    message: 'Transacción actualizada',
    data: rows[0]
  });
};

/**
 * Delete transaccion (soft delete)
 * DELETE /api/v1/finanzas/transacciones/:id
 */
const deleteTransaccion = async (req, res) => {
  const { id } = req.params;

  const { rowCount } = await db.query(
    'UPDATE transacciones SET deleted_at = NOW() WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [id, req.userId]
  );

  if (rowCount === 0) {
    throw Errors.notFound('Transacción');
  }

  res.json({
    success: true,
    message: 'Transacción eliminada'
  });
};

// ============================================
// DASHBOARD
// ============================================

/**
 * Get financial dashboard
 * GET /api/v1/finanzas/dashboard
 */
const getDashboard = async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  // Use database function
  const { rows } = await db.query(
    'SELECT * FROM dashboard_financiero($1, $2, $3)',
    [req.userId, fecha_inicio || null, fecha_fin || null]
  );

  const dashboard = rows[0] || {
    total_ingresos: 0,
    total_egresos: 0,
    balance: 0,
    ingresos_por_categoria: {},
    egresos_por_categoria: {},
    transacciones_por_mes: {},
    top_aves_rentables: []
  };

  res.json({
    success: true,
    data: dashboard
  });
};

/**
 * Get monthly summary
 * GET /api/v1/finanzas/resumen-mensual
 */
const getResumenMensual = async (req, res) => {
  const { meses = 12 } = req.query;

  const { rows } = await db.query(
    `SELECT
      TO_CHAR(fecha, 'YYYY-MM') as mes,
      TO_CHAR(fecha, 'Mon YYYY') as mes_nombre,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0) as ingresos,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0) as egresos,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0) -
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0) as balance,
      COUNT(*) as num_transacciones
    FROM transacciones
    WHERE usuario_id = $1
      AND deleted_at IS NULL
      AND fecha >= CURRENT_DATE - ($2 || ' months')::INTERVAL
    GROUP BY TO_CHAR(fecha, 'YYYY-MM'), TO_CHAR(fecha, 'Mon YYYY')
    ORDER BY mes DESC`,
    [req.userId, parseInt(meses)]
  );

  // Calculate totals
  const totales = rows.reduce((acc, row) => ({
    ingresos: acc.ingresos + parseFloat(row.ingresos),
    egresos: acc.egresos + parseFloat(row.egresos),
    transacciones: acc.transacciones + parseInt(row.num_transacciones)
  }), { ingresos: 0, egresos: 0, transacciones: 0 });

  res.json({
    success: true,
    data: {
      meses: rows,
      totales: {
        ...totales,
        balance: totales.ingresos - totales.egresos
      }
    }
  });
};

/**
 * Get category breakdown
 * GET /api/v1/finanzas/por-categoria
 */
const getPorCategoria = async (req, res) => {
  const { tipo, fecha_inicio, fecha_fin } = req.query;

  let dateCondition = '';
  const params = [req.userId];
  let paramIndex = 2;

  if (fecha_inicio) {
    dateCondition += ` AND t.fecha >= $${paramIndex++}`;
    params.push(fecha_inicio);
  }

  if (fecha_fin) {
    dateCondition += ` AND t.fecha <= $${paramIndex++}`;
    params.push(fecha_fin);
  }

  let tipoCondition = '';
  if (tipo) {
    tipoCondition = ` AND t.tipo = $${paramIndex++}`;
    params.push(tipo);
  }

  const { rows } = await db.query(
    `SELECT
      c.id as categoria_id,
      c.nombre as categoria,
      c.icono,
      c.color,
      c.tipo,
      COUNT(*) as num_transacciones,
      SUM(t.monto) as total,
      ROUND(AVG(t.monto)::numeric, 2) as promedio
    FROM transacciones t
    JOIN categorias_transaccion c ON t.categoria_id = c.id
    WHERE t.usuario_id = $1 AND t.deleted_at IS NULL ${dateCondition} ${tipoCondition}
    GROUP BY c.id, c.nombre, c.icono, c.color, c.tipo
    ORDER BY total DESC`,
    params
  );

  // Calculate percentages
  const totalGeneral = rows.reduce((sum, row) => sum + parseFloat(row.total), 0);
  const conPorcentaje = rows.map(row => ({
    ...row,
    total: parseFloat(row.total),
    promedio: parseFloat(row.promedio),
    porcentaje: totalGeneral > 0 ? Math.round((parseFloat(row.total) / totalGeneral) * 100 * 10) / 10 : 0
  }));

  res.json({
    success: true,
    data: {
      categorias: conPorcentaje,
      total_general: totalGeneral
    }
  });
};

// ============================================
// ROI POR AVE
// ============================================

/**
 * Get ROI for specific ave
 * GET /api/v1/finanzas/roi/ave/:aveId
 */
const getRoiAve = async (req, res) => {
  const { aveId } = req.params;

  // Verify ownership
  const { rows: ave } = await db.query(
    'SELECT id, codigo_identidad, linea_genetica, fecha_nacimiento, precio_compra FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [aveId, req.userId]
  );

  if (ave.length === 0) {
    throw Errors.notFound('Ave');
  }

  // Use database function
  const { rows } = await db.query(
    'SELECT * FROM calcular_roi_ave($1)',
    [aveId]
  );

  const roi = rows[0] || {
    total_ingresos: 0,
    total_egresos: 0,
    ganancia_neta: 0,
    roi_porcentaje: 0,
    costo_promedio_mensual: 0,
    meses_activo: 1,
    desglose_egresos: {},
    desglose_ingresos: {}
  };

  res.json({
    success: true,
    data: {
      ave: ave[0],
      roi: {
        ...roi,
        total_ingresos: parseFloat(roi.total_ingresos) || 0,
        total_egresos: parseFloat(roi.total_egresos) || 0,
        ganancia_neta: parseFloat(roi.ganancia_neta) || 0,
        roi_porcentaje: parseFloat(roi.roi_porcentaje) || 0,
        costo_promedio_mensual: parseFloat(roi.costo_promedio_mensual) || 0
      }
    }
  });
};

/**
 * Get ROI ranking for all aves
 * GET /api/v1/finanzas/roi/ranking
 */
const getRoiRanking = async (req, res) => {
  const { limit = 10 } = req.query;

  const { rows } = await db.query(
    `WITH roi_aves AS (
      SELECT
        a.id,
        a.codigo_identidad,
        a.linea_genetica,
        a.fecha_nacimiento,
        COALESCE(SUM(t.monto) FILTER (WHERE t.tipo = 'ingreso'), 0) as ingresos,
        COALESCE(SUM(t.monto) FILTER (WHERE t.tipo = 'egreso'), 0) as egresos,
        COALESCE(SUM(t.monto) FILTER (WHERE t.tipo = 'ingreso'), 0) -
          COALESCE(SUM(t.monto) FILTER (WHERE t.tipo = 'egreso'), 0) as ganancia,
        COUNT(t.id) as num_transacciones
      FROM aves a
      LEFT JOIN transacciones t ON a.id = t.ave_id AND t.deleted_at IS NULL
      WHERE a.usuario_id = $1 AND a.deleted_at IS NULL
      GROUP BY a.id, a.codigo_identidad, a.linea_genetica, a.fecha_nacimiento
      HAVING COUNT(t.id) > 0
    )
    SELECT
      *,
      CASE
        WHEN egresos > 0 THEN ROUND(((ingresos - egresos) / egresos * 100)::numeric, 2)
        ELSE 0
      END as roi_porcentaje
    FROM roi_aves
    ORDER BY ganancia DESC
    LIMIT $2`,
    [req.userId, parseInt(limit)]
  );

  res.json({
    success: true,
    data: rows.map((row, idx) => ({
      posicion: idx + 1,
      ...row,
      ingresos: parseFloat(row.ingresos),
      egresos: parseFloat(row.egresos),
      ganancia: parseFloat(row.ganancia),
      roi_porcentaje: parseFloat(row.roi_porcentaje)
    }))
  });
};

// ============================================
// ESTADÍSTICAS RÁPIDAS
// ============================================

/**
 * Get quick stats
 * GET /api/v1/finanzas/stats
 */
const getStats = async (req, res) => {
  const { periodo = 'mes' } = req.query;

  let dateCondition;
  switch (periodo) {
    case 'semana':
      dateCondition = "fecha >= CURRENT_DATE - INTERVAL '7 days'";
      break;
    case 'mes':
      dateCondition = "fecha >= DATE_TRUNC('month', CURRENT_DATE)";
      break;
    case 'año':
      dateCondition = "fecha >= DATE_TRUNC('year', CURRENT_DATE)";
      break;
    case 'todo':
      dateCondition = '1=1';
      break;
    default:
      dateCondition = "fecha >= DATE_TRUNC('month', CURRENT_DATE)";
  }

  const { rows } = await db.query(
    `SELECT
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0) as ingresos,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0) as egresos,
      COUNT(*) FILTER (WHERE tipo = 'ingreso') as num_ingresos,
      COUNT(*) FILTER (WHERE tipo = 'egreso') as num_egresos,
      COUNT(DISTINCT ave_id) FILTER (WHERE ave_id IS NOT NULL) as aves_con_movimientos
    FROM transacciones
    WHERE usuario_id = $1 AND deleted_at IS NULL AND ${dateCondition}`,
    [req.userId]
  );

  const stats = rows[0];
  const ingresos = parseFloat(stats.ingresos);
  const egresos = parseFloat(stats.egresos);

  res.json({
    success: true,
    data: {
      periodo,
      ingresos,
      egresos,
      balance: ingresos - egresos,
      num_ingresos: parseInt(stats.num_ingresos),
      num_egresos: parseInt(stats.num_egresos),
      total_transacciones: parseInt(stats.num_ingresos) + parseInt(stats.num_egresos),
      aves_con_movimientos: parseInt(stats.aves_con_movimientos)
    }
  });
};

module.exports = {
  // Categorías
  getCategorias,
  // Transacciones
  listTransacciones,
  getTransaccionById,
  getTransaccionesByAve,
  createTransaccion,
  updateTransaccion,
  deleteTransaccion,
  // Dashboard
  getDashboard,
  getResumenMensual,
  getPorCategoria,
  // ROI
  getRoiAve,
  getRoiRanking,
  // Stats
  getStats
};
