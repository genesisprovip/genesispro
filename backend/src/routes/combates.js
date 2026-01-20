/**
 * Combates (Fights) Routes
 */

const express = require('express');
const router = express.Router();
const combatesController = require('../controllers/combatesController');
const { authenticateJWT } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkPlanLimits } = require('../middleware/planLimits');
const { body, param, query } = require('express-validator');
const { validateRequest: validate } = require('../middleware/validator');

// All routes require authentication
router.use(authenticateJWT);

// Validation schemas
const combateValidation = [
  body('macho_id')
    .notEmpty().withMessage('El ID del ave es requerido')
    .isUUID().withMessage('ID de ave inválido'),
  body('fecha_combate')
    .notEmpty().withMessage('La fecha del combate es requerida')
    .isDate().withMessage('Fecha inválida'),
  body('resultado')
    .notEmpty().withMessage('El resultado es requerido')
    .isIn(['victoria', 'empate', 'derrota']).withMessage('Resultado debe ser: victoria, empate o derrota'),
  body('tipo_combate')
    .optional()
    .isIn(['oficial', 'entrenamiento', 'amistoso']).withMessage('Tipo debe ser: oficial, entrenamiento o amistoso'),
  body('duracion_minutos')
    .optional()
    .isInt({ min: 1, max: 120 }).withMessage('Duración debe ser entre 1 y 120 minutos'),
  body('peso_combate')
    .optional()
    .isFloat({ min: 0.1, max: 10 }).withMessage('Peso debe ser entre 0.1 y 10 kg'),
  body('ubicacion')
    .optional()
    .isLength({ max: 150 }).withMessage('Ubicación muy larga (máx 150 caracteres)')
];

const updateCombateValidation = [
  body('resultado')
    .optional()
    .isIn(['victoria', 'empate', 'derrota']).withMessage('Resultado debe ser: victoria, empate o derrota'),
  body('tipo_combate')
    .optional()
    .isIn(['oficial', 'entrenamiento', 'amistoso']).withMessage('Tipo debe ser: oficial, entrenamiento o amistoso'),
  body('duracion_minutos')
    .optional()
    .isInt({ min: 1, max: 120 }).withMessage('Duración debe ser entre 1 y 120 minutos')
];

const lesionValidation = [
  body('tipo_lesion')
    .notEmpty().withMessage('El tipo de lesión es requerido')
    .isLength({ max: 100 }).withMessage('Tipo de lesión muy largo'),
  body('gravedad')
    .notEmpty().withMessage('La gravedad es requerida')
    .isIn(['leve', 'moderada', 'grave']).withMessage('Gravedad debe ser: leve, moderada o grave'),
  body('fecha_lesion')
    .notEmpty().withMessage('La fecha de lesión es requerida')
    .isDate().withMessage('Fecha inválida'),
  body('zona_afectada')
    .optional()
    .isLength({ max: 100 }).withMessage('Zona afectada muy larga'),
  body('costo_tratamiento')
    .optional()
    .isFloat({ min: 0 }).withMessage('Costo debe ser positivo')
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('resultado').optional().isIn(['victoria', 'empate', 'derrota']),
  query('tipo_combate').optional().isIn(['oficial', 'entrenamiento', 'amistoso']),
  query('fecha_desde').optional().isDate(),
  query('fecha_hasta').optional().isDate()
];

// Routes

/**
 * @route   GET /api/v1/combates
 * @desc    List all combates for user
 * @access  Private
 */
router.get('/',
  listValidation,
  validate,
  asyncHandler(combatesController.list)
);

/**
 * @route   GET /api/v1/combates/ranking
 * @desc    Get ranking of best fighters
 * @access  Private
 */
router.get('/ranking',
  asyncHandler(combatesController.getRanking)
);

/**
 * @route   GET /api/v1/combates/stats
 * @desc    Get global combat statistics
 * @access  Private
 */
router.get('/stats',
  asyncHandler(combatesController.getGlobalStats)
);

/**
 * @route   GET /api/v1/combates/ave/:aveId
 * @desc    Get combates for specific ave
 * @access  Private
 */
router.get('/ave/:aveId',
  param('aveId').isUUID().withMessage('ID de ave inválido'),
  validate,
  asyncHandler(combatesController.getByAve)
);

/**
 * @route   GET /api/v1/combates/ave/:aveId/stats
 * @desc    Get combat statistics for specific ave
 * @access  Private
 */
router.get('/ave/:aveId/stats',
  param('aveId').isUUID().withMessage('ID de ave inválido'),
  validate,
  asyncHandler(combatesController.getStatsByAve)
);

/**
 * @route   GET /api/v1/combates/ave/:aveId/lesiones
 * @desc    Get all lesiones for an ave
 * @access  Private
 */
router.get('/ave/:aveId/lesiones',
  param('aveId').isUUID().withMessage('ID de ave inválido'),
  validate,
  asyncHandler(combatesController.getLesionesByAve)
);

/**
 * @route   GET /api/v1/combates/:id
 * @desc    Get single combate by ID
 * @access  Private
 */
router.get('/:id',
  param('id').isUUID().withMessage('ID de combate inválido'),
  validate,
  asyncHandler(combatesController.getById)
);

/**
 * @route   POST /api/v1/combates
 * @desc    Create new combate
 * @access  Private
 */
router.post('/',
  checkPlanLimits('crear_combate'),
  combateValidation,
  validate,
  asyncHandler(combatesController.create)
);

/**
 * @route   PUT /api/v1/combates/:id
 * @desc    Update combate
 * @access  Private
 */
router.put('/:id',
  param('id').isUUID().withMessage('ID de combate inválido'),
  updateCombateValidation,
  validate,
  asyncHandler(combatesController.update)
);

/**
 * @route   DELETE /api/v1/combates/:id
 * @desc    Delete combate (soft delete)
 * @access  Private
 */
router.delete('/:id',
  param('id').isUUID().withMessage('ID de combate inválido'),
  validate,
  asyncHandler(combatesController.delete)
);

/**
 * @route   POST /api/v1/combates/:id/lesiones
 * @desc    Add lesion to combate
 * @access  Private
 */
router.post('/:id/lesiones',
  param('id').isUUID().withMessage('ID de combate inválido'),
  lesionValidation,
  validate,
  asyncHandler(combatesController.addLesion)
);

module.exports = router;
