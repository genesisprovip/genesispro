/**
 * Setup Stripe Products & Prices for Empresario Plans
 * Run once: node scripts/setup-stripe-empresario.js
 *
 * After running, add the printed Price IDs to your .env:
 *   STRIPE_PRICE_EMPRESARIO_BASICO=price_xxx
 *   STRIPE_PRICE_EMPRESARIO_PRO=price_xxx
 */

require('dotenv').config();
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function setup() {
  console.log('Creating Empresario products and prices in Stripe...\n');

  // Empresario Basico
  const basicProduct = await stripe.products.create({
    name: 'GenesisPro Empresario Basico',
    description: 'Membresia para organizadores de eventos de palenque. Hasta 4 eventos por mes, cartel personalizado, avisos push.',
    metadata: { plan: 'empresario_basico' },
  });

  const basicPrice = await stripe.prices.create({
    product: basicProduct.id,
    unit_amount: 79900, // $799 MXN in centavos
    currency: 'mxn',
    recurring: { interval: 'month' },
    metadata: { plan: 'empresario_basico' },
  });

  console.log(`Empresario Basico:`);
  console.log(`  Product: ${basicProduct.id}`);
  console.log(`  Price:   ${basicPrice.id}`);
  console.log(`  STRIPE_PRICE_EMPRESARIO_BASICO=${basicPrice.id}\n`);

  // Empresario Pro
  const proProduct = await stripe.products.create({
    name: 'GenesisPro Empresario Pro',
    description: 'Membresia premium para organizadores de eventos de palenque. Eventos ilimitados, estadisticas, cartel personalizado, avisos push.',
    metadata: { plan: 'empresario_pro' },
  });

  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 199900, // $1,999 MXN in centavos
    currency: 'mxn',
    recurring: { interval: 'month' },
    metadata: { plan: 'empresario_pro' },
  });

  console.log(`Empresario Pro:`);
  console.log(`  Product: ${proProduct.id}`);
  console.log(`  Price:   ${proPrice.id}`);
  console.log(`  STRIPE_PRICE_EMPRESARIO_PRO=${proPrice.id}\n`);

  console.log('Add these to your .env file:');
  console.log(`STRIPE_PRICE_EMPRESARIO_BASICO=${basicPrice.id}`);
  console.log(`STRIPE_PRICE_EMPRESARIO_PRO=${proPrice.id}`);
}

setup().catch(console.error);
