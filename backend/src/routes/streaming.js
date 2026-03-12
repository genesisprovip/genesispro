/**
 * GenesisPro - Streaming Routes
 * Live streaming management for palenque events via OvenMediaEngine
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/database');
const { EMPRESARIO_CONFIG } = require('../config/stripe');
const { authenticateJWT } = require('../middleware/auth');
const { Errors, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

const RTMP_URL = process.env.RTMP_URL || 'rtmp://live.genesispro.vip/live';
const HLS_BASE_URL = process.env.HLS_BASE_URL || 'https://live.genesispro.vip/live';
const WEBRTC_SIGNALING_URL = process.env.WEBRTC_SIGNALING_URL || 'wss://live.genesispro.vip/ws';

// Quality tiers based on app subscription plan
const QUALITY_TIERS = {
  free: { calidad: '360p', previewMinutos: 5, maxHeight: 360 },
  basico: { calidad: '480p', previewMinutos: null, maxHeight: 480 },
  pro: { calidad: '720p', previewMinutos: null, maxHeight: 720 },
  premium: { calidad: '1080p', previewMinutos: null, maxHeight: 1080 },
};

// OvenMediaEngine rendition suffixes for ABR streams
// OME LLHLS outputs renditions as separate playlists when transcoding is enabled:
//   /live/{key}/llhls.m3u8       -> master (ABR)
//   /live/{key}/llhls.m3u8?rendition=480p  -> capped rendition (when supported)
// If OME is single-bitrate, the master URL is used and the frontend caps display.
const RENDITION_MAP = {
  360: 'low',
  480: 'mid',
  720: 'high',
  1080: 'source',
};

// ─── POST /start - Start a stream for an event (empresario premium only) ───
router.post('/start', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { eventoId } = req.body;

  if (!eventoId) throw Errors.badRequest('eventoId es requerido');

  // Verify user has empresario premium plan
  const { rows: [user] } = await db.query(
    'SELECT id, plan_empresario FROM usuarios WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );

  if (!user) throw Errors.notFound('Usuario');

  if (user.plan_empresario !== 'empresario_premium') {
    throw Errors.forbidden('Streaming en vivo solo esta disponible para el plan Empresario Premium');
  }

  // Verify the event belongs to this user OR user is an authorized operator
  let evento;
  const { rows: [ownedEvento] } = await db.query(
    `SELECT id, nombre, estado, organizador_id FROM eventos_palenque
     WHERE id = $1 AND deleted_at IS NULL`,
    [eventoId]
  );

  if (!ownedEvento) throw Errors.notFound('Evento no encontrado');

  const isOrganizer = ownedEvento.organizador_id === userId;

  if (!isOrganizer) {
    // Check if user is an authorized operator
    const { rows: [operador] } = await db.query(
      `SELECT id FROM operadores_evento
       WHERE evento_id = $1 AND usuario_id = $2 AND activo = true`,
      [eventoId, userId]
    );
    if (!operador) throw Errors.forbidden('No eres el organizador ni un operador autorizado de este evento');
  }

  evento = ownedEvento;

  // Block streaming for finalized/cancelled events
  if (evento.estado === 'finalizado' || evento.estado === 'cancelado') {
    throw Errors.badRequest(`No se puede transmitir un evento ${evento.estado}. El evento debe estar en curso o programado.`);
  }

  // Check if THIS USER already has an active stream for this event
  const { rows: [existingStream] } = await db.query(
    `SELECT id, stream_key, es_principal, nombre_camara FROM streams_evento
     WHERE evento_id = $1 AND usuario_id = $2 AND estado = 'activo'`,
    [eventoId, userId]
  );

  if (existingStream) {
    return res.json({
      success: true,
      data: {
        streamKey: existingStream.stream_key,
        rtmpUrl: RTMP_URL,
        streamName: existingStream.stream_key,
        esPrincipal: existingStream.es_principal,
        nombreCamara: existingStream.nombre_camara,
        message: 'Stream ya activo para este evento',
      },
    });
  }

  // Check if there are any other active streams for this event (determines principal/director)
  const { rows: activeStreams } = await db.query(
    `SELECT id FROM streams_evento WHERE evento_id = $1 AND estado = 'activo'`,
    [eventoId]
  );
  const isFirstStream = activeStreams.length === 0;
  const nombreCamara = req.body.nombreCamara || `Cámara ${activeStreams.length + 1}`;

  // Reuse the last stream key for this user+event if one exists (so Larix doesn't need reconfiguring)
  const { rows: [lastStream] } = await db.query(
    `SELECT stream_key FROM streams_evento
     WHERE evento_id = $1 AND usuario_id = $2
     ORDER BY created_at DESC LIMIT 1`,
    [eventoId, userId]
  );
  const streamKey = lastStream ? lastStream.stream_key : crypto.randomUUID();

  // Store in DB — first stream becomes principal and director
  const { rows: [stream] } = await db.query(
    `INSERT INTO streams_evento (evento_id, usuario_id, stream_key, estado, calidad_max, es_principal, es_director, nombre_camara)
     VALUES ($1, $2, $3, 'activo', '1080p', $4, $5, $6)
     ON CONFLICT (stream_key) DO UPDATE SET estado = 'activo', ended_at = NULL, started_at = NOW(),
       es_principal = $4, es_director = $5, nombre_camara = $6
     RETURNING id, stream_key, started_at, es_principal, es_director, nombre_camara`,
    [eventoId, userId, streamKey, isFirstStream, isFirstStream, nombreCamara]
  );

  logger.info(`[Streaming] Stream started: evento=${eventoId}, user=${userId}, key=${streamKey}, principal=${isFirstStream}`);

  res.json({
    success: true,
    data: {
      streamKey: stream.stream_key,
      rtmpUrl: RTMP_URL,
      streamName: stream.stream_key,
      startedAt: stream.started_at,
      esPrincipal: stream.es_principal,
      esDirector: stream.es_director,
      nombreCamara: stream.nombre_camara,
    },
  });
}));

// ─── POST /stop - Stop a stream ───
router.post('/stop', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { eventoId } = req.body;

  if (!eventoId) throw Errors.badRequest('eventoId es requerido');

  // Find the active stream for this event owned by this user
  const { rows: [stream] } = await db.query(
    `UPDATE streams_evento
     SET estado = 'finalizado', ended_at = NOW()
     WHERE evento_id = $1 AND usuario_id = $2 AND estado = 'activo'
     RETURNING id, stream_key, es_principal`,
    [eventoId, userId]
  );

  if (!stream) {
    throw Errors.notFound('No hay stream activo para este evento');
  }

  // If the stopped stream was principal, promote another active stream if available
  if (stream.es_principal) {
    await db.query(
      `UPDATE streams_evento SET es_principal = true
       WHERE id = (
         SELECT id FROM streams_evento
         WHERE evento_id = $1 AND estado = 'activo'
         ORDER BY es_director DESC, created_at ASC
         LIMIT 1
       )`,
      [eventoId]
    );
  }

  logger.info(`[Streaming] Stream stopped: evento=${eventoId}, user=${userId}, key=${stream.stream_key}`);

  res.json({
    success: true,
    data: {
      message: 'Stream finalizado',
      stream_key: stream.stream_key,
    },
  });
}));

// ─── GET /evento/:eventoId - Get stream info for an event (public, optional auth) ───
router.get('/evento/:eventoId', asyncHandler(async (req, res) => {
  const { eventoId } = req.params;

  // Get the principal active stream for this event, or fall back to latest stream
  const { rows: [stream] } = await db.query(
    `SELECT id, stream_key, estado, calidad_max, viewers_count, viewers_peak, started_at, ended_at,
            es_principal, nombre_camara
     FROM streams_evento
     WHERE evento_id = $1
     ORDER BY (estado = 'activo' AND es_principal = true) DESC,
              (estado = 'activo') DESC,
              created_at DESC
     LIMIT 1`,
    [eventoId]
  );

  if (!stream) {
    return res.json({
      success: true,
      data: { stream: null, message: 'No hay stream para este evento' },
    });
  }

  // Optional auth - try to get user plan but don't require it
  let userPlan = 'free';
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const jwt = require('jsonwebtoken');
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { rows: [user] } = await db.query(
        'SELECT plan_actual FROM usuarios WHERE id = $1', [decoded.userId]
      );
      if (user) userPlan = user.plan_actual || 'free';
    } catch { /* ignore - use free tier */ }
  }

  const qualityTier = QUALITY_TIERS[userPlan] || QUALITY_TIERS.free;
  const renditionSuffix = RENDITION_MAP[qualityTier.maxHeight] || 'source';

  const isLive = stream.estado === 'activo';
  const masterHlsUrl = `${HLS_BASE_URL}/${stream.stream_key}/llhls.m3u8`;
  const data = {
    isLive,
    hlsUrl: isLive ? masterHlsUrl : null,
    webrtcUrl: isLive ? `${WEBRTC_SIGNALING_URL}/live/${stream.stream_key}` : null,
    webrtcSignaling: isLive ? WEBRTC_SIGNALING_URL : null,
    streamName: isLive ? stream.stream_key : null,
    calidad: qualityTier.calidad,
    calidadMaxHeight: qualityTier.maxHeight,
    rendition: renditionSuffix,
    planActual: userPlan,
    previewMinutos: qualityTier.previewMinutos,
    viewersCount: stream.viewers_count,
    viewersPeak: stream.viewers_peak,
    startedAt: stream.started_at,
    endedAt: stream.ended_at,
  };

  res.json({ success: true, data });
}));

