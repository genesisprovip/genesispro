-- Smart alerts for assistant (proactive notifications per user)
CREATE TABLE IF NOT EXISTS alertas_asistente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,  -- PLAN_LIMIT_AVES, VACUNAS_VENCIDAS, RACHA_COMBATES, etc.
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  prioridad VARCHAR(10) NOT NULL DEFAULT 'media',  -- alta, media, baja
  datos_extra JSONB DEFAULT '{}',
  leida BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alertas_usuario_leida ON alertas_asistente(usuario_id, leida);
CREATE INDEX IF NOT EXISTS idx_alertas_usuario_tipo ON alertas_asistente(usuario_id, tipo);
CREATE INDEX IF NOT EXISTS idx_alertas_created ON alertas_asistente(created_at);

-- Prevent duplicate unread alerts of same type per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_alertas_unique_unread
  ON alertas_asistente(usuario_id, tipo) WHERE leida = false;
