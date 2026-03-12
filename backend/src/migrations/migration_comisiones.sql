-- Migration: Comisiones Empresario System
-- Date: 2026-03-12
-- Business rules:
--   Month 1: 20% of referred user's subscription revenue
--   Months 2-12: 3% passive commission
--   Month 13+: $0 (expires)

-- Detailed commission records per referido per period
CREATE TABLE IF NOT EXISTS comisiones_empresario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresario_id UUID NOT NULL REFERENCES usuarios(id),
  referido_id UUID NOT NULL REFERENCES usuarios(id),
  monto DECIMAL(10,2) NOT NULL DEFAULT 0,
  porcentaje DECIMAL(5,2) NOT NULL,
  mes_numero INTEGER NOT NULL,
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comisiones_empresario_id ON comisiones_empresario(empresario_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_referido_id ON comisiones_empresario(referido_id);
CREATE INDEX IF NOT EXISTS idx_comisiones_estado ON comisiones_empresario(estado);
CREATE INDEX IF NOT EXISTS idx_comisiones_periodo ON comisiones_empresario(periodo_inicio, periodo_fin);

-- Monthly summary per empresario
CREATE TABLE IF NOT EXISTS comisiones_resumen (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresario_id UUID NOT NULL REFERENCES usuarios(id),
  periodo VARCHAR(7) NOT NULL, -- 'YYYY-MM' format
  total_referidos INTEGER NOT NULL DEFAULT 0,
  total_comision DECIMAL(10,2) NOT NULL DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado')),
  fecha_pago TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comisiones_resumen_empresario ON comisiones_resumen(empresario_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_comisiones_resumen_unique ON comisiones_resumen(empresario_id, periodo);
