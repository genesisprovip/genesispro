-- Migration: Add ring/band tracking to aves
-- Anillos metalicos (permanentes), de color (visuales), y codificados

ALTER TABLE aves ADD COLUMN IF NOT EXISTS anillo_metalico VARCHAR(50);
ALTER TABLE aves ADD COLUMN IF NOT EXISTS anillo_color VARCHAR(50);
ALTER TABLE aves ADD COLUMN IF NOT EXISTS anillo_codigo VARCHAR(50);
ALTER TABLE aves ADD COLUMN IF NOT EXISTS anillo_pata VARCHAR(15);

CREATE INDEX IF NOT EXISTS idx_aves_anillo_metalico ON aves(anillo_metalico) WHERE anillo_metalico IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_aves_anillo_color ON aves(anillo_color) WHERE anillo_color IS NOT NULL;