// ─── GET /camaras/:eventoId - List all active cameras for an event ───
router.get('/camaras/:eventoId', asyncHandler(async (req, res) => {
  const { eventoId } = req.params;

  const { rows: camaras } = await db.query(
    `SELECT s.id, s.stream_key, s.nombre_camara, s.es_principal, s.es_director,
            s.viewers_count, s.estado, s.started_at,
            u.nombre as operador_nombre
     FROM streams_evento s
     LEFT JOIN usuarios u ON s.usuario_id = u.id
     WHERE s.evento_id = $1 AND s.estado = 'activo'
     ORDER BY s.es_principal DESC, s.created_at ASC`,
    [eventoId]
  );

  res.json({
    success: true,
    data: {
      camaras: camaras.map(c => ({
        id: c.id,
        streamKey: c.stream_key,
        nombreCamara: c.nombre_camara,
        esPrincipal: c.es_principal,
        esDirector: c.es_director,
        viewersCount: c.viewers_count,
        estado: c.estado,
        startedAt: c.started_at,
        operadorNombre: c.operador_nombre,
      })),
      total: camaras.length,
    },
  });
}));

// ─── POST /set-principal - Director switches principal camera ───
router.post('/set-principal', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { eventoId, streamId } = req.body;

  if (!eventoId || !streamId) throw Errors.badRequest('eventoId y streamId son requeridos');

  // Verify the user is the director or the event creator
  const { rows: [evento] } = await db.query(
    `SELECT id, organizador_id FROM eventos_palenque
     WHERE id = $1 AND deleted_at IS NULL`,
    [eventoId]
  );

  if (!evento) throw Errors.notFound('Evento no encontrado');

  const isOrganizer = evento.organizador_id === userId;

  // Check if user is the director of any active stream for this event
  const { rows: [directorStream] } = await db.query(
    `SELECT id FROM streams_evento
     WHERE evento_id = $1 AND usuario_id = $2 AND es_director = true AND estado = 'activo'`,
    [eventoId, userId]
  );

  if (!isOrganizer && !directorStream) {
    throw Errors.forbidden('Solo el director o el organizador pueden cambiar la cámara principal');
  }

  // Verify the target stream exists and is active
  const { rows: [targetStream] } = await db.query(
    `SELECT id, stream_key, nombre_camara FROM streams_evento
     WHERE id = $1 AND evento_id = $2 AND estado = 'activo'`,
    [streamId, eventoId]
  );

  if (!targetStream) throw Errors.notFound('Stream no encontrado o no está activo');

  // Set all streams for this event to non-principal, then set the chosen one
  await db.query(
    `UPDATE streams_evento SET es_principal = false WHERE evento_id = $1 AND estado = 'activo'`,
    [eventoId]
  );

  await db.query(
    `UPDATE streams_evento SET es_principal = true WHERE id = $1`,
    [streamId]
  );

  logger.info(`[Streaming] Principal camera switched: evento=${eventoId}, stream=${streamId}, by=${userId}`);

  res.json({
    success: true,
    data: {
      message: 'Cámara principal actualizada',
      streamId: targetStream.id,
      streamKey: targetStream.stream_key,
      nombreCamara: targetStream.nombre_camara,
    },
  });
}));

