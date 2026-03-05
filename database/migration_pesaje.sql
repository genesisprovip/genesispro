-- ============================================
-- GENESISPRO - Agregar horario de pesaje
-- ============================================

ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS pesaje_abre TIME;
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS pesaje_cierra TIME;
