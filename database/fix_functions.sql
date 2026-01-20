-- ============================================
-- FIX: calcular_roi_ave function
-- ============================================
DROP FUNCTION IF EXISTS calcular_roi_ave(UUID);

CREATE OR REPLACE FUNCTION calcular_roi_ave(ave_id_param UUID)
RETURNS TABLE (
    total_ingresos DECIMAL(12,2),
    total_egresos DECIMAL(12,2),
    ganancia_neta DECIMAL(12,2),
    roi_porcentaje DECIMAL(8,2),
    costo_promedio_mensual DECIMAL(10,2),
    meses_activo INTEGER,
    desglose_egresos JSONB,
    desglose_ingresos JSONB
) AS $$
DECLARE
    fecha_nac DATE;
    meses INTEGER;
    v_total_ingresos DECIMAL(12,2);
    v_total_egresos DECIMAL(12,2);
    v_desglose_ingresos JSONB;
    v_desglose_egresos JSONB;
BEGIN
    -- Get bird's birth date
    SELECT fecha_nacimiento INTO fecha_nac FROM aves WHERE id = ave_id_param;

    IF fecha_nac IS NULL THEN
        fecha_nac := CURRENT_DATE - INTERVAL '1 month';
    END IF;

    meses := GREATEST(1, EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nac))::INTEGER * 12 +
                         EXTRACT(MONTH FROM AGE(CURRENT_DATE, fecha_nac))::INTEGER);

    -- Calculate total income
    SELECT COALESCE(SUM(monto), 0)::DECIMAL(12,2) INTO v_total_ingresos
    FROM transacciones
    WHERE ave_id = ave_id_param
      AND tipo = 'ingreso'
      AND deleted_at IS NULL;

    -- Calculate total expenses
    SELECT COALESCE(SUM(monto), 0)::DECIMAL(12,2) INTO v_total_egresos
    FROM transacciones
    WHERE ave_id = ave_id_param
      AND tipo = 'egreso'
      AND deleted_at IS NULL;

    -- Build income breakdown by category
    SELECT COALESCE(
        jsonb_object_agg(categoria, total),
        '{}'::jsonb
    ) INTO v_desglose_ingresos
    FROM (
        SELECT COALESCE(ct.nombre, 'Otros') as categoria, SUM(t.monto) as total
        FROM transacciones t
        LEFT JOIN categorias_transaccion ct ON t.categoria_id = ct.id
        WHERE t.ave_id = ave_id_param
          AND t.tipo = 'ingreso'
          AND t.deleted_at IS NULL
        GROUP BY ct.nombre
    ) sub;

    -- Build expense breakdown by category
    SELECT COALESCE(
        jsonb_object_agg(categoria, total),
        '{}'::jsonb
    ) INTO v_desglose_egresos
    FROM (
        SELECT COALESCE(ct.nombre, 'Otros') as categoria, SUM(t.monto) as total
        FROM transacciones t
        LEFT JOIN categorias_transaccion ct ON t.categoria_id = ct.id
        WHERE t.ave_id = ave_id_param
          AND t.tipo = 'egreso'
          AND t.deleted_at IS NULL
        GROUP BY ct.nombre
    ) sub;

    RETURN QUERY SELECT
        v_total_ingresos,
        v_total_egresos,
        (v_total_ingresos - v_total_egresos)::DECIMAL(12,2),
        CASE
            WHEN v_total_egresos > 0 THEN
                ROUND(((v_total_ingresos - v_total_egresos) / v_total_egresos * 100), 2)
            ELSE 0
        END::DECIMAL(8,2),
        (v_total_egresos / meses)::DECIMAL(10,2),
        meses,
        v_desglose_egresos,
        v_desglose_ingresos;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FIX: dashboard_financiero function
