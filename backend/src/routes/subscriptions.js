/**
 * GenesisPro - Subscription Routes (Stripe)
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { stripe, PLAN_CONFIG, getPlanFromPriceId, getBillingInterval } = require('../config/stripe');
const { authenticateJWT } = require('../middleware/auth');
const { Errors, asyncHandler } = require('../middleware/errorHandler');
const logger = require('../config/logger');
const {
  handleEmpresarioCheckoutCompleted,
  handleEmpresarioSubscriptionUpdated,
  handleEmpresarioSubscriptionDeleted,
} = require('./empresario');

// ─── POST /checkout - Create Stripe Checkout Session ───
router.post('/checkout', authenticateJWT, asyncHandler(async (req, res) => {
  const { priceId } = req.body;
  const userId = req.userId;

  if (!priceId) {
    throw Errors.badRequest('priceId es requerido');
  }

  // Get user
  const { rows: [user] } = await db.query(
    'SELECT id, email, nombre, stripe_customer_id, suscripcion_activa_id FROM usuarios WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );

  if (!user) throw Errors.notFound('Usuario');

  // Check if already has active subscription
  if (user.suscripcion_activa_id) {
    const { rows: [sub] } = await db.query(
      "SELECT id FROM suscripciones WHERE id = $1 AND estado = 'activa'",
      [user.suscripcion_activa_id]
    );
    if (sub) {
      throw Errors.badRequest('Ya tienes una suscripción activa. Usa el portal para cambiar de plan.');
    }
  }

  // Get or create Stripe customer
  let customerId = user.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.nombre,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.query(
      'UPDATE usuarios SET stripe_customer_id = $1 WHERE id = $2',
      [customerId, userId]
    );
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_BASE_URL || 'genesispro://'}subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_BASE_URL || 'genesispro://'}subscription/cancelled`,
    metadata: { userId },
    subscription_data: {
      metadata: { userId },
    },
  });

  res.json({
    success: true,
    data: { url: session.url, sessionId: session.id },
  });
}));

// ─── POST /portal - Open Stripe Billing Portal ───
router.post('/portal', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.userId;

  const { rows: [user] } = await db.query(
    'SELECT stripe_customer_id FROM usuarios WHERE id = $1',
    [userId]
  );

  if (!user?.stripe_customer_id) {
    throw Errors.badRequest('No tienes una suscripción para gestionar');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${process.env.APP_BASE_URL || 'genesispro://'}subscription/portal-return`,
  });

  res.json({
    success: true,
    data: { url: session.url },
  });
}));

// ─── GET /status - Subscription Status ───
router.get('/status', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.userId;

  const { rows: [user] } = await db.query(
    `SELECT u.id, u.plan_actual, u.plan_elegido, u.stripe_customer_id,
            s.id as sub_id, s.stripe_subscription_id, s.stripe_price_id,
            s.tipo_pago, s.fecha_inicio, s.fecha_expiracion, s.estado as sub_estado
     FROM usuarios u
     LEFT JOIN suscripciones s ON u.suscripcion_activa_id = s.id
     WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId]
  );

  if (!user) throw Errors.notFound('Usuario');

  // Get usage counts
  const [avesResult, combatesResult] = await Promise.all([
    db.query('SELECT COUNT(*) FROM aves WHERE usuario_id = $1 AND deleted_at IS NULL', [userId]),
    db.query(
      `SELECT COUNT(*) FROM combates c JOIN aves a ON c.macho_id = a.id
       WHERE a.usuario_id = $1 AND c.deleted_at IS NULL`, [userId]
    ),
  ]);

  // Get plan limits
  const { rows: [planLimits] } = await db.query(
    'SELECT * FROM planes WHERE nombre = $1',
    [user.plan_actual]
  );

  const isExpired = user.fecha_expiracion && new Date() > new Date(user.fecha_expiracion);

  res.json({
    success: true,
    data: {
      plan: user.plan_actual,
      planElegido: user.plan_elegido || 'basico',
      hasSubscription: !!user.stripe_subscription_id,
      isExpired: isExpired && !user.stripe_subscription_id,
      billingInterval: user.tipo_pago || null,
      fechaExpiracion: user.fecha_expiracion,
      currentPriceId: user.stripe_price_id || null,
      limits: {
        maxAves: planLimits?.max_aves,
        maxFotosPorAve: planLimits?.max_fotos_por_ave,
        maxCombates: planLimits?.max_combates,
      },
      usage: {
        aves: parseInt(avesResult.rows[0].count),
        combates: parseInt(combatesResult.rows[0].count),
      },
    },
  });
}));

// ─── GET /invoices - List Invoices ───
router.get('/invoices', authenticateJWT, asyncHandler(async (req, res) => {
  const userId = req.userId;

  const { rows: [user] } = await db.query(
    'SELECT stripe_customer_id FROM usuarios WHERE id = $1',
    [userId]
  );

  if (!user?.stripe_customer_id) {
    return res.json({ success: true, data: { invoices: [] } });
  }

  const stripeInvoices = await stripe.invoices.list({
    customer: user.stripe_customer_id,
    limit: 12,
  });

  const invoices = stripeInvoices.data.map(inv => ({
    id: inv.id,
    number: inv.number,
    date: inv.created ? new Date(inv.created * 1000).toISOString() : null,
    amount: (inv.amount_paid || 0) / 100,
    currency: (inv.currency || 'mxn').toUpperCase(),
    status: inv.status,
    pdfUrl: inv.invoice_pdf,
    hostedUrl: inv.hosted_invoice_url,
  }));

  res.json({ success: true, data: { invoices } });
}));

// ─── PUT /change-plan - Change user plan ───
router.put('/change-plan', authenticateJWT, asyncHandler(async (req, res) => {
  const { plan } = req.body;
  const userId = req.userId;

  // Validate plan
  const validPlans = ['basico', 'pro', 'premium'];
  if (!plan || !validPlans.includes(plan)) {
    throw Errors.badRequest('Plan inválido. Opciones: basico, pro, premium');
  }

  // Get current user state
  const { rows: [user] } = await db.query(
    'SELECT id, plan_actual, plan_elegido, estado_cuenta, suscripcion_activa_id FROM usuarios WHERE id = $1 AND deleted_at IS NULL',
    [userId]
  );

  if (!user) throw Errors.notFound('Usuario');

  // If user has active paid subscription, store as plan_elegido (change at end of period)
  if (user.estado_cuenta === 'activa' && user.suscripcion_activa_id) {
    await db.query(
      'UPDATE usuarios SET plan_elegido = $1, updated_at = NOW() WHERE id = $2',
      [plan, userId]
    );

    logger.info(`User ${userId} scheduled plan change to ${plan} (active subscription)`);

    return res.json({
      success: true,
      message: `Plan cambiará a ${plan} al finalizar el periodo actual`,
      data: {
        plan_actual: user.plan_actual,
        plan_elegido: plan,
        cambio_inmediato: false
      }
    });
  }

  // If user is on trial, update plan_elegido (keep premium during trial)
  if (user.estado_cuenta === 'trial') {
    await db.query(
      'UPDATE usuarios SET plan_elegido = $1, updated_at = NOW() WHERE id = $2',
      [plan, userId]
    );

    logger.info(`User ${userId} chose plan ${plan} during trial`);

    return res.json({
      success: true,
      message: `Plan ${plan} seleccionado. Se aplicará al terminar tu periodo de prueba.`,
      data: {
        plan_actual: 'premium',
        plan_elegido: plan,
        cambio_inmediato: false
      }
    });
  }

  // If user is vencido or no active subscription, change immediately
  await db.query(
    'UPDATE usuarios SET plan_actual = $1, plan_elegido = $1, updated_at = NOW() WHERE id = $2',
    [plan, userId]
  );

  logger.info(`User ${userId} changed plan to ${plan} immediately`);

  res.json({
    success: true,
    message: `Plan actualizado a ${plan}`,
    data: {
      plan_actual: plan,
      plan_elegido: plan,
      cambio_inmediato: true
    }
  });
}));

// ─── GET /plans - Available Plans ───
router.get('/plans', asyncHandler(async (req, res) => {
  const { rows: plans } = await db.query(
    'SELECT nombre, precio_mensual, precio_anual, max_aves, max_fotos_por_ave, max_combates, profundidad_genealogia, analytics_avanzado, multi_usuario, exportacion, soporte_prioritario FROM planes WHERE activo = true ORDER BY precio_mensual'
  );

  res.json({ success: true, data: { plans } });
}));

// ─── POST /webhook - Stripe Webhook Handler ───
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('[Stripe Webhook] Signature verification failed:', err.message);
    return res.status(400).send('Webhook signature verification failed');
  }

  try {
    const obj = event.data.object;
    const isEmpresario = obj.metadata?.type === 'empresario';

    switch (event.type) {
      case 'checkout.session.completed':
        if (isEmpresario) {
          await handleEmpresarioCheckoutCompleted(obj);
        } else {
          await handleCheckoutCompleted(obj);
        }
        break;
      case 'customer.subscription.updated':
        if (isEmpresario) {
          await handleEmpresarioSubscriptionUpdated(obj);
        } else {
          await handleSubscriptionUpdated(obj);
        }
        break;
      case 'customer.subscription.deleted':
        if (isEmpresario) {
          await handleEmpresarioSubscriptionDeleted(obj);
        } else {
          await handleSubscriptionDeleted(obj);
        }
        break;
      case 'invoice.payment_failed':
        await handleInvoiceFailed(obj);
        break;
      default:
        logger.info(`[Stripe Webhook] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    logger.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
  }

  res.json({ received: true });
});

// ─── Webhook Handlers ───

async function handleCheckoutCompleted(session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const interval = getBillingInterval(priceId);

  logger.info(`[Stripe] Checkout completed: user=${userId}, plan=${plan}, interval=${interval}`);

  // Get plan_id from planes table
  const { rows: [planRow] } = await db.query(
    'SELECT id FROM planes WHERE nombre = $1',
    [plan]
  );

  if (!planRow) {
    logger.error(`[Stripe] Plan not found in DB: ${plan}`);
    return;
  }

  // Create subscription record
  const { rows: [sub] } = await db.query(
    `INSERT INTO suscripciones (usuario_id, plan_id, tipo_pago, fecha_inicio, fecha_expiracion, estado, stripe_subscription_id, stripe_customer_id, stripe_price_id, auto_renovacion)
     VALUES ($1, $2, $3, $4, $5, 'activa', $6, $7, $8, true)
     RETURNING id`,
    [
      userId,
      planRow.id,
      interval === 'anual' ? 'anual' : 'mensual',
      new Date(),
      new Date(subscription.current_period_end * 1000),
      subscription.id,
      session.customer,
      priceId,
    ]
  );

  // Update user plan
  await db.query(
    `UPDATE usuarios SET plan_actual = $1, suscripcion_activa_id = $2 WHERE id = $3`,
    [plan, sub.id, userId]
  );

  logger.info(`[Stripe] User ${userId} upgraded to ${plan}`);
}

async function handleSubscriptionUpdated(subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const plan = getPlanFromPriceId(priceId);
  const interval = getBillingInterval(priceId);

  logger.info(`[Stripe] Subscription updated: user=${userId}, plan=${plan}`);

  // Get plan_id
  const { rows: [planRow] } = await db.query(
    'SELECT id FROM planes WHERE nombre = $1',
    [plan]
  );

  if (!planRow) return;

  // Update subscription record
  await db.query(
    `UPDATE suscripciones SET
       plan_id = $1,
       tipo_pago = $2,
       fecha_expiracion = $3,
       stripe_price_id = $4,
       estado = CASE WHEN $5 IN ('active', 'trialing') THEN 'activa'::estado_suscripcion ELSE estado END,
       updated_at = NOW()
     WHERE stripe_subscription_id = $6`,
    [
      planRow.id,
      interval === 'anual' ? 'anual' : 'mensual',
      new Date(subscription.current_period_end * 1000),
      priceId,
      subscription.status,
      subscription.id,
    ]
  );

  // Update user plan
  if (subscription.status === 'active' || subscription.status === 'trialing') {
    await db.query(
      'UPDATE usuarios SET plan_actual = $1 WHERE id = $2',
      [plan, userId]
    );
  }
}

async function handleSubscriptionDeleted(subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  logger.info(`[Stripe] Subscription cancelled: user=${userId}`);

  // Mark subscription as cancelled
  await db.query(
    `UPDATE suscripciones SET estado = 'cancelada', cancelada_at = NOW(), updated_at = NOW()
     WHERE stripe_subscription_id = $1`,
    [subscription.id]
  );

  // Downgrade user to basico
  await db.query(
    `UPDATE usuarios SET plan_actual = 'basico', suscripcion_activa_id = NULL WHERE id = $1`,
    [userId]
  );

  logger.info(`[Stripe] User ${userId} downgraded to basico`);
}

async function handleInvoiceFailed(invoice) {
  const customerId = invoice.customer;

  const { rows: [user] } = await db.query(
    'SELECT id, email, nombre FROM usuarios WHERE stripe_customer_id = $1',
    [customerId]
  );

  if (user) {
    logger.warn(`[Stripe] Payment failed for user ${user.id} (${user.email})`);
    // Don't suspend immediately - Stripe retries automatically
    // After all retries fail, subscription.deleted triggers the downgrade
  }
}

module.exports = router;
