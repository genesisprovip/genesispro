-- Migration: Referral/Commission Tracking System + Extra Events
-- Date: 2026-03-07

-- Track which empresario referred which user
CREATE TABLE IF NOT EXISTS referidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresario_id UUID NOT NULL REFERENCES usuarios(id),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  evento_id UUID REFERENCES eventos_palenque(id),
  estado VARCHAR(20) DEFAULT 'registrado' CHECK (estado IN ('registrado', 'suscrito', 'comision_pagada')),
  comision_monto DECIMAL(10,2) DEFAULT 0,
  comision_porcentaje DECIMAL(5,2) DEFAULT 40.00,
  suscripcion_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_referidos_empresario ON referidos(empresario_id);
CREATE INDEX IF NOT EXISTS idx_referidos_usuario ON referidos(usuario_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referidos_unique_user ON referidos(usuario_id);

-- Add referral tracking to usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS referido_por UUID REFERENCES usuarios(id);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS referido_evento_id UUID REFERENCES eventos_palenque(id);

-- Track extra events purchased
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS eventos_extra_disponibles INTEGER DEFAULT 0;
