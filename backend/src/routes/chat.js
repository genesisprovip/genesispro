/**
 * Chat Routes
 * Live chat for palenque events
 */

const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler, Errors } = require('../middleware/errorHandler');
const db = require('../config/database');
const logger = require('../config/logger');

// In-memory rate limit tracker: userId -> last message timestamp
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 2000; // 1 message per 2 seconds

/**
 * GET /evento/:eventoId - Get last 50 messages for an event (paginated with `before` cursor)
 */
router.get('/evento/:eventoId', authenticateJWT, asyncHandler(async (req, res) => {
  const { eventoId } = req.params;
  const { before } = req.query;

  let query;
  let params;

  if (before) {
    query = `
      SELECT cm.id, cm.mensaje, cm.eliminado, cm.created_at, cm.usuario_id,
             u.nombre AS usuario_nombre
      FROM chat_mensajes cm
      JOIN usuarios u ON u.id = cm.usuario_id
      WHERE cm.evento_id = $1
        AND cm.created_at < (SELECT created_at FROM chat_mensajes WHERE id = $2)
      ORDER BY cm.created_at DESC
      LIMIT 50
    `;
    params = [eventoId, before];
  } else {
    query = `
      SELECT cm.id, cm.mensaje, cm.eliminado, cm.created_at, cm.usuario_id,
             u.nombre AS usuario_nombre
      FROM chat_mensajes cm
      JOIN usuarios u ON u.id = cm.usuario_id
      WHERE cm.evento_id = $1
      ORDER BY cm.created_at DESC
      LIMIT 50
    `;
    params = [eventoId];
  }

  const { rows } = await db.query(query, params);

  // Reverse so oldest is first (for display)
  const messages = rows.reverse().map(m => ({
    id: m.id,
    mensaje: m.eliminado ? null : m.mensaje,
    eliminado: m.eliminado,
    usuario_id: m.usuario_id,
    usuario_nombre: m.usuario_nombre,
    created_at: m.created_at,
  }));

  res.json({ success: true, data: messages });
}));

/**
 * POST /evento/:eventoId - Send a message
 */
router.post('/evento/:eventoId', authenticateJWT, asyncHandler(async (req, res) => {
  const { eventoId } = req.params;
  const { mensaje } = req.body;
  const userId = req.userId;

  // Validate message
  if (!mensaje || typeof mensaje !== 'string' || mensaje.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: { message: 'El mensaje es requerido' }
    });
  }

  if (mensaje.length > 500) {
    return res.status(400).json({
      success: false,
      error: { message: 'El mensaje no puede exceder 500 caracteres' }
    });
  }

  // Rate limiting: 1 message per 2 seconds per user
  const lastSent = rateLimitMap.get(userId);
  const now = Date.now();
  if (lastSent && (now - lastSent) < RATE_LIMIT_MS) {
    return res.status(429).json({
      success: false,
      error: { message: 'Espera un momento antes de enviar otro mensaje' }
    });
  }
  rateLimitMap.set(userId, now);

  // Insert message
  const { rows } = await db.query(`
    INSERT INTO chat_mensajes (evento_id, usuario_id, mensaje)
    VALUES ($1, $2, $3)
    RETURNING id, mensaje, eliminado, created_at, usuario_id
  `, [eventoId, userId, mensaje.trim()]);

  // Get user name
  const userRes = await db.query('SELECT nombre FROM usuarios WHERE id = $1', [userId]);
  const msg = rows[0];

  res.status(201).json({
    success: true,
    data: {
      id: msg.id,
      mensaje: msg.mensaje,
      eliminado: msg.eliminado,
      usuario_id: msg.usuario_id,
      usuario_nombre: userRes.rows[0]?.nombre || 'Usuario',
      created_at: msg.created_at,
    }
  });
}));

/**
 * DELETE /:messageId - Soft delete a message (only author or event organizer)
 */
router.delete('/:messageId', authenticateJWT, asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.userId;

  // Get the message and check ownership
  const { rows: [message] } = await db.query(`
    SELECT cm.id, cm.usuario_id, cm.evento_id
    FROM chat_mensajes cm
    WHERE cm.id = $1
  `, [messageId]);

  if (!message) {
    return res.status(404).json({
      success: false,
      error: { message: 'Mensaje no encontrado' }
    });
  }

  // Check if user is the author or the event organizer
  const isAuthor = message.usuario_id === userId;

  let isOrganizer = false;
  if (!isAuthor) {
    const { rows: [evento] } = await db.query(
      'SELECT organizador_id FROM eventos_palenque WHERE id = $1',
      [message.evento_id]
    );
    isOrganizer = evento && evento.organizador_id === userId;
  }

  if (!isAuthor && !isOrganizer) {
    return res.status(403).json({
      success: false,
      error: { message: 'No tienes permiso para eliminar este mensaje' }
    });
  }

  // Soft delete
  await db.query(
    'UPDATE chat_mensajes SET eliminado = true WHERE id = $1',
    [messageId]
  );

  res.json({ success: true, message: 'Mensaje eliminado' });
}));

module.exports = router;
