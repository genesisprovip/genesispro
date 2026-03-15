/**
 * GenesisPro - Smart Alerts System
 * Proactive alert generation based on business rules.
 * Zero AI cost — pure SQL queries and logic.
 * Runs periodically to analyze each user's data and generate personalized alerts.
 */

const db = require('../config/database');
const logger = require('../config/logger');

// Plan hierarchy for upgrade suggestions
const PLAN_HIERARCHY = {
  basico: { next: 'pro', label: 'Basico' },
  pro: { next: 'premium', label: 'Pro' },
  premium: { next: null, label: 'Premium' },
};

// ─── Individual Alert Checks ───────────────────────────────────────────

/**
 * Check if user is approaching their aves limit
 */
const checkPlanLimitAves = async (userId) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM v_limites_usuario WHERE usuario_id = $1',
      [userId]
    );
    if (rows.length === 0) return null;

    const limits = rows[0];
    if (limits.max_aves === null) return null; // unlimited

    const count = parseInt(limits.aves_actuales);
    const max = parseInt(limits.max_aves);
    const percentage = Math.round((count / max) * 100);

    if (percentage < 80) return null;

    const plan = limits.plan_actual;
    const planInfo = PLAN_HIERARCHY[plan] || {};
    const nextPlan = planInfo.next;

    let mensaje;
    if (percentage >= 100) {
      mensaje = `Has alcanzado el limite de ${max} aves en tu plan ${plan}.`;
      if (nextPlan) {
        const { rows: nextRows } = await db.query(
          'SELECT max_aves FROM planes WHERE nombre = $1',
          [nextPlan]
        );
        const nextMax = nextRows.length > 0 ? nextRows[0].max_aves : '?';
        mensaje += ` Mejora a ${nextPlan} para seguir registrando (hasta ${nextMax} aves).`;
      }
    } else {
      mensaje = `Llevas ${count} de ${max} aves en tu plan ${plan}.`;
      if (nextPlan) {
        const { rows: nextRows } = await db.query(
          'SELECT max_aves FROM planes WHERE nombre = $1',
          [nextPlan]
        );
        const nextMax = nextRows.length > 0 ? nextRows[0].max_aves : '?';
        mensaje += ` El plan ${nextPlan} te permite hasta ${nextMax}.`;
      }
    }

    return {
      tipo: 'PLAN_LIMIT_AVES',
      titulo: percentage >= 100 ? 'Limite de aves alcanzado' : 'Cerca del limite de aves',
      mensaje,
      prioridad: 'alta',
      datos_extra: { count, max, plan, percentage },
    };
  } catch (err) {
    logger.error('[SmartAlerts] checkPlanLimitAves error:', err.message);
    return null;
  }
};

/**
 * Check for overdue vaccines
 */
const checkVacunasVencidas = async (userId) => {
  try {
    const { rows } = await db.query(`
      SELECT v.tipo_vacuna, v.proxima_dosis, a.codigo_identidad
      FROM vacunas v
      JOIN aves a ON v.ave_id = a.id
      WHERE a.usuario_id = $1
        AND a.deleted_at IS NULL
        AND v.proxima_dosis < NOW()
        AND (v.recordatorio_silenciado IS NULL OR v.recordatorio_silenciado = false)
      ORDER BY v.proxima_dosis ASC
    `, [userId]);

    if (rows.length === 0) return null;

    const items = rows.map(r => {
      const diasVencida = Math.floor((Date.now() - new Date(r.proxima_dosis).getTime()) / 86400000);
      return {
        ave_nombre: r.codigo_identidad,
        vacuna: r.tipo_vacuna,
        fecha: r.proxima_dosis,
        dias_vencida: diasVencida,
      };
    });

    const most = items[0];
    const mensaje = `Tienes ${items.length} vacuna(s) vencida(s). La mas urgente es '${most.vacuna || 'Vacuna'}' para ${most.ave_nombre} (vencida hace ${most.dias_vencida} dias).`;

    return {
      tipo: 'VACUNAS_VENCIDAS',
      titulo: 'Vacunas vencidas',
      mensaje,
      prioridad: 'alta',
      datos_extra: { count: items.length, items },
    };
  } catch (err) {
    logger.error('[SmartAlerts] checkVacunasVencidas error:', err.message);
    return null;
  }
};

