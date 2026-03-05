-- ============================================
-- GENESISPRO - Fix: azul → verde (México)
-- En palenques mexicanos: Partido Rojo vs Partido Verde
-- ============================================

-- 1. Renombrar columnas en peleas
ALTER TABLE peleas RENAME COLUMN partido_azul_id TO partido_verde_id;
ALTER TABLE peleas RENAME COLUMN ave_azul_id TO ave_verde_id;
ALTER TABLE peleas RENAME COLUMN anillo_azul TO anillo_verde;
ALTER TABLE peleas RENAME COLUMN peso_azul TO peso_verde;
ALTER TABLE peleas RENAME COLUMN placa_azul TO placa_verde;

-- 2. Actualizar CHECK constraints en peleas
ALTER TABLE peleas DROP CONSTRAINT IF EXISTS peleas_resultado_check;
ALTER TABLE peleas ADD CONSTRAINT peleas_resultado_check
  CHECK (resultado IN ('rojo','verde','empate','tabla','cancelada'));

-- 3. Actualizar CHECK constraint en apuestas
ALTER TABLE apuestas DROP CONSTRAINT IF EXISTS apuestas_a_favor_de_check;
ALTER TABLE apuestas ADD CONSTRAINT apuestas_a_favor_de_check
  CHECK (a_favor_de IN ('rojo','verde'));

-- 4. Actualizar datos existentes (si hay)
UPDATE peleas SET resultado = 'verde' WHERE resultado = 'azul';
UPDATE apuestas SET a_favor_de = 'verde' WHERE a_favor_de = 'azul';

-- 5. Recrear trigger function con verde
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

-- 6. Agregar campo formato_derby a eventos_palenque
ALTER TABLE eventos_palenque ADD COLUMN IF NOT EXISTS formato_derby VARCHAR(20) DEFAULT 'normal'
  CHECK (formato_derby IN ('normal','pares_nones'));
