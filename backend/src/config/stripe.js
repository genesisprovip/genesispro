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
  // Empresario Palenque
  empresario_basico: process.env.STRIPE_PRICE_EMPRESARIO_BASICO || '',
  empresario_pro: process.env.STRIPE_PRICE_EMPRESARIO_PRO || '',
  empresario_premium: process.env.STRIPE_PRICE_EMPRESARIO_PREMIUM || '',
};

// Empresario plan config
const EMPRESARIO_CONFIG = {
  empresario_basico: {
    nombre: 'Empresario Basico',
    precio: 799, // MXN/mes
    maxEventosMes: 4, // can buy extras at $299 each
    maxEventosSimultaneos: 2,
    cartel: true,
    avisos: true,
    participantesIlimitados: true,
    estadisticasEvento: false,
    streamingEnVivo: false,
    estadisticasAlcance: false,
    comisionesReferidos: false,
  },
  empresario_pro: {
    nombre: 'Empresario Pro',
    precio: 1999, // MXN/mes
    maxEventosMes: null, // unlimited
    maxEventosSimultaneos: 5,
    cartel: true,
    avisos: true,
    participantesIlimitados: true,
    estadisticasEvento: true,
    streamingEnVivo: false,
    estadisticasAlcance: false,
    comisionesReferidos: false,
  },
  empresario_premium: {
    nombre: 'Empresario Premium',
    precio: 2999, // MXN/mes
    maxEventosMes: null, // unlimited
    maxEventosSimultaneos: 10,
    cartel: true,
    avisos: true,
    participantesIlimitados: true,
    estadisticasEvento: true,
    streamingEnVivo: true,
    estadisticasAlcance: true,
    comisionesReferidos: true,
  },
};

function getEmpresarioPlanFromPriceId(priceId) {
  if (priceId === PRICE_IDS.empresario_basico) return 'empresario_basico';
  if (priceId === PRICE_IDS.empresario_pro) return 'empresario_pro';
  if (priceId === PRICE_IDS.empresario_premium) return 'empresario_premium';
  return null;
}

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
  EMPRESARIO_CONFIG,
  PRICE_IDS,
  getPlanFromPriceId,
  getEmpresarioPlanFromPriceId,
  getBillingInterval,
};
