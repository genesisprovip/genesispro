-- Migration: Composición genética + Origen de aves
-- Date: 2026-03-09

-- Composición genética como JSONB
-- Formato: [{"linea":"Kelso","fraccion":"3/4","decimal":0.75,"via":"padre"},...]
ALTER TABLE aves ADD COLUMN IF NOT EXISTS composicion_genetica JSONB DEFAULT '[]';

-- Flag de pureza (semental/madre pura = 100% una línea)
ALTER TABLE aves ADD COLUMN IF NOT EXISTS es_puro BOOLEAN DEFAULT false;

-- Origen / procedencia
ALTER TABLE aves ADD COLUMN IF NOT EXISTS criadero_origen VARCHAR(200);
ALTER TABLE aves ADD COLUMN IF NOT EXISTS criador_nombre VARCHAR(200);
ALTER TABLE aves ADD COLUMN IF NOT EXISTS fecha_adquisicion DATE;
ALTER TABLE aves ADD COLUMN IF NOT EXISTS tipo_adquisicion VARCHAR(50) DEFAULT 'cria_propia';
-- tipos: cria_propia, compra, regalo, intercambio
ALTER TABLE aves ADD COLUMN IF NOT EXISTS notas_origen TEXT;

-- Index para búsquedas por línea genética en JSONB
CREATE INDEX IF NOT EXISTS idx_aves_composicion ON aves USING gin (composicion_genetica);

-- Constraint para tipo_adquisicion
ALTER TABLE aves DROP CONSTRAINT IF EXISTS chk_tipo_adquisicion;
ALTER TABLE aves ADD CONSTRAINT chk_tipo_adquisicion
  CHECK (tipo_adquisicion IS NULL OR tipo_adquisicion IN ('cria_propia', 'compra', 'regalo', 'intercambio'));
