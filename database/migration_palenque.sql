-- ============================================
-- GENESISPRO - Migration: Módulo Palenque
-- Sistema de gestión de eventos, cotejo en vivo,
-- y registro logístico de apuestas
-- ============================================

-- 1. EVENTOS (Derby / Torneo)
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizador_id UUID NOT NULL REFERENCES usuarios(id),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  hora_inicio TIME,
  lugar VARCHAR(300),
  direccion TEXT,
  tipo_derby VARCHAR(50) DEFAULT 'regular', -- regular, torneo, amistoso, clasificatorio
  reglas TEXT,
  estado VARCHAR(20) DEFAULT 'programado' CHECK (estado IN ('programado','en_curso','finalizado','cancelado','pausado')),
  pelea_actual INTEGER DEFAULT 0,
  total_peleas INTEGER DEFAULT 0,
  codigo_acceso VARCHAR(8) UNIQUE, -- Código para que partidos se unan
  es_publico BOOLEAN DEFAULT false,
  entrada_costo DECIMAL(10,2),
  imagen_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 2. PARTICIPANTES DEL EVENTO
CREATE TABLE IF NOT EXISTS participantes_evento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  rol VARCHAR(20) DEFAULT 'partido' CHECK (rol IN ('organizador','juez','partido','espectador')),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmado','rechazado')),
  numero_partido INTEGER, -- Número asignado al partido
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evento_id, usuario_id)
);

-- 3. PELEAS (Cotejo)
CREATE TABLE IF NOT EXISTS peleas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  numero_pelea INTEGER NOT NULL,

  -- Esquina Roja
  partido_rojo_id UUID REFERENCES usuarios(id),
  ave_roja_id UUID REFERENCES aves(id),
  anillo_rojo VARCHAR(50),
  peso_rojo DECIMAL(5,2),
  placa_rojo VARCHAR(50),

  -- Esquina Azul
  partido_azul_id UUID REFERENCES usuarios(id),
  ave_azul_id UUID REFERENCES aves(id),
  anillo_azul VARCHAR(50),
  peso_azul DECIMAL(5,2),
  placa_azul VARCHAR(50),

  -- Estado y resultado
  estado VARCHAR(20) DEFAULT 'programada' CHECK (estado IN ('programada','en_curso','finalizada','cancelada','tabla')),
  resultado VARCHAR(20) CHECK (resultado IN ('rojo','azul','empate','tabla','cancelada')),
  duracion_minutos INTEGER,
  tipo_victoria VARCHAR(50), -- KO, puntos, muerte, huida, tiempo
  notas TEXT,

  hora_inicio TIMESTAMPTZ,
  hora_fin TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(evento_id, numero_pelea)
);

-- 4. APUESTAS (Solo registro logístico - SIN manejo de dinero)
CREATE TABLE IF NOT EXISTS apuestas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pelea_id UUID NOT NULL REFERENCES peleas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  registrado_por UUID NOT NULL REFERENCES usuarios(id), -- Quien registra la apuesta
  apostador_nombre VARCHAR(150), -- Puede ser alguien sin cuenta
  apostador_id UUID REFERENCES usuarios(id), -- Si tiene cuenta
  contraparte_nombre VARCHAR(150),
  contraparte_id UUID REFERENCES usuarios(id),
  a_favor_de VARCHAR(10) NOT NULL CHECK (a_favor_de IN ('rojo','azul')),
  monto DECIMAL(10,2) NOT NULL,
  momio VARCHAR(20), -- ej: "2 a 1", "parejo"
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','ganada','perdida','cancelada','cobrada')),
  notas VARCHAR(300),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NOTIFICACIONES DE PELEA (tracking de avisos enviados)
CREATE TABLE IF NOT EXISTS notificaciones_pelea (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pelea_id UUID NOT NULL REFERENCES peleas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('5_antes','3_antes','1_antes','tu_turno','resultado')),
  enviada_at TIMESTAMPTZ DEFAULT NOW(),
  leida BOOLEAN DEFAULT false,
  UNIQUE(pelea_id, usuario_id, tipo)
);

