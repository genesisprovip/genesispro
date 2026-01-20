/**
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { Errors, asyncHandler } = require('./errorHandler');
const logger = require('../config/logger');

/**
 * Verify JWT token and attach user to request
 */
const authenticateJWT = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Errors.unauthorized('Token no proporcionado');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user exists and is active
    const { rows } = await db.query(
      `SELECT
        u.id, u.email, u.nombre, u.plan_actual, u.email_verificado,
        u.foto_perfil, u.created_at
      FROM usuarios u
      WHERE u.id = $1 AND u.activo = true AND u.deleted_at IS NULL`,
      [decoded.userId]
    );

    if (rows.length === 0) {
      throw Errors.unauthorized('Usuario no válido o inactivo');
    }

    // Attach user to request
    req.user = rows[0];
    req.userId = rows[0].id;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw Errors.tokenExpired();
    }
    if (error.name === 'JsonWebTokenError') {
      throw Errors.tokenInvalid();
    }
    throw error;
  }
});

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await db.query(
      `SELECT id, email, nombre, plan_actual, foto_perfil
      FROM usuarios
      WHERE id = $1 AND activo = true AND deleted_at IS NULL`,
      [decoded.userId]
    );

    if (rows.length > 0) {
      req.user = rows[0];
      req.userId = rows[0].id;
    }
  } catch (error) {
    // Ignore token errors for optional auth
    logger.debug('Optional auth token invalid:', error.message);
  }

  next();
});

/**
 * Require email verification
 */
const requireEmailVerified = asyncHandler(async (req, res, next) => {
  if (!req.user.email_verificado) {
    throw Errors.forbidden('Debes verificar tu email para acceder a esta función');
  }
  next();
});

/**
 * Generate JWT tokens
 */
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );

  // Calculate expiration in seconds
  const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn
  };
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw Errors.tokenInvalid();
  }
};

module.exports = {
  authenticateJWT,
  optionalAuth,
  requireEmailVerified,
  generateTokens,
  verifyRefreshToken
};