// ─── POST /operadores - Add an operator to an event ───
router.post('/operadores', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { eventoId, email } = req.body;

  if (!eventoId || !email) throw Errors.badRequest('eventoId y email son requeridos');

  // Verify the user is the event organizer
  const { rows: [evento] } = await db.query(
    `SELECT id FROM eventos_palenque
     WHERE id = $1 AND organizador_id = $2 AND deleted_at IS NULL`,
    [eventoId, userId]
  );

  if (!evento) throw Errors.notFound('Evento no encontrado o no eres el organizador');

  // Look up the operator user by email
  const { rows: [operadorUser] } = await db.query(
    `SELECT id, nombre FROM usuarios WHERE email = $1 AND deleted_at IS NULL`,
    [email.toLowerCase().trim()]
  );

  if (!operadorUser) throw Errors.notFound('No se encontró un usuario con ese email');

  // Insert operator (upsert in case they were previously removed)
  const { rows: [operador] } = await db.query(
    `INSERT INTO operadores_evento (evento_id, usuario_id, nombre, autorizado_por, activo)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (evento_id, usuario_id)
     DO UPDATE SET activo = true, autorizado_por = $4, nombre = $3
     RETURNING id, usuario_id, nombre, created_at`,
    [eventoId, operadorUser.id, operadorUser.nombre, userId]
  );

  logger.info(`[Streaming] Operator added: evento=${eventoId}, operador=${operadorUser.id}, by=${userId}`);

  res.json({
    success: true,
    data: {
      id: operador.id,
      usuarioId: operador.usuario_id,
      nombre: operador.nombre,
      createdAt: operador.created_at,
    },
  });
}));

