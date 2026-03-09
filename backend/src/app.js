/**
 * GenesisPro Backend - Main Entry Point
 */

require('dotenv').config();

const Sentry = require('@sentry/node');

// Initialize Sentry BEFORE anything else
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: `genesispro-api@${process.env.npm_package_version || '1.0.0'}`,
    tracesSampleRate: 0.2,
    beforeSend(event) {
      // Don't send operational errors (4xx) to Sentry
      const status = event.extra?.statusCode || event.contexts?.response?.status_code;
      if (status && status >= 400 && status < 500) return null;
      return event;
    },
  });
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const logger = require('./config/logger');
const { startDataRetentionCron } = require('./cron/dataRetention');

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
const notificationsRoutes = require('./routes/notifications');
const empresarioRoutes = require('./routes/empresario');
const streamingRoutes = require('./routes/streaming');
const chatRoutes = require('./routes/chat');
const finanzasEventoRoutes = require('./routes/finanzasEvento');
const alimentacionRoutes = require('./routes/alimentacion');
const adminRoutes = require('./routes/admin');

const app = express();

// Trust proxy (for rate limiting behind nginx)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
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
  max: 3000, // 3000 requests per windowMs
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

// Event share page with Open Graph meta tags (must be before API routes)
const db = require('./config/database');

