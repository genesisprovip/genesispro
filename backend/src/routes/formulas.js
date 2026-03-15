/**
 * GenesisPro - Custom Formulas Routes
 * Formulas/dosis personalizadas con ingredientes multiples
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler, Errors } = require('../middleware/errorHandler');
const { checkPlanLimits } = require('../middleware/planLimits');

router.use(authenticateJWT);

// All write operations require at least Pro plan
router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return checkPlanLimits('formulas')(req, res, next);
  }
  next();
});

// GET / - List user formulas
router.get('/', asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT f.*,
      COALESCE(
        json_agg(
          json_build_object('id', fi.id, 'nombre', fi.nombre, 'cantidad', fi.cantidad, 'unidad', fi.unidad, 'orden', fi.orden, 'notas', fi.notas)
          ORDER BY fi.orden
        ) FILTER (WHERE fi.id IS NOT NULL),
        '[]'
      ) as ingredientes
    FROM formulas f
    LEFT JOIN formula_ingredientes fi ON fi.formula_id = f.id
    WHERE f.usuario_id = $1 AND f.activo = true
    GROUP BY f.id
    ORDER BY f.created_at DESC
  `, [req.userId]);

  res.json({ success: true, data: rows });
}));

// GET /:id - Get formula detail
router.get('/:id', asyncHandler(async (req, res) => {
  const { rows } = await db.query(`
    SELECT f.*,
      COALESCE(
        json_agg(
          json_build_object('id', fi.id, 'nombre', fi.nombre, 'cantidad', fi.cantidad, 'unidad', fi.unidad, 'orden', fi.orden, 'notas', fi.notas)
          ORDER BY fi.orden
        ) FILTER (WHERE fi.id IS NOT NULL),
        '[]'
      ) as ingredientes
    FROM formulas f
    LEFT JOIN formula_ingredientes fi ON fi.formula_id = f.id
    WHERE f.id = $1 AND f.usuario_id = $2
    GROUP BY f.id
  `, [req.params.id, req.userId]);

  if (rows.length === 0) throw Errors.notFound('Formula');
  res.json({ success: true, data: rows[0] });
}));

// POST / - Create formula with ingredients
router.post('/', asyncHandler(async (req, res) => {
  const { nombre, descripcion, categoria, notas, ingredientes } = req.body;

  if (!nombre?.trim()) throw Errors.badRequest('Nombre es requerido');
  if (!ingredientes || !Array.isArray(ingredientes) || ingredientes.length === 0) {
    throw Errors.badRequest('Al menos un ingrediente es requerido');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO formulas (usuario_id, nombre, descripcion, categoria, notas)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, nombre.trim(), descripcion || null, categoria || 'general', notas || null]
    );

    const formula = rows[0];

    for (let i = 0; i < ingredientes.length; i++) {
      const ing = ingredientes[i];
      if (!ing.nombre?.trim()) continue;
      await client.query(
        `INSERT INTO formula_ingredientes (formula_id, nombre, cantidad, unidad, orden, notas)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [formula.id, ing.nombre.trim(), ing.cantidad || null, ing.unidad || 'ml', i, ing.notas || null]
      );
    }

    await client.query('COMMIT');

    // Return with ingredients
    const { rows: full } = await db.query(`
      SELECT f.*,
        COALESCE(
          json_agg(
            json_build_object('id', fi.id, 'nombre', fi.nombre, 'cantidad', fi.cantidad, 'unidad', fi.unidad, 'orden', fi.orden, 'notas', fi.notas)
            ORDER BY fi.orden
          ) FILTER (WHERE fi.id IS NOT NULL),
          '[]'
        ) as ingredientes
      FROM formulas f
      LEFT JOIN formula_ingredientes fi ON fi.formula_id = f.id
      WHERE f.id = $1
      GROUP BY f.id
    `, [formula.id]);

    res.status(201).json({ success: true, data: full[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// PUT /:id - Update formula and ingredients
router.put('/:id', asyncHandler(async (req, res) => {
  const { nombre, descripcion, categoria, notas, ingredientes } = req.body;

  // Verify ownership
  const { rows: existing } = await db.query(
    'SELECT id FROM formulas WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.userId]
  );
  if (existing.length === 0) throw Errors.notFound('Formula');

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE formulas SET nombre = COALESCE($1, nombre), descripcion = COALESCE($2, descripcion),
       categoria = COALESCE($3, categoria), notas = COALESCE($4, notas), updated_at = NOW()
       WHERE id = $5`,
      [nombre?.trim(), descripcion, categoria, notas, req.params.id]
    );

    if (ingredientes && Array.isArray(ingredientes)) {
      await client.query('DELETE FROM formula_ingredientes WHERE formula_id = $1', [req.params.id]);
      for (let i = 0; i < ingredientes.length; i++) {
        const ing = ingredientes[i];
        if (!ing.nombre?.trim()) continue;
        await client.query(
          `INSERT INTO formula_ingredientes (formula_id, nombre, cantidad, unidad, orden, notas)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.params.id, ing.nombre.trim(), ing.cantidad || null, ing.unidad || 'ml', i, ing.notas || null]
        );
      }
    }

    await client.query('COMMIT');

    const { rows: full } = await db.query(`
      SELECT f.*,
        COALESCE(
          json_agg(
            json_build_object('id', fi.id, 'nombre', fi.nombre, 'cantidad', fi.cantidad, 'unidad', fi.unidad, 'orden', fi.orden, 'notas', fi.notas)
            ORDER BY fi.orden
          ) FILTER (WHERE fi.id IS NOT NULL),
          '[]'
        ) as ingredientes
      FROM formulas f
      LEFT JOIN formula_ingredientes fi ON fi.formula_id = f.id
      WHERE f.id = $1
      GROUP BY f.id
    `, [req.params.id]);

    res.json({ success: true, data: full[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}));

// DELETE /:id - Soft delete formula
router.delete('/:id', asyncHandler(async (req, res) => {
  const { rowCount } = await db.query(
    'UPDATE formulas SET activo = false, updated_at = NOW() WHERE id = $1 AND usuario_id = $2',
    [req.params.id, req.userId]
  );
  if (rowCount === 0) throw Errors.notFound('Formula');
  res.json({ success: true, message: 'Formula eliminada' });
}));

module.exports = router;