// ─── GET /operadores/:eventoId - List operators for an event ───
router.get('/operadores/:eventoId', authenticateJWT, asyncHandler(async (req, res) => {
  const { eventoId } = req.params;

  const { rows: operadores } = await db.query(
    `SELECT o.id, o.usuario_id, o.nombre, o.activo, o.created_at,
            u.email, a.nombre as autorizado_por_nombre
     FROM operadores_evento o
     JOIN usuarios u ON o.usuario_id = u.id
     LEFT JOIN usuarios a ON o.autorizado_por = a.id
     WHERE o.evento_id = $1 AND o.activo = true
     ORDER BY o.created_at ASC`,
    [eventoId]
  );

  res.json({
    success: true,
    data: {
      operadores: operadores.map(o => ({
        id: o.id,
        usuarioId: o.usuario_id,
        nombre: o.nombre,
        email: o.email,
        autorizadoPor: o.autorizado_por_nombre,
        createdAt: o.created_at,
      })),
      total: operadores.length,
    },
  });
}));

// ─── DELETE /operadores/:operadorId - Remove an operator ───
router.delete('/operadores/:operadorId', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.userId;
  const { operadorId } = req.params;

  // Verify the operator exists and the requester is the event organizer
  const { rows: [operador] } = await db.query(
    `SELECT o.id, o.evento_id, o.usuario_id, o.nombre
     FROM operadores_evento o
     JOIN eventos_palenque e ON o.evento_id = e.id
     WHERE o.id = $1 AND e.organizador_id = $2`,
    [operadorId, userId]
  );

  if (!operador) throw Errors.notFound('Operador no encontrado o no tienes permisos');

  await db.query(
    `UPDATE operadores_evento SET activo = false WHERE id = $1`,
    [operadorId]
  );

  logger.info(`[Streaming] Operator removed: id=${operadorId}, evento=${operador.evento_id}, by=${userId}`);

  res.json({
    success: true,
    data: { message: 'Operador removido', id: operadorId },
  });
}));

// ─── GET /active - List all currently active streams ───
router.get('/active', asyncHandler(async (req, res) => {
  const { rows: streams } = await db.query(
    `SELECT s.id, s.evento_id, s.estado, s.viewers_count, s.started_at,
            e.nombre as evento_nombre, e.fecha, e.lugar,
            u.nombre as organizador_nombre
     FROM streams_evento s
     JOIN eventos_palenque e ON s.evento_id = e.id AND e.deleted_at IS NULL
     JOIN usuarios u ON s.usuario_id = u.id
     WHERE s.estado = 'activo'
     ORDER BY s.started_at DESC`
  );

  res.json({
    success: true,
    data: {
      streams: streams.map(s => ({
        id: s.id,
        evento_id: s.evento_id,
        evento_nombre: s.evento_nombre,
        fecha: s.fecha,
        lugar: s.lugar,
        organizador: s.organizador_nombre,
        viewers_count: s.viewers_count,
        started_at: s.started_at,
      })),
      total: streams.length,
    },
  });
}));

module.exports = router;
