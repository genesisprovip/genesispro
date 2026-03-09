const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const pool = require('../config/database');
const logger = require('../config/logger');

// All routes require authentication
router.use(authenticateJWT);

// ==================== ALIMENTOS (Inventario) ====================

// GET /alimentos - List all alimentos for user
router.get('/alimentos', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM alimentos WHERE usuario_id = $1 ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error fetching alimentos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener alimentos' });
  }
});

// POST /alimentos - Create alimento
router.post('/alimentos', async (req, res) => {
  try {
    const { nombre, tipo, cantidad, unidad, precio_unitario, fecha_compra, fecha_vencimiento, proveedor, notas } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'Nombre es requerido' });
    }

    const { rows } = await pool.query(
      `INSERT INTO alimentos (usuario_id, nombre, tipo, cantidad, unidad, precio_unitario, fecha_compra, fecha_vencimiento, proveedor, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.userId, nombre, tipo || 'otro', cantidad || 0, unidad || 'kg', precio_unitario || null, fecha_compra || null, fecha_vencimiento || null, proveedor || null, notas || null]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Error creating alimento:', error);
    res.status(500).json({ success: false, error: 'Error al crear alimento' });
  }
});

// PUT /alimentos/:id - Update alimento
router.put('/alimentos/:id', async (req, res) => {
  try {
    const { nombre, tipo, cantidad, unidad, precio_unitario, fecha_compra, fecha_vencimiento, proveedor, notas } = req.body;

    const { rows } = await pool.query(
      `UPDATE alimentos SET
        nombre = COALESCE($1, nombre),
        tipo = COALESCE($2, tipo),
        cantidad = COALESCE($3, cantidad),
        unidad = COALESCE($4, unidad),
        precio_unitario = $5,
        fecha_compra = $6,
        fecha_vencimiento = $7,
        proveedor = $8,
        notas = $9,
        updated_at = NOW()
       WHERE id = $10 AND usuario_id = $11
       RETURNING *`,
      [nombre, tipo, cantidad, unidad, precio_unitario, fecha_compra, fecha_vencimiento, proveedor, notas, req.params.id, req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Alimento no encontrado' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Error updating alimento:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar alimento' });
  }
});

// DELETE /alimentos/:id - Delete alimento
router.delete('/alimentos/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM alimentos WHERE id = $1 AND usuario_id = $2`,
      [req.params.id, req.userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Alimento no encontrado' });
    }

    res.json({ success: true, message: 'Alimento eliminado' });
  } catch (error) {
    logger.error('Error deleting alimento:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar alimento' });
  }
});

// ==================== REGISTROS DE ALIMENTACIÓN ====================

// GET /registros - List registros with optional filters
router.get('/registros', async (req, res) => {
  try {
    const { fecha, ave_id, limit: lim } = req.query;
    let query = `SELECT r.*, a.codigo_identidad as ave_codigo
                 FROM registros_alimentacion r
                 LEFT JOIN aves a ON r.ave_id = a.id
                 WHERE r.usuario_id = $1`;
    const params = [req.userId];
    let idx = 2;

    if (fecha) {
      query += ` AND r.fecha = $${idx++}`;
      params.push(fecha);
    }
    if (ave_id) {
      query += ` AND r.ave_id = $${idx++}`;
      params.push(ave_id);
    }

    query += ` ORDER BY r.fecha DESC, r.created_at DESC`;

    if (lim) {
      query += ` LIMIT $${idx++}`;
      params.push(parseInt(lim) || 50);
    }

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error fetching registros:', error);
    res.status(500).json({ success: false, error: 'Error al obtener registros' });
  }
});

// POST /registros - Create registro + auto-discount inventory
router.post('/registros', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { ave_id, alimento_id, alimento_nombre, cantidad, unidad, fecha, hora, tipo_comida, notas } = req.body;

    if (!alimento_nombre || !cantidad || !fecha) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'alimento_nombre, cantidad y fecha son requeridos' });
    }

    const { rows } = await client.query(
      `INSERT INTO registros_alimentacion (usuario_id, ave_id, alimento_id, alimento_nombre, cantidad, unidad, fecha, hora, tipo_comida, notas)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.userId, ave_id || null, alimento_id || null, alimento_nombre, cantidad, unidad || 'kg', fecha, hora || null, tipo_comida || 'otro', notas || null]
    );

    // Auto-discount from inventory
    if (alimento_id) {
      await client.query(
        `UPDATE alimentos SET cantidad = GREATEST(0, cantidad - $1), updated_at = NOW()
         WHERE id = $2 AND usuario_id = $3`,
        [cantidad, alimento_id, req.userId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating registro:', error);
    res.status(500).json({ success: false, error: 'Error al crear registro' });
  } finally {
    client.release();
  }
});

// DELETE /registros/:id - Delete registro
router.delete('/registros/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM registros_alimentacion WHERE id = $1 AND usuario_id = $2`,
      [req.params.id, req.userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Registro no encontrado' });
    }

    res.json({ success: true, message: 'Registro eliminado' });
  } catch (error) {
    logger.error('Error deleting registro:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar registro' });
  }
});

