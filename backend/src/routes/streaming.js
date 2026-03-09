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
const WEBRTC_SIGNALING_URL = process.env.WEBRTC_SIGNALING_URL || 'wss://live.genesispro.vip:3334';

// Quality tiers based on app subscription plan
const QUALITY_TIERS = {
  free: { calidad: '360p', previewMinutos: 5 },
  basico: { calidad: '480p', previewMinutos: null },
  pro: { calidad: '720p', previewMinutos: null },
  premium: { calidad: '1080p', previewMinutos: null },
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

  // Verify the event belongs to this user
  const { rows: [evento] } = await db.query(
    `SELECT id, nombre, estado FROM eventos_palenque
     WHERE id = $1 AND organizador_id = $2 AND deleted_at IS NULL`,
    [eventoId, userId]
  );

  if (!evento) throw Errors.notFound('Evento no encontrado o no eres el organizador');

  // Check if there's already an active stream for this event
  const { rows: [existingStream] } = await db.query(
    `SELECT id, stream_key FROM streams_evento
     WHERE evento_id = $1 AND estado = 'activo'`,
    [eventoId]
  );

  if (existingStream) {
    return res.json({
      success: true,
      data: {
        streamKey: existingStream.stream_key,
        rtmpUrl: RTMP_URL,
        streamName: existingStream.stream_key,
        message: 'Stream ya activo para este evento',
      },
    });
  }

  // Reuse the last stream key for this event if one exists (so Larix doesn't need reconfiguring)
  const { rows: [lastStream] } = await db.query(
    `SELECT stream_key FROM streams_evento
     WHERE evento_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [eventoId]
  );
  const streamKey = lastStream ? lastStream.stream_key : crypto.randomUUID();

  // Store in DB
  const { rows: [stream] } = await db.query(
    `INSERT INTO streams_evento (evento_id, usuario_id, stream_key, estado, calidad_max)
     VALUES ($1, $2, $3, 'activo', '1080p')
     ON CONFLICT (stream_key) DO UPDATE SET estado = 'activo', ended_at = NULL, started_at = NOW()
     RETURNING id, stream_key, started_at`,
    [eventoId, userId, streamKey]
  );

  logger.info(`[Streaming] Stream started: evento=${eventoId}, user=${userId}, key=${streamKey}`);

  res.json({
    success: true,
    data: {
      streamKey: stream.stream_key,
      rtmpUrl: RTMP_URL,
      streamName: stream.stream_key,
      startedAt: stream.started_at,
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
     RETURNING id, stream_key`,
    [eventoId, userId]
  );

  if (!stream) {
    throw Errors.notFound('No hay stream activo para este evento');
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

  // Get the latest stream for this event
  const { rows: [stream] } = await db.query(
    `SELECT id, stream_key, estado, calidad_max, viewers_count, viewers_peak, started_at, ended_at
     FROM streams_evento
     WHERE evento_id = $1
     ORDER BY created_at DESC
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

  const isLive = stream.estado === 'activo';
  const data = {
    isLive,
    hlsUrl: isLive ? `${HLS_BASE_URL}/${stream.stream_key}/llhls.m3u8` : null,
    webrtcUrl: isLive ? `${WEBRTC_SIGNALING_URL}/live/${stream.stream_key}` : null,
    webrtcSignaling: isLive ? WEBRTC_SIGNALING_URL : null,
    streamName: isLive ? stream.stream_key : null,
    calidad: qualityTier.calidad,
    previewMinutos: qualityTier.previewMinutos,
    viewersCount: stream.viewers_count,
    viewersPeak: stream.viewers_peak,
    startedAt: stream.started_at,
    endedAt: stream.ended_at,
  };

  res.json({ success: true, data });
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
