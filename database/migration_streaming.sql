-- Migration: Streaming en vivo para eventos de palenque
-- Date: 2026-03-07

CREATE TABLE IF NOT EXISTS streams_evento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id UUID NOT NULL REFERENCES eventos_palenque(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  stream_key VARCHAR(100) UNIQUE NOT NULL,
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo', 'finalizado', 'error')),
  calidad_max VARCHAR(10) DEFAULT '720p',
  viewers_count INTEGER DEFAULT 0,
  viewers_peak INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_streams_evento ON streams_evento(evento_id);
CREATE INDEX IF NOT EXISTS idx_streams_estado ON streams_evento(estado);
CREATE INDEX IF NOT EXISTS idx_streams_key ON streams_evento(stream_key);
