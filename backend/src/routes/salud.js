/**
 * Salud (Health) Routes
 * Manages: vacunas, desparasitaciones, tratamientos, consultas, lesiones
 */

const express = require('express');
const router = express.Router();
const saludController = require('../controllers/saludController');
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

const vacunaValidation = [
  body('ave_id').notEmpty().isUUID().withMessage('ID de ave inválido'),
  body('tipo_vacuna').notEmpty().isLength({ max: 100 }).withMessage('Tipo de vacuna requerido'),
  body('fecha_aplicacion').notEmpty().isDate().withMessage('Fecha de aplicación requerida'),
  body('proxima_dosis').optional().isDate().withMessage('Fecha de próxima dosis inválida'),
  body('costo').optional().isFloat({ min: 0 }).withMessage('Costo debe ser positivo')
];

const desparasitacionValidation = [
  body('ave_id').notEmpty().isUUID().withMessage('ID de ave inválido'),
  body('producto').notEmpty().isLength({ max: 100 }).withMessage('Producto requerido'),
  body('fecha_aplicacion').notEmpty().isDate().withMessage('Fecha de aplicación requerida'),
  body('proxima_aplicacion').optional().isDate().withMessage('Fecha de próxima aplicación inválida'),
  body('costo').optional().isFloat({ min: 0 }).withMessage('Costo debe ser positivo')
];

const tratamientoValidation = [
  body('ave_id').notEmpty().isUUID().withMessage('ID de ave inválido'),
  body('diagnostico').notEmpty().withMessage('Diagnóstico requerido'),
  body('fecha_inicio').notEmpty().isDate().withMessage('Fecha de inicio requerida'),
  body('fecha_fin').optional().isDate().withMessage('Fecha de fin inválida'),
  body('estado').optional().isIn(['en_curso', 'completado', 'suspendido']).withMessage('Estado inválido'),
  body('costo_total').optional().isFloat({ min: 0 }).withMessage('Costo debe ser positivo')
];

const consultaValidation = [
  body('ave_id').notEmpty().isUUID().withMessage('ID de ave inválido'),
  body('fecha_consulta').notEmpty().isDate().withMessage('Fecha de consulta requerida'),
  body('motivo').notEmpty().withMessage('Motivo de consulta requerido'),
  body('costo').optional().isFloat({ min: 0 }).withMessage('Costo debe ser positivo'),
  body('proxima_consulta').optional().isDate().withMessage('Fecha de próxima consulta inválida')
];

const lesionValidation = [
  body('ave_id').notEmpty().isUUID().withMessage('ID de ave inválido'),
  body('tipo_lesion').notEmpty().isLength({ max: 100 }).withMessage('Tipo de lesión requerido'),
  body('gravedad').notEmpty().isIn(['leve', 'moderada', 'grave']).withMessage('Gravedad inválida'),
  body('fecha_lesion').notEmpty().isDate().withMessage('Fecha de lesión requerida'),
  body('costo_tratamiento').optional().isFloat({ min: 0 }).withMessage('Costo debe ser positivo')
];

// ============================================
// ALERTAS
// ============================================

/**
 * @route   GET /api/v1/salud/alertas
 * @desc    Get health alerts for user
 * @access  Private
 */
router.get('/alertas',
  query('dias_anticipacion').optional().isInt({ min: 1, max: 90 }),
  validate,
  asyncHandler(saludController.getAlertas)
);

// ============================================
// RESUMEN POR AVE
// ============================================

/**
 * @route   GET /api/v1/salud/ave/:aveId/resumen
 * @desc    Get health summary for an ave
 * @access  Private
 */
router.get('/ave/:aveId/resumen',
  uuidParam('aveId'),
  validate,
  asyncHandler(saludController.getResumenSaludAve)
);

// ============================================
// VACUNAS
// ============================================

/**
 * @route   GET /api/v1/salud/vacunas
 * @desc    List all vacunas
 * @access  Private
 */
router.get('/vacunas',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('ave_id').optional().isUUID(),
  validate,
  asyncHandler(saludController.listVacunas)
);

/**
 * @route   GET /api/v1/salud/vacunas/ave/:aveId
 * @desc    Get vacunas for specific ave
 * @access  Private
 */
router.get('/vacunas/ave/:aveId',
  uuidParam('aveId'),
  validate,
  asyncHandler(saludController.getVacunasByAve)
);

/**
 * @route   POST /api/v1/salud/vacunas
 * @desc    Create vacuna
 * @access  Private
 */
router.post('/vacunas',
  vacunaValidation,
  validate,
  asyncHandler(saludController.createVacuna)
);

/**
 * @route   PUT /api/v1/salud/vacunas/:id
 * @desc    Update vacuna
 * @access  Private
 */
router.put('/vacunas/:id',
  uuidParam('id'),
  validate,
  asyncHandler(saludController.updateVacuna)
);

/**
 * @route   DELETE /api/v1/salud/vacunas/:id
 * @desc    Delete vacuna
 * @access  Private
 */
router.delete('/vacunas/:id',
  uuidParam('id'),
  validate,
  asyncHandler(saludController.deleteVacuna)
);

// ============================================
// DESPARASITACIONES
// ============================================

/**
 * @route   GET /api/v1/salud/desparasitaciones
 * @desc    List all desparasitaciones
 * @access  Private
 */
