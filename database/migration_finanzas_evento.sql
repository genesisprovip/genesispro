-- Migration: Event-level financial tracking
-- Tracks inscriptions, fight payments, expenses, and prize distribution

CREATE TABLE IF NOT EXISTS pagos_evento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id UUID NOT NULL REFERENCES eventos_palenque(id) ON DELETE CASCADE,
  partido_id UUID REFERENCES partidos_derby(id) ON DELETE SET NULL,
  partido_nombre VARCHAR(200),
  concepto VARCHAR(50) NOT NULL CHECK (concepto IN ('inscripcion', 'pelea_ganada', 'pelea_perdida', 'premio', 'gasto', 'corretaje', 'otro')),
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
  monto DECIMAL(10,2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'cancelado')),
  pelea_id UUID REFERENCES peleas(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_evento_evento ON pagos_evento(evento_id);
CREATE INDEX IF NOT EXISTS idx_pagos_evento_partido ON pagos_evento(partido_id);
CREATE INDEX IF NOT EXISTS idx_pagos_evento_concepto ON pagos_evento(evento_id, concepto);
