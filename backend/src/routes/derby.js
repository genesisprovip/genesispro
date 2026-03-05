/**
 * Derby Routes
 * Registro de partidos, aves, rondas y sorteo
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler, Errors } = require('../middleware/errorHandler');
const { validateRequest: validate } = require('../middleware/validator');
const { body, param, query } = require('express-validator');
const db = require('../config/database');

router.use(authenticateJWT);

const uuidParam = (field) => param(field).isUUID().withMessage(`${field} invalido`);

// Helper: verify organizer
async function verifyOrganizador(eventoId, userId) {
  const { rows } = await db.query(
    `SELECT organizador_id FROM eventos_palenque WHERE id = $1 AND deleted_at IS NULL`,
    [eventoId]
  );
  if (rows.length === 0) throw Errors.notFound('Evento');
  if (rows[0].organizador_id !== userId) throw Errors.forbidden('Solo el organizador');
  return rows[0];
}

// ============================================
// PARTIDOS
// ============================================

/**
 * GET /api/v1/derby/:eventoId/partidos
 * List all partidos for an event with their points
 */
router.get('/:eventoId/partidos',
  uuidParam('eventoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;

    const { rows } = await db.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM aves_derby a WHERE a.partido_id = p.id) AS total_aves,
        (SELECT COUNT(*) FROM aves_derby a WHERE a.partido_id = p.id AND a.estado = 'disponible') AS aves_disponibles
      FROM partidos_derby p
      WHERE p.evento_id = $1
      ORDER BY p.numero_partido ASC`,
      [eventoId]
    );

    res.json({ success: true, data: rows });
  })
);

/**
 * POST /api/v1/derby/:eventoId/partidos
 * Register a partido
 */
router.post('/:eventoId/partidos',
  uuidParam('eventoId'),
  body('nombre').notEmpty().isLength({ max: 200 }).withMessage('Nombre requerido'),
  body('usuario_id').optional({ nullable: true }).isUUID(),
  body('notas').optional({ nullable: true }).isLength({ max: 500 }),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;
    await verifyOrganizador(eventoId, req.userId);

    const { nombre, usuario_id, notas } = req.body;

    // Auto-assign next numero_partido
    const { rows: maxRows } = await db.query(
      `SELECT COALESCE(MAX(numero_partido), 0) + 1 AS next_num FROM partidos_derby WHERE evento_id = $1`,
      [eventoId]
    );
    const numero = maxRows[0].next_num;

    const { rows } = await db.query(
      `INSERT INTO partidos_derby (evento_id, usuario_id, nombre, numero_partido, notas)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [eventoId, usuario_id || null, nombre, numero, notas || null]
    );

    res.status(201).json({ success: true, data: rows[0] });
  })
);

/**
 * PUT /api/v1/derby/partidos/:id
 * Update partido
 */
router.put('/partidos/:id',
  uuidParam('id'),
  body('nombre').optional().isLength({ max: 200 }),
  body('estado').optional().isIn(['activo', 'retirado', 'eliminado']),
  body('es_comodin').optional().isBoolean(),
  body('notas').optional({ nullable: true }).isLength({ max: 500 }),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT p.*, e.organizador_id FROM partidos_derby p
       JOIN eventos_palenque e ON e.id = p.evento_id
       WHERE p.id = $1`, [id]
    );
    if (existing.length === 0) throw Errors.notFound('Partido');
    if (existing[0].organizador_id !== req.userId) throw Errors.forbidden('Solo el organizador');

    const { nombre, estado, es_comodin, notas } = req.body;

    const { rows } = await db.query(
      `UPDATE partidos_derby SET
        nombre = COALESCE($1, nombre),
        estado = COALESCE($2, estado),
        es_comodin = COALESCE($3, es_comodin),
        notas = COALESCE($4, notas),
        updated_at = NOW()
      WHERE id = $5 RETURNING *`,
      [nombre, estado, es_comodin, notas, id]
    );

    res.json({ success: true, data: rows[0] });
  })
);

/**
 * DELETE /api/v1/derby/partidos/:id
 */
router.delete('/partidos/:id',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT p.*, e.organizador_id FROM partidos_derby p
       JOIN eventos_palenque e ON e.id = p.evento_id
       WHERE p.id = $1`, [id]
    );
    if (existing.length === 0) throw Errors.notFound('Partido');
    if (existing[0].organizador_id !== req.userId) throw Errors.forbidden('Solo el organizador');

    await db.query(`DELETE FROM aves_derby WHERE partido_id = $1`, [id]);
    await db.query(`DELETE FROM partidos_derby WHERE id = $1`, [id]);

    res.json({ success: true, data: { message: 'Partido eliminado' } });
  })
);

