-- Migration: Add plan_elegido column to usuarios
-- Description: Stores the user's chosen plan separately from plan_actual.
--   During trial, plan_actual = 'premium' (full access) while plan_elegido
--   stores the plan they intend to use after the trial ends.
--   On trial expiry, plan_actual is set to plan_elegido instead of hardcoded 'basico'.

-- Add plan_elegido column
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS plan_elegido VARCHAR(20) DEFAULT 'basico';

-- Update existing users: set plan_elegido based on current plan
UPDATE usuarios SET plan_elegido = plan_actual WHERE estado_cuenta != 'trial';
UPDATE usuarios SET plan_elegido = 'basico' WHERE estado_cuenta = 'trial' AND plan_elegido IS NULL;