// ==================== DIETAS ====================

// GET /dietas - List dietas with optional ave filter
router.get('/dietas', async (req, res) => {
  try {
    const { ave_id } = req.query;
    let query = `SELECT d.*, a.codigo_identidad as ave_codigo
                 FROM dietas d
                 LEFT JOIN aves a ON d.ave_id = a.id
                 WHERE d.usuario_id = $1`;
    const params = [req.userId];

    if (ave_id) {
      query += ` AND d.ave_id = $2`;
      params.push(ave_id);
    }

    query += ` ORDER BY d.activa DESC, d.created_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error fetching dietas:', error);
    res.status(500).json({ success: false, error: 'Error al obtener dietas' });
  }
});

// POST /dietas - Create dieta
router.post('/dietas', async (req, res) => {
  try {
    const { ave_id, nombre, descripcion, alimentos, activa } = req.body;

    if (!nombre) {
      return res.status(400).json({ success: false, error: 'Nombre es requerido' });
    }

    const { rows } = await pool.query(
      `INSERT INTO dietas (usuario_id, ave_id, nombre, descripcion, alimentos, activa)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.userId, ave_id || null, nombre, descripcion || null, JSON.stringify(alimentos || []), activa !== false]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Error creating dieta:', error);
    res.status(500).json({ success: false, error: 'Error al crear dieta' });
  }
});

// PUT /dietas/:id - Update dieta
router.put('/dietas/:id', async (req, res) => {
  try {
    const { nombre, descripcion, alimentos, activa, ave_id } = req.body;

    const { rows } = await pool.query(
      `UPDATE dietas SET
        nombre = COALESCE($1, nombre),
        descripcion = $2,
        alimentos = COALESCE($3, alimentos),
        activa = COALESCE($4, activa),
        ave_id = $5,
        updated_at = NOW()
       WHERE id = $6 AND usuario_id = $7
       RETURNING *`,
      [nombre, descripcion, alimentos ? JSON.stringify(alimentos) : null, activa, ave_id, req.params.id, req.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Dieta no encontrada' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    logger.error('Error updating dieta:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar dieta' });
  }
});

// DELETE /dietas/:id - Delete dieta
router.delete('/dietas/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM dietas WHERE id = $1 AND usuario_id = $2`,
      [req.params.id, req.userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Dieta no encontrada' });
    }

    res.json({ success: true, message: 'Dieta eliminada' });
  } catch (error) {
    logger.error('Error deleting dieta:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar dieta' });
  }
});

// ==================== STATS ====================

// GET /stats - Alimentacion stats
router.get('/stats', async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    const inicioMes = new Date();
    inicioMes.setDate(1);
    const inicioMesStr = inicioMes.toISOString().split('T')[0];

    const [totalRes, bajoStockRes, hoyRes, gastoRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM alimentos WHERE usuario_id = $1`, [req.userId]),
      pool.query(`SELECT COUNT(*) as total FROM alimentos WHERE usuario_id = $1 AND cantidad < 5`, [req.userId]),
      pool.query(`SELECT COUNT(*) as total FROM registros_alimentacion WHERE usuario_id = $1 AND fecha = $2`, [req.userId, hoy]),
      pool.query(
        `SELECT COALESCE(SUM(precio_unitario * cantidad), 0) as total
         FROM alimentos WHERE usuario_id = $1 AND fecha_compra >= $2`,
        [req.userId, inicioMesStr]
      ),
    ]);

    res.json({
      success: true,
      data: {
        totalAlimentos: parseInt(totalRes.rows[0].total),
        alimentosBajoStock: parseInt(bajoStockRes.rows[0].total),
        registrosHoy: parseInt(hoyRes.rows[0].total),
        gastoMensual: parseFloat(gastoRes.rows[0].total),
      },
    });
  } catch (error) {
    logger.error('Error fetching alimentacion stats:', error);
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
