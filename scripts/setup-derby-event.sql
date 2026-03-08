-- Clean up any existing data
DELETE FROM eventos_palenque WHERE nombre LIKE '%Copa de Gallos%' OR nombre LIKE '%Feria de Primavera%';

DO $$
DECLARE
  v_evento_id uuid := uuid_generate_v4();
  v_user_id uuid := 'ea92279a-86b1-4c56-abc6-aa8716d0b8fe';
  v_ronda_id uuid := uuid_generate_v4();
  v_partido_ids uuid[];
  v_ave_roja_id uuid;
  v_ave_verde_id uuid;
  v_nombres text[] := ARRAY[
    'Rancho El Aguila','Criadero Los Pinos','Gallera El Rey','Rancho San Miguel','Criadero La Victoria',
    'Gallera El Dorado','Rancho El Centenario','Criadero El Campeon','Gallera La Herradura','Rancho Los Laureles',
    'Criadero El Halcon','Gallera La Corona','Rancho El Gavilan','Criadero Las Palmas','Gallera El Guerrero',
    'Rancho Santa Fe','Criadero El Titan','Gallera Los Compadres','Rancho El Potrero','Criadero La Estrella',
    'Gallera El Palenque','Rancho La Esperanza','Criadero El Condor','Gallera El Coliseo','Rancho El Roble',
    'Criadero San Juan','Gallera La Fortaleza','Rancho El Mirador','Criadero El Fenix','Gallera El Triunfo'
  ];
  v_prefijos text[] := ARRAY[
    'AG','LP','RE','SM','VT','DR','CT','CP','HR','LL',
    'HL','CR','GV','PM','GR','SF','TT','LC','PT','ES',
    'PL','EP','CD','CL','RB','SJ','FT','MR','FX','TR'
  ];
  v_colores text[] := ARRAY['Giro','Colorado','Cenizo','Pinto','Negro','Blanco'];
  v_pid uuid;
  i integer;
  j integer;
BEGIN
  -- Create event
  INSERT INTO eventos_palenque (id, organizador_id, nombre, fecha, lugar, estado, tipo_derby, codigo_acceso, aves_por_partido)
  VALUES (v_evento_id, v_user_id, 'Derby Copa de Gallos 2026', '2026-03-08', 'Arena Principal - Guadalajara', 'en_curso', 'Derby', 'COPA26', 5);

  -- Create 30 partidos
  FOR i IN 1..30 LOOP
    v_pid := uuid_generate_v4();
    v_partido_ids := array_append(v_partido_ids, v_pid);
    INSERT INTO partidos_derby (id, evento_id, nombre, numero_partido)
    VALUES (v_pid, v_evento_id, v_nombres[i], i);

    -- 5 aves per partido
    FOR j IN 1..5 LOOP
      INSERT INTO aves_derby (evento_id, partido_id, numero_ave, anillo, peso, color)
      VALUES (
        v_evento_id,
        v_pid,
        j,
        v_prefijos[i] || '-' || LPAD(j::text, 3, '0'),
        2100 + (random() * 250)::int,
        v_colores[1 + (random() * 5)::int]
      );
    END LOOP;
  END LOOP;

  -- Create Ronda 1
  INSERT INTO rondas_derby (id, evento_id, numero_ronda, estado)
  VALUES (v_ronda_id, v_evento_id, 1, 'en_curso');

  -- Create Pelea 1: first ave of partido 1 (ROJO) vs first ave of partido 2 (VERDE)
  SELECT id INTO v_ave_roja_id FROM aves_derby WHERE partido_id = v_partido_ids[1] AND numero_ave = 1;
  SELECT id INTO v_ave_verde_id FROM aves_derby WHERE partido_id = v_partido_ids[2] AND numero_ave = 1;

  INSERT INTO peleas (evento_id, numero_pelea, ronda_id, ave_roja_derby_id, anillo_rojo, peso_rojo, ave_verde_derby_id, anillo_verde, peso_verde, estado)
  VALUES (
    v_evento_id, 1, v_ronda_id,
    v_ave_roja_id,
    (SELECT anillo FROM aves_derby WHERE id = v_ave_roja_id),
    (SELECT peso::numeric / 1000.0 FROM aves_derby WHERE id = v_ave_roja_id),
    v_ave_verde_id,
    (SELECT anillo FROM aves_derby WHERE id = v_ave_verde_id),
    (SELECT peso::numeric / 1000.0 FROM aves_derby WHERE id = v_ave_verde_id),
    'programada'
  );

  RAISE NOTICE 'Evento creado: %, codigo: COPA26', v_evento_id;
  RAISE NOTICE 'Partidos: 30, Aves: 150, Ronda 1 en_curso, Pelea 1 programada';
END $$;

-- Verify
SELECT 'Evento' as tipo, count(*) as total FROM eventos_palenque WHERE codigo_acceso = 'COPA26'
UNION ALL
SELECT 'Partidos', count(*) FROM partidos_derby pd JOIN eventos_palenque ep ON pd.evento_id = ep.id WHERE ep.codigo_acceso = 'COPA26'
UNION ALL
SELECT 'Aves', count(*) FROM aves_derby ad JOIN eventos_palenque ep ON ad.evento_id = ep.id WHERE ep.codigo_acceso = 'COPA26'
UNION ALL
SELECT 'Rondas', count(*) FROM rondas_derby rd JOIN eventos_palenque ep ON rd.evento_id = ep.id WHERE ep.codigo_acceso = 'COPA26'
UNION ALL
SELECT 'Peleas', count(*) FROM peleas p JOIN eventos_palenque ep ON p.evento_id = ep.id WHERE ep.codigo_acceso = 'COPA26';
