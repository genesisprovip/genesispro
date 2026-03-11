BEGIN;

DELETE FROM pagos_evento WHERE evento_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM peleas WHERE evento_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM aves_derby WHERE evento_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
DELETE FROM partidos_derby WHERE evento_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

UPDATE eventos_palenque SET
  nombre = 'COPA 26 - Palenque El Rosario',
  total_peleas = 10,
  pelea_actual = 0,
  estado = 'en_curso',
  modo = 'genesispro',
  lugar = 'Palenque El Rosario, Colima',
  costo_inscripcion = 5000,
  costo_por_pelea = 2000,
  premio_campeon = 50000
WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

-- 6 Partidos
INSERT INTO partidos_derby (id, evento_id, nombre, codigo_acceso) VALUES
  ('aa000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Rancho Los Reyes', 'RLR26K'),
  ('aa000002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Gallera El Dorado', 'GED47M'),
  ('aa000003-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Criadero La Joya', 'CLJ83N'),
  ('aa000004-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Partido Hernandez', 'PHZ52R'),
  ('aa000005-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Gallistica del Valle', 'GDV19T'),
  ('aa000006-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Rancho Santa Cruz', 'RSC64W');

-- 22 Aves (3-4 per partido, varied weights 2.10-2.28kg)
INSERT INTO aves_derby (id, evento_id, partido_id, numero_ave, anillo, peso, placa, estado) VALUES
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000001-0000-0000-0000-000000000001', 1, 'RLR-01', 2.15, 'P001', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000001-0000-0000-0000-000000000001', 2, 'RLR-02', 2.22, 'P002', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000001-0000-0000-0000-000000000001', 3, 'RLR-03', 2.18, 'P003', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000001-0000-0000-0000-000000000001', 4, 'RLR-04', 2.25, 'P004', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000002-0000-0000-0000-000000000002', 1, 'GED-01', 2.20, 'P005', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000002-0000-0000-0000-000000000002', 2, 'GED-02', 2.17, 'P006', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000002-0000-0000-0000-000000000002', 3, 'GED-03', 2.24, 'P007', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000002-0000-0000-0000-000000000002', 4, 'GED-04', 2.19, 'P008', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000003-0000-0000-0000-000000000003', 1, 'CLJ-01', 2.16, 'P009', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000003-0000-0000-0000-000000000003', 2, 'CLJ-02', 2.21, 'P010', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000003-0000-0000-0000-000000000003', 3, 'CLJ-03', 2.23, 'P011', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000004-0000-0000-0000-000000000004', 1, 'PHZ-01', 2.18, 'P012', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000004-0000-0000-0000-000000000004', 2, 'PHZ-02', 2.14, 'P013', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000004-0000-0000-0000-000000000004', 3, 'PHZ-03', 2.26, 'P014', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000005-0000-0000-0000-000000000005', 1, 'GDV-01', 2.20, 'P015', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000005-0000-0000-0000-000000000005', 2, 'GDV-02', 2.23, 'P016', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000005-0000-0000-0000-000000000005', 3, 'GDV-03', 2.17, 'P017', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000005-0000-0000-0000-000000000005', 4, 'GDV-04', 2.21, 'P018', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000006-0000-0000-0000-000000000006', 1, 'RSC-01', 2.19, 'P019', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000006-0000-0000-0000-000000000006', 2, 'RSC-02', 2.22, 'P020', 'disponible'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000006-0000-0000-0000-000000000006', 3, 'RSC-03', 2.16, 'P021', 'disponible');

-- 10 Peleas with matchups (each partido fights ~3 times)
INSERT INTO peleas (id, evento_id, numero_pelea, estado, partido_derby_rojo_id, partido_derby_verde_id, anillo_rojo, anillo_verde, peso_rojo, peso_verde, placa_rojo, placa_verde) VALUES
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1,  'programada', 'aa000001-0000-0000-0000-000000000001', 'aa000002-0000-0000-0000-000000000002', 'RLR-01', 'GED-01', 2.15, 2.20, 'P001', 'P005'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2,  'programada', 'aa000003-0000-0000-0000-000000000003', 'aa000004-0000-0000-0000-000000000004', 'CLJ-01', 'PHZ-01', 2.16, 2.18, 'P009', 'P012'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 3,  'programada', 'aa000005-0000-0000-0000-000000000005', 'aa000006-0000-0000-0000-000000000006', 'GDV-01', 'RSC-01', 2.20, 2.19, 'P015', 'P019'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 4,  'programada', 'aa000001-0000-0000-0000-000000000001', 'aa000003-0000-0000-0000-000000000003', 'RLR-02', 'CLJ-02', 2.22, 2.21, 'P002', 'P010'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 5,  'programada', 'aa000002-0000-0000-0000-000000000002', 'aa000005-0000-0000-0000-000000000005', 'GED-02', 'GDV-02', 2.17, 2.23, 'P006', 'P016'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 6,  'programada', 'aa000004-0000-0000-0000-000000000004', 'aa000006-0000-0000-0000-000000000006', 'PHZ-02', 'RSC-02', 2.14, 2.22, 'P013', 'P020'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 7,  'programada', 'aa000001-0000-0000-0000-000000000001', 'aa000005-0000-0000-0000-000000000005', 'RLR-03', 'GDV-03', 2.18, 2.17, 'P003', 'P017'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 8,  'programada', 'aa000002-0000-0000-0000-000000000002', 'aa000006-0000-0000-0000-000000000006', 'GED-03', 'RSC-03', 2.24, 2.16, 'P007', 'P021'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 9,  'programada', 'aa000003-0000-0000-0000-000000000003', 'aa000005-0000-0000-0000-000000000005', 'CLJ-03', 'GDV-04', 2.23, 2.21, 'P011', 'P018'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 10, 'programada', 'aa000004-0000-0000-0000-000000000004', 'aa000001-0000-0000-0000-000000000001', 'PHZ-03', 'RLR-04', 2.26, 2.25, 'P014', 'P004');

-- Inscriptions ($5,000 per partido = $30,000 total)
INSERT INTO pagos_evento (id, evento_id, partido_id, partido_nombre, concepto, tipo, monto, estado) VALUES
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000001-0000-0000-0000-000000000001', 'Rancho Los Reyes', 'inscripcion', 'ingreso', 5000, 'pagado'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000002-0000-0000-0000-000000000002', 'Gallera El Dorado', 'inscripcion', 'ingreso', 5000, 'pagado'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000003-0000-0000-0000-000000000003', 'Criadero La Joya', 'inscripcion', 'ingreso', 5000, 'pagado'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000004-0000-0000-0000-000000000004', 'Partido Hernandez', 'inscripcion', 'ingreso', 5000, 'pagado'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000005-0000-0000-0000-000000000005', 'Gallistica del Valle', 'inscripcion', 'ingreso', 5000, 'pagado'),
  (gen_random_uuid(), 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aa000006-0000-0000-0000-000000000006', 'Rancho Santa Cruz', 'inscripcion', 'ingreso', 5000, 'pagado');

COMMIT;