/**
 * Check for overdue tratamientos and desparasitaciones
 */
const checkTratamientosPendientes = async (userId) => {
  try {
    const items = [];

    // Tratamientos
    const { rows: trats } = await db.query(`
      SELECT t.nombre_tratamiento, t.proxima_aplicacion, a.codigo_identidad
      FROM tratamientos t
      JOIN aves a ON t.ave_id = a.id
      WHERE a.usuario_id = $1
        AND a.deleted_at IS NULL
        AND t.proxima_aplicacion < NOW()
        AND (t.recordatorio_silenciado IS NULL OR t.recordatorio_silenciado = false)
      ORDER BY t.proxima_aplicacion ASC
    `, [userId]);

    trats.forEach(r => {
      const dias = Math.floor((Date.now() - new Date(r.proxima_aplicacion).getTime()) / 86400000);
      items.push({
        ave_nombre: r.codigo_identidad,
        tipo: 'tratamiento',
        nombre: r.nombre_tratamiento,
        dias_vencida: dias,
      });
    });

    // Desparasitaciones
    const { rows: desps } = await db.query(`
      SELECT d.producto, d.proxima_aplicacion, a.codigo_identidad
      FROM desparasitaciones d
      JOIN aves a ON d.ave_id = a.id
      WHERE a.usuario_id = $1
        AND a.deleted_at IS NULL
        AND d.proxima_aplicacion < NOW()
        AND (d.recordatorio_silenciado IS NULL OR d.recordatorio_silenciado = false)
      ORDER BY d.proxima_aplicacion ASC
    `, [userId]);

    desps.forEach(r => {
      const dias = Math.floor((Date.now() - new Date(r.proxima_aplicacion).getTime()) / 86400000);
      items.push({
        ave_nombre: r.codigo_identidad,
        tipo: 'desparasitacion',
        nombre: r.producto,
        dias_vencida: dias,
      });
    });

    if (items.length === 0) return null;

    const mensaje = `Tienes ${items.length} tratamiento(s)/desparasitacion(es) pendiente(s). Revisa el modulo de salud para actualizar.`;

    return {
      tipo: 'TRATAMIENTOS_PENDIENTES',
      titulo: 'Tratamientos pendientes',
      mensaje,
      prioridad: 'media',
      datos_extra: { count: items.length, items },
    };
  } catch (err) {
    logger.error('[SmartAlerts] checkTratamientosPendientes error:', err.message);
    return null;
  }
};

/**
 * Check for win/loss streaks in recent combates
 */
const checkRachaCombates = async (userId) => {
  try {
    const { rows } = await db.query(`
      SELECT c.resultado, c.ubicacion, c.fecha, a.codigo_identidad
      FROM combates c
      JOIN aves a ON c.macho_id = a.id
      WHERE a.usuario_id = $1
        AND c.deleted_at IS NULL
        AND c.resultado IN ('victoria', 'derrota')
      ORDER BY c.fecha DESC
      LIMIT 10
    `, [userId]);

    if (rows.length < 3) return null;

    // Count streak from most recent
    const firstResult = rows[0].resultado;
    let streakCount = 0;
    const streakCombates = [];

    for (const c of rows) {
      if (c.resultado === firstResult) {
        streakCount++;
        streakCombates.push({
          resultado: c.resultado,
          ubicacion: c.ubicacion,
          fecha: c.fecha,
          ave: c.codigo_identidad,
        });
      } else {
        break;
      }
    }

    if (streakCount < 3) return null;

    const isWin = firstResult === 'victoria';
    const lastUbicacion = rows[0].ubicacion || 'ubicacion desconocida';

    let mensaje;
    if (isWin) {
      mensaje = `Excelente racha! Llevas ${streakCount} victorias consecutivas. Tu ultimo combate fue en ${lastUbicacion}.`;
    } else {
      mensaje = `Llevas ${streakCount} derrotas consecutivas. Considera revisar tu preparacion o linea genetica.`;
    }

    return {
      tipo: 'RACHA_COMBATES',
      titulo: isWin ? 'Racha ganadora' : 'Racha de derrotas',
      mensaje,
      prioridad: 'media',
      datos_extra: {
        streak_type: isWin ? 'win' : 'loss',
        count: streakCount,
        combates: streakCombates,
      },
    };
  } catch (err) {
    logger.error('[SmartAlerts] checkRachaCombates error:', err.message);
    return null;
  }
};

