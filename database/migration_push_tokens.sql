-- Migration: Push notification tokens
-- The push_tokens table may already exist from migration_palenque_fix.sql
-- This ensures the structure is correct and adds user preferences

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  visitor_id VARCHAR(100),
  token VARCHAR(255) NOT NULL,
  platform VARCHAR(20) DEFAULT 'expo',
  device_info JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_usuario ON push_tokens(usuario_id) WHERE active = true;

-- User notification preferences
CREATE TABLE IF NOT EXISTS preferencias_notificacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
  push_habilitado BOOLEAN DEFAULT true,
  alerta_vacunas BOOLEAN DEFAULT true,
  recordatorio_combates BOOLEAN DEFAULT false,
  avisos_evento BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
