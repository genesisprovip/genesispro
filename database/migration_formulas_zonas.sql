-- Migration: Custom formulas, zones, and gallera observations

-- 1. Formulas/dosis personalizadas
CREATE TABLE IF NOT EXISTS formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  nombre TEXT NOT NULL,  -- "Revitalizador RMR18"
  descripcion TEXT,
  categoria TEXT DEFAULT 'general',  -- general, vitaminas, minerales, antibiotico, desparasitante, otro
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS formula_ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formula_id UUID NOT NULL REFERENCES formulas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,      -- "Vitamina B12"
  cantidad DECIMAL(10,2),    -- 2.5
  unidad TEXT DEFAULT 'ml',  -- ml, mg, gr, gotas, cc, unidades
  orden INT DEFAULT 0,
  notas TEXT
);

CREATE INDEX IF NOT EXISTS idx_formulas_usuario ON formulas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_formula_ingredientes_formula ON formula_ingredientes(formula_id);

-- 2. Zonas/ubicaciones para aves
ALTER TABLE aves ADD COLUMN IF NOT EXISTS zona TEXT;          -- "Rancho El Rey"
ALTER TABLE aves ADD COLUMN IF NOT EXISTS sub_zona TEXT;      -- "Modulo A" / "Corral 3" / "Nave 2"
ALTER TABLE aves ADD COLUMN IF NOT EXISTS lote TEXT;          -- "Lote 2024-A"

CREATE INDEX IF NOT EXISTS idx_aves_zona ON aves(usuario_id, zona) WHERE zona IS NOT NULL;

-- 3. Observaciones generales de gallera
CREATE TABLE IF NOT EXISTS observaciones_gallera (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  titulo TEXT,
  contenido TEXT NOT NULL,
  categoria TEXT DEFAULT 'general',  -- general, salud, alimentacion, reproduccion, instalaciones
  fecha DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_observaciones_usuario ON observaciones_gallera(usuario_id, fecha DESC);

-- 4. Recordatorios - columna para silenciar avisos por evento
ALTER TABLE vacunas ADD COLUMN IF NOT EXISTS recordatorio_silenciado BOOLEAN DEFAULT false;
ALTER TABLE desparasitaciones ADD COLUMN IF NOT EXISTS recordatorio_silenciado BOOLEAN DEFAULT false;
ALTER TABLE consultas_veterinarias ADD COLUMN IF NOT EXISTS recordatorio_silenciado BOOLEAN DEFAULT false;

-- 5. Motivo de muerte/baja y observaciones de combate en aves
ALTER TABLE aves ADD COLUMN IF NOT EXISTS motivo_baja TEXT;          -- "Murio en combate", "Enfermedad", "Accidente", etc
ALTER TABLE aves ADD COLUMN IF NOT EXISTS fecha_baja DATE;
ALTER TABLE aves ADD COLUMN IF NOT EXISTS observaciones_combate TEXT; -- Notas del gallero sobre desempeno en peleas

COMMENT ON TABLE formulas IS 'Formulas/dosis personalizadas del gallero con ingredientes multiples';
COMMENT ON TABLE observaciones_gallera IS 'Notas y observaciones generales de la gallera';
COMMENT ON COLUMN aves.zona IS 'Zona principal: rancho, nave, area';
COMMENT ON COLUMN aves.sub_zona IS 'Sub-zona: corral, modulo, seccion, lote';
COMMENT ON COLUMN aves.motivo_baja IS 'Motivo de muerte o baja del ave';
COMMENT ON COLUMN aves.observaciones_combate IS 'Observaciones del gallero sobre desempeno en peleas';
