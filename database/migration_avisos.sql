-- Migration: Announcements/messages system for live events
CREATE TABLE IF NOT EXISTS avisos_evento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES eventos_palenque(id) ON DELETE CASCADE,
  mensaje TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avisos_evento_id ON avisos_evento(evento_id);
