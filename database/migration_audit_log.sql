-- Migration: Audit log for tracking corrections and sensitive changes
-- Every edit to finalized data gets logged here with reason

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES eventos_palenque(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  usuario_nombre TEXT,
  accion TEXT NOT NULL,  -- 'corregir_resultado', 'editar_pelea', 'eliminar_pelea', etc.
  entidad TEXT NOT NULL, -- 'pelea', 'partido', 'evento'
  entidad_id UUID,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  motivo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_evento ON audit_log(evento_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entidad ON audit_log(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

COMMENT ON TABLE audit_log IS 'Registro de auditoría para correcciones y cambios sensibles durante eventos';