// ============================================
// AVES
// ============================================

/**
 * GET /api/v1/derby/:eventoId/aves
 * List all aves for an event
 */
router.get('/:eventoId/aves',
  uuidParam('eventoId'),
  query('partido_id').optional().isUUID(),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;
    const { partido_id } = req.query;

    let sql = `
      SELECT a.*, p.nombre AS partido_nombre, p.numero_partido
      FROM aves_derby a
      JOIN partidos_derby p ON p.id = a.partido_id
      WHERE a.evento_id = $1
    `;
    const params = [eventoId];

    if (partido_id) {
      params.push(partido_id);
      sql += ` AND a.partido_id = $${params.length}`;
    }

    sql += ` ORDER BY p.numero_partido ASC, a.numero_ave ASC`;

    const { rows } = await db.query(sql, params);
    res.json({ success: true, data: rows });
  })
);

/**
 * POST /api/v1/derby/:eventoId/aves
 * Register an ave for a partido
 */
router.post('/:eventoId/aves',
  uuidParam('eventoId'),
  body('partido_id').notEmpty().isUUID().withMessage('Partido requerido'),
  body('peso').notEmpty().isInt({ min: 500, max: 5000 }).withMessage('Peso en gramos (500-5000)'),
  body('anillo').optional({ nullable: true }).isLength({ max: 50 }),
  body('placa').optional({ nullable: true }).isLength({ max: 50 }),
  body('color').optional({ nullable: true }).isLength({ max: 100 }),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;
    await verifyOrganizador(eventoId, req.userId);

    const { partido_id, peso, anillo, placa, color } = req.body;

    // Verify partido belongs to this event
    const { rows: partido } = await db.query(
      `SELECT id FROM partidos_derby WHERE id = $1 AND evento_id = $2`,
      [partido_id, eventoId]
    );
    if (partido.length === 0) throw Errors.notFound('Partido');

    // Auto-assign next numero_ave for this partido
    const { rows: maxRows } = await db.query(
      `SELECT COALESCE(MAX(numero_ave), 0) + 1 AS next_num
       FROM aves_derby WHERE partido_id = $1`,
      [partido_id]
    );

    const { rows } = await db.query(
      `INSERT INTO aves_derby (evento_id, partido_id, numero_ave, peso, anillo, placa, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [eventoId, partido_id, maxRows[0].next_num, peso, anillo || null, placa || null, color || null]
    );

    res.status(201).json({ success: true, data: rows[0] });
  })
);

/**
 * PUT /api/v1/derby/aves/:id
 */
router.put('/aves/:id',
  uuidParam('id'),
  body('peso').optional().isInt({ min: 500, max: 5000 }),
  body('anillo').optional({ nullable: true }).isLength({ max: 50 }),
  body('placa').optional({ nullable: true }).isLength({ max: 50 }),
  body('color').optional({ nullable: true }).isLength({ max: 100 }),
  body('navaja_derecha').optional().isBoolean(),
  body('estado').optional().isIn(['disponible', 'retirada']),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT a.*, e.organizador_id FROM aves_derby a
       JOIN eventos_palenque e ON e.id = a.evento_id
       WHERE a.id = $1`, [id]
    );
    if (existing.length === 0) throw Errors.notFound('Ave');
    if (existing[0].organizador_id !== req.userId) throw Errors.forbidden('Solo el organizador');

    const { peso, anillo, placa, color, navaja_derecha, estado } = req.body;

    const { rows } = await db.query(
      `UPDATE aves_derby SET
        peso = COALESCE($1, peso),
        anillo = COALESCE($2, anillo),
        placa = COALESCE($3, placa),
        color = COALESCE($4, color),
        navaja_derecha = COALESCE($5, navaja_derecha),
        estado = COALESCE($6, estado),
        updated_at = NOW()
      WHERE id = $7 RETURNING *`,
      [peso, anillo, placa, color, navaja_derecha, estado, id]
    );

    res.json({ success: true, data: rows[0] });
  })
);

