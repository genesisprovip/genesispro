/**
 * GenesisPro - Stripe Configuration
 */

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

// Plan configuration with limits
const PLAN_CONFIG = {
  basico: {
    maxAves: 10,
    maxFotosPorAve: 3,
    maxCombates: 5,
    profundidadGenealogia: 2,
    analyticsAvanzado: false,
    multiUsuario: false,
    maxColaboradores: 0,
    exportacion: false,
    apiAccess: false,
    features: ['aves', 'combates', 'salud_basica'],
  },
  pro: {
    maxAves: 50,
    maxFotosPorAve: 10,
    maxCombates: 20,
    profundidadGenealogia: 3,
    analyticsAvanzado: false,
    multiUsuario: false,
    maxColaboradores: 0,
    exportacion: true,
    apiAccess: false,
    features: ['aves', 'combates', 'salud', 'finanzas', 'alimentacion', 'exportacion'],
  },
  premium: {
    maxAves: null, // unlimited
    maxFotosPorAve: null,
    maxCombates: null,
    profundidadGenealogia: null,
    analyticsAvanzado: true,
    multiUsuario: true,
    maxColaboradores: 3,
    exportacion: true,
    apiAccess: true,
    features: ['aves', 'combates', 'salud', 'finanzas', 'alimentacion', 'exportacion', 'analytics_avanzado', 'multi_usuario', 'api_access', 'soporte_prioritario'],
  },
};

// Price IDs - populated after running setup-stripe.js
// These will be updated with real IDs from Stripe
const PRICE_IDS = {
  basico_monthly: process.env.STRIPE_PRICE_BASICO_MONTHLY || '',
  basico_yearly: process.env.STRIPE_PRICE_BASICO_YEARLY || '',
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || '',
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '',
  premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY || '',
};

function getPlanFromPriceId(priceId) {
  if (priceId === PRICE_IDS.basico_monthly || priceId === PRICE_IDS.basico_yearly) return 'basico';
  if (priceId === PRICE_IDS.pro_monthly || priceId === PRICE_IDS.pro_yearly) return 'pro';
  if (priceId === PRICE_IDS.premium_monthly || priceId === PRICE_IDS.premium_yearly) return 'premium';
  return 'basico';
}

function getBillingInterval(priceId) {
  if (!priceId) return null;
  const yearlyIds = [PRICE_IDS.basico_yearly, PRICE_IDS.pro_yearly, PRICE_IDS.premium_yearly];
  if (yearlyIds.includes(priceId)) return 'anual';
  const monthlyIds = [PRICE_IDS.basico_monthly, PRICE_IDS.pro_monthly, PRICE_IDS.premium_monthly];
  if (monthlyIds.includes(priceId)) return 'mensual';
  return null;
}

module.exports = {
  stripe,
  PLAN_CONFIG,
  PRICE_IDS,
  getPlanFromPriceId,
  getBillingInterval,
};
