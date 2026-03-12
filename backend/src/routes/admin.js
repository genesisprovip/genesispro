/**
 * Admin Routes - Full management panel
 */
const express = require('express');
const { body, query, param } = require('express-validator');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateRequest } = require('../middleware/validator');
const logger = require('../config/logger');

// All admin routes require auth + admin role
router.use(authenticateJWT);
router.use(requireAdmin);

// ============================================
// DASHBOARD STATS
// ============================================

router.get('/dashboard', asyncHandler(async (req, res) => {
  const safe = (promise, fallback) => promise.catch(() => ({ rows: [fallback] }));

  const [
    usersRes,
    empresariosRes,
    avesRes,
    eventosRes,
    suscripcionesRes,
    ingresosRes,
    recentUsersRes,
    activeStreamsRes,
  ] = await Promise.all([
    safe(db.query(`SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE activo = true AND deleted_at IS NULL) as activos,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as nuevos_30d,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as nuevos_7d
      FROM usuarios`), { total: 0, activos: 0, nuevos_30d: 0, nuevos_7d: 0 }),
    safe(db.query(`SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE plan_empresario = 'empresario_basico') as basico,
      COUNT(*) FILTER (WHERE plan_empresario = 'empresario_pro') as pro,
      COUNT(*) FILTER (WHERE plan_empresario = 'empresario_premium') as premium
      FROM usuarios WHERE plan_empresario IS NOT NULL`), { total: 0, basico: 0, pro: 0, premium: 0 }),
    safe(db.query(`SELECT COUNT(*) as total FROM aves WHERE deleted_at IS NULL`), { total: 0 }),
    safe(db.query(`SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE estado = 'en_curso') as en_curso,
      COUNT(*) FILTER (WHERE estado = 'programado') as programados,
      COUNT(*) FILTER (WHERE estado = 'finalizado') as finalizados
      FROM eventos_palenque WHERE deleted_at IS NULL`), { total: 0, en_curso: 0, programados: 0, finalizados: 0 }),
    safe(db.query(`SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE estado = 'activa') as activas
      FROM suscripciones`), { total: 0, activas: 0 }),
    safe(db.query(`SELECT
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0) as ingresos,
      COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0) as egresos
      FROM transacciones WHERE fecha > NOW() - INTERVAL '30 days'`), { ingresos: 0, egresos: 0 }),
    safe(db.query(`SELECT id, email, nombre, rol, plan_actual, plan_empresario, created_at
      FROM usuarios WHERE deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 10`), []),
    safe(db.query(`SELECT COUNT(*) as total FROM streams_evento WHERE estado = 'activo'`), { total: 0 }),
  ]);

  res.json({
    success: true,
    data: {
      usuarios: usersRes.rows[0],
      empresarios: empresariosRes.rows[0],
      aves: avesRes.rows[0],
      eventos: eventosRes.rows[0],
      suscripciones: suscripcionesRes.rows[0],
      ingresos_30d: ingresosRes.rows[0],
      usuarios_recientes: recentUsersRes.rows,
      streams_activos: parseInt(activeStreamsRes.rows[0].total),
    }
  });
}));

// ============================================
// USERS MANAGEMENT
// ============================================

router.get('/usuarios', asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, search, rol, plan, activo } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = 'WHERE deleted_at IS NULL';
  const params = [];
  let paramIdx = 1;

  if (search) {
    where += ` AND (email ILIKE $${paramIdx} OR nombre ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }
  if (rol) {
    where += ` AND rol = $${paramIdx}`;
    params.push(rol);
    paramIdx++;
  }
  if (plan) {
    where += ` AND plan_actual = $${paramIdx}`;
    params.push(plan);
    paramIdx++;
  }
  if (activo !== undefined) {
    where += ` AND activo = $${paramIdx}`;
    params.push(activo === 'true');
    paramIdx++;
  }

  const countRes = await db.query(`SELECT COUNT(*) FROM usuarios ${where}`, params);
  const total = parseInt(countRes.rows[0].count);

  const { rows } = await db.query(
    `SELECT id, email, nombre, telefono, ubicacion, rol, plan_actual, plan_empresario,
      suscripcion_activa_id, activo, email_verificado, ultimo_acceso, created_at, updated_at
    FROM usuarios ${where}
    ORDER BY created_at DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, parseInt(limit), offset]
  );

  res.json({
    success: true,
    data: rows,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    }
  });
}));

