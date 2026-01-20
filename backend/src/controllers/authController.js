/**
 * Authentication Controller
 */

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const { Errors, asyncHandler } = require('../middleware/errorHandler');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');
const logger = require('../config/logger');

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { email, password, nombre, telefono, ubicacion } = req.body;

  // Check if email already exists
  const { rows: existing } = await db.query(
    'SELECT id FROM usuarios WHERE email = $1',
    [email.toLowerCase()]
  );

  if (existing.length > 0) {
    throw Errors.conflict('Este email ya está registrado');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // Create user
  const { rows } = await db.query(
    `INSERT INTO usuarios (email, password_hash, nombre, telefono, ubicacion)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, nombre, telefono, ubicacion, plan_actual, email_verificado, created_at`,
    [email.toLowerCase(), passwordHash, nombre, telefono || null, ubicacion || null]
  );

  const user = rows[0];

  // Generate tokens
  const tokens = generateTokens(user.id);

  // Store refresh token hash
  const refreshTokenHash = crypto.createHash('sha256').update(tokens.refresh_token).digest('hex');
  await db.query(
    `INSERT INTO refresh_tokens (usuario_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
    [user.id, refreshTokenHash]
  );

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    success: true,
    message: 'Usuario registrado exitosamente',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        telefono: user.telefono,
        ubicacion: user.ubicacion,
        plan_actual: user.plan_actual,
        email_verificado: user.email_verificado,
        created_at: user.created_at
      },
      tokens
    }
  });
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password, device_info } = req.body;

  // Find user
  const { rows } = await db.query(
    `SELECT id, email, password_hash, nombre, telefono, ubicacion,
            plan_actual, email_verificado, foto_perfil, activo, created_at
     FROM usuarios
     WHERE email = $1 AND deleted_at IS NULL`,
    [email.toLowerCase()]
  );

  if (rows.length === 0) {
    throw Errors.unauthorized('Credenciales inválidas');
  }

  const user = rows[0];

  // Check if user is active
  if (!user.activo) {
    throw Errors.unauthorized('Tu cuenta ha sido desactivada');
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);

  if (!isValidPassword) {
    throw Errors.unauthorized('Credenciales inválidas');
  }

  // Generate tokens
  const tokens = generateTokens(user.id);

  // Store refresh token
  const refreshTokenHash = crypto.createHash('sha256').update(tokens.refresh_token).digest('hex');
  const ipAddress = req.ip || req.connection.remoteAddress;

  await db.query(
    `INSERT INTO refresh_tokens (usuario_id, token_hash, device_info, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')`,
    [user.id, refreshTokenHash, device_info ? JSON.stringify(device_info) : null, ipAddress]
  );

  // Update last access
  await db.query(
    'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
    [user.id]
  );

  logger.info(`User logged in: ${user.email}`);

  res.json({
    success: true,
    message: 'Login exitoso',
    data: {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        telefono: user.telefono,
        ubicacion: user.ubicacion,
        plan_actual: user.plan_actual,
        email_verificado: user.email_verificado,
        foto_perfil: user.foto_perfil,
        created_at: user.created_at
      },
      tokens
    }
  });
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;

  // Verify token
  const decoded = verifyRefreshToken(refresh_token);

  // Check if token exists and is not revoked
  const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');

  const { rows } = await db.query(
    `SELECT rt.*, u.id as user_id, u.email, u.activo
     FROM refresh_tokens rt
     JOIN usuarios u ON rt.usuario_id = u.id
     WHERE rt.token_hash = $1 AND rt.revoked = false AND rt.expires_at > NOW()`,
    [tokenHash]
  );

  if (rows.length === 0) {
    throw Errors.tokenInvalid();
  }

  const tokenData = rows[0];

  if (!tokenData.activo) {
    throw Errors.unauthorized('Tu cuenta ha sido desactivada');
  }

  // Generate new access token only
  const newAccessToken = require('jsonwebtoken').sign(
    { userId: tokenData.user_id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  res.json({
    success: true,
    data: {
      access_token: newAccessToken,
      expires_in: 7 * 24 * 60 * 60
    }
  });
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    // Revoke all refresh tokens for this user (optional: could revoke just current)
    await db.query(
      `UPDATE refresh_tokens
       SET revoked = true, revoked_at = NOW(), revoked_reason = 'logout'
       WHERE usuario_id = $1 AND revoked = false`,
      [req.userId]
    );
  }

  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
const getProfile = asyncHandler(async (req, res) => {
  const { rows } = await db.query(
    `SELECT
      u.id, u.email, u.nombre, u.telefono, u.ubicacion,
      u.foto_perfil, u.email_verificado, u.plan_actual,
      u.created_at, u.ultimo_acceso,
      l.max_aves, l.aves_actuales, l.max_fotos_por_ave,
      l.profundidad_genealogia, l.analytics_avanzado,
      l.multi_usuario, l.exportacion, l.api_access,
      l.suscripcion_valida
     FROM usuarios u
     LEFT JOIN v_limites_usuario l ON u.id = l.usuario_id
     WHERE u.id = $1`,
    [req.userId]
  );

  if (rows.length === 0) {
    throw Errors.notFound('Usuario');
  }

  const user = rows[0];

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        telefono: user.telefono,
        ubicacion: user.ubicacion,
        foto_perfil: user.foto_perfil,
        email_verificado: user.email_verificado,
        plan_actual: user.plan_actual,
        created_at: user.created_at,
        ultimo_acceso: user.ultimo_acceso
      },
      limites: {
        max_aves: user.max_aves,
        aves_actuales: user.aves_actuales,
        max_fotos_por_ave: user.max_fotos_por_ave,
        profundidad_genealogia: user.profundidad_genealogia,
        analytics_avanzado: user.analytics_avanzado,
        multi_usuario: user.multi_usuario,
        exportacion: user.exportacion,
        api_access: user.api_access,
        suscripcion_valida: user.suscripcion_valida
      }
    }
  });
});

