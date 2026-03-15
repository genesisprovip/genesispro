/**
 * Aves (Birds) Routes
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const avesController = require('../controllers/avesController');
const { authenticateJWT } = require('../middleware/auth');
const { checkPlanLimits } = require('../middleware/planLimits');
const { validateRequest } = require('../middleware/validator');

// Multer config for ave photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `ave_${req.params.id}_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    cb(null, ext && mime);
  },
});

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
    .trim(),
  body('composicion_genetica')
    .optional()
    .isArray()
    .withMessage('Composición genética debe ser un arreglo'),
  body('composicion_genetica.*.linea')
    .optional()
    .isLength({ min: 1, max: 100 }),
  body('composicion_genetica.*.fraccion')
    .optional()
    .isLength({ min: 1, max: 10 }),
  body('composicion_genetica.*.decimal')
    .optional()
    .isFloat({ min: 0, max: 1 }),
  body('es_puro')
    .optional()
    .isBoolean(),
  body('criadero_origen')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  body('criador_nombre')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  body('fecha_adquisicion')
    .optional()
    .isISO8601(),
  body('tipo_adquisicion')
    .optional()
    .isIn(['cria_propia', 'compra', 'regalo', 'intercambio']),
  body('notas_origen')
    .optional()
    .trim(),
  body('zona').optional().trim(),
  body('sub_zona').optional().trim(),
  body('lote').optional().trim()
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
    .trim(),
  body('composicion_genetica')
    .optional()
    .isArray(),
  body('es_puro')
    .optional()
    .isBoolean(),
  body('criadero_origen')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  body('criador_nombre')
    .optional()
    .trim()
    .isLength({ max: 200 }),
  body('fecha_adquisicion')
    .optional({ nullable: true })
    .isISO8601(),
  body('tipo_adquisicion')
    .optional()
    .isIn(['cria_propia', 'compra', 'regalo', 'intercambio']),
  body('notas_origen')
    .optional()
    .trim(),
  body('zona').optional().trim(),
  body('sub_zona').optional().trim(),
  body('lote').optional().trim()
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

// Pedigree PDF (Premium only)
router.get('/:id/pedigree',
  uuidValidation,
  validateRequest,
  checkPlanLimits('pedigree'),
  avesController.getPedigree
);

// Upload photo for ave
router.post('/:id/fotos',
  uuidValidation,
  validateRequest,
  checkPlanLimits('foto'),
  upload.single('foto'),
  avesController.uploadFoto
);

// Delete photo
router.delete('/:id/fotos/:fotoId',
  [
    param('id').isUUID(),
    param('fotoId').isUUID(),
  ],
  validateRequest,
  avesController.deleteFoto
);

// Set photo as principal
router.patch('/:id/fotos/:fotoId/principal',
  [
    param('id').isUUID(),
    param('fotoId').isUUID(),
  ],
  validateRequest,
  avesController.setFotoPrincipal
);

module.exports = router;
