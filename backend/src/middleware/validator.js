/**
 * Request Validation Middleware
 */

const { validationResult } = require('express-validator');
const { Errors } = require('./errorHandler');

/**
 * Validate request and throw error if validation fails
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));

    throw Errors.validationError(
      'Error de validación',
      { errors: formattedErrors }
    );
  }

  next();
};

/**
 * Custom validators
 */
const customValidators = {
  isUUID: (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  isValidDate: (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime());
  },

  isPastDate: (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date <= new Date();
  },

  isFutureDate: (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime()) && date > new Date();
  },

  isPositiveNumber: (value) => {
    return typeof value === 'number' && value > 0;
  },

  isValidSexo: (value) => {
    return ['M', 'H'].includes(value);
  },

  isValidEstadoAve: (value) => {
    return ['activo', 'vendido', 'fallecido', 'prestamo'].includes(value);
  },

  isValidResultadoCombate: (value) => {
    return ['victoria', 'empate', 'derrota'].includes(value);
  },

  isValidTipoCombate: (value) => {
    return ['oficial', 'entrenamiento', 'amistoso'].includes(value);
  },

  isValidPlan: (value) => {
    return ['basico', 'pro', 'premium'].includes(value);
  }
};

module.exports = {
  validateRequest,
  customValidators
};