app.get('/evento/:codigoAcceso', async (req, res) => {
  try {
    const { codigoAcceso } = req.params;
    const { rows } = await db.query(
      `SELECT e.nombre, e.fecha, e.hora_inicio, e.lugar, e.codigo_acceso,
              e.imagen_cartel_url AS cartel_url, e.estado, e.total_peleas, e.tipo_derby,
              u.nombre AS organizador_nombre
       FROM eventos_palenque e
       JOIN usuarios u ON e.organizador_id = u.id
       WHERE e.codigo_acceso = $1 AND e.deleted_at IS NULL`,
      [codigoAcceso.toUpperCase()]
    );

    if (rows.length === 0) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html lang="es"><head><meta charset="UTF-8"><title>Evento no encontrado - GenesisPro</title></head>
        <body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;background:#0F172A;color:#fff;">
          <div style="text-align:center"><h1>Evento no encontrado</h1><p>El codigo de acceso no es valido.</p></div>
        </body></html>
      `);
    }

    const evento = rows[0];
    const fechaFormatted = new Date(evento.fecha).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    const horaStr = evento.hora_inicio ? evento.hora_inicio.slice(0, 5) : '';
    const shareUrl = `https://api.genesispro.vip/evento/${evento.codigo_acceso}`;
    const ogImage = evento.cartel_url || 'https://api.genesispro.vip/uploads/og-default.png';
    const ogDescription = `Evento de palenque - ${fechaFormatted}${horaStr ? ' a las ' + horaStr : ''}${evento.lugar ? ' - ' + evento.lugar : ''}`;
    const deepLink = `genesispro://palenque/live?code=${evento.codigo_acceso}`;

    const estadoLabel = {
      programado: 'Programado',
      en_curso: 'EN VIVO',
      finalizado: 'Finalizado',
      cancelado: 'Cancelado',
      pausado: 'Pausado',
    }[evento.estado] || evento.estado;

    const estadoColor = {
      programado: '#3B82F6',
      en_curso: '#10B981',
      finalizado: '#6B7280',
      cancelado: '#EF4444',
      pausado: '#F59E0B',
    }[evento.estado] || '#6B7280';

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${evento.nombre} - GenesisPro</title>

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${evento.nombre}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:site_name" content="GenesisPro">
  <meta property="og:locale" content="es_MX">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${evento.nombre}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${ogImage}">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%);
      min-height: 100vh; display: flex; justify-content: center; align-items: center;
      padding: 20px; color: #fff;
    }
    .card {
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px; padding: 32px; max-width: 420px; width: 100%;
      text-align: center; backdrop-filter: blur(10px);
    }
    .logo { font-size: 28px; font-weight: 800; color: #F59E0B; margin-bottom: 8px; }
    .badge {
      display: inline-block; padding: 4px 14px; border-radius: 20px;
      font-size: 12px; font-weight: 700; letter-spacing: 1px;
      background: ${estadoColor}22; color: ${estadoColor}; margin-bottom: 16px;
    }
    .event-name { font-size: 22px; font-weight: 700; margin-bottom: 12px; line-height: 1.3; }
    .meta { color: rgba(255,255,255,0.6); font-size: 14px; margin-bottom: 6px; }
    ${evento.cartel_url ? `.cartel { width: 100%; border-radius: 16px; margin: 16px 0; max-height: 300px; object-fit: cover; }` : ''}
    .btn-open {
      display: inline-block; margin-top: 24px; padding: 14px 36px;
      background: linear-gradient(135deg, #F59E0B, #D97706); color: #fff;
      font-size: 16px; font-weight: 700; border-radius: 14px;
      text-decoration: none; transition: transform 0.2s;
    }
    .btn-open:hover { transform: scale(1.03); }
    .download {
      margin-top: 16px; font-size: 13px; color: rgba(255,255,255,0.4);
    }
    .download a { color: #F59E0B; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">GenesisPro</div>
    <div class="badge">${estadoLabel}</div>
    <div class="event-name">${evento.nombre}</div>
    <div class="meta">${fechaFormatted}${horaStr ? ' - ' + horaStr : ''}</div>
    ${evento.lugar ? `<div class="meta">${evento.lugar}</div>` : ''}
    ${evento.tipo_derby ? `<div class="meta">${evento.tipo_derby}${evento.total_peleas ? ' - ' + evento.total_peleas + ' peleas' : ''}</div>` : ''}
    ${evento.organizador_nombre ? `<div class="meta">Organiza: ${evento.organizador_nombre}</div>` : ''}
    ${evento.cartel_url ? `<img class="cartel" src="${evento.cartel_url}" alt="Cartel del evento">` : ''}
    <a class="btn-open" href="${deepLink}" id="openApp">Abrir en GenesisPro</a>
    <div class="download">
      No tienes la app? <a href="https://apps.apple.com/app/genesispro" target="_blank">App Store</a>
      | <a href="https://play.google.com/store/apps/details?id=com.genesispro.app" target="_blank">Google Play</a>
    </div>
  </div>

  <script>
    // Try deep link, fall back to staying on page
    document.getElementById('openApp').addEventListener('click', function(e) {
      e.preventDefault();
      var deepLink = '${deepLink}';
      var fallback = window.location.href;
      window.location.href = deepLink;
      setTimeout(function() {
        // If we're still here after 1.5s, the app didn't open
        // Stay on page so user can download
      }, 1500);
    });
  </script>
</body>
</html>`);
  } catch (error) {
    logger.error('Error serving OG event page:', error);
    res.status(500).send('Error interno');
  }
});

// Fight result share page with Open Graph meta tags
app.get('/resultado/:eventoCode/:numeroPelea', async (req, res) => {
  try {
    const { eventoCode, numeroPelea } = req.params;
    const { rows } = await db.query(
      `SELECT e.nombre AS evento_nombre, e.codigo_acceso, e.tipo_derby, e.total_peleas,
              p.numero_pelea, p.estado, p.resultado, p.anillo_rojo, p.anillo_verde,
              p.peso_rojo, p.peso_verde, p.placa_rojo, p.placa_verde,
              p.duracion_minutos, p.tipo_victoria,
              rd.numero_ronda,
              ur.nombre AS partido_rojo_nombre, uv.nombre AS partido_verde_nombre
       FROM peleas p
       JOIN eventos_palenque e ON e.id = p.evento_id
       LEFT JOIN rondas_derby rd ON rd.id = p.ronda_id
       LEFT JOIN usuarios ur ON ur.id = p.partido_rojo_id
       LEFT JOIN usuarios uv ON uv.id = p.partido_verde_id
       WHERE e.codigo_acceso = $1 AND p.numero_pelea = $2 AND e.deleted_at IS NULL`,
      [eventoCode.toUpperCase(), parseInt(numeroPelea)]
    );

    if (rows.length === 0) {
      return res.status(404).send(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Pelea no encontrada</title></head>
        <body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;background:#0F172A;color:#fff;">
        <div style="text-align:center"><h1>Pelea no encontrada</h1></div></body></html>`);
    }

    const p = rows[0];
    const rojoName = p.partido_rojo_nombre || p.placa_rojo || p.anillo_rojo || 'ROJO';
    const verdeName = p.partido_verde_nombre || p.placa_verde || p.anillo_verde || 'VERDE';
    const shareUrl = `https://api.genesispro.vip/resultado/${p.codigo_acceso}/${p.numero_pelea}`;
    const deepLink = `genesispro://palenque/live?code=${p.codigo_acceso}`;

    let resultLabel = 'EN CURSO';
    let resultColor = '#F59E0B';
    let resultEmoji = '';
    if (p.resultado === 'rojo') { resultLabel = `GANA ${rojoName}`; resultColor = '#EF4444'; resultEmoji = '🔴'; }
    else if (p.resultado === 'verde') { resultLabel = `GANA ${verdeName}`; resultColor = '#10B981'; resultEmoji = '🟢'; }
    else if (p.resultado === 'tabla' || p.resultado === 'empate') { resultLabel = 'TABLAS'; resultColor = '#F59E0B'; resultEmoji = '🟡'; }
    else if (p.estado === 'programada') { resultLabel = 'PROXIMA'; resultColor = '#3B82F6'; resultEmoji = ''; }

    const ogTitle = `${resultEmoji} Pelea ${p.numero_pelea} - ${p.evento_nombre}`;
    const ogDesc = `${rojoName} (${p.peso_rojo || '?'}kg) vs ${verdeName} (${p.peso_verde || '?'}kg) - ${resultLabel}`;

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ogTitle} - GenesisPro</title>
  <meta property="og:type" content="website">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDesc}">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:site_name" content="GenesisPro">
  <meta property="og:locale" content="es_MX">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDesc}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; color: #fff; }
    .card { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px; max-width: 420px; width: 100%; text-align: center; backdrop-filter: blur(10px); }
    .logo { font-size: 24px; font-weight: 800; color: #F59E0B; margin-bottom: 4px; }
    .event-name { font-size: 14px; color: rgba(255,255,255,0.5); margin-bottom: 16px; }
    .fight-num { font-size: 13px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .matchup { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 20px 0; }
    .corner { text-align: center; flex: 1; }
    .corner-dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; margin-bottom: 4px; }
    .corner-name { font-size: 18px; font-weight: 800; display: block; }
    .corner-peso { font-size: 13px; color: rgba(255,255,255,0.5); }
    .vs { font-size: 14px; color: rgba(255,255,255,0.3); font-weight: 700; }
    .result-badge { display: inline-block; padding: 8px 24px; border-radius: 12px; font-size: 16px; font-weight: 800; letter-spacing: 1px; margin: 16px 0; background: ${resultColor}22; color: ${resultColor}; border: 2px solid ${resultColor}44; }
    .ronda { font-size: 12px; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
    .btn-open { display: inline-block; margin-top: 20px; padding: 12px 32px; background: linear-gradient(135deg, #F59E0B, #D97706); color: #fff; font-size: 15px; font-weight: 700; border-radius: 14px; text-decoration: none; }
    .powered { margin-top: 16px; font-size: 11px; color: rgba(255,255,255,0.3); }
    .powered a { color: #F59E0B; text-decoration: none; }
    .winner { text-shadow: 0 0 20px ${resultColor}66; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">GenesisPro</div>
    <div class="event-name">${p.evento_nombre}</div>
    <div class="fight-num">Pelea ${p.numero_pelea}${p.total_peleas ? ' de ' + p.total_peleas : ''}${p.numero_ronda ? '  &middot;  Ronda ' + p.numero_ronda : ''}</div>
    <div class="matchup">
      <div class="corner">
        <span class="corner-dot" style="background:#EF4444"></span>
        <span class="corner-name ${p.resultado === 'rojo' ? 'winner' : ''}" style="color:#EF4444">${rojoName}</span>
        ${p.peso_rojo ? `<span class="corner-peso">${p.peso_rojo}kg</span>` : ''}
      </div>
      <span class="vs">VS</span>
      <div class="corner">
        <span class="corner-dot" style="background:#10B981"></span>
        <span class="corner-name ${p.resultado === 'verde' ? 'winner' : ''}" style="color:#10B981">${verdeName}</span>
        ${p.peso_verde ? `<span class="corner-peso">${p.peso_verde}kg</span>` : ''}
      </div>
    </div>
    <div class="result-badge">${resultLabel}</div>
    <a class="btn-open" href="${deepLink}">Ver en GenesisPro</a>
    <div class="powered">Powered by <a href="https://genesispro.vip">GenesisPro</a></div>
  </div>
</body>
</html>`);
  } catch (error) {
    logger.error('Error serving fight result page:', error);
    res.status(500).send('Error interno');
  }
});

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
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/empresario', empresarioRoutes);
app.use('/api/v1/streaming', streamingRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/finanzas-evento', finanzasEventoRoutes);
app.use('/api/v1/alimentacion', alimentacionRoutes);
app.use('/api/v1/admin', adminRoutes);

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
        empresario: '/api/v1/empresario',
        streaming: '/api/v1/streaming',
        chat: '/api/v1/chat',
      }
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Sentry error handler (must be before our error handler)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`GenesisPro API running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    startDataRetentionCron();
  });
}

module.exports = app;
