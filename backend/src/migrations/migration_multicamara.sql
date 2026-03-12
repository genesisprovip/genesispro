-- Migration: Multi-camera streaming system
-- Date: 2026-03-12
-- Description: Adds multi-camera support to streaming, with director control and operators

-- New columns on streams_evento for multi-camera support
ALTER TABLE streams_evento ADD COLUMN IF NOT EXISTS es_principal BOOLEAN DEFAULT false;
ALTER TABLE streams_evento ADD COLUMN IF NOT EXISTS es_director BOOLEAN DEFAULT false;
ALTER TABLE streams_evento ADD COLUMN IF NOT EXISTS nombre_camara VARCHAR(100) DEFAULT 'Cámara 1';
ALTER TABLE streams_evento ADD COLUMN IF NOT EXISTS operador_id UUID REFERENCES usuarios(id) NULL;

-- Operators table: authorized people who can broadcast on behalf of the empresario
CREATE TABLE IF NOT EXISTS operadores_evento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES eventos_palenque(id),
  usuario_id UUID REFERENCES usuarios(id),
  nombre VARCHAR(100),
  autorizado_por UUID REFERENCES usuarios(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(evento_id, usuario_id)
);

-- Index for fast lookup of active streams per event
CREATE INDEX IF NOT EXISTS idx_streams_evento_principal ON streams_evento (evento_id, es_principal) WHERE estado = 'activo';
CREATE INDEX IF NOT EXISTS idx_operadores_evento_activo ON operadores_evento (evento_id, activo) WHERE activo = true;