router.get('/usuarios/:id',
  param('id').isUUID(),
  validateRequest,
  asyncHandler(async (req, res) => {
    const { rows } = await db.query(
      `SELECT id, email, nombre, telefono, ubicacion, rol, plan_actual, plan_empresario,
        activo, email_verificado, ultimo_acceso, created_at, updated_at,
        (SELECT COUNT(*) FROM aves WHERE usuario_id = u.id AND deleted_at IS NULL) as total_aves,
        (SELECT COUNT(*) FROM combates c JOIN aves a ON c.macho_id = a.id WHERE a.usuario_id = u.id AND c.deleted_at IS NULL) as total_combates,
        (SELECT COUNT(*) FROM eventos_palenque WHERE organizador_id = u.id AND deleted_at IS NULL) as total_eventos
      FROM usuarios u WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Usuario no encontrado' } });
    }

    res.json({ success: true, data: rows[0] });
  })
);

router.put('/usuarios/:id',
  param('id').isUUID(),
  validateRequest,
  asyncHandler(async (req, res) => {
    const { nombre, telefono, ubicacion, rol, plan_actual, plan_empresario, activo } = req.body;
    const updates = [];
    const params = [];
    let idx = 1;

    if (nombre !== undefined) { updates.push(`nombre = $${idx++}`); params.push(nombre); }
    if (telefono !== undefined) { updates.push(`telefono = $${idx++}`); params.push(telefono); }
    if (ubicacion !== undefined) { updates.push(`ubicacion = $${idx++}`); params.push(ubicacion); }
    if (rol !== undefined) { updates.push(`rol = $${idx++}`); params.push(rol); }
    if (plan_actual !== undefined) { updates.push(`plan_actual = $${idx++}`); params.push(plan_actual); }
    if (plan_empresario !== undefined) { updates.push(`plan_empresario = $${idx++}`); params.push(plan_empresario || null); }
    if (activo !== undefined) { updates.push(`activo = $${idx++}`); params.push(activo); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'No hay campos para actualizar' } });
    }

    updates.push(`updated_at = NOW()`);
    params.push(req.params.id);

    const { rows } = await db.query(
      `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL
       RETURNING id, email, nombre, rol, plan_actual, plan_empresario, activo`,
      params
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Usuario no encontrado' } });
    }

    logger.info(`Admin ${req.userId} updated user ${req.params.id}:`, req.body);
    res.json({ success: true, data: rows[0] });
  })
);

// Reset user password (admin sets new password)
router.post('/usuarios/:id/reset-password',
  param('id').isUUID(),
  body('password').isLength({ min: 6 }).withMessage('Minimo 6 caracteres'),
  validateRequest,
  asyncHandler(async (req, res) => {
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(req.body.password, salt);

    await db.query(
      `UPDATE usuarios SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [hash, req.params.id]
    );

    // Revoke all refresh tokens
    await db.query(
      `UPDATE refresh_tokens SET revoked = true, revoked_at = NOW(), revoked_reason = 'admin_reset'
       WHERE usuario_id = $1 AND revoked = false`,
      [req.params.id]
    );

    logger.info(`Admin ${req.userId} reset password for user ${req.params.id}`);
    res.json({ success: true, message: 'Contraseña actualizada' });
  })
);

// Soft delete user
router.delete('/usuarios/:id',
  param('id').isUUID(),
  validateRequest,
  asyncHandler(async (req, res) => {
    if (req.params.id === req.userId) {
      return res.status(400).json({ success: false, error: { message: 'No puedes eliminar tu propia cuenta de admin' } });
    }

    await db.query(
      `UPDATE usuarios SET deleted_at = NOW(), activo = false, updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    logger.info(`Admin ${req.userId} deleted user ${req.params.id}`);
    res.json({ success: true, message: 'Usuario eliminado' });
  })
);

// ============================================
// EMPRESARIO MANAGEMENT
// ============================================

// Grant empresario access
router.post('/empresarios/grant',
  body('usuario_id').isUUID(),
  body('plan').isIn(['empresario_basico', 'empresario_pro', 'empresario_premium']),
  validateRequest,
  asyncHandler(async (req, res) => {
    const { usuario_id, plan } = req.body;

    const { rows } = await db.query(
      `UPDATE usuarios SET plan_empresario = $1, rol = 'empresario', updated_at = NOW()
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, email, nombre, plan_empresario, rol`,
      [plan, usuario_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Usuario no encontrado' } });
    }

    logger.info(`Admin ${req.userId} granted empresario ${plan} to user ${usuario_id}`);
    res.json({ success: true, data: rows[0], message: `Plan ${plan} asignado exitosamente` });
  })
);

// Revoke empresario access
router.post('/empresarios/revoke',
  body('usuario_id').isUUID(),
  validateRequest,
  asyncHandler(async (req, res) => {
    const { usuario_id } = req.body;

    const { rows } = await db.query(
      `UPDATE usuarios SET plan_empresario = NULL, rol = 'usuario', updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, email, nombre, plan_empresario, rol`,
      [usuario_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Usuario no encontrado' } });
    }

    logger.info(`Admin ${req.userId} revoked empresario from user ${usuario_id}`);
    res.json({ success: true, data: rows[0], message: 'Acceso empresario revocado' });
  })
);

// List all empresarios
router.get('/empresarios', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.nombre, u.telefono, u.plan_empresario, u.rol,
      u.activo, u.created_at, u.ultimo_acceso,
      (SELECT COUNT(*) FROM eventos_palenque ep WHERE ep.organizador_id = u.id AND ep.deleted_at IS NULL) as total_eventos,
      (SELECT COUNT(*) FROM streams_evento se WHERE se.usuario_id = u.id AND se.estado = 'activo') as streams_activos
    FROM usuarios u
    WHERE u.plan_empresario IS NOT NULL AND u.deleted_at IS NULL
    ORDER BY u.created_at DESC`
  );

  res.json({ success: true, data: rows });
}));

