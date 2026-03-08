const express = require('express');
const router = express.Router();
const { authenticateJWT, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../config/database');
const logger = require('../config/logger');

// Register push token (requires auth since usuario_id is NOT NULL)
router.post('/register-token', authenticateJWT, asyncHandler(async (req, res) => {
  const { token, platform } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, error: { message: 'Token requerido' } });
  }

  // Upsert token
  await db.query(`
    INSERT INTO push_tokens (usuario_id, token, plataforma, activo, updated_at)
    VALUES ($1, $2, $3, true, NOW())
    ON CONFLICT (token) DO UPDATE SET
      usuario_id = $1,
      plataforma = COALESCE($3, push_tokens.plataforma),
      activo = true,
      updated_at = NOW()
  `, [req.userId, token, platform || 'expo']);

  res.json({ success: true, message: 'Token registrado' });
}));

// Unregister token
router.post('/unregister-token', asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, error: { message: 'Token requerido' } });
  }

  await db.query('UPDATE push_tokens SET activo = false, updated_at = NOW() WHERE token = $1', [token]);
  res.json({ success: true, message: 'Token desactivado' });
}));

// Get/update notification preferences (requires auth)
router.get('/preferences', authenticateJWT, asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    'SELECT * FROM preferencias_notificacion WHERE usuario_id = $1',
    [req.userId]
  );

  res.json({
    success: true,
    data: rows[0] || {
      push_habilitado: true,
      alerta_vacunas: true,
      recordatorio_combates: false,
      avisos_evento: true
    }
  });
}));

router.put('/preferences', authenticateJWT, asyncHandler(async (req, res) => {
  const { push_habilitado, alerta_vacunas, recordatorio_combates, avisos_evento } = req.body;

  const { rows } = await db.query(`
    INSERT INTO preferencias_notificacion (usuario_id, push_habilitado, alerta_vacunas, recordatorio_combates, avisos_evento, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (usuario_id) DO UPDATE SET
      push_habilitado = COALESCE($2, preferencias_notificacion.push_habilitado),
      alerta_vacunas = COALESCE($3, preferencias_notificacion.alerta_vacunas),
      recordatorio_combates = COALESCE($4, preferencias_notificacion.recordatorio_combates),
      avisos_evento = COALESCE($5, preferencias_notificacion.avisos_evento),
      updated_at = NOW()
    RETURNING *
  `, [req.userId, push_habilitado, alerta_vacunas, recordatorio_combates, avisos_evento]);

  res.json({ success: true, data: rows[0] });
}));

// Send push notification (internal helper, exported for use by other routes)
async function sendPushNotification(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return;

  const messages = tokens.map(token => ({
    to: token,
    sound: 'default',
    title,
    body,
    data,
  }));

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    logger.info(`Push sent to ${tokens.length} devices`, result);
    return result;
  } catch (error) {
    logger.error('Push notification error:', error);
  }
}

// Send notification to all participants of an evento
async function notifyEventoParticipants(eventoId, title, body, data = {}) {
  const { rows } = await db.query(`
    SELECT DISTINCT pt.token
    FROM push_tokens pt
    JOIN participantes_evento pe ON pe.usuario_id = pt.usuario_id
    WHERE pe.evento_id = $1
      AND pt.activo = true
  `, [eventoId]);

  const tokens = rows.map(r => r.token);
  if (tokens.length > 0) {
    return sendPushNotification(tokens, title, body, { ...data, eventoId });
  }
}

// Send notification to a specific user
async function notifyUser(userId, title, body, data = {}) {
  const { rows } = await db.query(
    'SELECT token FROM push_tokens WHERE usuario_id = $1 AND activo = true',
    [userId]
  );

  const tokens = rows.map(r => r.token);
  if (tokens.length > 0) {
    return sendPushNotification(tokens, title, body, data);
  }
}

router.sendPushNotification = sendPushNotification;
router.notifyEventoParticipants = notifyEventoParticipants;
router.notifyUser = notifyUser;

module.exports = router;
