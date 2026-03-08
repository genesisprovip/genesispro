-- Create partidos for event 3de0950f-7b99-439c-a9d6-ee8905ccd987
DO $$
DECLARE
  eid UUID := '3de0950f-7b99-439c-a9d6-ee8905ccd987';
  p1 UUID; p2 UUID; p3 UUID; p4 UUID; p5 UUID; p6 UUID;
BEGIN
  INSERT INTO partidos_derby (evento_id, nombre, numero_partido, codigo_acceso)
  VALUES (eid, 'Rancho El Caporal', 1, 'CAP4X7') RETURNING id INTO p1;

  INSERT INTO partidos_derby (evento_id, nombre, numero_partido, codigo_acceso)
  VALUES (eid, 'Gallos de Oro', 2, 'ORO9K2') RETURNING id INTO p2;

  INSERT INTO partidos_derby (evento_id, nombre, numero_partido, codigo_acceso)
  VALUES (eid, 'Criadero La Joya', 3, 'JOY5M8') RETURNING id INTO p3;

  INSERT INTO partidos_derby (evento_id, nombre, numero_partido, codigo_acceso)
  VALUES (eid, 'El Gavilan', 4, 'GAV3N6') RETURNING id INTO p4;

  INSERT INTO partidos_derby (evento_id, nombre, numero_partido, codigo_acceso)
  VALUES (eid, 'Gallera El Rey', 5, 'REY7P4') RETURNING id INTO p5;

  INSERT INTO partidos_derby (evento_id, nombre, numero_partido, codigo_acceso)
  VALUES (eid, 'Los Compadres', 6, 'CMP2W9') RETURNING id INTO p6;

  -- Aves for Rancho El Caporal
  INSERT INTO aves_derby (evento_id, partido_id, numero_ave, peso, anillo, color) VALUES
    (eid, p1, 1, 2050, 'CAP-101', 'Giro Claro'),
    (eid, p1, 2, 2180, 'CAP-205', 'Colorado'),
    (eid, p1, 3, 2320, 'CAP-312', 'Cenizo');

  -- Aves for Gallos de Oro
  INSERT INTO aves_derby (evento_id, partido_id, numero_ave, peso, anillo, color) VALUES
    (eid, p2, 1, 2070, 'ORO-44', 'Pinto'),
    (eid, p2, 2, 2200, 'ORO-67', 'Blanco'),
    (eid, p2, 3, 2290, 'ORO-88', 'Giro Negro');

  -- Aves for Criadero La Joya
  INSERT INTO aves_derby (evento_id, partido_id, numero_ave, peso, anillo, color) VALUES
    (eid, p3, 1, 2060, 'JOY-15', 'Melado'),
    (eid, p3, 2, 2150, 'JOY-23', 'Pinto Claro'),
    (eid, p3, 3, 2350, 'JOY-37', 'Colorado');

  -- Aves for El Gavilan
  INSERT INTO aves_derby (evento_id, partido_id, numero_ave, peso, anillo, color) VALUES
    (eid, p4, 1, 2080, 'GAV-09', 'Negro'),
    (eid, p4, 2, 2190, 'GAV-21', 'Cenizo Oscuro'),
    (eid, p4, 3, 2300, 'GAV-33', 'Giro');

  -- Aves for Gallera El Rey
  INSERT INTO aves_derby (evento_id, partido_id, numero_ave, peso, anillo, color) VALUES
    (eid, p5, 1, 2040, 'REY-55', 'Blanco Sucio'),
    (eid, p5, 2, 2170, 'REY-72', 'Pinto Negro'),
    (eid, p5, 3, 2280, 'REY-91', 'Colorado Claro');

  -- Aves for Los Compadres
  INSERT INTO aves_derby (evento_id, partido_id, numero_ave, peso, anillo, color) VALUES
    (eid, p6, 1, 2090, 'CMP-18', 'Giro Colorado'),
    (eid, p6, 2, 2160, 'CMP-26', 'Cenizo Claro'),
    (eid, p6, 3, 2310, 'CMP-41', 'Negro Dorado');

  RAISE NOTICE 'Created 6 partidos and 18 aves';
END $$;
