/**
 * Global Error Handler Middleware
 */

const Sentry = require('@sentry/node');
const logger = require('../config/logger');

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common error factory methods
 */
const Errors = {
  badRequest: (message, details = null) =>
    new ApiError(400, 'BAD_REQUEST', message, details),

  unauthorized: (message = 'No autorizado') =>
    new ApiError(401, 'UNAUTHORIZED', message),

  forbidden: (message = 'Acceso denegado') =>
    new ApiError(403, 'FORBIDDEN', message),

  notFound: (resource = 'Recurso') =>
    new ApiError(404, 'NOT_FOUND', `${resource} no encontrado`),

  conflict: (message) =>
    new ApiError(409, 'CONFLICT', message),

  validationError: (message, details = null) =>
    new ApiError(422, 'VALIDATION_ERROR', message, details),

  limitExceeded: (message, details = null) =>
    new ApiError(403, 'LIMIT_EXCEEDED', message, details),

  subscriptionRequired: (plan = 'pro') =>
    new ApiError(403, 'SUBSCRIPTION_REQUIRED', `Esta función requiere plan ${plan}`, { required_plan: plan }),

  subscriptionExpired: () =>
    new ApiError(403, 'SUBSCRIPTION_EXPIRED', 'Tu suscripción ha expirado'),

  rateLimitExceeded: () =>
    new ApiError(429, 'RATE_LIMIT_EXCEEDED', 'Demasiadas peticiones, intenta más tarde'),

  tokenExpired: () =>
    new ApiError(401, 'TOKEN_EXPIRED', 'Token expirado'),

  tokenInvalid: () =>
    new ApiError(401, 'TOKEN_INVALID', 'Token inválido'),

  internal: (message = 'Error interno del servidor') =>
    new ApiError(500, 'INTERNAL_ERROR', message)
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  next(Errors.notFound(`Ruta ${req.originalUrl}`));
};

/**
 * Global Error Handler
 */
const errorHandler = (err, req, res, next) => {
  // Log error
  if (err.statusCode >= 500 || !err.isOperational) {
    logger.error('Server error:', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      user: req.user?.id
    });
    // Send unexpected/server errors to Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setTag('url', req.originalUrl);
        scope.setTag('method', req.method);
        if (req.userId) scope.setUser({ id: req.userId });
        Sentry.captureException(err);
      });
    }
  } else if (process.env.NODE_ENV === 'development') {
    logger.warn('Client error:', {
      message: err.message,
      code: err.code,
      url: req.originalUrl
    });
  }

  // Default to 500 if no statusCode
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Build error response
  const response = {
    success: false,
    error: {
      code,
      message: err.isOperational ? err.message : 'Error interno del servidor'
    }
  };

  // Add details if available
  if (err.details) {
    response.error.details = err.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

/**
 * Async handler wrapper to catch async errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ApiError,
  Errors,
  notFoundHandler,
  errorHandler,
  asyncHandler
};
