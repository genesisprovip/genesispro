-- Migration: Chat en vivo para eventos de palenque
-- Date: 2026-03-07

CREATE TABLE IF NOT EXISTS chat_mensajes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id UUID NOT NULL REFERENCES eventos_palenque(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  mensaje TEXT NOT NULL,
  eliminado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_evento ON chat_mensajes(evento_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_usuario ON chat_mensajes(usuario_id);