/**
 * Update user profile
 * PUT /api/v1/auth/me
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { nombre, telefono, ubicacion } = req.body;

  const { rows } = await db.query(
    `UPDATE usuarios
     SET nombre = COALESCE($2, nombre),
         telefono = COALESCE($3, telefono),
         ubicacion = COALESCE($4, ubicacion),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, nombre, telefono, ubicacion, foto_perfil, plan_actual`,
    [req.userId, nombre, telefono, ubicacion]
  );

  res.json({
    success: true,
    message: 'Perfil actualizado',
    data: { user: rows[0] }
  });
});

/**
 * Change password
 * PUT /api/v1/auth/change-password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { password_actual, password_nuevo } = req.body;

  // Get current password hash
  const { rows } = await db.query(
    'SELECT password_hash FROM usuarios WHERE id = $1',
    [req.userId]
  );

  // Verify current password
  const isValid = await bcrypt.compare(password_actual, rows[0].password_hash);

  if (!isValid) {
    throw Errors.unauthorized('Contraseña actual incorrecta');
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const newPasswordHash = await bcrypt.hash(password_nuevo, salt);

  // Update password
  await db.query(
    'UPDATE usuarios SET password_hash = $2, updated_at = NOW() WHERE id = $1',
    [req.userId, newPasswordHash]
  );

  // Revoke all refresh tokens
  await db.query(
    `UPDATE refresh_tokens
     SET revoked = true, revoked_at = NOW(), revoked_reason = 'password_change'
     WHERE usuario_id = $1 AND revoked = false`,
    [req.userId]
  );

  logger.info(`Password changed for user: ${req.userId}`);

  res.json({
    success: true,
    message: 'Contraseña actualizada. Por favor inicia sesión nuevamente.'
  });
});

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Always return success to prevent email enumeration
  const successResponse = {
    success: true,
    message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
  };

  const { rows } = await db.query(
    'SELECT id, email FROM usuarios WHERE email = $1 AND deleted_at IS NULL',
    [email.toLowerCase()]
  );

  if (rows.length === 0) {
    return res.json(successResponse);
  }

  // Generate reset token (in production, send via email)
  const resetToken = crypto.randomBytes(32).toString('hex');

  // TODO: Store token and send email
  logger.info(`Password reset requested for: ${email}, token: ${resetToken}`);

  res.json(successResponse);
});

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password/:token
 */
const resetPassword = asyncHandler(async (req, res) => {
  // TODO: Implement token verification
  res.json({
    success: true,
    message: 'Funcionalidad en desarrollo'
  });
});

/**
 * Verify email
 * GET /api/v1/auth/verify-email/:token
 */
const verifyEmail = asyncHandler(async (req, res) => {
  // TODO: Implement email verification
  res.json({
    success: true,
    message: 'Funcionalidad en desarrollo'
  });
});

/**
 * Delete account
 * DELETE /api/v1/auth/account
 */
const deleteAccount = asyncHandler(async (req, res) => {
  // Soft delete
  await db.query(
    `UPDATE usuarios
     SET deleted_at = NOW(), activo = false, email = email || '_deleted_' || id
     WHERE id = $1`,
    [req.userId]
  );

  // Revoke all tokens
  await db.query(
    `UPDATE refresh_tokens
     SET revoked = true, revoked_at = NOW(), revoked_reason = 'account_deleted'
     WHERE usuario_id = $1`,
    [req.userId]
  );

  logger.info(`Account deleted: ${req.userId}`);

  res.json({
    success: true,
    message: 'Cuenta eliminada'
  });
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  deleteAccount
};
