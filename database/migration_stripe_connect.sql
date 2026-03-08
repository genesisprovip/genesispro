-- ============================================
-- GENESISPRO - Migration: Planes Empresario Palenque
-- Membresia para organizadores de eventos
-- ============================================

-- 1. Agregar campos de empresario a usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plan_empresario VARCHAR(20) DEFAULT NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS suscripcion_empresario_id UUID;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS stripe_customer_id_empresario VARCHAR(100);

-- 2. Tabla de suscripciones empresario (separada de suscripciones de app)
CREATE TABLE IF NOT EXISTS suscripciones_empresario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  plan VARCHAR(20) NOT NULL CHECK (plan IN ('empresario_basico', 'empresario_pro', 'empresario_premium')),
  estado VARCHAR(20) DEFAULT 'activa' CHECK (estado IN ('activa', 'cancelada', 'expirada', 'pendiente')),

  -- Stripe
  stripe_subscription_id VARCHAR(100),
  stripe_customer_id VARCHAR(100),
  stripe_price_id VARCHAR(100),

  -- Fechas
  fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
  fecha_expiracion TIMESTAMPTZ,
  cancelada_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indices
CREATE INDEX IF NOT EXISTS idx_suscripciones_empresario_usuario ON suscripciones_empresario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_suscripciones_empresario_stripe ON suscripciones_empresario(stripe_subscription_id);

-- 4. Agregar campo para trackear eventos del mes
-- (se calcula en runtime, no necesita columna)
