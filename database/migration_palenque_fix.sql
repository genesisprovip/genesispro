-- ============================================
-- GENESISPRO - Fix: Rename eventos → eventos_palenque
-- La tabla "eventos" ya existe para el calendario
-- ============================================

-- Drop the incorrectly linked FKs and tables that reference old "eventos"
-- (they were just created and are empty)
ALTER TABLE apuestas DROP CONSTRAINT IF EXISTS apuestas_evento_id_fkey;
ALTER TABLE peleas DROP CONSTRAINT IF EXISTS peleas_evento_id_fkey;
ALTER TABLE participantes_evento DROP CONSTRAINT IF EXISTS participantes_evento_evento_id_fkey;

DROP TABLE IF EXISTS notificaciones_pelea CASCADE;
DROP TABLE IF EXISTS apuestas CASCADE;
DROP TABLE IF EXISTS peleas CASCADE;
DROP TABLE IF EXISTS participantes_evento CASCADE;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS trg_actualizar_apuestas ON peleas;
DROP TRIGGER IF EXISTS trg_total_peleas ON peleas;
DROP FUNCTION IF EXISTS actualizar_apuestas_pelea();
DROP FUNCTION IF EXISTS actualizar_total_peleas();
DROP FUNCTION IF EXISTS generar_codigo_acceso();

-- ============================================
-- RECREATE WITH CORRECT NAME: eventos_palenque
-- ============================================

CREATE TABLE IF NOT EXISTS eventos_palenque (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organizador_id UUID NOT NULL REFERENCES usuarios(id),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  fecha DATE NOT NULL,
  hora_inicio TIME,
  lugar VARCHAR(300),
  direccion TEXT,
  tipo_derby VARCHAR(50) DEFAULT 'regular',
  reglas TEXT,
  estado VARCHAR(20) DEFAULT 'programado' CHECK (estado IN ('programado','en_curso','finalizado','cancelado','pausado')),
  pelea_actual INTEGER DEFAULT 0,
  total_peleas INTEGER DEFAULT 0,
  codigo_acceso VARCHAR(8) UNIQUE,
  es_publico BOOLEAN DEFAULT false,
  entrada_costo DECIMAL(10,2),
  imagen_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS participantes_evento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id UUID NOT NULL REFERENCES eventos_palenque(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  rol VARCHAR(20) DEFAULT 'partido' CHECK (rol IN ('organizador','juez','partido','espectador')),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmado','rechazado')),
  numero_partido INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evento_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS peleas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id UUID NOT NULL REFERENCES eventos_palenque(id) ON DELETE CASCADE,
  numero_pelea INTEGER NOT NULL,
  partido_rojo_id UUID REFERENCES usuarios(id),
  ave_roja_id UUID REFERENCES aves(id),
  anillo_rojo VARCHAR(50),
  peso_rojo DECIMAL(5,2),
  placa_rojo VARCHAR(50),
  partido_azul_id UUID REFERENCES usuarios(id),
  ave_azul_id UUID REFERENCES aves(id),
  anillo_azul VARCHAR(50),
  peso_azul DECIMAL(5,2),
  placa_azul VARCHAR(50),
  estado VARCHAR(20) DEFAULT 'programada' CHECK (estado IN ('programada','en_curso','finalizada','cancelada','tabla')),
  resultado VARCHAR(20) CHECK (resultado IN ('rojo','azul','empate','tabla','cancelada')),
  duracion_minutos INTEGER,
  tipo_victoria VARCHAR(50),
  notas TEXT,
  hora_inicio TIMESTAMPTZ,
  hora_fin TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evento_id, numero_pelea)
);

