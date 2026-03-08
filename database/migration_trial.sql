-- Migration: Trial system (15 days free Premium)
-- Adds trial tracking fields to usuarios table

-- Add trial fields
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trial_inicio TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS trial_fin TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS estado_cuenta VARCHAR(20) DEFAULT 'activo';
-- estado_cuenta: 'trial', 'activo', 'vencido', 'suspendido'

-- Set existing users as 'activo' (they were already using the app)
UPDATE usuarios SET estado_cuenta = 'activo' WHERE estado_cuenta IS NULL;

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_usuarios_estado_cuenta ON usuarios(estado_cuenta);
CREATE INDEX IF NOT EXISTS idx_usuarios_trial_fin ON usuarios(trial_fin) WHERE trial_fin IS NOT NULL;