-- 6. PUSH TOKENS (para notificaciones Expo)
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token VARCHAR(200) NOT NULL,
  plataforma VARCHAR(10) DEFAULT 'expo', -- expo, fcm, apns
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, token)
);

-- ═══════════════════════════════════
-- ÍNDICES
-- ═══════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_eventos_organizador ON eventos(organizador_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON eventos(fecha) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_eventos_estado ON eventos(estado) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_eventos_codigo ON eventos(codigo_acceso) WHERE codigo_acceso IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_participantes_evento ON participantes_evento(evento_id);
CREATE INDEX IF NOT EXISTS idx_participantes_usuario ON participantes_evento(usuario_id);

CREATE INDEX IF NOT EXISTS idx_peleas_evento ON peleas(evento_id);
CREATE INDEX IF NOT EXISTS idx_peleas_partido_rojo ON peleas(partido_rojo_id);
CREATE INDEX IF NOT EXISTS idx_peleas_partido_azul ON peleas(partido_azul_id);
CREATE INDEX IF NOT EXISTS idx_peleas_estado ON peleas(estado);

CREATE INDEX IF NOT EXISTS idx_apuestas_pelea ON apuestas(pelea_id);
CREATE INDEX IF NOT EXISTS idx_apuestas_evento ON apuestas(evento_id);
CREATE INDEX IF NOT EXISTS idx_apuestas_apostador ON apuestas(apostador_id) WHERE apostador_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_push_tokens_usuario ON push_tokens(usuario_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_notif_pelea_usuario ON notificaciones_pelea(usuario_id);

-- ═══════════════════════════════════
-- FUNCIÓN: Generar código de acceso único
-- ═══════════════════════════════════

CREATE OR REPLACE FUNCTION generar_codigo_acceso()
RETURNS VARCHAR(8) AS $$
DECLARE
  codigo VARCHAR(8);
  existe BOOLEAN;
BEGIN
  LOOP
    codigo := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM eventos WHERE codigo_acceso = codigo) INTO existe;
    IF NOT existe THEN
      RETURN codigo;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════
-- FUNCIÓN: Actualizar apuestas al finalizar pelea
-- ═══════════════════════════════════

CREATE OR REPLACE FUNCTION actualizar_apuestas_pelea()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo cuando la pelea se marca como finalizada
  IF NEW.estado = 'finalizada' AND NEW.resultado IS NOT NULL THEN
    -- Marcar ganadoras
    UPDATE apuestas SET
      estado = 'ganada',
      updated_at = NOW()
    WHERE pelea_id = NEW.id
      AND a_favor_de = NEW.resultado
      AND estado = 'pendiente';

    -- Marcar perdedoras
    UPDATE apuestas SET
      estado = 'perdida',
      updated_at = NOW()
    WHERE pelea_id = NEW.id
      AND a_favor_de != NEW.resultado
      AND estado = 'pendiente';
  END IF;

  -- Si se cancela la pelea, cancelar apuestas
  IF NEW.estado = 'cancelada' OR NEW.resultado = 'tabla' THEN
    UPDATE apuestas SET
      estado = 'cancelada',
      updated_at = NOW()
    WHERE pelea_id = NEW.id
      AND estado = 'pendiente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_actualizar_apuestas
  AFTER UPDATE ON peleas
  FOR EACH ROW
  WHEN (OLD.estado IS DISTINCT FROM NEW.estado OR OLD.resultado IS DISTINCT FROM NEW.resultado)
  EXECUTE FUNCTION actualizar_apuestas_pelea();

-- ═══════════════════════════════════
-- FUNCIÓN: Auto-actualizar total_peleas en evento
-- ═══════════════════════════════════

CREATE OR REPLACE FUNCTION actualizar_total_peleas()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE eventos SET
    total_peleas = (SELECT COUNT(*) FROM peleas WHERE evento_id = COALESCE(NEW.evento_id, OLD.evento_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.evento_id, OLD.evento_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_total_peleas
  AFTER INSERT OR DELETE ON peleas
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_total_peleas();
