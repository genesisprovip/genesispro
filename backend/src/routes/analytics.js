const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');

router.use(authenticateJWT);

// Dashboard general
router.get('/dashboard', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM v_dashboard_usuario WHERE usuario_id = $1',
    [req.userId]
  );

  res.json({
    success: true,
    data: rows[0] || {
      total_aves: 0,
      total_machos: 0,
      total_hembras: 0,
      total_combates: 0,
      total_victorias: 0
    }
  });
}));

// Monthly trends - combates por mes (last 12 months)
router.get('/tendencias', asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', c.fecha_combate), 'YYYY-MM') as mes,
      COUNT(*)::int as total,
      COUNT(*) FILTER (WHERE c.resultado = 'victoria')::int as victorias,
      COUNT(*) FILTER (WHERE c.resultado = 'derrota')::int as derrotas,
      COUNT(*) FILTER (WHERE c.resultado = 'empate')::int as empates
    FROM combates c
    JOIN aves a ON c.macho_id = a.id
    WHERE a.usuario_id = $1
      AND c.deleted_at IS NULL
      AND c.fecha_combate >= NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', c.fecha_combate)
    ORDER BY mes ASC
  `, [req.userId]);

  res.json({ success: true, data: rows });
}));

// Top performing aves
router.get('/top-aves', asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);

  const { rows } = await db.query(`
    SELECT
      a.id,
      a.codigo_identidad,
      a.linea_genetica,
      a.sexo,
      COUNT(c.id)::int as total_combates,
      COUNT(*) FILTER (WHERE c.resultado = 'victoria')::int as victorias,
      COUNT(*) FILTER (WHERE c.resultado = 'derrota')::int as derrotas,
      COUNT(*) FILTER (WHERE c.resultado = 'empate')::int as empates,
      CASE WHEN COUNT(c.id) > 0
        THEN ROUND((COUNT(*) FILTER (WHERE c.resultado = 'victoria')::numeric / COUNT(c.id)) * 100, 1)
        ELSE 0
      END as win_rate
    FROM aves a
    LEFT JOIN combates c ON c.macho_id = a.id AND c.deleted_at IS NULL
    WHERE a.usuario_id = $1
      AND a.deleted_at IS NULL
      AND a.estado = 'activo'
    GROUP BY a.id, a.codigo_identidad, a.linea_genetica, a.sexo
    HAVING COUNT(c.id) > 0
    ORDER BY victorias DESC, win_rate DESC
    LIMIT $2
  `, [req.userId, limit]);

  res.json({ success: true, data: rows });
}));

// Per-ave detailed stats
router.get('/ave/:aveId', asyncHandler(async (req, res) => {
  const { aveId } = req.params;

  const { rows: aveRows } = await db.query(
    'SELECT id, codigo_identidad, linea_genetica FROM aves WHERE id = $1 AND usuario_id = $2 AND deleted_at IS NULL',
    [aveId, req.userId]
  );

  if (aveRows.length === 0) {
    return res.status(404).json({ success: false, error: { message: 'Ave no encontrada' } });
  }

  const { rows } = await db.query(`
    SELECT
      COUNT(*)::int as total_combates,
      COUNT(*) FILTER (WHERE resultado = 'victoria')::int as victorias,
      COUNT(*) FILTER (WHERE resultado = 'derrota')::int as derrotas,
      COUNT(*) FILTER (WHERE resultado = 'empate')::int as empates,
      MIN(fecha_combate) as primer_combate,
      MAX(fecha_combate) as ultimo_combate,
      COALESCE(AVG(peso_combate), 0) as peso_promedio
    FROM combates
    WHERE macho_id = $1 AND deleted_at IS NULL
  `, [aveId]);

  const { rows: recientes } = await db.query(`
    SELECT id, fecha_combate, resultado, ubicacion, oponente_codigo,
           peso_combate, tipo_combate, duracion_minutos
    FROM combates
    WHERE macho_id = $1 AND deleted_at IS NULL
    ORDER BY fecha_combate DESC
    LIMIT 10
  `, [aveId]);

  const { rows: vacunaRows } = await db.query(
    'SELECT COUNT(*)::int as total FROM vacunas WHERE ave_id = $1', [aveId]
  );
  const { rows: despaRows } = await db.query(
    'SELECT COUNT(*)::int as total FROM desparasitaciones WHERE ave_id = $1', [aveId]
  );
  const { rows: consultaRows } = await db.query(
    'SELECT COUNT(*)::int as total FROM consultas_veterinarias WHERE ave_id = $1', [aveId]
  );

  res.json({
    success: true,
    data: {
      ave: aveRows[0],
      estadisticas: rows[0],
      combates_recientes: recientes,
      salud: {
        vacunas: vacunaRows[0].total,
        desparasitaciones: despaRows[0].total,
        consultas: consultaRows[0].total,
      }
    }
  });
}));

// Financial summary by period
router.get('/financiero', asyncHandler(async (req, res) => {
  const periodo = req.query.periodo || '6m';
  let interval;
  switch (periodo) {
    case '1m': interval = '1 month'; break;
    case '3m': interval = '3 months'; break;
    case '12m': interval = '12 months'; break;
    case 'all': interval = '100 years'; break;
    default: interval = '6 months';
  }

  const { rows } = await db.query(`
    SELECT
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0) as total_ingresos,
      COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0) as total_egresos,
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0) as balance,
      COUNT(*)::int as total_transacciones
    FROM transacciones
    WHERE usuario_id = $1
      AND deleted_at IS NULL
      AND fecha >= NOW() - $2::interval
  `, [req.userId, interval]);

  res.json({ success: true, data: rows[0] });
}));

module.exports = router;
