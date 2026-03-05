-- ============================================
-- GENESISPRO - Migration: Stripe Integration
-- Run this on existing database
-- ============================================

-- 1. Add Stripe fields to usuarios (if not exist)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100) UNIQUE;

-- 2. Add stripe_price_id to suscripciones
ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(100);

-- 3. Update plan prices to match Stripe
UPDATE planes SET
  precio_mensual = 299.00,
  precio_anual = 2990.00,
  max_aves = 10,
  max_fotos_por_ave = 3,
  max_combates = 5,
  profundidad_genealogia = 2
WHERE nombre = 'basico';

UPDATE planes SET
  precio_mensual = 599.00,
  precio_anual = 5990.00,
  max_aves = 50,
  max_fotos_por_ave = 10,
  max_combates = 20,
  profundidad_genealogia = 3,
  exportacion = true
WHERE nombre = 'pro';

UPDATE planes SET
  precio_mensual = 999.00,
  precio_anual = 9990.00,
  max_aves = NULL,
  max_fotos_por_ave = NULL,
  max_combates = NULL,
  profundidad_genealogia = NULL,
  analytics_avanzado = true,
  multi_usuario = true,
  max_colaboradores = 3,
  exportacion = true,
  api_access = true,
  soporte_prioritario = true
WHERE nombre = 'premium';

-- 4. Create index on stripe fields
CREATE INDEX IF NOT EXISTS idx_usuarios_stripe ON usuarios(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_suscripciones_stripe_price ON suscripciones(stripe_price_id);
