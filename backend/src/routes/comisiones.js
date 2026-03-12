/**
 * GenesisPro - Comisiones Empresario Routes
 * Commission system for empresario referrals
 *
 * Business rules:
 *   Month 1:    20% of referred user's subscription amount
 *   Months 2-12: 3% passive commission
 *   Month 13+:  $0 (no more commissions)
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateJWT } = require('../middleware/auth');
const { Errors, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// All routes require auth
router.use(authenticateJWT);

// Middleware: verify user is empresario
const requireEmpresario = asyncHandler(async (req, res, next) => {
  const { rows: [user] } = await db.query(
    'SELECT plan_empresario FROM usuarios WHERE id = $1 AND deleted_at IS NULL',
    [req.userId]
  );

  if (!user) throw Errors.notFound('Usuario');
  if (!user.plan_empresario) {
    throw Errors.forbidden('Necesitas una membresia empresario para acceder a comisiones');
  }

  req.planEmpresario = user.plan_empresario;
  next();
});

router.use(requireEmpresario);

/**
 * Calculate commissions on-the-fly for a given empresario.
 * For each referido (where referido_por = empresario_id):
 *   - Find their active subscription and its plan price
 *   - Calculate months since referral registration
 *   - Month 1: 20%, Months 2-12: 3%, Month 13+: $0
 */
async function calcularComisiones(empresarioId) {
  // Get all users referred by this empresario, with their subscription info
  const { rows: referidos } = await db.query(
    `SELECT
       u.id AS referido_id,
       u.nombre AS referido_nombre,
       u.email AS referido_email,
       u.plan_actual,
       u.created_at AS fecha_registro,
       s.estado AS sub_estado,
       s.fecha_inicio AS sub_inicio,
       p.precio_mensual,
       p.nombre AS plan_nombre
     FROM usuarios u
     LEFT JOIN suscripciones s ON s.usuario_id = u.id AND s.estado = 'activa'
     LEFT JOIN planes p ON p.id = s.plan_id
     WHERE u.referido_por = $1
       AND u.deleted_at IS NULL
     ORDER BY u.created_at DESC`,
    [empresarioId]
  );

  const ahora = new Date();
  const comisionesDetalle = [];
  let totalGanado = 0;
  let totalPendiente = 0;
  let totalPagado = 0;

  for (const ref of referidos) {
    const fechaRegistro = new Date(ref.fecha_registro);
    const mesesDesdeRegistro = monthsDiff(fechaRegistro, ahora);
    const precioMensual = parseFloat(ref.precio_mensual || 0);

    // No active subscription or free plan => no commission
    if (!ref.sub_estado || precioMensual <= 0) {
      comisionesDetalle.push({
        referido_id: ref.referido_id,
        referido_nombre: ref.referido_nombre,
        referido_email: ref.referido_email,
        plan: ref.plan_nombre || ref.plan_actual || 'sin_plan',
        fecha_registro: ref.fecha_registro,
        meses_desde_registro: mesesDesdeRegistro,
        precio_suscripcion: precioMensual,
        porcentaje_actual: 0,
        comision_actual: 0,
        estado_comision: 'sin_suscripcion',
        comisiones_por_mes: [],
      });
      continue;
    }

    // Calculate commissions for each month since registration (up to 12 months)
    const maxMeses = Math.min(mesesDesdeRegistro, 12);
    const comisionesMes = [];
    let totalRef = 0;

    for (let mes = 1; mes <= maxMeses; mes++) {
      const porcentaje = mes === 1 ? 20 : 3;
      const monto = parseFloat((precioMensual * porcentaje / 100).toFixed(2));
      totalRef += monto;

      comisionesMes.push({
        mes_numero: mes,
        porcentaje,
        monto,
        periodo: formatPeriodo(fechaRegistro, mes),
      });
    }

    // Current month commission info
    const mesActual = mesesDesdeRegistro + 1; // 1-based for display
    let porcentajeActual = 0;
    let comisionActual = 0;
    let estadoComision = 'activa';

    if (mesActual === 1) {
      porcentajeActual = 20;
      comisionActual = parseFloat((precioMensual * 0.20).toFixed(2));
    } else if (mesActual >= 2 && mesActual <= 12) {
      porcentajeActual = 3;
      comisionActual = parseFloat((precioMensual * 0.03).toFixed(2));
    } else {
      estadoComision = 'expirada';
    }

    // Check if any commissions have been marked as paid in the DB
    const { rows: pagadas } = await db.query(
      `SELECT COALESCE(SUM(monto), 0) AS total_pagado
       FROM comisiones_empresario
       WHERE empresario_id = $1 AND referido_id = $2 AND estado = 'pagado'`,
      [empresarioId, ref.referido_id]
    );
    const pagadoRef = parseFloat(pagadas[0]?.total_pagado || 0);

    totalGanado += totalRef;
    totalPagado += pagadoRef;
    totalPendiente += (totalRef - pagadoRef);

    comisionesDetalle.push({
      referido_id: ref.referido_id,
      referido_nombre: ref.referido_nombre,
      referido_email: ref.referido_email,
      plan: ref.plan_nombre || ref.plan_actual,
      fecha_registro: ref.fecha_registro,
      meses_desde_registro: mesesDesdeRegistro,
      precio_suscripcion: precioMensual,
      porcentaje_actual: porcentajeActual,
      comision_actual: comisionActual,
      estado_comision: estadoComision,
      total_ganado_referido: totalRef,
      total_pagado_referido: pagadoRef,
      comisiones_por_mes: comisionesMes,
    });
  }

  return {
    totalReferidos: referidos.length,
    totalReferidosActivos: referidos.filter(r => r.sub_estado === 'activa' && parseFloat(r.precio_mensual || 0) > 0).length,
    totalGanado: parseFloat(totalGanado.toFixed(2)),
    totalPendiente: parseFloat(totalPendiente.toFixed(2)),
    totalPagado: parseFloat(totalPagado.toFixed(2)),
    detalle: comisionesDetalle,
  };
}

