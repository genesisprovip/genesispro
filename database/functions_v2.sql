-- ============================================
-- GENESISPRO - FUNCIONES Y TRIGGERS v2.0
-- PostgreSQL 15+
-- ============================================

-- ============================================
-- FUNCIÓN: Generar código único para ave
-- Formato: GP-YYYY-XXXX (ej: GP-2025-0001)
-- ============================================
CREATE OR REPLACE FUNCTION generar_codigo_ave()
RETURNS VARCHAR AS $$
DECLARE
    año_actual INTEGER;
    numero_secuencial INTEGER;
    codigo_generado VARCHAR(20);
BEGIN
    año_actual := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Obtener o crear registro para el año actual con bloqueo
    INSERT INTO codigos_generados (año, ultimo_numero)
    VALUES (año_actual, 0)
    ON CONFLICT (año) DO NOTHING;

    -- Incrementar y obtener número con bloqueo para evitar duplicados
    UPDATE codigos_generados
    SET ultimo_numero = ultimo_numero + 1
    WHERE año = año_actual
    RETURNING ultimo_numero INTO numero_secuencial;

    -- Generar código con formato GP-YYYY-####
    codigo_generado := 'GP-' || año_actual || '-' || LPAD(numero_secuencial::TEXT, 4, '0');

    RETURN codigo_generado;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: Calcular edad del ave
-- ============================================
CREATE OR REPLACE FUNCTION calcular_edad_ave(fecha_nac DATE)
RETURNS TABLE (
    años INTEGER,
    meses INTEGER,
    dias INTEGER,
    total_meses INTEGER,
    total_dias INTEGER,
    descripcion VARCHAR
) AS $$
DECLARE
    edad INTERVAL;
BEGIN
    edad := AGE(CURRENT_DATE, fecha_nac);

    RETURN QUERY SELECT
        EXTRACT(YEAR FROM edad)::INTEGER,
        EXTRACT(MONTH FROM edad)::INTEGER,
        EXTRACT(DAY FROM edad)::INTEGER,
        (EXTRACT(YEAR FROM edad) * 12 + EXTRACT(MONTH FROM edad))::INTEGER,
        (CURRENT_DATE - fecha_nac)::INTEGER,
        CASE
            WHEN EXTRACT(YEAR FROM edad) >= 1 THEN
                EXTRACT(YEAR FROM edad)::INTEGER || ' año(s), ' || EXTRACT(MONTH FROM edad)::INTEGER || ' mes(es)'
            WHEN EXTRACT(MONTH FROM edad) >= 1 THEN
                EXTRACT(MONTH FROM edad)::INTEGER || ' mes(es), ' || EXTRACT(DAY FROM edad)::INTEGER || ' día(s)'
            ELSE
                EXTRACT(DAY FROM edad)::INTEGER || ' día(s)'
        END::VARCHAR;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Obtener árbol genealógico (optimizado con límite)