-- ============================================
DROP FUNCTION IF EXISTS dashboard_financiero(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION dashboard_financiero(
    usuario_id_param UUID,
    fecha_inicio DATE DEFAULT NULL,
    fecha_fin DATE DEFAULT NULL
)
RETURNS TABLE (
    total_ingresos DECIMAL(12,2),
    total_egresos DECIMAL(12,2),
    balance DECIMAL(12,2),
    ingresos_por_categoria JSONB,
    egresos_por_categoria JSONB,
    transacciones_por_mes JSONB,
    top_aves_rentables JSONB
) AS $$
DECLARE
    v_fecha_inicio DATE;
    v_fecha_fin DATE;
    v_total_ingresos DECIMAL(12,2);
    v_total_egresos DECIMAL(12,2);
    v_ingresos_categoria JSONB;
    v_egresos_categoria JSONB;
    v_trans_mes JSONB;
    v_top_aves JSONB;
BEGIN
    -- Set default dates
    v_fecha_inicio := COALESCE(fecha_inicio, DATE_TRUNC('year', CURRENT_DATE)::DATE);
    v_fecha_fin := COALESCE(fecha_fin, CURRENT_DATE);

    -- Calculate totals
    SELECT
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0)::DECIMAL(12,2),
        COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0)::DECIMAL(12,2)
    INTO v_total_ingresos, v_total_egresos
    FROM transacciones
    WHERE usuario_id = usuario_id_param
      AND fecha BETWEEN v_fecha_inicio AND v_fecha_fin
      AND deleted_at IS NULL;

    -- Income by category
    SELECT COALESCE(jsonb_object_agg(categoria, total), '{}'::jsonb) INTO v_ingresos_categoria
    FROM (
        SELECT COALESCE(ct.nombre, 'Otros') as categoria, SUM(t.monto) as total
        FROM transacciones t
        LEFT JOIN categorias_transaccion ct ON t.categoria_id = ct.id
        WHERE t.usuario_id = usuario_id_param
          AND t.tipo = 'ingreso'
          AND t.fecha BETWEEN v_fecha_inicio AND v_fecha_fin
          AND t.deleted_at IS NULL
        GROUP BY ct.nombre
    ) sub;

    -- Expenses by category
    SELECT COALESCE(jsonb_object_agg(categoria, total), '{}'::jsonb) INTO v_egresos_categoria
    FROM (
        SELECT COALESCE(ct.nombre, 'Otros') as categoria, SUM(t.monto) as total
        FROM transacciones t
        LEFT JOIN categorias_transaccion ct ON t.categoria_id = ct.id
        WHERE t.usuario_id = usuario_id_param
          AND t.tipo = 'egreso'
          AND t.fecha BETWEEN v_fecha_inicio AND v_fecha_fin
          AND t.deleted_at IS NULL
        GROUP BY ct.nombre
    ) sub;

    -- Transactions by month
    SELECT COALESCE(jsonb_object_agg(mes, datos), '{}'::jsonb) INTO v_trans_mes
    FROM (
        SELECT
            TO_CHAR(fecha, 'YYYY-MM') as mes,
            jsonb_build_object(
                'ingresos', COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0),
                'egresos', COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0)
            ) as datos
        FROM transacciones
        WHERE usuario_id = usuario_id_param
          AND fecha BETWEEN v_fecha_inicio AND v_fecha_fin
          AND deleted_at IS NULL
        GROUP BY TO_CHAR(fecha, 'YYYY-MM')
    ) sub;

    -- Top profitable birds
    SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb) INTO v_top_aves
    FROM (
        SELECT
            t.ave_id,
            a.codigo_identidad as codigo,
            SUM(CASE WHEN t.tipo = 'ingreso' THEN t.monto ELSE -t.monto END) as ganancia
        FROM transacciones t
        JOIN aves a ON t.ave_id = a.id
        WHERE t.usuario_id = usuario_id_param
          AND t.ave_id IS NOT NULL
          AND t.fecha BETWEEN v_fecha_inicio AND v_fecha_fin
          AND t.deleted_at IS NULL
        GROUP BY t.ave_id, a.codigo_identidad
        ORDER BY ganancia DESC
        LIMIT 5
    ) sub;

    RETURN QUERY SELECT
        v_total_ingresos,
        v_total_egresos,
        (v_total_ingresos - v_total_egresos)::DECIMAL(12,2),
        v_ingresos_categoria,
        v_egresos_categoria,
        v_trans_mes,
        v_top_aves;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FIX: alertas_salud function (ORDER BY issue)
-- ============================================
DROP FUNCTION IF EXISTS alertas_salud(UUID, INTEGER);

CREATE OR REPLACE FUNCTION alertas_salud(
    usuario_id_param UUID,
    dias_anticipacion INTEGER DEFAULT 7
)
RETURNS TABLE (
    tipo_alerta VARCHAR,
    ave_id UUID,
    codigo_identidad VARCHAR,
    descripcion TEXT,
    fecha_programada DATE,
    dias_restantes INTEGER,
    prioridad VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        -- Vacunas próximas
        SELECT
            'vacuna'::VARCHAR as tipo_alerta,
            a.id as ave_id,
            a.codigo_identidad,
            ('Próxima dosis de ' || v.tipo_vacuna)::TEXT as descripcion,
            v.proxima_dosis as fecha_programada,
            (v.proxima_dosis - CURRENT_DATE)::INTEGER as dias_restantes,
            CASE
                WHEN v.proxima_dosis <= CURRENT_DATE THEN 'urgente'
                WHEN v.proxima_dosis <= CURRENT_DATE + 3 THEN 'alta'
                ELSE 'normal'
            END::VARCHAR as prioridad
        FROM vacunas v
        JOIN aves a ON v.ave_id = a.id
        WHERE a.usuario_id = usuario_id_param
          AND a.deleted_at IS NULL
          AND v.proxima_dosis IS NOT NULL
          AND v.proxima_dosis <= CURRENT_DATE + dias_anticipacion

        UNION ALL

        -- Desparasitaciones próximas
        SELECT
            'desparasitacion'::VARCHAR,
            a.id,
            a.codigo_identidad,
            ('Próxima desparasitación con ' || d.producto)::TEXT,
            d.proxima_aplicacion,
            (d.proxima_aplicacion - CURRENT_DATE)::INTEGER,
            CASE
                WHEN d.proxima_aplicacion <= CURRENT_DATE THEN 'urgente'
                WHEN d.proxima_aplicacion <= CURRENT_DATE + 3 THEN 'alta'
                ELSE 'normal'
            END::VARCHAR
        FROM desparasitaciones d
        JOIN aves a ON d.ave_id = a.id
        WHERE a.usuario_id = usuario_id_param
          AND a.deleted_at IS NULL
          AND d.proxima_aplicacion IS NOT NULL
          AND d.proxima_aplicacion <= CURRENT_DATE + dias_anticipacion

        UNION ALL

        -- Tratamientos en curso
        SELECT
            'tratamiento'::VARCHAR,
            a.id,
            a.codigo_identidad,
            ('Tratamiento en curso: ' || LEFT(t.diagnostico, 50))::TEXT,
            t.fecha_fin,
            COALESCE((t.fecha_fin - CURRENT_DATE)::INTEGER, 0),
            'alta'::VARCHAR
        FROM tratamientos t
        JOIN aves a ON t.ave_id = a.id
        WHERE a.usuario_id = usuario_id_param
          AND a.deleted_at IS NULL
          AND t.estado = 'en_curso'
    ) alertas
    ORDER BY dias_restantes, prioridad DESC;
END;
$$ LANGUAGE plpgsql STABLE;
