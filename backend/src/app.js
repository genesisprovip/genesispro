/**
 * GenesisPro Backend - Main Entry Point
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./config/logger');

// Import routes
const authRoutes = require('./routes/auth');
const avesRoutes = require('./routes/aves');
const combatesRoutes = require('./routes/combates');
const saludRoutes = require('./routes/salud');
const finanzasRoutes = require('./routes/finanzas');
const calendarioRoutes = require('./routes/calendario');
const analyticsRoutes = require('./routes/analytics');
const subscriptionRoutes = require('./routes/subscriptions');
const eventosRoutes = require('./routes/eventos');
const peleasRoutes = require('./routes/peleas');
const apuestasRoutes = require('./routes/apuestas');
const derbyRoutes = require('./routes/derby');

const app = express();

// Trust proxy (for rate limiting behind nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:19000', 'http://localhost:19001', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Compression
app.use(compression());

// Stripe webhook needs raw body BEFORE json parsing
app.use('/api/v1/subscriptions/webhook', express.raw({ type: 'application/json' }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Demasiadas peticiones, intenta de nuevo más tarde'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', globalLimiter);

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    }
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/aves', avesRoutes);
app.use('/api/v1/combates', combatesRoutes);
app.use('/api/v1/salud', saludRoutes);
app.use('/api/v1/finanzas', finanzasRoutes);
app.use('/api/v1/calendario', calendarioRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/eventos', eventosRoutes);
app.use('/api/v1/peleas', peleasRoutes);
app.use('/api/v1/apuestas', apuestasRoutes);
app.use('/api/v1/derby', derbyRoutes);

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'GenesisPro API',
      version: '1.0.0',
      description: 'Sistema de Gestión Avícola',
      endpoints: {
        auth: '/api/v1/auth',
        aves: '/api/v1/aves',
        combates: '/api/v1/combates',
        salud: '/api/v1/salud',
        finanzas: '/api/v1/finanzas',
        calendario: '/api/v1/calendario',
        analytics: '/api/v1/analytics',
        subscriptions: '/api/v1/subscriptions',
        eventos: '/api/v1/eventos',
        peleas: '/api/v1/peleas',
        apuestas: '/api/v1/apuestas',
        derby: '/api/v1/derby',
      }
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`GenesisPro API running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