/**
 * DELETE /api/v1/derby/aves/:id
 */
router.delete('/aves/:id',
  uuidParam('id'),
  validate,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const { rows: existing } = await db.query(
      `SELECT a.*, e.organizador_id FROM aves_derby a
       JOIN eventos_palenque e ON e.id = a.evento_id
       WHERE a.id = $1`, [id]
    );
    if (existing.length === 0) throw Errors.notFound('Ave');
    if (existing[0].organizador_id !== req.userId) throw Errors.forbidden('Solo el organizador');

    await db.query(`DELETE FROM aves_derby WHERE id = $1`, [id]);
    res.json({ success: true, data: { message: 'Ave eliminada' } });
  })
);

// ============================================
// RONDAS Y SORTEO
// ============================================

/**
 * GET /api/v1/derby/:eventoId/rondas
 * List rounds with summary
 */
router.get('/:eventoId/rondas',
  uuidParam('eventoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;

    const { rows } = await db.query(
      `SELECT r.*,
        (SELECT COUNT(*) FROM peleas p WHERE p.ronda_id = r.id) AS total_peleas,
        (SELECT COUNT(*) FROM peleas p WHERE p.ronda_id = r.id AND p.estado = 'finalizada') AS peleas_finalizadas
      FROM rondas_derby r
      WHERE r.evento_id = $1
      ORDER BY r.numero_ronda ASC`,
      [eventoId]
    );

    res.json({ success: true, data: rows });
  })
);

/**
 * GET /api/v1/derby/:eventoId/tabla
 * Get standings table (puntos por partido)
 */
