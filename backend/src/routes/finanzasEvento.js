/**
 * Finanzas Evento Routes
 * Event-level financial tracking: inscriptions, fight payments, expenses, prizes
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler, Errors } = require('../middleware/errorHandler');
const { validateRequest: validate } = require('../middleware/validator');
const { body, param } = require('express-validator');
const db = require('../config/database');
const logger = require('../config/logger');

const uuidParam = (field) => param(field).isUUID().withMessage(`${field} inválido`);

// All routes require authentication
router.use(authenticateJWT);

// ─── Helper: verify user is event organizer ───
async function verificarOrganizador(eventoId, userId) {
  const { rows: [ev] } = await db.query(
    'SELECT id, organizador_id, costo_inscripcion, costo_por_pelea, premio_campeon FROM eventos_palenque WHERE id = $1 AND deleted_at IS NULL',
    [eventoId]
  );
  if (!ev) throw Errors.notFound('Evento');
  if (ev.organizador_id !== userId) throw Errors.forbidden('Solo el organizador puede gestionar finanzas');
  return ev;
}

// ─── GET /:eventoId - Financial summary ───
router.get('/:eventoId',
  uuidParam('eventoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;
    await verificarOrganizador(eventoId, req.userId);

    // Get aggregated totals
    const { rows: [totals] } = await db.query(
      `SELECT
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' AND estado = 'pagado' THEN monto END), 0) AS total_recaudado,
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' AND estado = 'pendiente' THEN monto END), 0) AS total_pendiente,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' AND estado = 'pagado' THEN monto END), 0) AS total_gastos,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' AND estado = 'pendiente' THEN monto END), 0) AS gastos_pendientes,
        COALESCE(SUM(CASE WHEN concepto = 'inscripcion' AND estado = 'pagado' THEN monto END), 0) AS inscripciones_cobradas,
        COALESCE(SUM(CASE WHEN concepto = 'inscripcion' AND estado = 'pendiente' THEN monto END), 0) AS inscripciones_pendientes,
        COUNT(DISTINCT CASE WHEN concepto = 'inscripcion' AND estado = 'pagado' THEN partido_id END) AS partidos_pagados,
        COUNT(DISTINCT CASE WHEN concepto = 'inscripcion' AND estado = 'pendiente' THEN partido_id END) AS partidos_pendientes
      FROM pagos_evento WHERE evento_id = $1 AND estado != 'cancelado'`,
      [eventoId]
    );

    // Get balance per partido
    const { rows: balances } = await db.query(
      `SELECT
        p.partido_nombre,
        p.partido_id,
        COALESCE(SUM(CASE WHEN p.tipo = 'ingreso' AND p.estado = 'pagado' THEN p.monto END), 0) AS cobrado,
        COALESCE(SUM(CASE WHEN p.tipo = 'ingreso' AND p.estado = 'pendiente' THEN p.monto END), 0) AS por_cobrar,
        COALESCE(SUM(CASE WHEN p.tipo = 'egreso' AND p.estado = 'pagado' THEN p.monto END), 0) AS pagado,
        COALESCE(SUM(CASE WHEN p.tipo = 'egreso' AND p.estado = 'pendiente' THEN p.monto END), 0) AS por_pagar,
        COUNT(CASE WHEN p.concepto = 'inscripcion' AND p.estado = 'pagado' THEN 1 END) > 0 AS inscripcion_pagada,
        COUNT(CASE WHEN p.concepto = 'pelea_ganada' THEN 1 END) AS peleas_ganadas,
        COUNT(CASE WHEN p.concepto = 'pelea_perdida' THEN 1 END) AS peleas_perdidas
      FROM pagos_evento p
      WHERE p.evento_id = $1 AND p.estado != 'cancelado' AND p.partido_nombre IS NOT NULL
      GROUP BY p.partido_nombre, p.partido_id
      ORDER BY p.partido_nombre`,
      [eventoId]
    );

    res.json({
      success: true,
      data: {
        resumen: {
          total_recaudado: parseFloat(totals.total_recaudado),
          total_pendiente: parseFloat(totals.total_pendiente),
          total_gastos: parseFloat(totals.total_gastos),
          gastos_pendientes: parseFloat(totals.gastos_pendientes),
          inscripciones_cobradas: parseFloat(totals.inscripciones_cobradas),
          inscripciones_pendientes: parseFloat(totals.inscripciones_pendientes),
          partidos_pagados: parseInt(totals.partidos_pagados),
          partidos_pendientes: parseInt(totals.partidos_pendientes),
          balance_neto: parseFloat(totals.total_recaudado) - parseFloat(totals.total_gastos),
        },
        balances,
      },
    });
  })
);

// ─── GET /:eventoId/pagos - List all payments ───
router.get('/:eventoId/pagos',
  uuidParam('eventoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;
    await verificarOrganizador(eventoId, req.userId);

    const { rows } = await db.query(
      `SELECT p.*, pe.numero_pelea
       FROM pagos_evento p
       LEFT JOIN peleas pe ON pe.id = p.pelea_id
       WHERE p.evento_id = $1
       ORDER BY p.created_at DESC`,
      [eventoId]
    );

    res.json({ success: true, data: rows });
  })
);

// ─── POST /:eventoId/pagos - Create payment record ───
router.post('/:eventoId/pagos',
  uuidParam('eventoId'),
  [
    body('partido_nombre').optional().isLength({ max: 200 }),
    body('partido_id').optional().isUUID(),
    body('concepto').notEmpty().isIn(['inscripcion', 'pelea_ganada', 'pelea_perdida', 'premio', 'gasto', 'corretaje', 'otro']),
    body('tipo').notEmpty().isIn(['ingreso', 'egreso']),
    body('monto').notEmpty().isFloat({ min: 0 }),
    body('estado').optional().isIn(['pendiente', 'pagado', 'cancelado']),
    body('pelea_id').optional().isUUID(),
    body('notas').optional().isLength({ max: 500 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;
    await verificarOrganizador(eventoId, req.userId);

    const { partido_nombre, partido_id, concepto, tipo, monto, estado, pelea_id, notas } = req.body;

    const { rows: [pago] } = await db.query(
      `INSERT INTO pagos_evento (evento_id, partido_id, partido_nombre, concepto, tipo, monto, estado, pelea_id, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [eventoId, partido_id || null, partido_nombre || null, concepto, tipo, monto, estado || 'pendiente', pelea_id || null, notas || null]
    );

    res.status(201).json({ success: true, data: pago });
  })
);

// ─── PUT /:eventoId/pagos/:pagoId - Update payment (mainly status toggle) ───
router.put('/:eventoId/pagos/:pagoId',
  uuidParam('eventoId'),
  uuidParam('pagoId'),
  [
    body('estado').optional().isIn(['pendiente', 'pagado', 'cancelado']),
    body('monto').optional().isFloat({ min: 0 }),
    body('notas').optional().isLength({ max: 500 }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId, pagoId } = req.params;
    await verificarOrganizador(eventoId, req.userId);

    const { estado, monto, notas } = req.body;
    const updates = [];
    const params = [];
    let idx = 1;

    if (estado !== undefined) { updates.push(`estado = $${idx++}`); params.push(estado); }
    if (monto !== undefined) { updates.push(`monto = $${idx++}`); params.push(monto); }
    if (notas !== undefined) { updates.push(`notas = $${idx++}`); params.push(notas); }

    if (updates.length === 0) throw Errors.badRequest('No hay campos para actualizar');

    updates.push(`updated_at = NOW()`);
    params.push(pagoId, eventoId);

    const { rows: [pago] } = await db.query(
      `UPDATE pagos_evento SET ${updates.join(', ')} WHERE id = $${idx++} AND evento_id = $${idx++} RETURNING *`,
      params
    );

    if (!pago) throw Errors.notFound('Pago');
    res.json({ success: true, data: pago });
  })
);

// ─── DELETE /:eventoId/pagos/:pagoId ───
router.delete('/:eventoId/pagos/:pagoId',
  uuidParam('eventoId'),
  uuidParam('pagoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId, pagoId } = req.params;
    await verificarOrganizador(eventoId, req.userId);

    const { rows: [pago] } = await db.query(
      'DELETE FROM pagos_evento WHERE id = $1 AND evento_id = $2 RETURNING id',
      [pagoId, eventoId]
    );

    if (!pago) throw Errors.notFound('Pago');
    res.json({ success: true, data: { message: 'Pago eliminado' } });
  })
);

// ─── POST /:eventoId/generar-inscripciones - Auto-generate inscription charges ───
router.post('/:eventoId/generar-inscripciones',
  uuidParam('eventoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;
    const ev = await verificarOrganizador(eventoId, req.userId);

    if (!ev.costo_inscripcion || ev.costo_inscripcion <= 0) {
      throw Errors.badRequest('El evento no tiene costo de inscripción configurado');
    }

    // Get all partidos for this event
    const { rows: partidos } = await db.query(
      `SELECT pd.id, pd.nombre, u.nombre AS usuario_nombre
       FROM partidos_derby pd
       LEFT JOIN usuarios u ON u.id = pd.usuario_id
       WHERE pd.evento_id = $1`,
      [eventoId]
    );

    // Check which already have inscription charges
    const { rows: existing } = await db.query(
      `SELECT partido_id FROM pagos_evento WHERE evento_id = $1 AND concepto = 'inscripcion' AND estado != 'cancelado'`,
      [eventoId]
    );
    const existingIds = new Set(existing.map(e => e.partido_id));

    let created = 0;
    for (const p of partidos) {
      if (existingIds.has(p.id)) continue;
      await db.query(
        `INSERT INTO pagos_evento (evento_id, partido_id, partido_nombre, concepto, tipo, monto, estado)
         VALUES ($1, $2, $3, 'inscripcion', 'ingreso', $4, 'pendiente')`,
        [eventoId, p.id, p.nombre || p.usuario_nombre || `Partido ${p.id.slice(0, 6)}`, ev.costo_inscripcion]
      );
      created++;
    }

    res.json({ success: true, data: { message: `${created} inscripciones generadas`, total: partidos.length, nuevas: created } });
  })
);

// ─── POST /:eventoId/generar-cargos-pelea - Generate fight charges from results ───
router.post('/:eventoId/generar-cargos-pelea',
  uuidParam('eventoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;
    const ev = await verificarOrganizador(eventoId, req.userId);

    const costoPelea = ev.costo_por_pelea || 0;
    if (costoPelea <= 0) {
      throw Errors.badRequest('El evento no tiene costo por pelea configurado');
    }

    // Get all finished fights with results
    const { rows: peleas } = await db.query(
      `SELECT p.id, p.numero_pelea, p.resultado, p.anillo_rojo, p.anillo_verde,
              p.placa_rojo, p.placa_verde, p.partido_rojo_id, p.partido_verde_id,
              ur.nombre AS nombre_rojo, uv.nombre AS nombre_verde
       FROM peleas p
       LEFT JOIN usuarios ur ON ur.id = p.partido_rojo_id
       LEFT JOIN usuarios uv ON uv.id = p.partido_verde_id
       WHERE p.evento_id = $1 AND p.estado = 'finalizada' AND p.resultado IS NOT NULL`,
      [eventoId]
    );

    // Check existing fight charges
    const { rows: existing } = await db.query(
      `SELECT pelea_id, concepto FROM pagos_evento WHERE evento_id = $1 AND pelea_id IS NOT NULL AND estado != 'cancelado'`,
      [eventoId]
    );
    const existingSet = new Set(existing.map(e => `${e.pelea_id}_${e.concepto}`));

    let created = 0;
    for (const pelea of peleas) {
      const nombreRojo = pelea.nombre_rojo || pelea.placa_rojo || pelea.anillo_rojo || 'Rojo';
      const nombreVerde = pelea.nombre_verde || pelea.placa_verde || pelea.anillo_verde || 'Verde';

      if (pelea.resultado === 'rojo' || pelea.resultado === 'verde') {
        const ganador = pelea.resultado === 'rojo' ? nombreRojo : nombreVerde;
        const perdedor = pelea.resultado === 'rojo' ? nombreVerde : nombreRojo;
        const ganadorId = pelea.resultado === 'rojo' ? pelea.partido_rojo_id : pelea.partido_verde_id;
        const perdedorId = pelea.resultado === 'rojo' ? pelea.partido_verde_id : pelea.partido_rojo_id;

        // Winner receives
        if (!existingSet.has(`${pelea.id}_pelea_ganada`)) {
          await db.query(
            `INSERT INTO pagos_evento (evento_id, partido_id, partido_nombre, concepto, tipo, monto, estado, pelea_id, notas)
             VALUES ($1, $2, $3, 'pelea_ganada', 'egreso', $4, 'pendiente', $5, $6)`,
            [eventoId, ganadorId, ganador, costoPelea, pelea.id, `Pelea ${pelea.numero_pelea} - Ganador`]
          );
          created++;
        }

        // Loser pays
        if (!existingSet.has(`${pelea.id}_pelea_perdida`)) {
          await db.query(
            `INSERT INTO pagos_evento (evento_id, partido_id, partido_nombre, concepto, tipo, monto, estado, pelea_id, notas)
             VALUES ($1, $2, $3, 'pelea_perdida', 'ingreso', $4, 'pendiente', $5, $6)`,
            [eventoId, perdedorId, perdedor, costoPelea, pelea.id, `Pelea ${pelea.numero_pelea} - Perdedor`]
          );
          created++;
        }
      }
      // Tablas: no charge
    }

    res.json({ success: true, data: { message: `${created} cargos generados`, peleas_procesadas: peleas.length } });
  })
);

module.exports = router;