/**
 * Calculate the number of complete months between two dates
 */
function monthsDiff(from, to) {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const totalMonths = years * 12 + months;
  // If the day hasn't passed yet in the current month, subtract 1
  if (to.getDate() < from.getDate()) {
    return Math.max(0, totalMonths - 1);
  }
  return Math.max(0, totalMonths);
}

/**
 * Format a period string (YYYY-MM) for a given month offset from registration
 */
function formatPeriodo(fechaRegistro, mesNumero) {
  const d = new Date(fechaRegistro);
  d.setMonth(d.getMonth() + mesNumero - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// ─── GET /mis-comisiones — Commission summary for the empresario ───
router.get('/mis-comisiones', asyncHandler(async (req, res) => {
  const comisiones = await calcularComisiones(req.userId);

  res.json({
    success: true,
    data: {
      totalGanado: comisiones.totalGanado,
      totalPendiente: comisiones.totalPendiente,
      totalPagado: comisiones.totalPagado,
      totalReferidos: comisiones.totalReferidos,
      totalReferidosActivos: comisiones.totalReferidosActivos,
      // Group by month for summary view
      porMes: agruparPorMes(comisiones.detalle),
    },
  });
}));

// ─── GET /mis-comisiones/detalle — Detailed breakdown per referido ───
router.get('/mis-comisiones/detalle', asyncHandler(async (req, res) => {
  const comisiones = await calcularComisiones(req.userId);

  res.json({
    success: true,
    data: {
      totalReferidos: comisiones.totalReferidos,
      totalReferidosActivos: comisiones.totalReferidosActivos,
      totalGanado: comisiones.totalGanado,
      referidos: comisiones.detalle,
    },
  });
}));

// ─── GET /mis-comisiones/resumen — Dashboard stats ───
router.get('/mis-comisiones/resumen', asyncHandler(async (req, res) => {
  const comisiones = await calcularComisiones(req.userId);

  // Get commission rate info for current display
  const tasaInfo = {
    mes1: { porcentaje: 20, descripcion: 'Primer mes del referido' },
    meses2a12: { porcentaje: 3, descripcion: 'Meses 2 al 12' },
    mes13: { porcentaje: 0, descripcion: 'Sin comision despues del mes 12' },
  };

  res.json({
    success: true,
    data: {
      totalReferidos: comisiones.totalReferidos,
      totalReferidosActivos: comisiones.totalReferidosActivos,
      totalGanado: comisiones.totalGanado,
      pendienteDePago: comisiones.totalPendiente,
      totalPagado: comisiones.totalPagado,
      tasas: tasaInfo,
    },
  });
}));

/**
 * Group commission details by calendar month
 */
function agruparPorMes(detalle) {
  const porMes = {};

  for (const ref of detalle) {
    for (const comMes of ref.comisiones_por_mes) {
      const periodo = comMes.periodo;
      if (!porMes[periodo]) {
        porMes[periodo] = {
          periodo,
          totalComision: 0,
          referidos: 0,
        };
      }
      porMes[periodo].totalComision += comMes.monto;
      porMes[periodo].referidos += 1;
    }
  }

  // Convert to array sorted by period descending
  return Object.values(porMes)
    .map(m => ({
      ...m,
      totalComision: parseFloat(m.totalComision.toFixed(2)),
    }))
    .sort((a, b) => b.periodo.localeCompare(a.periodo));
}

module.exports = router;