CREATE TABLE IF NOT EXISTS apuestas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pelea_id UUID NOT NULL REFERENCES peleas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES eventos_palenque(id) ON DELETE CASCADE,
  registrado_por UUID NOT NULL REFERENCES usuarios(id),
  apostador_nombre VARCHAR(150),
  apostador_id UUID REFERENCES usuarios(id),
  contraparte_nombre VARCHAR(150),
  contraparte_id UUID REFERENCES usuarios(id),
  a_favor_de VARCHAR(10) NOT NULL CHECK (a_favor_de IN ('rojo','azul')),
  monto DECIMAL(10,2) NOT NULL,
  momio VARCHAR(20),
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','ganada','perdida','cancelada','cobrada')),
  notas VARCHAR(300),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificaciones_pelea (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pelea_id UUID NOT NULL REFERENCES peleas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('5_antes','3_antes','1_antes','tu_turno','resultado')),
  enviada_at TIMESTAMPTZ DEFAULT NOW(),
  leida BOOLEAN DEFAULT false,
  UNIQUE(pelea_id, usuario_id, tipo)
);

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token VARCHAR(200) NOT NULL,
  plataforma VARCHAR(10) DEFAULT 'expo',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, token)
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_ep_organizador ON eventos_palenque(organizador_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ep_fecha ON eventos_palenque(fecha) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ep_estado ON eventos_palenque(estado) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ep_codigo ON eventos_palenque(codigo_acceso) WHERE codigo_acceso IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_part_evento ON participantes_evento(evento_id);
CREATE INDEX IF NOT EXISTS idx_part_usuario ON participantes_evento(usuario_id);
CREATE INDEX IF NOT EXISTS idx_peleas_evento ON peleas(evento_id);
CREATE INDEX IF NOT EXISTS idx_peleas_projo ON peleas(partido_rojo_id);
CREATE INDEX IF NOT EXISTS idx_peleas_pazul ON peleas(partido_azul_id);
CREATE INDEX IF NOT EXISTS idx_apuestas_pelea ON apuestas(pelea_id);
CREATE INDEX IF NOT EXISTS idx_apuestas_evento ON apuestas(evento_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_usr ON push_tokens(usuario_id) WHERE activo = true;
CREATE INDEX IF NOT EXISTS idx_notif_pelea_usr ON notificaciones_pelea(usuario_id);

-- FUNCIONES Y TRIGGERS

CREATE OR REPLACE FUNCTION generar_codigo_acceso()
RETURNS VARCHAR(8) AS $$
DECLARE
  codigo VARCHAR(8);
  existe BOOLEAN;
BEGIN
  LOOP
    codigo := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    SELECT EXISTS(SELECT 1 FROM eventos_palenque WHERE codigo_acceso = codigo) INTO existe;
    IF NOT existe THEN RETURN codigo; END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION actualizar_apuestas_pelea()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'finalizada' AND NEW.resultado IS NOT NULL THEN
    UPDATE apuestas SET estado = 'ganada', updated_at = NOW()
    WHERE pelea_id = NEW.id AND a_favor_de = NEW.resultado AND estado = 'pendiente';
    UPDATE apuestas SET estado = 'perdida', updated_at = NOW()
    WHERE pelea_id = NEW.id AND a_favor_de != NEW.resultado AND estado = 'pendiente';
  END IF;
  IF NEW.estado = 'cancelada' OR NEW.resultado = 'tabla' THEN
    UPDATE apuestas SET estado = 'cancelada', updated_at = NOW()
    WHERE pelea_id = NEW.id AND estado = 'pendiente';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_actualizar_apuestas
  AFTER UPDATE ON peleas
  FOR EACH ROW
  WHEN (OLD.estado IS DISTINCT FROM NEW.estado OR OLD.resultado IS DISTINCT FROM NEW.resultado)
  EXECUTE FUNCTION actualizar_apuestas_pelea();

CREATE OR REPLACE FUNCTION actualizar_total_peleas()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE eventos_palenque SET
    total_peleas = (SELECT COUNT(*) FROM peleas WHERE evento_id = COALESCE(NEW.evento_id, OLD.evento_id)),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.evento_id, OLD.evento_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_total_peleas
  AFTER INSERT OR DELETE ON peleas
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_total_peleas();