/**
 * Find the best performing linea_genetica
 */
const checkLineaDestacada = async (userId) => {
  try {
    const { rows } = await db.query(`
      SELECT a.linea_genetica,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE c.resultado = 'victoria') AS victorias
      FROM combates c
      JOIN aves a ON c.macho_id = a.id
      WHERE a.usuario_id = $1
        AND a.deleted_at IS NULL
        AND c.deleted_at IS NULL
        AND a.linea_genetica IS NOT NULL
        AND a.linea_genetica != ''
        AND c.resultado IN ('victoria', 'derrota')
      GROUP BY a.linea_genetica
      HAVING COUNT(*) >= 3
      ORDER BY (COUNT(*) FILTER (WHERE c.resultado = 'victoria'))::float / COUNT(*) DESC
      LIMIT 1
    `, [userId]);

    if (rows.length === 0) return null;

    const { linea_genetica, total, victorias } = rows[0];
    const pct = Math.round((parseInt(victorias) / parseInt(total)) * 100);

    if (pct <= 60) return null;

    return {
      tipo: 'LINEA_DESTACADA',
      titulo: 'Linea genetica destacada',
      mensaje: `Tu linea ${linea_genetica} tiene un ${pct}% de victorias en ${total} combates. Es tu linea mas fuerte!`,
      prioridad: 'baja',
      datos_extra: { linea: linea_genetica, pct, total: parseInt(total), victorias: parseInt(victorias) },
    };
  } catch (err) {
    logger.error('[SmartAlerts] checkLineaDestacada error:', err.message);
    return null;
  }
};

/**
 * Check for active birds without recent combates
 */
const checkAvesSinActividad = async (userId) => {
  try {
    const { rows } = await db.query(`
      SELECT a.id, a.codigo_identidad,
        COALESCE(
          (SELECT MAX(c.fecha) FROM combates c WHERE c.macho_id = a.id AND c.deleted_at IS NULL),
          a.created_at
        ) AS ultima_actividad
      FROM aves a
      WHERE a.usuario_id = $1
        AND a.deleted_at IS NULL
        AND a.estado = 'activo'
        AND a.sexo = 'macho'
      ORDER BY ultima_actividad ASC
    `, [userId]);

    const now = Date.now();
    const threshold = 60 * 86400000; // 60 days
    const inactive = [];

    for (const ave of rows) {
      const dias = Math.floor((now - new Date(ave.ultima_actividad).getTime()) / 86400000);
      if (dias >= 60) {
        inactive.push({
          nombre: ave.codigo_identidad,
          codigo: ave.codigo_identidad,
          dias_sin_combate: dias,
        });
      }
    }

    if (inactive.length === 0) return null;

    return {
      tipo: 'AVES_SIN_ACTIVIDAD',
      titulo: 'Aves sin actividad reciente',
      mensaje: `Tienes ${inactive.length} ave(s) activa(s) sin combate en mas de 60 dias.`,
      prioridad: 'baja',
      datos_extra: { count: inactive.length, aves: inactive.slice(0, 20) },
    };
  } catch (err) {
    logger.error('[SmartAlerts] checkAvesSinActividad error:', err.message);
    return null;
  }
};

