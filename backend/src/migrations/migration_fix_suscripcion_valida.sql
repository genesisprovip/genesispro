-- Fix: v_limites_usuario view - add trial, activo/activa, and admin bypass
-- Previously only considered Stripe subscription active OR plan basico
-- Now also considers:
--   - Trial period (estado_cuenta='trial' AND trial_fin >= today)
--   - Active accounts (estado_cuenta IN ('activa','activo')) - manually activated
--   - Admin role bypass
CREATE OR REPLACE VIEW v_limites_usuario AS
SELECT u.id AS usuario_id,
    u.email,
    u.plan_actual,
    p.max_aves,
    p.max_fotos_por_ave,
    p.max_combates,
    p.profundidad_genealogia,
    p.analytics_avanzado,
    p.multi_usuario,
    p.max_colaboradores,
    p.exportacion,
    p.api_access,
    p.api_requests_por_dia,
    p.marketplace_sin_comision,
    p.soporte_prioritario,
    s.fecha_expiracion,
    s.estado AS estado_suscripcion,
    CASE
        WHEN s.estado = 'activa' AND s.fecha_expiracion >= CURRENT_DATE THEN true
        WHEN u.plan_actual = 'basico' THEN true
        WHEN u.estado_cuenta IN ('trial') AND u.trial_fin IS NOT NULL AND u.trial_fin::date >= CURRENT_DATE THEN true
        WHEN u.estado_cuenta IN ('activa', 'activo') THEN true
        WHEN u.rol = 'admin' THEN true
        ELSE false
    END AS suscripcion_valida,
    (SELECT count(*) FROM aves WHERE aves.usuario_id = u.id AND aves.deleted_at IS NULL) AS aves_actuales,
    (SELECT count(*) FROM colaboradores WHERE colaboradores.propietario_id = u.id AND colaboradores.estado = 'activo') AS colaboradores_actuales
FROM usuarios u
LEFT JOIN planes p ON u.plan_actual = p.nombre
LEFT JOIN suscripciones s ON u.suscripcion_activa_id = s.id
WHERE u.deleted_at IS NULL;
