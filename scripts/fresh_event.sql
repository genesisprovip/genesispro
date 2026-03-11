BEGIN;

DELETE FROM eventos_palenque WHERE codigo_acceso = 'COPA26';

INSERT INTO eventos_palenque (id, organizador_id, nombre, fecha, hora_inicio, lugar, estado, codigo_acceso, aves_por_partido, costo_inscripcion, costo_por_pelea, modo)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  (SELECT id FROM usuarios WHERE email = 'admin@genesispro.vip' LIMIT 1),
  'Derby Copa de Gallos 2026',
  '2026-03-15',
  '16:00',
  'Palenque La Arena, Guadalajara',
  'en_curso',
  'COPA26',
  5,
  5000,
  2000,
  'genesispro'
);

INSERT INTO partidos_derby (id, evento_id, usuario_id, nombre, numero_partido, codigo_acceso, estado) VALUES
('10000001-0000-0000-0000-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM usuarios WHERE email = 'admin@genesispro.vip'), 'Rancho El Aguila', 1, 'AGU01', 'activo'),
('20000002-0000-0000-0000-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM usuarios WHERE email = 'admin@genesispro.vip'), 'Criadero Los Pinos', 2, 'PIN02', 'activo'),
('30000003-0000-0000-0000-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM usuarios WHERE email = 'admin@genesispro.vip'), 'Gallera El Rey', 3, 'REY03', 'activo'),
('40000004-0000-0000-0000-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM usuarios WHERE email = 'admin@genesispro.vip'), 'Rancho San Miguel', 4, 'MIG04', 'activo'),
('50000005-0000-0000-0000-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM usuarios WHERE email = 'admin@genesispro.vip'), 'Criadero La Victoria', 5, 'VIC05', 'activo'),
('60000006-0000-0000-0000-000000000006', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM usuarios WHERE email = 'admin@genesispro.vip'), 'Gallera El Dorado', 6, 'DOR06', 'activo'),
('70000007-0000-0000-0000-000000000007', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM usuarios WHERE email = 'admin@genesispro.vip'), 'Rancho El Centenario', 7, 'CEN07', 'activo'),
('80000008-0000-0000-0000-000000000008', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', (SELECT id FROM usuarios WHERE email = 'admin@genesispro.vip'), 'Criadero El Campeon', 8, 'CAM08', 'activo');

INSERT INTO aves_derby (evento_id, partido_id, numero_ave, anillo, placa, peso, estado) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 1, 'AGU-101', 'R-001', 2.15, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 2, 'AGU-102', 'R-002', 2.08, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 3, 'AGU-103', 'R-003', 2.22, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 4, 'AGU-104', 'R-004', 2.10, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '10000001-0000-0000-0000-000000000001', 5, 'AGU-105', 'R-005', 2.18, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20000002-0000-0000-0000-000000000002', 1, 'PIN-201', 'R-006', 2.12, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20000002-0000-0000-0000-000000000002', 2, 'PIN-202', 'R-007', 2.20, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20000002-0000-0000-0000-000000000002', 3, 'PIN-203', 'R-008', 2.05, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20000002-0000-0000-0000-000000000002', 4, 'PIN-204', 'R-009', 2.17, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '20000002-0000-0000-0000-000000000002', 5, 'PIN-205', 'R-010', 2.11, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '30000003-0000-0000-0000-000000000003', 1, 'REY-301', 'R-011', 2.19, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '30000003-0000-0000-0000-000000000003', 2, 'REY-302', 'R-012', 2.14, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '30000003-0000-0000-0000-000000000003', 3, 'REY-303', 'R-013', 2.23, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '30000003-0000-0000-0000-000000000003', 4, 'REY-304', 'R-014', 2.07, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '30000003-0000-0000-0000-000000000003', 5, 'REY-305', 'R-015', 2.16, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '40000004-0000-0000-0000-000000000004', 1, 'MIG-401', 'R-016', 2.13, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '40000004-0000-0000-0000-000000000004', 2, 'MIG-402', 'R-017', 2.21, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '40000004-0000-0000-0000-000000000004', 3, 'MIG-403', 'R-018', 2.09, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '40000004-0000-0000-0000-000000000004', 4, 'MIG-404', 'R-019', 2.18, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '40000004-0000-0000-0000-000000000004', 5, 'MIG-405', 'R-020', 2.06, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '50000005-0000-0000-0000-000000000005', 1, 'VIC-501', 'R-021', 2.20, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '50000005-0000-0000-0000-000000000005', 2, 'VIC-502', 'R-022', 2.11, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '50000005-0000-0000-0000-000000000005', 3, 'VIC-503', 'R-023', 2.15, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '50000005-0000-0000-0000-000000000005', 4, 'VIC-504', 'R-024', 2.24, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '50000005-0000-0000-0000-000000000005', 5, 'VIC-505', 'R-025', 2.08, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '60000006-0000-0000-0000-000000000006', 1, 'DOR-601', 'R-026', 2.16, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '60000006-0000-0000-0000-000000000006', 2, 'DOR-602', 'R-027', 2.22, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '60000006-0000-0000-0000-000000000006', 3, 'DOR-603', 'R-028', 2.07, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '60000006-0000-0000-0000-000000000006', 4, 'DOR-604', 'R-029', 2.19, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '60000006-0000-0000-0000-000000000006', 5, 'DOR-605', 'R-030', 2.13, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '70000007-0000-0000-0000-000000000007', 1, 'CEN-701', 'R-031', 2.10, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '70000007-0000-0000-0000-000000000007', 2, 'CEN-702', 'R-032', 2.21, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '70000007-0000-0000-0000-000000000007', 3, 'CEN-703', 'R-033', 2.14, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '70000007-0000-0000-0000-000000000007', 4, 'CEN-704', 'R-034', 2.23, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '70000007-0000-0000-0000-000000000007', 5, 'CEN-705', 'R-035', 2.09, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '80000008-0000-0000-0000-000000000008', 1, 'CAM-801', 'R-036', 2.17, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '80000008-0000-0000-0000-000000000008', 2, 'CAM-802', 'R-037', 2.12, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '80000008-0000-0000-0000-000000000008', 3, 'CAM-803', 'R-038', 2.25, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '80000008-0000-0000-0000-000000000008', 4, 'CAM-804', 'R-039', 2.06, 'disponible'),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '80000008-0000-0000-0000-000000000008', 5, 'CAM-805', 'R-040', 2.20, 'disponible');

COMMIT;