router.get('/:eventoId/tabla',
  uuidParam('eventoId'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;

    const { rows } = await db.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM aves_derby a WHERE a.partido_id = p.id) AS total_aves,
        (SELECT COUNT(*) FROM aves_derby a WHERE a.partido_id = p.id AND a.estado = 'disponible') AS aves_disponibles,
        (SELECT COUNT(*) FROM peleas pl
          JOIN aves_derby ar ON ar.id = pl.ave_roja_derby_id
          WHERE ar.partido_id = p.id AND pl.resultado = 'rojo' AND pl.estado = 'finalizada') +
        (SELECT COUNT(*) FROM peleas pl
          JOIN aves_derby av ON av.id = pl.ave_verde_derby_id
          WHERE av.partido_id = p.id AND pl.resultado = 'verde' AND pl.estado = 'finalizada')
        AS victorias,
        (SELECT COUNT(*) FROM peleas pl
          JOIN aves_derby ar ON ar.id = pl.ave_roja_derby_id
          WHERE ar.partido_id = p.id AND pl.resultado = 'verde' AND pl.estado = 'finalizada') +
        (SELECT COUNT(*) FROM peleas pl
          JOIN aves_derby av ON av.id = pl.ave_verde_derby_id
          WHERE av.partido_id = p.id AND pl.resultado = 'rojo' AND pl.estado = 'finalizada')
        AS derrotas,
        (SELECT COUNT(*) FROM peleas pl
          JOIN aves_derby ar ON ar.id = pl.ave_roja_derby_id
          WHERE ar.partido_id = p.id AND (pl.resultado = 'tabla' OR pl.resultado = 'empate') AND pl.estado = 'finalizada') +
        (SELECT COUNT(*) FROM peleas pl
          JOIN aves_derby av ON av.id = pl.ave_verde_derby_id
          WHERE av.partido_id = p.id AND (pl.resultado = 'tabla' OR pl.resultado = 'empate') AND pl.estado = 'finalizada')
        AS tablas
      FROM partidos_derby p
      WHERE p.evento_id = $1 AND p.estado = 'activo'
      ORDER BY p.puntos DESC, victorias DESC, p.numero_partido ASC`,
      [eventoId]
    );

    res.json({ success: true, data: rows });
  })
);

/**
 * POST /api/v1/derby/:eventoId/sorteo
 * Generate pairings for next round
 *
 * Body:
 *   ganadores_vs_perdedores: boolean (optional, for round 2+)
 *   margen_peso: integer (default 80g)
 */
router.post('/:eventoId/sorteo',
  uuidParam('eventoId'),
  body('ganadores_vs_perdedores').optional().isBoolean(),
  body('margen_peso').optional().isInt({ min: 0, max: 500 }),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;
    await verifyOrganizador(eventoId, req.userId);

    const ganadoresVsPerdedores = req.body.ganadores_vs_perdedores || false;
    const margenPeso = req.body.margen_peso || 80;

    // Get current round number
    const { rows: rondas } = await db.query(
      `SELECT numero_ronda FROM rondas_derby WHERE evento_id = $1 ORDER BY numero_ronda DESC LIMIT 1`,
      [eventoId]
    );
    const siguienteRonda = rondas.length > 0 ? rondas[0].numero_ronda + 1 : 1;

    // Get available aves (not yet fought in this round concept: disponible state)
    const { rows: aves } = await db.query(
      `SELECT a.*, p.nombre AS partido_nombre, p.numero_partido, p.puntos AS partido_puntos,
              p.es_comodin AS partido_comodin, p.estado AS partido_estado
       FROM aves_derby a
       JOIN partidos_derby p ON p.id = a.partido_id
       WHERE a.evento_id = $1 AND a.estado = 'disponible' AND p.estado = 'activo'
       ORDER BY a.peso ASC`,
      [eventoId]
    );

    if (aves.length < 2) {
      throw Errors.badRequest('Se necesitan al menos 2 aves disponibles para el sorteo');
    }

    // Group aves by partido (one ave per partido per round)
    const porPartido = {};
    for (const ave of aves) {
      if (!porPartido[ave.partido_id]) {
        porPartido[ave.partido_id] = [];
      }
      porPartido[ave.partido_id].push(ave);
    }

    // Select one ave per partido (lightest available)
    let candidatos = [];
    for (const [partidoId, avesPartido] of Object.entries(porPartido)) {
      // Pick the first available ave (sorted by peso already)
      candidatos.push(avesPartido[0]);
    }

    // Shuffle for randomness
    for (let i = candidatos.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
    }

    // Sort by weight for pairing
    candidatos.sort((a, b) => a.peso - b.peso);

    // If ganadores_vs_perdedores: separate by partido puntos
    if (ganadoresVsPerdedores && siguienteRonda > 1) {
      const ganadores = candidatos.filter(a => a.partido_puntos > 0);
      const perdedores = candidatos.filter(a => a.partido_puntos === 0);

      // Sort each group by weight
      ganadores.sort((a, b) => a.peso - b.peso);
      perdedores.sort((a, b) => a.peso - b.peso);

      // Try to pair ganadores vs perdedores by weight
      candidatos = [];
      const shorter = Math.min(ganadores.length, perdedores.length);
      for (let i = 0; i < shorter; i++) {
        candidatos.push(ganadores[i], perdedores[i]);
      }
      // Remaining unpaired go at the end
      const remaining = [
        ...ganadores.slice(shorter),
        ...perdedores.slice(shorter)
      ];
      remaining.sort((a, b) => a.peso - b.peso);
      candidatos.push(...remaining);
    }

    // Create round
    const { rows: rondaRows } = await db.query(
      `INSERT INTO rondas_derby (evento_id, numero_ronda, ganadores_vs_perdedores)
       VALUES ($1, $2, $3) RETURNING *`,
      [eventoId, siguienteRonda, ganadoresVsPerdedores]
    );
    const ronda = rondaRows[0];

    // Pair candidates (take pairs from the sorted list)
    const peleas = [];
    const pareados = [];
    const usados = new Set();

    for (let i = 0; i < candidatos.length; i++) {
      if (usados.has(i)) continue;

      // Find best match (closest weight, different partido)
      let mejorJ = -1;
      let mejorDiff = Infinity;

      for (let j = i + 1; j < candidatos.length; j++) {
        if (usados.has(j)) continue;
        if (candidatos[j].partido_id === candidatos[i].partido_id) continue;

        const diff = Math.abs(candidatos[j].peso - candidatos[i].peso);
        if (diff < mejorDiff) {
          mejorDiff = diff;
          mejorJ = j;
        }
      }

      if (mejorJ === -1) continue; // No match found (same partido or solo)

      usados.add(i);
      usados.add(mejorJ);

      const aveA = candidatos[i];
      const aveB = candidatos[mejorJ];
      const diffPeso = Math.abs(aveA.peso - aveB.peso);

      // Determine navaja derecha if over margin
      let navajaDerecha = null;
      if (diffPeso > margenPeso) {
        navajaDerecha = aveA.peso > aveB.peso ? 'rojo' : 'verde';
      }

      pareados.push({
        rojo: aveA,
        verde: aveB,
        diff_peso: diffPeso,
        navaja_derecha: navajaDerecha
      });
    }

    // Get next pelea number for event
    const { rows: maxPelea } = await db.query(
      `SELECT COALESCE(MAX(numero_pelea), 0) AS max_num FROM peleas WHERE evento_id = $1`,
      [eventoId]
    );
    let numPelea = maxPelea[0].max_num;

    // Create peleas
    for (const par of pareados) {
      numPelea++;

      // Get usuario_id from partidos_derby (may be null for external partidos)
      const { rows: rojoP } = await db.query(`SELECT usuario_id FROM partidos_derby WHERE id = $1`, [par.rojo.partido_id]);
      const { rows: verdeP } = await db.query(`SELECT usuario_id FROM partidos_derby WHERE id = $1`, [par.verde.partido_id]);

      const { rows: pelea } = await db.query(
        `INSERT INTO peleas (
          evento_id, numero_pelea, ronda_id,
          partido_rojo_id, ave_roja_derby_id, anillo_rojo, peso_rojo, placa_rojo,
          partido_verde_id, ave_verde_derby_id, anillo_verde, peso_verde, placa_verde,
          navaja_derecha_a, estado
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'programada')
        RETURNING *`,
        [
          eventoId, numPelea, ronda.id,
          rojoP[0]?.usuario_id || null, par.rojo.id, par.rojo.anillo, par.rojo.peso / 1000, par.rojo.partido_nombre,
          verdeP[0]?.usuario_id || null, par.verde.id, par.verde.anillo, par.verde.peso / 1000, par.verde.partido_nombre,
          par.navaja_derecha
        ]
      );

      // Mark aves with ronda_asignada
      await db.query(
        `UPDATE aves_derby SET ronda_asignada = $1, updated_at = NOW() WHERE id = $2 OR id = $3`,
        [siguienteRonda, par.rojo.id, par.verde.id]
      );

      peleas.push({
        pelea: pelea[0],
        rojo: { partido: par.rojo.partido_nombre, peso: par.rojo.peso, anillo: par.rojo.anillo },
        verde: { partido: par.verde.partido_nombre, peso: par.verde.peso, anillo: par.verde.anillo },
        diff_peso: par.diff_peso,
        navaja_derecha: par.navaja_derecha
      });
    }

    // Check for unpaired (impar)
    const sinParear = candidatos.filter((_, i) => !usados.has(i));

    res.json({
      success: true,
      data: {
        ronda,
        peleas,
        total_pareados: peleas.length,
        sin_parear: sinParear.map(a => ({
          ave_id: a.id,
          partido: a.partido_nombre,
          peso: a.peso,
          anillo: a.anillo
        })),
        mensaje: sinParear.length > 0
          ? `${sinParear.length} ave(s) sin pareja. Considera agregar un comodín.`
          : `Ronda ${siguienteRonda}: ${peleas.length} peleas generadas`
      }
    });
  })
);

/**
 * POST /api/v1/derby/:eventoId/comodin
 * Add a comodin partido to fill an odd spot
 */
router.post('/:eventoId/comodin',
  uuidParam('eventoId'),
  body('nombre').notEmpty().isLength({ max: 200 }).withMessage('Nombre requerido'),
  body('peso').notEmpty().isInt({ min: 500, max: 5000 }).withMessage('Peso requerido'),
  body('anillo').optional({ nullable: true }).isLength({ max: 50 }),
  body('ave_sin_pareja_id').notEmpty().isUUID().withMessage('ID del ave sin pareja requerido'),
  validate,
  asyncHandler(async (req, res) => {
    const { eventoId } = req.params;
    await verifyOrganizador(eventoId, req.userId);

    const { nombre, peso, anillo, ave_sin_pareja_id } = req.body;

    // Verify the unpaired ave exists
    const { rows: aveRows } = await db.query(
      `SELECT a.*, p.nombre AS partido_nombre FROM aves_derby a
       JOIN partidos_derby p ON p.id = a.partido_id
       WHERE a.id = $1 AND a.evento_id = $2 AND a.estado = 'disponible'`,
      [ave_sin_pareja_id, eventoId]
    );
    if (aveRows.length === 0) throw Errors.notFound('Ave sin pareja');

    // Create comodin partido
    const { rows: maxP } = await db.query(
      `SELECT COALESCE(MAX(numero_partido), 0) + 1 AS n FROM partidos_derby WHERE evento_id = $1`,
      [eventoId]
    );

    const { rows: partido } = await db.query(
      `INSERT INTO partidos_derby (evento_id, nombre, numero_partido, es_comodin)
       VALUES ($1, $2, $3, true) RETURNING *`,
      [eventoId, nombre + ' (Comodín)', maxP[0].n]
    );

    // Create comodin ave
    const { rows: ave } = await db.query(
      `INSERT INTO aves_derby (evento_id, partido_id, numero_ave, peso, anillo)
       VALUES ($1, $2, 1, $3, $4) RETURNING *`,
      [eventoId, partido[0].id, peso, anillo || null]
    );

    // Get current ronda
    const { rows: rondas } = await db.query(
      `SELECT * FROM rondas_derby WHERE evento_id = $1 ORDER BY numero_ronda DESC LIMIT 1`,
      [eventoId]
    );

    if (rondas.length === 0) throw Errors.badRequest('No hay ronda activa');

    const ronda = rondas[0];
    const aveOriginal = aveRows[0];
    const margenPeso = 80;
    const diffPeso = Math.abs(peso - aveOriginal.peso);
    let navajaDerecha = null;
    if (diffPeso > margenPeso) {
      navajaDerecha = peso > aveOriginal.peso ? 'verde' : 'rojo';
    }

    // Create pelea
    const { rows: maxPelea } = await db.query(
      `SELECT COALESCE(MAX(numero_pelea), 0) + 1 AS n FROM peleas WHERE evento_id = $1`,
      [eventoId]
    );

    // Get usuario_id for original partido
    const { rows: origP } = await db.query(`SELECT usuario_id FROM partidos_derby WHERE id = $1`, [aveOriginal.partido_id]);

    const { rows: pelea } = await db.query(
      `INSERT INTO peleas (
        evento_id, numero_pelea, ronda_id,
        partido_rojo_id, ave_roja_derby_id, anillo_rojo, peso_rojo, placa_rojo,
        ave_verde_derby_id, anillo_verde, peso_verde, placa_verde,
        navaja_derecha_a, es_comodin, estado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, 'programada')
      RETURNING *`,
      [
        eventoId, maxPelea[0].n, ronda.id,
        origP[0]?.usuario_id || null, aveOriginal.id, aveOriginal.anillo, aveOriginal.peso / 1000, aveOriginal.partido_nombre,
        ave[0].id, anillo, peso / 1000, nombre + ' (Comodín)',
        navajaDerecha
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        partido_comodin: partido[0],
        ave_comodin: ave[0],
        pelea: pelea[0],
        mensaje: `Comodín agregado. Pelea #${maxPelea[0].n} creada.`
      }
    });
  })
);

module.exports = router;