-- ============================================
CREATE OR REPLACE FUNCTION obtener_genealogia(
    ave_id_param UUID,
    profundidad_max INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    codigo_identidad VARCHAR,
    sexo CHAR(1),
    color VARCHAR,
    linea_genetica VARCHAR,
    fecha_nacimiento DATE,
    padre_id UUID,
    madre_id UUID,
    nivel INTEGER,
    relacion VARCHAR,
    rama VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE arbol AS (
        -- Caso base: el ave inicial
        SELECT
            a.id,
            a.codigo_identidad,
            a.sexo::CHAR(1),
            a.color,
            a.linea_genetica,
            a.fecha_nacimiento,
            a.padre_id,
            a.madre_id,
            0 as nivel,
            'origen'::VARCHAR as relacion,
            ''::VARCHAR as rama
        FROM aves a
        WHERE a.id = ave_id_param AND a.deleted_at IS NULL

        UNION ALL

        -- Padres (recursivo)
        SELECT
            padre.id,
            padre.codigo_identidad,
            padre.sexo::CHAR(1),
            padre.color,
            padre.linea_genetica,
            padre.fecha_nacimiento,
            padre.padre_id,
            padre.madre_id,
            ar.nivel + 1,
            CASE ar.nivel
                WHEN 0 THEN 'padre'
                WHEN 1 THEN 'abuelo'
                WHEN 2 THEN 'bisabuelo'
                ELSE 'ancestro_' || (ar.nivel + 1)
            END::VARCHAR,
            (CASE WHEN ar.rama = '' THEN 'P' ELSE ar.rama || '-P' END)::VARCHAR
        FROM aves padre
        JOIN arbol ar ON padre.id = ar.padre_id
        WHERE ar.nivel < profundidad_max
          AND padre.deleted_at IS NULL

        UNION ALL

        -- Madres (recursivo)
        SELECT
            madre.id,
            madre.codigo_identidad,
            madre.sexo::CHAR(1),
            madre.color,
            madre.linea_genetica,
            madre.fecha_nacimiento,
            madre.padre_id,
            madre.madre_id,
            ar.nivel + 1,
            CASE ar.nivel
                WHEN 0 THEN 'madre'
                WHEN 1 THEN 'abuela'
                WHEN 2 THEN 'bisabuela'
                ELSE 'ancestro_' || (ar.nivel + 1)
            END::VARCHAR,
            (CASE WHEN ar.rama = '' THEN 'M' ELSE ar.rama || '-M' END)::VARCHAR
        FROM aves madre
        JOIN arbol ar ON madre.id = ar.madre_id
        WHERE ar.nivel < profundidad_max
          AND madre.deleted_at IS NULL
    )
    SELECT DISTINCT * FROM arbol
    ORDER BY nivel, rama;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Obtener descendencia de un ave
-- ============================================
CREATE OR REPLACE FUNCTION obtener_descendencia(
    ave_id_param UUID,
    profundidad_max INTEGER DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    codigo_identidad VARCHAR,
    sexo CHAR(1),
    color VARCHAR,
    linea_genetica VARCHAR,
    fecha_nacimiento DATE,
    padre_id UUID,
    madre_id UUID,
    nivel INTEGER,
    es_por_padre BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE descendientes AS (
        -- Hijos directos del ave
        SELECT
            a.id,
            a.codigo_identidad,
            a.sexo::CHAR(1),
            a.color,
            a.linea_genetica,
            a.fecha_nacimiento,
            a.padre_id,
            a.madre_id,
            1 as nivel,
            (a.padre_id = ave_id_param) as es_por_padre
        FROM aves a
        WHERE (a.padre_id = ave_id_param OR a.madre_id = ave_id_param)
          AND a.deleted_at IS NULL

        UNION ALL

        -- Descendientes recursivos
        SELECT
            a.id,
            a.codigo_identidad,
            a.sexo::CHAR(1),
            a.color,
            a.linea_genetica,
            a.fecha_nacimiento,
            a.padre_id,
            a.madre_id,
            d.nivel + 1,
            d.es_por_padre
        FROM aves a
        JOIN descendientes d ON (a.padre_id = d.id OR a.madre_id = d.id)
        WHERE d.nivel < profundidad_max
          AND a.deleted_at IS NULL
    )
    SELECT DISTINCT * FROM descendientes
    ORDER BY nivel, fecha_nacimiento;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Calcular coeficiente de consanguinidad
-- Método simplificado de Wright
-- ============================================
CREATE OR REPLACE FUNCTION calcular_consanguinidad(
    padre_id_param UUID,
    madre_id_param UUID,
    generaciones_max INTEGER DEFAULT 5
)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    ancestros_comunes RECORD;
    coeficiente DECIMAL(10,8) := 0;
    n1 INTEGER;
    n2 INTEGER;
BEGIN
    -- Buscar ancestros comunes entre padre y madre
    FOR ancestros_comunes IN
        WITH RECURSIVE
        ancestros_padre AS (
            SELECT id, padre_id, madre_id, 0 as generacion
            FROM aves WHERE id = padre_id_param AND deleted_at IS NULL
            UNION ALL
            SELECT a.id, a.padre_id, a.madre_id, ap.generacion + 1
            FROM aves a
            JOIN ancestros_padre ap ON (a.id = ap.padre_id OR a.id = ap.madre_id)
            WHERE ap.generacion < generaciones_max AND a.deleted_at IS NULL
        ),
        ancestros_madre AS (
            SELECT id, padre_id, madre_id, 0 as generacion
            FROM aves WHERE id = madre_id_param AND deleted_at IS NULL
            UNION ALL
            SELECT a.id, a.padre_id, a.madre_id, am.generacion + 1
            FROM aves a
            JOIN ancestros_madre am ON (a.id = am.padre_id OR a.id = am.madre_id)
            WHERE am.generacion < generaciones_max AND a.deleted_at IS NULL
        )
        SELECT
            ap.id as ancestro_id,
            MIN(ap.generacion) as gen_padre,
            MIN(am.generacion) as gen_madre
        FROM ancestros_padre ap
        JOIN ancestros_madre am ON ap.id = am.id
        WHERE ap.id != padre_id_param AND ap.id != madre_id_param
        GROUP BY ap.id
    LOOP
        n1 := ancestros_comunes.gen_padre;
        n2 := ancestros_comunes.gen_madre;
        -- Fórmula de Wright: F = Σ (1/2)^(n1+n2+1)
        coeficiente := coeficiente + POWER(0.5, n1 + n2 + 1);
    END LOOP;

    RETURN LEAST(coeficiente, 1.0)::DECIMAL(5,4);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Validar cruce (consanguinidad)
-- Retorna advertencias si el coeficiente es alto
-- ============================================
CREATE OR REPLACE FUNCTION validar_cruce(
    padre_id_param UUID,
    madre_id_param UUID
)
RETURNS TABLE (
    es_valido BOOLEAN,
    coeficiente DECIMAL(5,4),
    nivel_riesgo VARCHAR,
    advertencia TEXT,
    parentesco_cercano BOOLEAN
) AS $$
DECLARE
    coef DECIMAL(5,4);
    padre_data RECORD;
    madre_data RECORD;
BEGIN
    -- Verificar que padre sea macho
    SELECT * INTO padre_data FROM aves WHERE id = padre_id_param AND deleted_at IS NULL;
    IF padre_data.sexo != 'M' THEN
        RETURN QUERY SELECT
            false,
            0::DECIMAL(5,4),
            'error'::VARCHAR,
            'El padre debe ser macho'::TEXT,
            false;
        RETURN;
    END IF;

    -- Verificar que madre sea hembra
    SELECT * INTO madre_data FROM aves WHERE id = madre_id_param AND deleted_at IS NULL;
    IF madre_data.sexo != 'H' THEN
        RETURN QUERY SELECT
            false,
            0::DECIMAL(5,4),
            'error'::VARCHAR,
            'La madre debe ser hembra'::TEXT,
            false;
        RETURN;
    END IF;

    -- Verificar parentesco directo (padre-hija, madre-hijo, hermanos)
    IF padre_data.padre_id = madre_id_param OR padre_data.madre_id = madre_id_param OR
       madre_data.padre_id = padre_id_param OR madre_data.madre_id = padre_id_param THEN
        RETURN QUERY SELECT
            false,
            0.25::DECIMAL(5,4),
            'critico'::VARCHAR,
            'Cruce entre padre/madre e hijo/hija no permitido'::TEXT,
            true;
        RETURN;
    END IF;

    -- Verificar hermanos completos
    IF padre_data.padre_id IS NOT NULL AND madre_data.padre_id IS NOT NULL AND
       padre_data.padre_id = madre_data.padre_id AND padre_data.madre_id = madre_data.madre_id THEN
        RETURN QUERY SELECT
            false,
            0.25::DECIMAL(5,4),
            'critico'::VARCHAR,
            'Cruce entre hermanos completos no recomendado'::TEXT,
            true;
        RETURN;
    END IF;

    -- Calcular coeficiente
    coef := calcular_consanguinidad(padre_id_param, madre_id_param, 5);

    -- Evaluar nivel de riesgo
    RETURN QUERY SELECT
        CASE
            WHEN coef > 0.25 THEN false
            ELSE true
        END,
        coef,
        CASE
            WHEN coef = 0 THEN 'ninguno'
            WHEN coef < 0.0625 THEN 'bajo'
            WHEN coef < 0.125 THEN 'moderado'
            WHEN coef < 0.25 THEN 'alto'
            ELSE 'critico'
        END::VARCHAR,
        CASE
            WHEN coef = 0 THEN 'Sin consanguinidad detectada'
            WHEN coef < 0.0625 THEN 'Consanguinidad baja, cruce aceptable'
            WHEN coef < 0.125 THEN 'Consanguinidad moderada, considerar alternativas'
            WHEN coef < 0.25 THEN 'Consanguinidad alta, se recomienda buscar otro cruce'
            ELSE 'Consanguinidad crítica, cruce no recomendado'
        END::TEXT,
        (coef >= 0.125);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Estadísticas de combates
-- ============================================
CREATE OR REPLACE FUNCTION estadisticas_combates(macho_id_param UUID)
RETURNS TABLE (
    total_combates BIGINT,
    victorias BIGINT,
    empates BIGINT,
    derrotas BIGINT,
    porcentaje_victorias DECIMAL(5,2),
    porcentaje_empates DECIMAL(5,2),
    porcentaje_derrotas DECIMAL(5,2),
    duracion_promedio DECIMAL(6,2),
    duracion_minima INTEGER,
    duracion_maxima INTEGER,
    racha_actual INTEGER,
    racha_actual_tipo VARCHAR,
    mejor_racha_victorias INTEGER,
    ultimo_combate DATE
) AS $$
DECLARE
    racha INTEGER := 0;
    racha_tipo VARCHAR := '';
    mejor_racha INTEGER := 0;
    ultimo_resultado VARCHAR;
    combate RECORD;
BEGIN
    -- Calcular rachas
    FOR combate IN
        SELECT resultado, fecha_combate
        FROM combates
        WHERE macho_id = macho_id_param AND deleted_at IS NULL
        ORDER BY fecha_combate DESC
    LOOP
        IF racha_tipo = '' THEN
            racha_tipo := combate.resultado::VARCHAR;
            racha := 1;
        ELSIF combate.resultado::VARCHAR = racha_tipo THEN
            racha := racha + 1;
        ELSE
            EXIT;
        END IF;

        IF combate.resultado = 'victoria' AND racha > mejor_racha THEN
            mejor_racha := racha;
        END IF;
    END LOOP;

    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT as total_combates,
        COUNT(*) FILTER (WHERE resultado = 'victoria')::BIGINT as victorias,
        COUNT(*) FILTER (WHERE resultado = 'empate')::BIGINT as empates,
        COUNT(*) FILTER (WHERE resultado = 'derrota')::BIGINT as derrotas,
        ROUND(
            (COUNT(*) FILTER (WHERE resultado = 'victoria')::DECIMAL /
            NULLIF(COUNT(*)::DECIMAL, 0) * 100), 2
        )::DECIMAL(5,2) as porcentaje_victorias,
        ROUND(
            (COUNT(*) FILTER (WHERE resultado = 'empate')::DECIMAL /
            NULLIF(COUNT(*)::DECIMAL, 0) * 100), 2
        )::DECIMAL(5,2) as porcentaje_empates,
        ROUND(
            (COUNT(*) FILTER (WHERE resultado = 'derrota')::DECIMAL /
            NULLIF(COUNT(*)::DECIMAL, 0) * 100), 2
        )::DECIMAL(5,2) as porcentaje_derrotas,
        ROUND(AVG(duracion_minutos)::DECIMAL, 2)::DECIMAL(6,2) as duracion_promedio,
        MIN(duracion_minutos)::INTEGER as duracion_minima,
        MAX(duracion_minutos)::INTEGER as duracion_maxima,
        racha::INTEGER,
        racha_tipo::VARCHAR,
        mejor_racha::INTEGER,
        MAX(fecha_combate)::DATE as ultimo_combate
    FROM combates
    WHERE macho_id = macho_id_param AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Ranking de mejores peleadores
-- ============================================
CREATE OR REPLACE FUNCTION ranking_peleadores(
    usuario_id_param UUID,
    limite INTEGER DEFAULT 10
)
RETURNS TABLE (
    posicion BIGINT,
    ave_id UUID,
    codigo_identidad VARCHAR,
    linea_genetica VARCHAR,
    total_combates BIGINT,
    victorias BIGINT,
    porcentaje_victorias DECIMAL(5,2),
    puntuacion DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ROW_NUMBER() OVER (ORDER BY
            -- Puntuación: victorias * 3 + empates * 1 - derrotas * 2 + bonus por % victorias
            (COUNT(*) FILTER (WHERE c.resultado = 'victoria') * 3 +
             COUNT(*) FILTER (WHERE c.resultado = 'empate') * 1 -
             COUNT(*) FILTER (WHERE c.resultado = 'derrota') * 2 +
             CASE WHEN COUNT(*) >= 5 THEN
                 (COUNT(*) FILTER (WHERE c.resultado = 'victoria')::DECIMAL / COUNT(*) * 10)
             ELSE 0 END)
            DESC
        ) as posicion,
        a.id,
        a.codigo_identidad,
        a.linea_genetica,
        COUNT(*)::BIGINT as total_combates,
        COUNT(*) FILTER (WHERE c.resultado = 'victoria')::BIGINT as victorias,
        ROUND(
            (COUNT(*) FILTER (WHERE c.resultado = 'victoria')::DECIMAL /
            NULLIF(COUNT(*)::DECIMAL, 0) * 100), 2
        )::DECIMAL(5,2) as porcentaje_victorias,
        (COUNT(*) FILTER (WHERE c.resultado = 'victoria') * 3 +
         COUNT(*) FILTER (WHERE c.resultado = 'empate') * 1 -
         COUNT(*) FILTER (WHERE c.resultado = 'derrota') * 2 +
         CASE WHEN COUNT(*) >= 5 THEN
             (COUNT(*) FILTER (WHERE c.resultado = 'victoria')::DECIMAL / COUNT(*) * 10)
         ELSE 0 END)::DECIMAL(10,2) as puntuacion
    FROM aves a
    JOIN combates c ON a.id = c.macho_id AND c.deleted_at IS NULL
    WHERE a.usuario_id = usuario_id_param
      AND a.deleted_at IS NULL
      AND a.sexo = 'M'
    GROUP BY a.id, a.codigo_identidad, a.linea_genetica
    HAVING COUNT(*) >= 1
    ORDER BY puntuacion DESC
    LIMIT limite;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: ROI por ave
-- ============================================
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
BEGIN
    SELECT fecha_nacimiento INTO fecha_nac FROM aves WHERE id = ave_id_param;
    meses := GREATEST(1, EXTRACT(YEAR FROM AGE(CURRENT_DATE, fecha_nac)) * 12 +
                         EXTRACT(MONTH FROM AGE(CURRENT_DATE, fecha_nac)));

    RETURN QUERY
    WITH ingresos AS (
        SELECT
            COALESCE(SUM(monto), 0) as total,
            jsonb_object_agg(
                COALESCE(ct.nombre, 'Otros'),
                COALESCE(SUM(t.monto), 0)
            ) as desglose
        FROM transacciones t
        LEFT JOIN categorias_transaccion ct ON t.categoria_id = ct.id
        WHERE t.ave_id = ave_id_param
          AND t.tipo = 'ingreso'
          AND t.deleted_at IS NULL
        GROUP BY ct.nombre
    ),
    egresos AS (
        SELECT
            COALESCE(SUM(monto), 0) as total,
            jsonb_object_agg(
                COALESCE(ct.nombre, 'Otros'),
                COALESCE(SUM(t.monto), 0)
            ) as desglose
        FROM transacciones t
        LEFT JOIN categorias_transaccion ct ON t.categoria_id = ct.id
        WHERE t.ave_id = ave_id_param
          AND t.tipo = 'egreso'
          AND t.deleted_at IS NULL
        GROUP BY ct.nombre
    )
    SELECT
        COALESCE((SELECT total FROM ingresos), 0)::DECIMAL(12,2),
        COALESCE((SELECT total FROM egresos), 0)::DECIMAL(12,2),
        (COALESCE((SELECT total FROM ingresos), 0) - COALESCE((SELECT total FROM egresos), 0))::DECIMAL(12,2),
        CASE
            WHEN COALESCE((SELECT total FROM egresos), 0) > 0 THEN
                ROUND(((COALESCE((SELECT total FROM ingresos), 0) - COALESCE((SELECT total FROM egresos), 0)) /
                       COALESCE((SELECT total FROM egresos), 1) * 100), 2)
            ELSE 0
        END::DECIMAL(8,2),
        (COALESCE((SELECT total FROM egresos), 0) / meses)::DECIMAL(10,2),
        meses,
        COALESCE((SELECT desglose FROM egresos), '{}'::jsonb),
        COALESCE((SELECT desglose FROM ingresos), '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Dashboard financiero
-- ============================================
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
BEGIN
    -- Si no se especifican fechas, usar el año actual
    IF fecha_inicio IS NULL THEN
        fecha_inicio := DATE_TRUNC('year', CURRENT_DATE)::DATE;
    END IF;
    IF fecha_fin IS NULL THEN
        fecha_fin := CURRENT_DATE;
    END IF;

    RETURN QUERY
    WITH trans AS (
        SELECT t.*, ct.nombre as categoria_nombre
        FROM transacciones t
        LEFT JOIN categorias_transaccion ct ON t.categoria_id = ct.id
        WHERE t.usuario_id = usuario_id_param
          AND t.fecha BETWEEN fecha_inicio AND fecha_fin
          AND t.deleted_at IS NULL
    )
    SELECT
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0)::DECIMAL(12,2),
        COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0)::DECIMAL(12,2),
        (COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0) -
         COALESCE(SUM(monto) FILTER (WHERE tipo = 'egreso'), 0))::DECIMAL(12,2),
        (SELECT jsonb_object_agg(categoria_nombre, total)
         FROM (SELECT categoria_nombre, SUM(monto) as total
               FROM trans WHERE tipo = 'ingreso' GROUP BY categoria_nombre) x)::JSONB,
        (SELECT jsonb_object_agg(categoria_nombre, total)
         FROM (SELECT categoria_nombre, SUM(monto) as total
               FROM trans WHERE tipo = 'egreso' GROUP BY categoria_nombre) x)::JSONB,
        (SELECT jsonb_object_agg(mes, datos)
         FROM (
             SELECT TO_CHAR(fecha, 'YYYY-MM') as mes,
                    jsonb_build_object(
                        'ingresos', SUM(monto) FILTER (WHERE tipo = 'ingreso'),
                        'egresos', SUM(monto) FILTER (WHERE tipo = 'egreso')
                    ) as datos
             FROM trans GROUP BY TO_CHAR(fecha, 'YYYY-MM')
         ) x)::JSONB,
        (SELECT jsonb_agg(jsonb_build_object(
            'ave_id', ave_id,
            'codigo', codigo_identidad,
            'ganancia', ganancia
         ))
         FROM (
             SELECT t.ave_id, a.codigo_identidad,
                    SUM(CASE WHEN t.tipo = 'ingreso' THEN t.monto ELSE -t.monto END) as ganancia
             FROM trans t
             JOIN aves a ON t.ave_id = a.id
             WHERE t.ave_id IS NOT NULL
             GROUP BY t.ave_id, a.codigo_identidad
             ORDER BY ganancia DESC
             LIMIT 5
         ) x)::JSONB
    FROM trans;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Alertas de salud pendientes
-- ============================================
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
    -- Vacunas próximas
    SELECT
        'vacuna'::VARCHAR,
        a.id,
        a.codigo_identidad,
        ('Próxima dosis de ' || v.tipo_vacuna)::TEXT,
        v.proxima_dosis,
        (v.proxima_dosis - CURRENT_DATE)::INTEGER,
        CASE
            WHEN v.proxima_dosis <= CURRENT_DATE THEN 'urgente'
            WHEN v.proxima_dosis <= CURRENT_DATE + 3 THEN 'alta'
            ELSE 'normal'
        END::VARCHAR
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

    ORDER BY dias_restantes, prioridad DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_usuarios_updated
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER tr_aves_updated
    BEFORE UPDATE ON aves
    FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER tr_suscripciones_updated
    BEFORE UPDATE ON suscripciones
    FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER tr_tratamientos_updated
    BEFORE UPDATE ON tratamientos
    FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER tr_publicaciones_marketplace_updated
    BEFORE UPDATE ON publicaciones_marketplace
    FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER tr_publicaciones_sociales_updated
    BEFORE UPDATE ON publicaciones_sociales
    FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER tr_inventario_updated
    BEFORE UPDATE ON inventario_alimentos
    FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER tr_configuraciones_updated
    BEFORE UPDATE ON configuraciones_usuario
    FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

-- Trigger: Actualizar peso actual del ave al agregar medición
CREATE OR REPLACE FUNCTION actualizar_peso_actual()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.peso IS NOT NULL THEN
        UPDATE aves SET peso_actual = NEW.peso, updated_at = NOW()
        WHERE id = NEW.ave_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_medicion_peso
    AFTER INSERT ON mediciones
    FOR EACH ROW EXECUTE FUNCTION actualizar_peso_actual();

-- Trigger: Sincronizar contadores de likes
CREATE OR REPLACE FUNCTION actualizar_contador_likes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE publicaciones_sociales
        SET likes_count = likes_count + 1
        WHERE id = NEW.publicacion_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE publicaciones_sociales
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.publicacion_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_likes_count
    AFTER INSERT OR DELETE ON likes_sociales
    FOR EACH ROW EXECUTE FUNCTION actualizar_contador_likes();

-- Trigger: Sincronizar contadores de comentarios
CREATE OR REPLACE FUNCTION actualizar_contador_comentarios()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.deleted_at IS NULL THEN
        UPDATE publicaciones_sociales
        SET comentarios_count = comentarios_count + 1
        WHERE id = NEW.publicacion_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
        UPDATE publicaciones_sociales
        SET comentarios_count = GREATEST(0, comentarios_count - 1)
        WHERE id = NEW.publicacion_id;
    ELSIF TG_OP = 'DELETE' AND OLD.deleted_at IS NULL THEN
        UPDATE publicaciones_sociales
        SET comentarios_count = GREATEST(0, comentarios_count - 1)
        WHERE id = OLD.publicacion_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_comentarios_count
    AFTER INSERT OR UPDATE OR DELETE ON comentarios_sociales
    FOR EACH ROW EXECUTE FUNCTION actualizar_contador_comentarios();

-- Trigger: Crear configuración de usuario al registrarse
CREATE OR REPLACE FUNCTION crear_configuracion_usuario()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO configuraciones_usuario (usuario_id)
    VALUES (NEW.id)
    ON CONFLICT (usuario_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_crear_config_usuario
    AFTER INSERT ON usuarios
    FOR EACH ROW EXECUTE FUNCTION crear_configuracion_usuario();

-- Trigger: Validar sexo en cruces
CREATE OR REPLACE FUNCTION validar_sexo_cruce()
RETURNS TRIGGER AS $$
DECLARE
    padre_sexo CHAR(1);
    madre_sexo CHAR(1);
BEGIN
    SELECT sexo INTO padre_sexo FROM aves WHERE id = NEW.padre_id;
    SELECT sexo INTO madre_sexo FROM aves WHERE id = NEW.madre_id;

    IF padre_sexo != 'M' THEN
        RAISE EXCEPTION 'El padre debe ser macho';
    END IF;

    IF madre_sexo != 'H' THEN
        RAISE EXCEPTION 'La madre debe ser hembra';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_validar_cruce
    BEFORE INSERT OR UPDATE ON cruces
    FOR EACH ROW EXECUTE FUNCTION validar_sexo_cruce();

-- Trigger: Validar que combates sean solo de machos
CREATE OR REPLACE FUNCTION validar_sexo_combate()
RETURNS TRIGGER AS $$
DECLARE
    ave_sexo CHAR(1);
BEGIN
    SELECT sexo INTO ave_sexo FROM aves WHERE id = NEW.macho_id;

    IF ave_sexo != 'M' THEN
        RAISE EXCEPTION 'Solo los machos pueden tener combates registrados';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_validar_combate
    BEFORE INSERT ON combates
    FOR EACH ROW EXECUTE FUNCTION validar_sexo_combate();

-- ============================================
-- VISTA: Límites de usuario por plan
-- ============================================
CREATE OR REPLACE VIEW v_limites_usuario AS
SELECT
    u.id as usuario_id,
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
    s.estado as estado_suscripcion,
    CASE
        WHEN s.estado = 'activa' AND s.fecha_expiracion >= CURRENT_DATE THEN true
        WHEN u.plan_actual = 'basico' THEN true
        ELSE false
    END as suscripcion_valida,
    (SELECT COUNT(*) FROM aves WHERE usuario_id = u.id AND deleted_at IS NULL) as aves_actuales,
    (SELECT COUNT(*) FROM colaboradores WHERE propietario_id = u.id AND estado = 'activo') as colaboradores_actuales
FROM usuarios u
LEFT JOIN planes p ON u.plan_actual = p.nombre
LEFT JOIN suscripciones s ON u.suscripcion_activa_id = s.id
WHERE u.deleted_at IS NULL;

-- ============================================
-- VISTA: Dashboard de usuario
-- ============================================
CREATE OR REPLACE VIEW v_dashboard_usuario AS
SELECT
    u.id as usuario_id,
    (SELECT COUNT(*) FROM aves WHERE usuario_id = u.id AND deleted_at IS NULL) as total_aves,
    (SELECT COUNT(*) FROM aves WHERE usuario_id = u.id AND deleted_at IS NULL AND sexo = 'M') as total_machos,
    (SELECT COUNT(*) FROM aves WHERE usuario_id = u.id AND deleted_at IS NULL AND sexo = 'H') as total_hembras,
    (SELECT COUNT(*) FROM aves WHERE usuario_id = u.id AND deleted_at IS NULL AND estado = 'activo') as aves_activas,
    (SELECT COUNT(*) FROM combates c JOIN aves a ON c.macho_id = a.id
     WHERE a.usuario_id = u.id AND c.deleted_at IS NULL) as total_combates,
    (SELECT COUNT(*) FROM combates c JOIN aves a ON c.macho_id = a.id
     WHERE a.usuario_id = u.id AND c.resultado = 'victoria' AND c.deleted_at IS NULL) as total_victorias,
    (SELECT COUNT(*) FROM cruces cr JOIN aves a ON cr.madre_id = a.id
     WHERE a.usuario_id = u.id AND cr.deleted_at IS NULL) as total_cruces,
    (SELECT COUNT(*) FROM eventos WHERE usuario_id = u.id AND completado = false
     AND fecha_inicio <= CURRENT_DATE + 7 AND deleted_at IS NULL) as eventos_proximos
FROM usuarios u
WHERE u.deleted_at IS NULL;
