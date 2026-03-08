-- Migration: Add event costs and cartel fields to eventos_palenque
-- Date: 2026-03-05

-- Cost fields (in pesos, variable per event)
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS costo_inscripcion INTEGER DEFAULT 0;
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS costo_por_pelea INTEGER DEFAULT 0;
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS premio_campeon INTEGER DEFAULT 0;
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS costos_extra JSONB DEFAULT '[]';

-- Cartel/event detail fields
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS aves_por_partido INTEGER DEFAULT 3;
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS reglas_navaja VARCHAR(500);
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS contacto_organizador VARCHAR(300);
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS hora_peleas TIME;
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS imagen_cartel_url TEXT;

-- Comments
COMMENT ON COLUMN eventos_palenque.costo_inscripcion IS 'Entry fee per partido in pesos (plumas)';
COMMENT ON COLUMN eventos_palenque.costo_por_pelea IS 'Bet amount per fight in pesos (plumas)';
COMMENT ON COLUMN eventos_palenque.premio_campeon IS 'Champion prize in pesos';
COMMENT ON COLUMN eventos_palenque.costos_extra IS 'JSON array of {nombre, monto} for custom costs';
COMMENT ON COLUMN eventos_palenque.aves_por_partido IS 'Number of birds to register per partido';
COMMENT ON COLUMN eventos_palenque.reglas_navaja IS 'Knife/navaja rules description';
COMMENT ON COLUMN eventos_palenque.contacto_organizador IS 'Organizer contact info (phone, social)';
COMMENT ON COLUMN eventos_palenque.hora_peleas IS 'Time fights start (after pesaje)';
