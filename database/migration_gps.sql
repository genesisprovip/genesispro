-- Migration: Add GPS coordinates to eventos_palenque
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION;
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_eventos_gps ON eventos_palenque(latitud, longitud) WHERE latitud IS NOT NULL;

COMMENT ON COLUMN eventos_palenque.latitud IS 'GPS latitude of event location';
COMMENT ON COLUMN eventos_palenque.longitud IS 'GPS longitude of event location';