router.get('/desparasitaciones',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('ave_id').optional().isUUID(),
  validate,
  asyncHandler(saludController.listDesparasitaciones)
);

/**
 * @route   GET /api/v1/salud/desparasitaciones/ave/:aveId
 * @desc    Get desparasitaciones for specific ave
 * @access  Private
 */
router.get('/desparasitaciones/ave/:aveId',
  uuidParam('aveId'),
  validate,
  asyncHandler(saludController.getDesparasitacionesByAve)
);

/**
 * @route   POST /api/v1/salud/desparasitaciones
 * @desc    Create desparasitacion
 * @access  Private
 */
router.post('/desparasitaciones',
  desparasitacionValidation,
  validate,
  asyncHandler(saludController.createDesparasitacion)
);

/**
 * @route   PUT /api/v1/salud/desparasitaciones/:id
 * @desc    Update desparasitacion
 * @access  Private
 */
router.put('/desparasitaciones/:id',
  uuidParam('id'),
  validate,
  asyncHandler(saludController.updateDesparasitacion)
);

/**
 * @route   DELETE /api/v1/salud/desparasitaciones/:id
 * @desc    Delete desparasitacion
 * @access  Private
 */
router.delete('/desparasitaciones/:id',
  uuidParam('id'),
  validate,
  asyncHandler(saludController.deleteDesparasitacion)
);

// ============================================
// TRATAMIENTOS
// ============================================

/**
 * @route   GET /api/v1/salud/tratamientos
 * @desc    List all tratamientos
 * @access  Private
 */
router.get('/tratamientos',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('ave_id').optional().isUUID(),
  query('estado').optional().isIn(['en_curso', 'completado', 'suspendido']),
  validate,
  asyncHandler(saludController.listTratamientos)
);

/**
 * @route   GET /api/v1/salud/tratamientos/ave/:aveId
 * @desc    Get tratamientos for specific ave
 * @access  Private
 */
router.get('/tratamientos/ave/:aveId',
  uuidParam('aveId'),
  validate,
  asyncHandler(saludController.getTratamientosByAve)
);

/**
 * @route   GET /api/v1/salud/tratamientos/:id
 * @desc    Get single tratamiento
 * @access  Private
 */
router.get('/tratamientos/:id',
  uuidParam('id'),
  validate,
  asyncHandler(saludController.getTratamientoById)
);

/**
 * @route   POST /api/v1/salud/tratamientos
 * @desc    Create tratamiento
 * @access  Private
 */
router.post('/tratamientos',
  tratamientoValidation,
  validate,
  asyncHandler(saludController.createTratamiento)
);

/**
 * @route   PUT /api/v1/salud/tratamientos/:id
 * @desc    Update tratamiento
 * @access  Private
 */
router.put('/tratamientos/:id',
  uuidParam('id'),
  validate,
  asyncHandler(saludController.updateTratamiento)
);

/**
 * @route   DELETE /api/v1/salud/tratamientos/:id
 * @desc    Delete tratamiento
 * @access  Private
 */
router.delete('/tratamientos/:id',
  uuidParam('id'),
  validate,
  asyncHandler(saludController.deleteTratamiento)
);

// ============================================
// CONSULTAS VETERINARIAS
// ============================================

/**
 * @route   GET /api/v1/salud/consultas
 * @desc    List all consultas veterinarias
 * @access  Private
 */
router.get('/consultas',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('ave_id').optional().isUUID(),
  validate,
  asyncHandler(saludController.listConsultas)
);

/**
 * @route   GET /api/v1/salud/consultas/ave/:aveId
 * @desc    Get consultas for specific ave
 * @access  Private
 */
router.get('/consultas/ave/:aveId',
  uuidParam('aveId'),
  validate,
  asyncHandler(saludController.getConsultasByAve)
);

/**
 * @route   POST /api/v1/salud/consultas
 * @desc    Create consulta veterinaria
 * @access  Private
 */
router.post('/consultas',
  consultaValidation,
  validate,
  asyncHandler(saludController.createConsulta)
);

/**
 * @route   PUT /api/v1/salud/consultas/:id
 * @desc    Update consulta veterinaria
 * @access  Private
 */
router.put('/consultas/:id',
  uuidParam('id'),
  validate,
  asyncHandler(saludController.updateConsulta)
);

/**
 * @route   DELETE /api/v1/salud/consultas/:id
 * @desc    Delete consulta veterinaria
 * @access  Private
 */
router.delete('/consultas/:id',
  uuidParam('id'),
  validate,
  asyncHandler(saludController.deleteConsulta)
);

// ============================================
// LESIONES
// ============================================

/**
 * @route   GET /api/v1/salud/lesiones
 * @desc    List all lesiones
 * @access  Private
 */
router.get('/lesiones',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('ave_id').optional().isUUID(),
  query('gravedad').optional().isIn(['leve', 'moderada', 'grave']),
  validate,
  asyncHandler(saludController.listLesiones)
);

/**
 * @route   POST /api/v1/salud/lesiones
 * @desc    Create lesion (standalone)
 * @access  Private
 */
router.post('/lesiones',
  lesionValidation,
  validate,
  asyncHandler(saludController.createLesion)
);

/**
 * @route   PUT /api/v1/salud/lesiones/:id
 * @desc    Update lesion
 * @access  Private
 */
router.put('/lesiones/:id',
  uuidParam('id'),
  validate,
  asyncHandler(saludController.updateLesion)
);

module.exports = router;
