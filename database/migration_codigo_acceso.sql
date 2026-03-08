-- Migration: Add codigo_acceso to partidos_derby
-- Alphanumeric access code for partido identification in mobile app

ALTER TABLE partidos_derby ADD COLUMN IF NOT EXISTS codigo_acceso VARCHAR(10);

-- Generate codes for existing partidos
UPDATE partidos_derby
SET codigo_acceso = UPPER(SUBSTR(MD5(RANDOM()::TEXT || id::TEXT), 1, 6))
WHERE codigo_acceso IS NULL;

-- Make it unique and not null
ALTER TABLE partidos_derby ALTER COLUMN codigo_acceso SET NOT NULL;
ALTER TABLE partidos_derby ALTER COLUMN codigo_acceso SET DEFAULT UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 6));

CREATE UNIQUE INDEX IF NOT EXISTS idx_partidos_derby_codigo_acceso ON partidos_derby(codigo_acceso);