/**
 * Check for incomplete user profile
 */
const checkPerfilIncompleto = async (userId) => {
  try {
    const { rows } = await db.query(
      'SELECT nombre_gallera, foto_perfil FROM usuarios WHERE id = $1',
      [userId]
    );

    if (rows.length === 0) return null;

    const user = rows[0];
    const missing = [];

    if (!user.nombre_gallera) missing.push('nombre de gallera');
    if (!user.foto_perfil) missing.push('foto de perfil');

    if (missing.length === 0) return null;

    return {
      tipo: 'PERFIL_INCOMPLETO',
      titulo: 'Perfil incompleto',
      mensaje: `Completa tu perfil de gallera para una mejor experiencia. Te falta: ${missing.join(', ')}.`,
      prioridad: 'baja',
      datos_extra: { missing },
    };
  } catch (err) {
    logger.error('[SmartAlerts] checkPerfilIncompleto error:', err.message);
    return null;
  }
};

/**
 * Check if any bird is approaching the photos-per-bird limit
 */
const checkPlanFotosLimit = async (userId) => {
  try {
    const { rows: limRows } = await db.query(
      'SELECT max_fotos_por_ave, plan_actual FROM v_limites_usuario WHERE usuario_id = $1',
      [userId]
    );
    if (limRows.length === 0) return null;

    const { max_fotos_por_ave, plan_actual } = limRows[0];
    if (max_fotos_por_ave === null) return null; // unlimited

    const max = parseInt(max_fotos_por_ave);

    const { rows } = await db.query(`
      SELECT f.ave_id, a.codigo_identidad, COUNT(*) AS foto_count
      FROM fotos f
      JOIN aves a ON f.ave_id = a.id
      WHERE a.usuario_id = $1 AND a.deleted_at IS NULL
      GROUP BY f.ave_id, a.codigo_identidad
      HAVING COUNT(*) >= $2
      ORDER BY COUNT(*) DESC
      LIMIT 5
    `, [userId, Math.ceil(max * 0.8)]);

    if (rows.length === 0) return null;

    const items = rows.map(r => ({
      ave: r.codigo_identidad,
      fotos: parseInt(r.foto_count),
      max,
    }));

    const atLimit = items.filter(i => i.fotos >= max);
    const nearLimit = items.filter(i => i.fotos < max);

    let mensaje;
    if (atLimit.length > 0) {
      mensaje = `${atLimit.length} ave(s) alcanzaron el limite de ${max} fotos en tu plan ${plan_actual}.`;
    } else {
      mensaje = `${nearLimit.length} ave(s) estan cerca del limite de ${max} fotos por ave.`;
    }

    return {
      tipo: 'PLAN_FOTOS_LIMIT',
      titulo: 'Limite de fotos por ave',
      mensaje,
      prioridad: 'media',
      datos_extra: { items, max, plan: plan_actual },
    };
  } catch (err) {
    logger.error('[SmartAlerts] checkPlanFotosLimit error:', err.message);
    return null;
  }
};

/**
 * Check if trial is about to expire
 */
const checkBienvenidaTrial = async (userId) => {
  try {
    const { rows } = await db.query(
      'SELECT estado_cuenta, trial_fin, plan_actual FROM usuarios WHERE id = $1',
      [userId]
    );

    if (rows.length === 0) return null;

    const user = rows[0];
    if (user.estado_cuenta !== 'trial' || !user.trial_fin) return null;

    const trialEnd = new Date(user.trial_fin);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000);

    if (daysLeft < 0 || daysLeft > 5) return null;

    let mensaje;
    if (daysLeft <= 0) {
      mensaje = 'Tu trial Premium ha expirado. Elige un plan para mantener acceso a funciones avanzadas.';
    } else if (daysLeft === 1) {
      mensaje = 'Tu trial Premium termina manana. Elige un plan para no perder acceso a funciones avanzadas.';
    } else {
      mensaje = `Tu trial Premium termina en ${daysLeft} dias. Elige un plan para no perder acceso a funciones avanzadas.`;
    }

    return {
      tipo: 'BIENVENIDA_TRIAL',
      titulo: daysLeft <= 0 ? 'Trial expirado' : 'Trial por expirar',
      mensaje,
      prioridad: 'media',
      datos_extra: { days_left: daysLeft, trial_fin: user.trial_fin },
    };
  } catch (err) {
    logger.error('[SmartAlerts] checkBienvenidaTrial error:', err.message);
    return null;
  }
};

