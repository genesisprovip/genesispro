/**
 * Authentication Routes
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validator');

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  body('telefono')
    .optional()
    .trim()
    .isLength({ max: 20 }),
  body('ubicacion')
    .optional()
    .trim()
    .isLength({ max: 100 })
];

const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail()
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres')
];

const changePasswordValidation = [
  body('password_actual')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),
  body('password_nuevo')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener al menos 6 caracteres')
];

const refreshTokenValidation = [
  body('refresh_token')
    .notEmpty()
    .withMessage('Refresh token es requerido')
];

// Public routes
router.post('/register', registerValidation, validateRequest, authController.register);
router.post('/login', loginValidation, validateRequest, authController.login);
router.post('/refresh-token', refreshTokenValidation, validateRequest, authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, authController.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, validateRequest, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// Protected routes
router.use(authenticateJWT);

router.post('/logout', authController.logout);
router.get('/me', authController.getProfile);
router.put('/me', authController.updateProfile);
router.put('/change-password', changePasswordValidation, validateRequest, authController.changePassword);
router.delete('/account', authController.deleteAccount);

module.exports = router;
