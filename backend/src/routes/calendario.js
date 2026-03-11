const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');

router.use(authenticateJWT);

// Get calendar events for a date range
router.get('/', asyncHandler(async (req, res) => {
  const { inicio, fin } = req.query;

  const startDate = inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const endDate = fin || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  const events = [];

  // Combates in range
  const { rows: combates } = await db.query(`
    SELECT c.id, c.fecha_combate as fecha, c.ubicacion, c.resultado, c.tipo_combate,
           a.codigo_identidad, a.linea_genetica
    FROM combates c
    JOIN aves a ON c.macho_id = a.id
    WHERE a.usuario_id = $1
      AND c.deleted_at IS NULL
      AND c.fecha_combate BETWEEN $2 AND $3
    ORDER BY c.fecha_combate
  `, [req.userId, startDate, endDate]);

  combates.forEach(c => {
    events.push({
      id: `combate-${c.id}`,
      tipo: 'combate',
      fecha: c.fecha,
      titulo: `Combate: ${c.codigo_identidad}`,
      subtitulo: c.ubicacion || '',
      resultado: c.resultado,
      color: c.resultado === 'victoria' ? '#10B981' : c.resultado === 'derrota' ? '#EF4444' : '#F59E0B',
    });
  });

  // Upcoming vaccinations
  const { rows: vacunas } = await db.query(`
    SELECT v.id, v.proxima_dosis as fecha, v.tipo_vacuna, v.laboratorio,
           a.codigo_identidad
    FROM vacunas v
    JOIN aves a ON v.ave_id = a.id
    WHERE a.usuario_id = $1
      AND a.deleted_at IS NULL
      AND v.proxima_dosis IS NOT NULL
      AND v.proxima_dosis BETWEEN $2 AND $3
    ORDER BY v.proxima_dosis
  `, [req.userId, startDate, endDate]);

  vacunas.forEach(v => {
    events.push({
      id: `vacuna-${v.id}`,
      tipo: 'vacuna',
      fecha: v.fecha,
      titulo: `Vacuna: ${v.codigo_identidad}`,
      subtitulo: v.tipo_vacuna || '',
      color: '#8B5CF6',
    });
  });

  // Desparasitaciones
  const { rows: desparas } = await db.query(`
    SELECT d.id, d.proxima_aplicacion as fecha, d.producto,
           a.codigo_identidad
    FROM desparasitaciones d
    JOIN aves a ON d.ave_id = a.id
    WHERE a.usuario_id = $1
      AND a.deleted_at IS NULL
      AND d.proxima_aplicacion IS NOT NULL
      AND d.proxima_aplicacion BETWEEN $2 AND $3
    ORDER BY d.proxima_aplicacion
  `, [req.userId, startDate, endDate]);

  desparas.forEach(d => {
    events.push({
      id: `desparasitacion-${d.id}`,
      tipo: 'desparasitacion',
      fecha: d.fecha,
      titulo: `Despara: ${d.codigo_identidad}`,
      subtitulo: d.producto || '',
      color: '#EC4899',
    });
  });

  // Consultas veterinarias
  const { rows: consultas } = await db.query(`
    SELECT cv.id, cv.proxima_consulta as fecha, cv.motivo,
           a.codigo_identidad
    FROM consultas_veterinarias cv
    JOIN aves a ON cv.ave_id = a.id
    WHERE a.usuario_id = $1
      AND a.deleted_at IS NULL
      AND cv.proxima_consulta IS NOT NULL
      AND cv.proxima_consulta BETWEEN $2 AND $3
    ORDER BY cv.proxima_consulta
  `, [req.userId, startDate, endDate]);

  consultas.forEach(c => {
    events.push({
      id: `consulta-${c.id}`,
      tipo: 'consulta',
      fecha: c.fecha,
      titulo: `Consulta: ${c.codigo_identidad}`,
      subtitulo: c.motivo || '',
      color: '#F97316',
    });
  });

  // Aves - fecha de nacimiento
  const { rows: aves } = await db.query(`
    SELECT id, codigo_identidad, fecha_nacimiento, linea_genetica, sexo
    FROM aves
    WHERE usuario_id = $1
      AND deleted_at IS NULL
      AND fecha_nacimiento BETWEEN $2 AND $3
    ORDER BY fecha_nacimiento
  `, [req.userId, startDate, endDate]);

  aves.forEach(a => {
    events.push({
      id: `ave-${a.id}`,
      tipo: 'ave',
      fecha: a.fecha_nacimiento,
      titulo: `Nac: ${a.codigo_identidad}`,
      subtitulo: `${a.linea_genetica || ''} ${a.sexo === 'M' ? 'Macho' : 'Hembra'}`.trim(),
      ave_codigo: a.codigo_identidad,
      color: '#6366F1',
    });
  });

  // Eventos de palenque
  const { rows: eventosP } = await db.query(`
    SELECT id, nombre, fecha, lugar, estado, tipo_derby
    FROM eventos_palenque
    WHERE organizador_id = $1
      AND deleted_at IS NULL
      AND fecha BETWEEN $2 AND $3
    UNION
    SELECT ep.id, ep.nombre, ep.fecha, ep.lugar, ep.estado, ep.tipo_derby
    FROM eventos_palenque ep
    JOIN participantes_evento pe ON pe.evento_id = ep.id
    WHERE pe.usuario_id = $1
      AND ep.deleted_at IS NULL
      AND ep.fecha BETWEEN $2 AND $3
    ORDER BY fecha
  `, [req.userId, startDate, endDate]);

  eventosP.forEach(e => {
    events.push({
      id: `evento-${e.id}`,
      tipo: 'evento',
      fecha: e.fecha,
      titulo: e.nombre,
      subtitulo: e.lugar || e.tipo_derby || '',
      estado: e.estado,
      color: '#EAB308',
    });
  });

  events.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  res.json({ success: true, data: events });
}));

// Get upcoming events (next 7 days)
router.get('/proximos', asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const { rows: vacunas } = await db.query(`
    SELECT v.id, v.proxima_dosis as fecha, v.tipo_vacuna,
           a.codigo_identidad
    FROM vacunas v
    JOIN aves a ON v.ave_id = a.id
    WHERE a.usuario_id = $1
      AND a.deleted_at IS NULL
      AND v.proxima_dosis BETWEEN $2 AND $3
    ORDER BY v.proxima_dosis
  `, [req.userId, today, nextWeek]);

  const { rows: desparas } = await db.query(`
    SELECT d.id, d.proxima_aplicacion as fecha, d.producto,
           a.codigo_identidad
    FROM desparasitaciones d
    JOIN aves a ON d.ave_id = a.id
    WHERE a.usuario_id = $1
      AND a.deleted_at IS NULL
      AND d.proxima_aplicacion BETWEEN $2 AND $3
    ORDER BY d.proxima_aplicacion
  `, [req.userId, today, nextWeek]);

  res.json({
    success: true,
    data: {
      vacunas: vacunas.map(v => ({
        id: v.id,
        fecha: v.fecha,
        ave: v.codigo_identidad,
        detalle: v.tipo_vacuna
      })),
      desparasitaciones: desparas.map(d => ({
        id: d.id,
        fecha: d.fecha,
        ave: d.codigo_identidad,
        detalle: d.producto
      }))
    }
  });
}));

module.exports = router;
