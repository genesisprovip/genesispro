-- Migration: Reglamentos system for Genesis AI
-- Table to store official and event-specific rules

CREATE TABLE IF NOT EXISTS reglamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES eventos_palenque(id) ON DELETE CASCADE,
  titulo TEXT,
  contenido TEXT NOT NULL,
  seccion TEXT,
  articulo TEXT,
  keywords TEXT[] DEFAULT '{}',
  es_oficial BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for keyword search
CREATE INDEX IF NOT EXISTS idx_reglamentos_evento ON reglamentos(evento_id);
CREATE INDEX IF NOT EXISTS idx_reglamentos_keywords ON reglamentos USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_reglamentos_oficial ON reglamentos(es_oficial);

-- Comment
COMMENT ON TABLE reglamentos IS 'Reglamentos de peleas de gallos - oficiales y por evento';
