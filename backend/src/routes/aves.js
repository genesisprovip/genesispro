/**
 * Aves (Birds) Routes
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const router = express.Router();

const avesController = require('../controllers/avesController');
const { authenticateJWT } = require('../middleware/auth');
const { checkPlanLimits } = require('../middleware/planLimits');
const { validateRequest } = require('../middleware/validator');

// All routes require authentication
router.use(authenticateJWT);

// Validation rules
const createAveValidation = [
  body('sexo')
    .isIn(['M', 'H'])
    .withMessage('Sexo debe ser M (macho) o H (hembra)'),
  body('fecha_nacimiento')
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida')
    .custom(value => new Date(value) <= new Date())
    .withMessage('La fecha de nacimiento no puede ser futura'),
  body('peso_nacimiento')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Peso debe ser un número positivo'),
  body('padre_id')
    .optional()
    .isUUID()
    .withMessage('ID de padre inválido'),
  body('madre_id')
    .optional()
    .isUUID()
    .withMessage('ID de madre inválido'),
  body('linea_genetica')
    .optional()
    .trim()
    .isLength({ max: 50 }),
  body('color')
    .optional()
    .trim()
    .isLength({ max: 50 }),
  body('precio_compra')
    .optional()
    .isFloat({ min: 0 }),
  body('notas')
    .optional()
    .trim()
];

const updateAveValidation = [
  body('sexo')
    .optional()
    .isIn(['M', 'H']),
  body('fecha_nacimiento')
    .optional()
    .isISO8601(),
  body('padre_id')
    .optional({ nullable: true })
    .isUUID(),
  body('madre_id')
    .optional({ nullable: true })
    .isUUID(),
  body('linea_genetica')
    .optional()
    .trim()
    .isLength({ max: 50 }),
  body('color')
    .optional()
    .trim()
    .isLength({ max: 50 }),
  body('estado')
    .optional()
    .isIn(['activo', 'vendido', 'fallecido', 'prestamo']),
  body('precio_compra')
    .optional()
    .isFloat({ min: 0 }),
  body('precio_venta')
    .optional()
    .isFloat({ min: 0 }),
  body('disponible_venta')
    .optional()
    .isBoolean(),
  body('disponible_cruces')
    .optional()
    .isBoolean(),
  body('notas')
    .optional()
    .trim()
];

const searchValidation = [
  query('q').optional().trim(),
  query('sexo').optional().isIn(['M', 'H']),
  query('estado').optional().isIn(['activo', 'vendido', 'fallecido', 'prestamo']),
  query('linea_genetica').optional().trim(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
];

const uuidValidation = [
  param('id').isUUID().withMessage('ID inválido')
];

// Routes

// List all aves (with pagination and filters)
router.get('/',
  searchValidation,
  validateRequest,
  avesController.list
);

// Search aves
router.get('/search',
  searchValidation,
  validateRequest,
  avesController.search
);

// Get ave by codigo
router.get('/scan/:codigo',
  avesController.getByCodigo
);

// Get single ave
router.get('/:id',
  uuidValidation,
  validateRequest,
  avesController.getById
);

// Create new ave
router.post('/',
  checkPlanLimits('crear_ave'),
  createAveValidation,
  validateRequest,
  avesController.create
);

// Update ave
router.put('/:id',
  uuidValidation,
  updateAveValidation,
  validateRequest,
  avesController.update
);

// Delete ave (soft delete)
router.delete('/:id',
  uuidValidation,
  validateRequest,
  avesController.delete
);

// Genealogy
router.get('/:id/genealogia',
  uuidValidation,
  validateRequest,
  checkPlanLimits('genealogia'),
  avesController.getGenealogia
);

// Descendants
router.get('/:id/descendencia',
  uuidValidation,
  validateRequest,
  avesController.getDescendencia
);

// Measurements
router.get('/:id/mediciones',
  uuidValidation,
  validateRequest,
  avesController.getMediciones
);

router.post('/:id/mediciones',
  uuidValidation,
  [
    body('fecha_medicion').isISO8601(),
    body('peso').optional().isFloat({ min: 0 }),
    body('altura_cm').optional().isFloat({ min: 0 }),
    body('longitud_espolon_cm').optional().isFloat({ min: 0 }),
    body('circunferencia_pata_cm').optional().isFloat({ min: 0 })
  ],
  validateRequest,
  avesController.addMedicion
);

// QR Code
router.get('/:id/qr',
  uuidValidation,
  validateRequest,
  avesController.getQRCode
);

module.exports = router;