/**
 * Generate weekly summary (only on Mondays)
 */
const checkResumenSemanal = async (userId) => {
  try {
    const now = new Date();
    if (now.getDay() !== 1) return null; // Only on Mondays

    const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

    // Combates this week
    const { rows: combateRows } = await db.query(`
      SELECT c.resultado
      FROM combates c
      JOIN aves a ON c.macho_id = a.id
      WHERE a.usuario_id = $1
        AND c.deleted_at IS NULL
        AND c.created_at >= $2
    `, [userId, weekAgo]);

    const totalCombates = combateRows.length;
    const wins = combateRows.filter(r => r.resultado === 'victoria').length;
    const losses = combateRows.filter(r => r.resultado === 'derrota').length;

    // New aves this week
    const { rows: avesRows } = await db.query(
      'SELECT COUNT(*) FROM aves WHERE usuario_id = $1 AND deleted_at IS NULL AND created_at >= $2',
      [userId, weekAgo]
    );
    const newAves = parseInt(avesRows[0].count);

    // Health events this week (vacunas + tratamientos + desparasitaciones)
    let healthCount = 0;

    const { rows: vRows } = await db.query(`
      SELECT COUNT(*) FROM vacunas v
      JOIN aves a ON v.ave_id = a.id
      WHERE a.usuario_id = $1 AND v.created_at >= $2
    `, [userId, weekAgo]);
    healthCount += parseInt(vRows[0].count);

    const { rows: tRows } = await db.query(`
      SELECT COUNT(*) FROM tratamientos t
      JOIN aves a ON t.ave_id = a.id
      WHERE a.usuario_id = $1 AND t.created_at >= $2
    `, [userId, weekAgo]);
    healthCount += parseInt(tRows[0].count);

    const { rows: dRows } = await db.query(`
      SELECT COUNT(*) FROM desparasitaciones d
      JOIN aves a ON d.ave_id = a.id
      WHERE a.usuario_id = $1 AND d.created_at >= $2
    `, [userId, weekAgo]);
    healthCount += parseInt(dRows[0].count);

    // Only generate if there was any activity
    if (totalCombates === 0 && newAves === 0 && healthCount === 0) return null;

    const mensaje = `Esta semana: ${totalCombates} combates (${wins}W-${losses}L), ${newAves} aves registradas, ${healthCount} eventos de salud.`;

    return {
      tipo: 'RESUMEN_SEMANAL',
      titulo: 'Resumen semanal',
      mensaje,
      prioridad: 'baja',
      datos_extra: {
        combates: totalCombates,
        wins,
        losses,
        new_aves: newAves,
        health: healthCount,
      },
    };
  } catch (err) {
    logger.error('[SmartAlerts] checkResumenSemanal error:', err.message);
    return null;
  }
};

// ─── Main Functions ────────────────────────────────────────────────────

/**
 * Generate all alerts for a single user.
 * Returns an array of alert objects (without usuario_id — caller adds it).
 */
const generateUserAlerts = async (userId) => {
  const checks = [
    checkPlanLimitAves,
    checkVacunasVencidas,
    checkTratamientosPendientes,
    checkRachaCombates,
    checkLineaDestacada,
    checkAvesSinActividad,
    checkPerfilIncompleto,
    checkPlanFotosLimit,
    checkBienvenidaTrial,
    checkResumenSemanal,
  ];

  const results = await Promise.allSettled(
    checks.map(fn => fn(userId))
  );

  const alerts = [];
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      alerts.push(result.value);
    }
  }

  return alerts;
};

