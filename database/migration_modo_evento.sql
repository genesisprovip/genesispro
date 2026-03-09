-- Migration: Add modo column to eventos_palenque
-- Allows switching between 'genesispro' (automated) and 'manual' (free-form editing) modes

ALTER TABLE eventos_palenque
  ADD COLUMN IF NOT EXISTS modo VARCHAR(20) DEFAULT 'genesispro'
  CHECK (modo IN ('genesispro', 'manual'));

-- Update existing events to default mode
UPDATE eventos_palenque SET modo = 'genesispro' WHERE modo IS NULL;
