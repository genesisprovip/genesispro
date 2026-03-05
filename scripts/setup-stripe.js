/**
 * GenesisPro - Create Stripe Products & Prices
 * Run ONCE: node scripts/setup-stripe.js
 *
 * Creates 3 products (Básico, Pro, Premium) with monthly and yearly prices in MXN
 * Outputs the Price IDs to add to your .env
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
});

const PLANS = [
  {
    name: 'GenesisPro Básico',
    description: 'Plan básico para criadores: hasta 10 aves, 5 combates/mes, 3 fotos por ave',
    key: 'basico',
    monthlyPrice: 29900, // $299 MXN in centavos
    yearlyPrice: 299000, // $2,990 MXN (10 meses, 2 gratis)
  },
  {
    name: 'GenesisPro Pro',
    description: 'Plan profesional: hasta 50 aves, 20 combates/mes, 10 fotos por ave, exportación',
    key: 'pro',
    monthlyPrice: 59900, // $599 MXN
    yearlyPrice: 599000, // $5,990 MXN (10 meses, 2 gratis)
  },
  {
    name: 'GenesisPro Premium',
    description: 'Plan premium ilimitado: aves, combates y fotos sin límite, analytics avanzado, multi-usuario',
    key: 'premium',
    monthlyPrice: 99900, // $999 MXN
    yearlyPrice: 999000, // $9,990 MXN (10 meses, 2 gratis)
  },
];

async function setupStripe() {
  console.log('========================================');
  console.log('  GenesisPro - Stripe Products Setup');
  console.log('========================================\n');

  const envLines = [];

  for (const plan of PLANS) {
    console.log(`Creating product: ${plan.name}...`);

    // Create product
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: {
        app: 'genesispro',
        plan_key: plan.key,
      },
    });

    console.log(`  Product ID: ${product.id}`);

    // Create monthly price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.monthlyPrice,
      currency: 'mxn',
      recurring: { interval: 'month' },
      metadata: {
        app: 'genesispro',
        plan_key: plan.key,
        billing: 'monthly',
      },
    });

    console.log(`  Monthly Price: ${monthlyPrice.id} ($${plan.monthlyPrice / 100} MXN/mes)`);

    // Create yearly price
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.yearlyPrice,
      currency: 'mxn',
      recurring: { interval: 'year' },
      metadata: {
        app: 'genesispro',
        plan_key: plan.key,
        billing: 'yearly',
      },
    });

    console.log(`  Yearly Price:  ${yearlyPrice.id} ($${plan.yearlyPrice / 100} MXN/año)`);
    console.log('');

    envLines.push(`STRIPE_PRICE_${plan.key.toUpperCase()}_MONTHLY=${monthlyPrice.id}`);
    envLines.push(`STRIPE_PRICE_${plan.key.toUpperCase()}_YEARLY=${yearlyPrice.id}`);
  }

  console.log('========================================');
  console.log('  Add these to your .env:');
  console.log('========================================\n');
  envLines.forEach(line => console.log(line));
  console.log('');
  console.log('Done! Products created in Stripe.');
}

setupStripe().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
