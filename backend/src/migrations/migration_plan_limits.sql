-- Migration: Update plan limits to match pricing tiers
-- basico (gratis): 20 aves, 1 foto/ave, no salud/alimentacion/formulas/finanzas/observaciones
-- pro ($99): 100 aves, 5 fotos/ave, full access
-- premium ($199): unlimited aves, unlimited fotos, full access + pedigree PDF

-- Ensure planes table has correct limits
UPDATE planes SET
  max_aves = 20,
  max_fotos_por_ave = 1,
  profundidad_genealogia = 2,
  analytics_avanzado = false,
  multi_usuario = false,
  max_colaboradores = 0,
  exportacion = false,
  api_access = false,
  marketplace_sin_comision = false,
  soporte_prioritario = false
WHERE nombre = 'basico';

UPDATE planes SET
  max_aves = 100,
  max_fotos_por_ave = 5,
  profundidad_genealogia = 5,
  analytics_avanzado = true,
  multi_usuario = false,
  max_colaboradores = 0,
  exportacion = true,
  api_access = false,
  marketplace_sin_comision = false,
  soporte_prioritario = false
WHERE nombre = 'pro';

UPDATE planes SET
  max_aves = NULL,
  max_fotos_por_ave = NULL,
  profundidad_genealogia = 10,
  analytics_avanzado = true,
  multi_usuario = true,
  max_colaboradores = 5,
  exportacion = true,
  api_access = true,
  marketplace_sin_comision = true,
  soporte_prioritario = true
WHERE nombre = 'premium';

-- Insert plans if they don't exist yet
INSERT INTO planes (nombre, max_aves, max_fotos_por_ave, profundidad_genealogia, analytics_avanzado, multi_usuario, max_colaboradores, exportacion, api_access, marketplace_sin_comision, soporte_prioritario)
SELECT 'basico', 20, 1, 2, false, false, 0, false, false, false, false
WHERE NOT EXISTS (SELECT 1 FROM planes WHERE nombre = 'basico');

INSERT INTO planes (nombre, max_aves, max_fotos_por_ave, profundidad_genealogia, analytics_avanzado, multi_usuario, max_colaboradores, exportacion, api_access, marketplace_sin_comision, soporte_prioritario)
SELECT 'pro', 100, 5, 5, true, false, 0, true, false, false, false
WHERE NOT EXISTS (SELECT 1 FROM planes WHERE nombre = 'pro');

INSERT INTO planes (nombre, max_aves, max_fotos_por_ave, profundidad_genealogia, analytics_avanzado, multi_usuario, max_colaboradores, exportacion, api_access, marketplace_sin_comision, soporte_prioritario)
SELECT 'premium', NULL, NULL, 10, true, true, 5, true, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM planes WHERE nombre = 'premium');