// ============================================
// EVENTS OVERVIEW
// ============================================

router.get('/eventos', asyncHandler(async (req, res) => {
  const { estado, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = 'WHERE ep.deleted_at IS NULL';
  const params = [];
  let idx = 1;

  if (estado) {
    where += ` AND ep.estado = $${idx++}`;
    params.push(estado);
  }

  const { rows } = await db.query(
    `SELECT ep.*, u.nombre as organizador_nombre, u.email as organizador_email,
      (SELECT COUNT(*) FROM participantes_evento pe WHERE pe.evento_id = ep.id) as total_participantes,
      (SELECT COUNT(*) FROM peleas pel WHERE pel.evento_id = ep.id) as total_peleas_registradas
    FROM eventos_palenque ep
    JOIN usuarios u ON u.id = ep.organizador_id
    ${where}
    ORDER BY ep.created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}`,
    [...params, parseInt(limit), offset]
  );

  res.json({ success: true, data: rows });
}));

// ============================================
// SUBSCRIPTIONS
// ============================================

router.get('/suscripciones', asyncHandler(async (req, res) => {
  const safe = (p, fb) => p.catch(() => ({ rows: [fb] }));

  const [userSubsRes, empSubsRes, userDetailRes, empDetailRes, revenueRes] = await Promise.all([
    safe(db.query(`SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE estado = 'activa') as activas,
      COUNT(*) FILTER (WHERE estado = 'cancelada') as canceladas,
      COUNT(*) FILTER (WHERE estado = 'vencida') as vencidas,
      COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as nuevas_30d
      FROM suscripciones`), { total: 0, activas: 0, canceladas: 0, vencidas: 0, pendientes: 0, nuevas_30d: 0 }),
    safe(db.query(`SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE estado = 'activa') as activas,
      COUNT(*) FILTER (WHERE estado = 'cancelada') as canceladas
      FROM suscripciones_empresario`), { total: 0, activas: 0, canceladas: 0 }),
    safe(db.query(`SELECT s.*, u.email, u.nombre, p.nombre as plan_nombre
      FROM suscripciones s
      JOIN usuarios u ON u.id = s.usuario_id
      LEFT JOIN planes p ON p.id = s.plan_id
      ORDER BY s.created_at DESC LIMIT 50`), []),
    safe(db.query(`SELECT se.*, u.email, u.nombre
      FROM suscripciones_empresario se
      JOIN usuarios u ON u.id = se.usuario_id
      ORDER BY se.created_at DESC LIMIT 50`), []),
    safe(db.query(`SELECT
      COUNT(*) FILTER (WHERE u.plan_actual = 'basico') as usuarios_basico,
      COUNT(*) FILTER (WHERE u.plan_actual = 'pro') as usuarios_pro,
      COUNT(*) FILTER (WHERE u.plan_actual = 'premium') as usuarios_premium,
      COUNT(*) FILTER (WHERE u.plan_actual = 'trial') as usuarios_trial,
      COUNT(*) FILTER (WHERE u.plan_actual IS NULL OR u.plan_actual = '') as usuarios_sin_plan
      FROM usuarios u WHERE u.deleted_at IS NULL`), { usuarios_basico: 0, usuarios_pro: 0, usuarios_premium: 0, usuarios_trial: 0, usuarios_sin_plan: 0 }),
  ]);

  res.json({
    success: true,
    data: {
      usuario_subs: userSubsRes.rows[0],
      empresario_subs: empSubsRes.rows[0],
      usuario_subs_detalle: userDetailRes.rows || [],
      empresario_subs_detalle: empDetailRes.rows || [],
      planes_distribucion: revenueRes.rows[0],
    }
  });
}));

// ============================================
// DATABASE TABLES OVERVIEW
// ============================================

router.get('/database', asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT
      schemaname, tablename,
      pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) as size,
      (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.tablename) as columns
    FROM pg_tables t
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC
  `);

  // Get row counts for key tables
  const counts = await Promise.all([
    db.query(`SELECT 'usuarios' as t, COUNT(*) as c FROM usuarios WHERE deleted_at IS NULL`),
    db.query(`SELECT 'aves' as t, COUNT(*) as c FROM aves WHERE deleted_at IS NULL`),
    db.query(`SELECT 'combates' as t, COUNT(*) as c FROM combates WHERE deleted_at IS NULL`),
    db.query(`SELECT 'eventos_palenque' as t, COUNT(*) as c FROM eventos_palenque WHERE deleted_at IS NULL`),
    db.query(`SELECT 'peleas' as t, COUNT(*) as c FROM peleas`),
    db.query(`SELECT 'vacunas' as t, COUNT(*) as c FROM vacunas`),
    db.query(`SELECT 'transacciones' as t, COUNT(*) as c FROM transacciones`),
    db.query(`SELECT 'suscripciones' as t, COUNT(*) as c FROM suscripciones`),
    db.query(`SELECT 'push_tokens' as t, COUNT(*) as c FROM push_tokens WHERE activo = true`),
    db.query(`SELECT 'chat_mensajes' as t, COUNT(*) as c FROM chat_mensajes`),
    db.query(`SELECT 'alimentos' as t, COUNT(*) as c FROM alimentos`),
    db.query(`SELECT 'streams_evento' as t, COUNT(*) as c FROM streams_evento`),
  ].map(p => p.catch(() => ({ rows: [{ t: '?', c: 0 }] }))));

  const rowCounts = {};
  counts.forEach(r => { rowCounts[r.rows[0].t] = parseInt(r.rows[0].c); });

  res.json({ success: true, data: { tables: rows, row_counts: rowCounts } });
}));

// ============================================
// SYSTEM LOGS / ACTIVITY
// ============================================

router.get('/activity', asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `(SELECT 'registro' as tipo, u.nombre as detalle, u.email, u.created_at as fecha
     FROM usuarios u WHERE u.deleted_at IS NULL ORDER BY u.created_at DESC LIMIT 15)
     UNION ALL
     (SELECT 'evento' as tipo, ep.nombre as detalle, u.email, ep.created_at as fecha
     FROM eventos_palenque ep JOIN usuarios u ON u.id = ep.organizador_id
     WHERE ep.deleted_at IS NULL ORDER BY ep.created_at DESC LIMIT 15)
     UNION ALL
     (SELECT 'combate' as tipo, CONCAT('Pelea #', p.numero_pelea) as detalle, ep.nombre as email, p.created_at as fecha
     FROM peleas p JOIN eventos_palenque ep ON ep.id = p.evento_id
     ORDER BY p.created_at DESC LIMIT 15)
     UNION ALL
     (SELECT 'stream' as tipo, CONCAT(ep.nombre, ' - ', se.estado) as detalle, u.email, se.created_at as fecha
     FROM streams_evento se JOIN eventos_palenque ep ON ep.id = se.evento_id JOIN usuarios u ON u.id = se.usuario_id
     ORDER BY se.created_at DESC LIMIT 10)
     ORDER BY fecha DESC LIMIT 50`
  );

  res.json({ success: true, data: rows });
}));

// ============================================
// SEND EMAIL (admin utility)
// ============================================

router.post('/send-email', asyncHandler(async (req, res) => {
  const { to, subject, html } = req.body;
  if (!to || !subject || !html) {
    return res.status(400).json({ success: false, error: { message: 'to, subject y html requeridos' } });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return res.status(500).json({ success: false, error: { message: 'RESEND_API_KEY no configurada' } });
  }

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || 'GenesisPro <noreply@genesispro.vip>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });
  const data = await resendRes.json();

  if (!resendRes.ok) throw new Error(data.message || 'Error enviando email');
  logger.info(`Admin ${req.userId} sent email to ${to}: ${subject}`);
  res.json({ success: true, data });
}));

module.exports = router;