/**
 * Run smart alerts for all active users.
 * Upserts into alertas_asistente (unique constraint prevents duplicate unread alerts of same tipo).
 */
const runSmartAlerts = async () => {
  logger.info('[SmartAlerts] Starting smart alerts generation...');

  try {
    const { rows: users } = await db.query(
      'SELECT id FROM usuarios WHERE deleted_at IS NULL'
    );

    let totalAlerts = 0;
    let usersProcessed = 0;
    let errors = 0;

    for (const user of users) {
      try {
        const alerts = await generateUserAlerts(user.id);

        for (const alert of alerts) {
          try {
            await db.query(`
              INSERT INTO alertas_asistente (usuario_id, tipo, titulo, mensaje, prioridad, datos_extra)
              VALUES ($1, $2, $3, $4, $5, $6)
              ON CONFLICT (usuario_id, tipo) WHERE leida = false
              DO UPDATE SET
                titulo = EXCLUDED.titulo,
                mensaje = EXCLUDED.mensaje,
                prioridad = EXCLUDED.prioridad,
                datos_extra = EXCLUDED.datos_extra,
                updated_at = NOW()
            `, [user.id, alert.tipo, alert.titulo, alert.mensaje, alert.prioridad, JSON.stringify(alert.datos_extra)]);

            totalAlerts++;
          } catch (insertErr) {
            logger.error(`[SmartAlerts] Error inserting alert ${alert.tipo} for user ${user.id}:`, insertErr.message);
            errors++;
          }
        }

        usersProcessed++;
      } catch (userErr) {
        logger.error(`[SmartAlerts] Error processing user ${user.id}:`, userErr.message);
        errors++;
      }
    }

    logger.info(`[SmartAlerts] Complete. Users: ${usersProcessed}, Alerts: ${totalAlerts}, Errors: ${errors}`);
  } catch (err) {
    logger.error('[SmartAlerts] Fatal error:', err);
  }
};

// ─── Helper Functions ──────────────────────────────────────────────────

/**
 * Get unread alerts for a user, ordered by priority then recency.
 */
const getUserAlerts = async (userId, limit = 10) => {
  const priorityOrder = `CASE prioridad WHEN 'alta' THEN 1 WHEN 'media' THEN 2 WHEN 'baja' THEN 3 ELSE 4 END`;

  const { rows } = await db.query(`
    SELECT id, tipo, titulo, mensaje, prioridad, datos_extra, leida, created_at
    FROM alertas_asistente
    WHERE usuario_id = $1 AND leida = false
    ORDER BY ${priorityOrder}, created_at DESC
    LIMIT $2
  `, [userId, limit]);

  return rows;
};

/**
 * Mark a specific alert as read.
 */
const markAlertRead = async (alertId, userId) => {
  const { rowCount } = await db.query(
    'UPDATE alertas_asistente SET leida = true, updated_at = NOW() WHERE id = $1 AND usuario_id = $2',
    [alertId, userId]
  );
  return rowCount > 0;
};

// Start cron: run every 4 hours
const startSmartAlertsCron = () => {
  const INTERVAL = 4 * 60 * 60 * 1000; // 4 hours
  logger.info('Smart Alerts cron started (every 4 hours)');

  // Run once after 30 seconds (let DB connect first)
  setTimeout(() => {
    runSmartAlerts().catch(err => logger.error('Smart alerts initial run failed:', err.message));
  }, 30000);

  setInterval(() => {
    runSmartAlerts().catch(err => logger.error('Smart alerts cron failed:', err.message));
  }, INTERVAL);
};

module.exports = {
  generateUserAlerts,
  runSmartAlerts,
  getUserAlerts,
  markAlertRead,
  startSmartAlertsCron,
};
