/**
 * Finanzas (Finances) Routes
 * Manages: transacciones, categorias, dashboard, ROI
 */

const express = require('express');
const router = express.Router();
const finanzasController = require('../controllers/finanzasController');
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateRequest: validate } = require('../middleware/validator');
const { body, param, query } = require('express-validator');

// All routes require authentication
router.use(authenticateJWT);

// ============================================
// Validation Schemas
// ============================================

const uuidParam = (field) => param(field).isUUID().withMessage(`${field} inválido`);

const transaccionValidation = [
  body('categoria_id')
    .notEmpty().withMessage('Categoría requerida')
    .isInt({ min: 1 }).withMessage('ID de categoría inválido'),
  body('tipo')
    .notEmpty().withMessage('Tipo requerido')
    .isIn(['ingreso', 'egreso']).withMessage('Tipo debe ser: ingreso o egreso'),
  body('monto')
    .notEmpty().withMessage('Monto requerido')
    .isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
  body('fecha')
    .notEmpty().withMessage('Fecha requerida')
    .isDate().withMessage('Fecha inválida'),
  body('ave_id')
    .optional()
    .isUUID().withMessage('ID de ave inválido'),
  body('descripcion')
    .optional()
    .isLength({ max: 500 }).withMessage('Descripción muy larga'),
  body('metodo_pago')
    .optional()
    .isLength({ max: 50 }).withMessage('Método de pago muy largo')
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('tipo').optional().isIn(['ingreso', 'egreso']),
  query('categoria_id').optional().isInt({ min: 1 }),
  query('ave_id').optional().isUUID(),
  query('fecha_desde').optional().isDate(),
  query('fecha_hasta').optional().isDate()
];

// ============================================
// CATEGORÍAS
// ============================================

/**
 * @route   GET /api/v1/finanzas/categorias
 * @desc    Get all transaction categories
 * @access  Private
 */
router.get('/categorias',
  query('tipo').optional().isIn(['ingreso', 'egreso']),
  validate,
  asyncHandler(finanzasController.getCategorias)
);

// ============================================
// DASHBOARD & REPORTES
// ============================================

/**
 * @route   GET /api/v1/finanzas/dashboard
 * @desc    Get financial dashboard
 * @access  Private
 */
router.get('/dashboard',
  query('fecha_inicio').optional().isDate(),
  query('fecha_fin').optional().isDate(),
  validate,
  asyncHandler(finanzasController.getDashboard)
);

/**
 * @route   GET /api/v1/finanzas/stats
 * @desc    Get quick financial stats
 * @access  Private
 */
router.get('/stats',
  query('periodo').optional().isIn(['semana', 'mes', 'año', 'todo']),
  validate,
  asyncHandler(finanzasController.getStats)
);

/**
 * @route   GET /api/v1/finanzas/resumen-mensual
 * @desc    Get monthly summary
 * @access  Private
 */
router.get('/resumen-mensual',
  query('meses').optional().isInt({ min: 1, max: 36 }),
  validate,
  asyncHandler(finanzasController.getResumenMensual)
);

/**
 * @route   GET /api/v1/finanzas/por-categoria
 * @desc    Get breakdown by category
 * @access  Private
 */
router.get('/por-categoria',
  query('tipo').optional().isIn(['ingreso', 'egreso']),
  query('fecha_inicio').optional().isDate(),
  query('fecha_fin').optional().isDate(),
  validate,
  asyncHandler(finanzasController.getPorCategoria)
);

// ============================================
// ROI
// ============================================

/**
 * @route   GET /api/v1/finanzas/roi/ranking
 * @desc    Get ROI ranking for all aves
 * @access  Private
 */
router.get('/roi/ranking',
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate,
  asyncHandler(finanzasController.getRoiRanking)
);

/**
 * @route   GET /api/v1/finanzas/roi/ave/:aveId
 * @desc    Get ROI for specific ave
 * @access  Private
 */
router.get('/roi/ave/:aveId',
  uuidParam('aveId'),
  validate,
  asyncHandler(finanzasController.getRoiAve)
);

// ============================================
// TRANSACCIONES
// ============================================

/**
 * @route   GET /api/v1/finanzas/transacciones
 * @desc    List all transacciones
 * @access  Private
 */
router.get('/transacciones',
  listValidation,
  validate,
  asyncHandler(finanzasController.listTransacciones)
);

/**
 * @route   GET /api/v1/finanzas/transacciones/ave/:aveId
 * @desc    Get transacciones for specific ave
 * @access  Private
 */
router.get('/transacciones/ave/:aveId',
  uuidParam('aveId'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
  asyncHandler(finanzasController.getTransaccionesByAve)
);

/**
 * @route   GET /api/v1/finanzas/transacciones/:id
 * @desc    Get single transaccion
 * @access  Private
 */
router.get('/transacciones/:id',
  uuidParam('id'),
  validate,
  asyncHandler(finanzasController.getTransaccionById)
);

/**
 * @route   POST /api/v1/finanzas/transacciones
 * @desc    Create transaccion
 * @access  Private
 */
router.post('/transacciones',
  transaccionValidation,
  validate,
  asyncHandler(finanzasController.createTransaccion)
);

/**
 * @route   PUT /api/v1/finanzas/transacciones/:id
 * @desc    Update transaccion
 * @access  Private
 */
router.put('/transacciones/:id',
  uuidParam('id'),
  body('monto').optional().isFloat({ min: 0.01 }),
  body('fecha').optional().isDate(),
  validate,
  asyncHandler(finanzasController.updateTransaccion)
);

/**
 * @route   DELETE /api/v1/finanzas/transacciones/:id
 * @desc    Delete transaccion (soft delete)
 * @access  Private
 */
router.delete('/transacciones/:id',
  uuidParam('id'),
  validate,
  asyncHandler(finanzasController.deleteTransaccion)
);

module.exports = router;
