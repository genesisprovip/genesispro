/**
 * GenesisPro - Empresario Subscription Routes
 * Membership for palenque event organizers
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { stripe, EMPRESARIO_CONFIG, PRICE_IDS, getEmpresarioPlanFromPriceId } = require('../config/stripe');
const { authenticateJWT } = require('../middleware/auth');
const { Errors, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');

// ─── GET /plans - Available empresario plans (PUBLIC) ───
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = Object.entries(EMPRESARIO_CONFIG).map(([key, config]) => ({
    id: key,
    nombre: config.nombre,
    precio: config.precio,
    priceId: PRICE_IDS[key] || null,
    maxEventosMes: config.maxEventosMes,
    maxEventosSimultaneos: config.maxEventosSimultaneos,
    cartel: config.cartel,
    avisos: config.avisos,
    participantesIlimitados: config.participantesIlimitados,
    estadisticasEvento: config.estadisticasEvento,
    streamingEnVivo: config.streamingEnVivo,
    estadisticasAlcance: config.estadisticasAlcance,
    comisionesReferidos: config.comisionesReferidos,
  }));

  res.json({ success: true, data: { plans } });
}));

// All remaining routes require auth
router.use(authenticateJWT);

// ─── GET /status - Empresario subscription status ───
router.get('/status', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const { rows: [user] } = await db.query(
    `SELECT u.id, u.plan_empresario, u.stripe_customer_id_empresario,
            se.id as sub_id, se.stripe_subscription_id, se.stripe_price_id,
            se.fecha_inicio, se.fecha_expiracion, se.estado as sub_estado
     FROM usuarios u
     LEFT JOIN suscripciones_empresario se ON u.suscripcion_empresario_id = se.id
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId]
  );

  if (!user) throw Errors.notFound('Usuario');

  // Count events this month
  const { rows: [eventCount] } = await db.query(
    `SELECT COUNT(*) FROM eventos_palenque
     WHERE organizador_id = $1
       AND deleted_at IS NULL
       AND date_trunc('month', created_at) = date_trunc('month', NOW())`,
    [userId]
  );

  const plan = user.plan_empresario;
  const config = plan ? EMPRESARIO_CONFIG[plan] : null;

  res.json({
    success: true,
    data: {
      plan: plan || null,
      hasSubscription: !!user.stripe_subscription_id,
      isActive: user.sub_estado === 'activa' || !!plan,
      fechaExpiracion: user.fecha_expiracion,
      currentPriceId: user.stripe_price_id || null,
      eventosEsteMes: parseInt(eventCount.count),
      limiteEventos: config?.maxEventosMes || null,
      maxEventosSimultaneos: config?.maxEventosSimultaneos || null,
      estadisticasEvento: config?.estadisticasEvento || false,
      streamingEnVivo: config?.streamingEnVivo || false,
      comisionesReferidos: config?.comisionesReferidos || false,
    },
  });
}));

// ─── POST /checkout - Create Stripe Checkout for empresario plan ───
router.post('/checkout', asyncHandler(async (req, res) => {
  const { priceId } = req.body;
  const userId = req.userId;

  if (!priceId) throw Errors.badRequest('priceId es requerido');

  const plan = getEmpresarioPlanFromPriceId(priceId);
  if (!plan) throw Errors.badRequest('Plan empresario no válido');

  const { rows: [user] } = await db.query(
    'SELECT id, email, nombre, stripe_customer_id_empresario, plan_empresario FROM usuarios WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );

  if (!user) throw Errors.notFound('Usuario');

  // Check if already has active empresario subscription
  if (user.plan_empresario) {
    const { rows: [activeSub] } = await db.query(
      `SELECT id FROM suscripciones_empresario
       WHERE usuario_id = $1 AND estado = 'activa'`,
      [userId]
    );
    if (activeSub) {
      throw Errors.badRequest('Ya tienes una membresía empresario activa. Usa el portal para cambiar de plan.');
    }
  }

  // Get or create Stripe customer (separate from app subscription customer)
  let customerId = user.stripe_customer_id_empresario;

  if (!customerId) {
    // Reuse existing stripe_customer_id if available
    const { rows: [existing] } = await db.query(
      'SELECT stripe_customer_id FROM usuarios WHERE id = $1', [userId]
    );

    if (existing?.stripe_customer_id) {
      customerId = existing.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.nombre,
        metadata: { userId: user.id, type: 'empresario' },
      });
      customerId = customer.id;
    }

    await db.query(
      'UPDATE usuarios SET stripe_customer_id_empresario = $1 WHERE id = $2',
      [customerId, userId]
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_BASE_URL || 'genesispro://'}empresario/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_BASE_URL || 'genesispro://'}empresario/cancelled`,
    metadata: { userId, type: 'empresario' },
    subscription_data: {
      metadata: { userId, type: 'empresario' },
    },
  });

  res.json({
    success: true,
    data: { url: session.url, sessionId: session.id },
  });
}));

// ─── POST /portal - Open billing portal for empresario subscription ───
router.post('/portal', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const { rows: [user] } = await db.query(
    'SELECT stripe_customer_id_empresario FROM usuarios WHERE id = $1',
    [userId]
  );

  if (!user?.stripe_customer_id_empresario) {
    throw Errors.badRequest('No tienes una membresía empresario para gestionar');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id_empresario,
    return_url: `${process.env.APP_BASE_URL || 'genesispro://'}empresario/portal-return`,
  });

  res.json({
    success: true,
    data: { url: session.url },
  });
}));

// ─── GET /referidos - Empresario's referrals list with stats ───
router.get('/referidos', asyncHandler(async (req, res) => {
  const userId = req.userId;

  // Get all referrals for this empresario
  const { rows: referidos } = await db.query(
    `SELECT r.id, r.usuario_id, r.evento_id, r.estado, r.comision_monto,
            r.comision_porcentaje, r.created_at,
            u.nombre AS usuario_nombre, u.email AS usuario_email,
            u.plan_actual AS usuario_plan,
            ep.nombre AS evento_nombre
     FROM referidos r
     JOIN usuarios u ON r.usuario_id = u.id
     LEFT JOIN eventos_palenque ep ON r.evento_id = ep.id
     WHERE r.empresario_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );

  // Calculate stats
  const totalReferidos = referidos.length;
  const totalSuscritos = referidos.filter(r => r.estado === 'suscrito' || r.estado === 'comision_pagada').length;
  const comisionesPendientes = referidos
    .filter(r => r.estado === 'suscrito')
    .reduce((sum, r) => sum + parseFloat(r.comision_monto || 0), 0);
  const comisionesPagadas = referidos
    .filter(r => r.estado === 'comision_pagada')
    .reduce((sum, r) => sum + parseFloat(r.comision_monto || 0), 0);

  res.json({
    success: true,
    data: {
      referidos,
      stats: {
        totalReferidos,
        totalSuscritos,
        comisionesPendientes,
        comisionesPagadas,
      },
    },
  });
}));

// ─── GET /comisiones - Commission summary ───
router.get('/comisiones', asyncHandler(async (req, res) => {
  const userId = req.userId;

  const { rows: [totals] } = await db.query(
    `SELECT
       COALESCE(SUM(comision_monto), 0) AS total_ganado,
       COALESCE(SUM(CASE WHEN estado = 'suscrito' THEN comision_monto ELSE 0 END), 0) AS pendiente,
       COALESCE(SUM(CASE WHEN estado = 'comision_pagada' THEN comision_monto ELSE 0 END), 0) AS pagado,
       COUNT(*) FILTER (WHERE estado IN ('suscrito', 'comision_pagada')) AS total_conversiones
     FROM referidos
     WHERE empresario_id = $1`,
    [userId]
  );

  // Monthly breakdown (last 6 months)
  const { rows: mensual } = await db.query(
    `SELECT
       date_trunc('month', created_at) AS mes,
       COUNT(*) AS referidos,
       COUNT(*) FILTER (WHERE estado IN ('suscrito', 'comision_pagada')) AS conversiones,
       COALESCE(SUM(comision_monto), 0) AS comisiones
     FROM referidos
     WHERE empresario_id = $1
       AND created_at >= NOW() - INTERVAL '6 months'
     GROUP BY date_trunc('month', created_at)
     ORDER BY mes DESC`,
    [userId]
  );

  res.json({
    success: true,
    data: {
      totalGanado: parseFloat(totals.total_ganado),
      pendiente: parseFloat(totals.pendiente),
      pagado: parseFloat(totals.pagado),
      totalConversiones: parseInt(totals.total_conversiones),
      mensual,
    },
  });
}));

// ─── POST /extra-event - Purchase an extra event ($299 MXN) ───
router.post('/extra-event', asyncHandler(async (req, res) => {
  const userId = req.userId;

  // Verify user has an active empresario subscription
  const { rows: [user] } = await db.query(
    `SELECT u.id, u.plan_empresario, u.stripe_customer_id_empresario, se.estado
     FROM usuarios u
     LEFT JOIN suscripciones_empresario se ON u.suscripcion_empresario_id = se.id
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId]
  );

  if (!user?.plan_empresario || user.estado !== 'activa') {
    throw Errors.forbidden('Necesitas una membresia empresario activa para comprar eventos extra');
  }

  let customerId = user.stripe_customer_id_empresario;
  if (!customerId) {
    throw Errors.badRequest('No se encontro tu cuenta de Stripe. Contacta soporte.');
  }

  // Create a one-time Stripe checkout session for $299 MXN
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'mxn',
        product_data: {
          name: 'Evento Extra - GenesisPro Empresario',
          description: '1 evento adicional para tu plan empresario',
        },
        unit_amount: 29900, // $299.00 MXN in centavos
      },
      quantity: 1,
    }],
    success_url: `${process.env.APP_BASE_URL || 'genesispro://'}empresario/extra-event-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_BASE_URL || 'genesispro://'}empresario/extra-event-cancelled`,
    metadata: { userId, type: 'extra_event' },
  });

  res.json({
    success: true,
    data: { url: session.url, sessionId: session.id },
  });
}));

// ─── Webhook handlers (called from main subscription webhook) ───

async function handleEmpresarioCheckoutCompleted(session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getEmpresarioPlanFromPriceId(priceId);

  if (!plan) {
    logger.error(`[Stripe Empresario] Unknown price ID: ${priceId}`);
    return;
  }

  logger.info(`[Stripe Empresario] Checkout completed: user=${userId}, plan=${plan}`);

  const { rows: [sub] } = await db.query(
    `INSERT INTO suscripciones_empresario (usuario_id, plan, estado, stripe_subscription_id, stripe_customer_id, stripe_price_id, fecha_inicio, fecha_expiracion)
     VALUES ($1, $2, 'activa', $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      userId,
      plan,
      subscription.id,
      session.customer,
      priceId,
      new Date(),
      new Date(subscription.current_period_end * 1000),
    ]
  );

  await db.query(
    'UPDATE usuarios SET plan_empresario = $1, suscripcion_empresario_id = $2 WHERE id = $3',
    [plan, sub.id, userId]
  );

  logger.info(`[Stripe Empresario] User ${userId} subscribed to ${plan}`);
}

async function handleEmpresarioSubscriptionUpdated(subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getEmpresarioPlanFromPriceId(priceId);
  if (!plan) return;

  logger.info(`[Stripe Empresario] Subscription updated: user=${userId}, plan=${plan}`);

  await db.query(
    `UPDATE suscripciones_empresario SET
       plan = $1,
       fecha_expiracion = $2,
       stripe_price_id = $3,
       estado = CASE WHEN $4 IN ('active', 'trialing') THEN 'activa' ELSE estado END,
       updated_at = NOW()
     WHERE stripe_subscription_id = $5`,
    [
      plan,
      new Date(subscription.current_period_end * 1000),
      priceId,
      subscription.status,
      subscription.id,
    ]
  );

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    await db.query(
      'UPDATE usuarios SET plan_empresario = $1 WHERE id = $2',
      [plan, userId]
    );
  }
}

async function handleEmpresarioSubscriptionDeleted(subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  logger.info(`[Stripe Empresario] Subscription cancelled: user=${userId}`);

  await db.query(
    `UPDATE suscripciones_empresario SET estado = 'cancelada', cancelada_at = NOW(), updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [subscription.id]
  );

  await db.query(
    'UPDATE usuarios SET plan_empresario = NULL, suscripcion_empresario_id = NULL WHERE id = $1',
    [userId]
  );
}

async function handleExtraEventPayment(session) {
  const userId = session.metadata?.userId;
  if (!userId || session.metadata?.type !== 'extra_event') return;

  logger.info(`[Stripe Empresario] Extra event purchased by user ${userId}`);

  await db.query(
    'UPDATE usuarios SET eventos_extra_disponibles = COALESCE(eventos_extra_disponibles, 0) + 1 WHERE id = $1',
    [userId]
  );
}

module.exports = router;
module.exports.handleEmpresarioCheckoutCompleted = handleEmpresarioCheckoutCompleted;
module.exports.handleEmpresarioSubscriptionUpdated = handleEmpresarioSubscriptionUpdated;
module.exports.handleEmpresarioSubscriptionDeleted = handleEmpresarioSubscriptionDeleted;
module.exports.handleExtraEventPayment = handleExtraEventPayment;
