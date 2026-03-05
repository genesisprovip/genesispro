-- ============================================
-- GENESISPRO - Sistema Derby: Partidos, Aves, Rondas, Sorteo
-- ============================================

-- Partidos registrados en un evento/derby
CREATE TABLE IF NOT EXISTS partidos_derby (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id UUID NOT NULL REFERENCES eventos_palenque(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id),
  nombre VARCHAR(200) NOT NULL,
  numero_partido INTEGER,
  puntos INTEGER DEFAULT 0,
  es_comodin BOOLEAN DEFAULT false,
  estado VARCHAR(20) DEFAULT 'activo' CHECK (estado IN ('activo','retirado','eliminado')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evento_id, numero_partido)
);

-- Aves registradas por partido para el derby
CREATE TABLE IF NOT EXISTS aves_derby (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id UUID NOT NULL REFERENCES eventos_palenque(id) ON DELETE CASCADE,
  partido_id UUID NOT NULL REFERENCES partidos_derby(id) ON DELETE CASCADE,
  numero_ave INTEGER NOT NULL,
  anillo VARCHAR(50),
  peso INTEGER NOT NULL, -- peso en gramos
  placa VARCHAR(50),
  color VARCHAR(100),
  navaja_derecha BOOLEAN DEFAULT false,
  estado VARCHAR(20) DEFAULT 'disponible' CHECK (estado IN ('disponible','peleada','retirada')),
  ronda_asignada INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rondas del derby
CREATE TABLE IF NOT EXISTS rondas_derby (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id UUID NOT NULL REFERENCES eventos_palenque(id) ON DELETE CASCADE,
  numero_ronda INTEGER NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_curso','finalizada')),
  ganadores_vs_perdedores BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(evento_id, numero_ronda)
);

-- Agregar referencia de ronda en peleas
ALTER TABLE peleas ADD COLUMN IF NOT EXISTS ronda_id UUID REFERENCES rondas_derby(id);
ALTER TABLE peleas ADD COLUMN IF NOT EXISTS ave_roja_derby_id UUID REFERENCES aves_derby(id);
ALTER TABLE peleas ADD COLUMN IF NOT EXISTS ave_verde_derby_id UUID REFERENCES aves_derby(id);
ALTER TABLE peleas ADD COLUMN IF NOT EXISTS navaja_derecha_a VARCHAR(10) CHECK (navaja_derecha_a IN ('rojo','verde'));
ALTER TABLE peleas ADD COLUMN IF NOT EXISTS es_comodin BOOLEAN DEFAULT false;

-- Indices
CREATE INDEX IF NOT EXISTS idx_partidos_derby_evento ON partidos_derby(evento_id);
CREATE INDEX IF NOT EXISTS idx_aves_derby_partido ON aves_derby(partido_id);
CREATE INDEX IF NOT EXISTS idx_aves_derby_evento ON aves_derby(evento_id);
CREATE INDEX IF NOT EXISTS idx_rondas_derby_evento ON rondas_derby(evento_id);

-- Funcion para actualizar puntos del partido despues de cada pelea
CREATE OR REPLACE FUNCTION actualizar_puntos_derby()
RETURNS TRIGGER AS $$
DECLARE
  v_rojo_partido_id UUID;
  v_verde_partido_id UUID;
BEGIN
  IF NEW.estado = 'finalizada' AND NEW.resultado IS NOT NULL
     AND NEW.ave_roja_derby_id IS NOT NULL AND NEW.ave_verde_derby_id IS NOT NULL THEN

    -- Obtener partido_id de cada ave
    SELECT partido_id INTO v_rojo_partido_id FROM aves_derby WHERE id = NEW.ave_roja_derby_id;
    SELECT partido_id INTO v_verde_partido_id FROM aves_derby WHERE id = NEW.ave_verde_derby_id;

    IF NEW.resultado = 'rojo' THEN
      UPDATE partidos_derby SET puntos = puntos + 2, updated_at = NOW() WHERE id = v_rojo_partido_id;
    ELSIF NEW.resultado = 'verde' THEN
      UPDATE partidos_derby SET puntos = puntos + 2, updated_at = NOW() WHERE id = v_verde_partido_id;
    ELSIF NEW.resultado = 'tabla' OR NEW.resultado = 'empate' THEN
      UPDATE partidos_derby SET puntos = puntos + 1, updated_at = NOW() WHERE id = v_rojo_partido_id;
      UPDATE partidos_derby SET puntos = puntos + 1, updated_at = NOW() WHERE id = v_verde_partido_id;
    END IF;

    -- Marcar aves como peleadas
    UPDATE aves_derby SET estado = 'peleada', updated_at = NOW() WHERE id = NEW.ave_roja_derby_id;
    UPDATE aves_derby SET estado = 'peleada', updated_at = NOW() WHERE id = NEW.ave_verde_derby_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_puntos_derby
  AFTER UPDATE ON peleas
  FOR EACH ROW
  WHEN (OLD.estado IS DISTINCT FROM NEW.estado AND NEW.estado = 'finalizada')
  EXECUTE FUNCTION actualizar_puntos_derby();
