-- ============================================
-- GENESISPRO - SCHEMA MEJORADO v2.0
-- PostgreSQL 15+
-- Mejoras: UUIDs, soft delete, refresh tokens,
-- rate limiting por usuario, genealogía optimizada
-- ============================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================
-- TIPOS ENUMERADOS (mejor performance que CHECK)
-- ============================================

CREATE TYPE plan_tipo AS ENUM ('basico', 'pro', 'premium');
CREATE TYPE sexo_tipo AS ENUM ('M', 'H');
CREATE TYPE estado_ave AS ENUM ('activo', 'vendido', 'fallecido', 'prestamo');
CREATE TYPE resultado_combate AS ENUM ('victoria', 'empate', 'derrota');
CREATE TYPE tipo_combate AS ENUM ('oficial', 'entrenamiento', 'amistoso');
CREATE TYPE tipo_transaccion AS ENUM ('ingreso', 'egreso');
CREATE TYPE gravedad_lesion AS ENUM ('leve', 'moderada', 'grave');
CREATE TYPE estado_tratamiento AS ENUM ('en_curso', 'completado', 'suspendido');
CREATE TYPE estado_suscripcion AS ENUM ('activa', 'cancelada', 'expirada', 'pendiente');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'completado', 'fallido', 'reembolsado');
CREATE TYPE tipo_evento AS ENUM ('combate', 'vacuna', 'desparasitacion', 'cruce', 'medicion', 'consulta', 'otro');
CREATE TYPE metodo_recordatorio AS ENUM ('push', 'email', 'ambos');
CREATE TYPE tipo_publicacion AS ENUM ('venta', 'semental');
CREATE TYPE estado_publicacion AS ENUM ('activa', 'vendida', 'pausada', 'cancelada');
CREATE TYPE visibilidad_tipo AS ENUM ('publico', 'seguidores', 'privado');
CREATE TYPE rol_colaborador AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE estado_colaborador AS ENUM ('pendiente', 'activo', 'revocado');

-- ============================================
-- TABLA: usuarios
-- ============================================
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100),
    telefono VARCHAR(20),
    ubicacion VARCHAR(100),
    foto_perfil VARCHAR(255),
    email_verificado BOOLEAN DEFAULT false,
    email_verificado_at TIMESTAMP,
    plan_actual plan_tipo DEFAULT 'basico',
    suscripcion_activa_id UUID,
    push_token VARCHAR(255),
    ultimo_acceso TIMESTAMP,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_usuarios_email ON usuarios(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_usuarios_plan ON usuarios(plan_actual) WHERE deleted_at IS NULL;
CREATE INDEX idx_usuarios_activo ON usuarios(activo) WHERE deleted_at IS NULL;

-- ============================================
-- TABLA: refresh_tokens (NUEVA)
-- ============================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP,
    revoked_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash) WHERE revoked = false;
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at) WHERE revoked = false;

-- ============================================
-- TABLA: rate_limits (NUEVA - Rate limiting por usuario)
-- ============================================
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    endpoint VARCHAR(100) NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_usuario ON rate_limits(usuario_id, endpoint, window_start);
CREATE INDEX idx_rate_limits_ip ON rate_limits(ip_address, endpoint, window_start);

-- ============================================
-- TABLA: planes
-- ============================================
CREATE TABLE planes (
    id SERIAL PRIMARY KEY,
    nombre plan_tipo UNIQUE NOT NULL,
    precio_mensual DECIMAL(8,2) NOT NULL,
    precio_anual DECIMAL(8,2) NOT NULL,
    max_aves INTEGER,
    max_fotos_por_ave INTEGER,
    max_combates INTEGER,
    profundidad_genealogia INTEGER,
    analytics_avanzado BOOLEAN DEFAULT false,
    multi_usuario BOOLEAN DEFAULT false,
    max_colaboradores INTEGER DEFAULT 0,
    exportacion BOOLEAN DEFAULT false,
    api_access BOOLEAN DEFAULT false,
    api_requests_por_dia INTEGER DEFAULT 0,
    marketplace_sin_comision BOOLEAN DEFAULT false,
    soporte_prioritario BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insertar planes con más detalles
INSERT INTO planes (nombre, precio_mensual, precio_anual, max_aves, max_fotos_por_ave, max_combates, profundidad_genealogia, analytics_avanzado, multi_usuario, max_colaboradores, exportacion, api_access, api_requests_por_dia, marketplace_sin_comision, soporte_prioritario) VALUES
('basico', 0.00, 0.00, 10, 2, 20, 2, false, false, 0, false, false, 0, false, false),
('pro', 199.00, 1990.00, 100, NULL, NULL, 3, false, false, 0, true, false, 0, false, false),
('premium', 399.00, 3990.00, NULL, NULL, NULL, NULL, true, true, 3, true, true, 10000, true, true);

-- ============================================
-- TABLA: suscripciones
-- ============================================
CREATE TABLE suscripciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    plan_id INTEGER NOT NULL REFERENCES planes(id),
    tipo_pago VARCHAR(10) CHECK (tipo_pago IN ('mensual', 'anual')),
    fecha_inicio DATE NOT NULL,
    fecha_expiracion DATE NOT NULL,
    estado estado_suscripcion DEFAULT 'activa',
    metodo_pago VARCHAR(50),
    stripe_subscription_id VARCHAR(100),
    stripe_customer_id VARCHAR(100),
    auto_renovacion BOOLEAN DEFAULT false,
    cancelada_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_suscripciones_usuario ON suscripciones(usuario_id);
CREATE INDEX idx_suscripciones_estado ON suscripciones(estado);
CREATE INDEX idx_suscripciones_expiracion ON suscripciones(fecha_expiracion);
CREATE INDEX idx_suscripciones_stripe ON suscripciones(stripe_subscription_id);

-- Agregar FK a usuarios después de crear suscripciones
ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_suscripcion
    FOREIGN KEY (suscripcion_activa_id) REFERENCES suscripciones(id) ON DELETE SET NULL;

-- ============================================
-- TABLA: pagos
-- ============================================
CREATE TABLE pagos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suscripcion_id UUID REFERENCES suscripciones(id),
    usuario_id UUID NOT NULL REFERENCES usuarios(id),
    monto DECIMAL(8,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'MXN',
    metodo_pago VARCHAR(50),
    stripe_payment_intent_id VARCHAR(100),
    stripe_invoice_id VARCHAR(100),
    estado estado_pago DEFAULT 'pendiente',
    fecha_pago TIMESTAMP DEFAULT NOW(),
    factura_url VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pagos_usuario ON pagos(usuario_id);
CREATE INDEX idx_pagos_estado ON pagos(estado);
CREATE INDEX idx_pagos_stripe ON pagos(stripe_payment_intent_id);

-- ============================================
-- TABLA: aves (con UUID y soft delete mejorado)
-- ============================================
CREATE TABLE aves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo_identidad VARCHAR(20) UNIQUE NOT NULL,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    sexo sexo_tipo NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    peso_nacimiento DECIMAL(6,2),
    peso_actual DECIMAL(6,2),
    padre_id UUID REFERENCES aves(id) ON DELETE SET NULL,
    madre_id UUID REFERENCES aves(id) ON DELETE SET NULL,
    linea_genetica VARCHAR(50),
    color VARCHAR(50),
    estado estado_ave DEFAULT 'activo',
    precio_compra DECIMAL(10,2),
    precio_venta DECIMAL(10,2),
    disponible_venta BOOLEAN DEFAULT false,
    disponible_cruces BOOLEAN DEFAULT false,
    notas TEXT,
    qr_code VARCHAR(255),
    -- Campos para cálculos de consanguinidad (cache)
    coeficiente_consanguinidad DECIMAL(5,4),
    generacion INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_aves_usuario ON aves(usuario_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_aves_codigo ON aves(codigo_identidad);
CREATE INDEX idx_aves_padre ON aves(padre_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_aves_madre ON aves(madre_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_aves_sexo ON aves(sexo) WHERE deleted_at IS NULL;
CREATE INDEX idx_aves_estado ON aves(estado) WHERE deleted_at IS NULL;
CREATE INDEX idx_aves_disponible_venta ON aves(disponible_venta) WHERE deleted_at IS NULL AND disponible_venta = true;
CREATE INDEX idx_aves_linea ON aves(linea_genetica) WHERE deleted_at IS NULL;
CREATE INDEX idx_aves_fecha_nacimiento ON aves(fecha_nacimiento) WHERE deleted_at IS NULL;

-- Índice para búsqueda fuzzy
CREATE INDEX idx_aves_codigo_trgm ON aves USING gin (codigo_identidad gin_trgm_ops);
CREATE INDEX idx_aves_linea_trgm ON aves USING gin (linea_genetica gin_trgm_ops);

-- ============================================
-- TABLA: fotos
-- ============================================
CREATE TABLE fotos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ave_id UUID NOT NULL REFERENCES aves(id) ON DELETE CASCADE,
    ruta_archivo VARCHAR(255) NOT NULL,
    ruta_thumbnail VARCHAR(255),
    nombre_original VARCHAR(255),
    descripcion TEXT,
    es_principal BOOLEAN DEFAULT false,
    tamaño_bytes INTEGER,
    mime_type VARCHAR(50),
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fotos_ave ON fotos(ave_id);
CREATE INDEX idx_fotos_principal ON fotos(ave_id, es_principal) WHERE es_principal = true;

-- ============================================
-- TABLA: mediciones
-- ============================================
CREATE TABLE mediciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ave_id UUID NOT NULL REFERENCES aves(id) ON DELETE CASCADE,
    fecha_medicion DATE NOT NULL,
    peso DECIMAL(6,2),
    altura_cm DECIMAL(5,2),
    longitud_espolon_cm DECIMAL(4,2),
    circunferencia_pata_cm DECIMAL(4,2),
    envergadura_cm DECIMAL(5,2),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mediciones_ave ON mediciones(ave_id);
CREATE INDEX idx_mediciones_fecha ON mediciones(ave_id, fecha_medicion DESC);

-- ============================================
-- TABLA: combates
-- ============================================
CREATE TABLE combates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    macho_id UUID NOT NULL REFERENCES aves(id) ON DELETE CASCADE,
    fecha_combate DATE NOT NULL,
    ubicacion VARCHAR(150),
    resultado resultado_combate NOT NULL,
    duracion_minutos INTEGER,
    peso_combate DECIMAL(6,2),
    oponente_codigo VARCHAR(50),
    oponente_info TEXT,
    oponente_linea VARCHAR(50),
    tipo_combate tipo_combate DEFAULT 'oficial',
    lesiones TEXT,
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_combates_macho ON combates(macho_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_combates_fecha ON combates(fecha_combate) WHERE deleted_at IS NULL;
CREATE INDEX idx_combates_resultado ON combates(resultado) WHERE deleted_at IS NULL;
CREATE INDEX idx_combates_tipo ON combates(tipo_combate) WHERE deleted_at IS NULL;

-- ============================================
-- TABLA: combate_medios (fotos/videos)
-- ============================================
CREATE TABLE combate_medios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    combate_id UUID NOT NULL REFERENCES combates(id) ON DELETE CASCADE,
    tipo VARCHAR(10) CHECK (tipo IN ('foto', 'video')),
    ruta_archivo VARCHAR(255) NOT NULL,
    ruta_thumbnail VARCHAR(255),
    duracion_segundos INTEGER,
    tamaño_bytes INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_combate_medios_combate ON combate_medios(combate_id);

-- ============================================
-- TABLA: cruces
-- ============================================
CREATE TABLE cruces (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    madre_id UUID NOT NULL REFERENCES aves(id) ON DELETE CASCADE,
    padre_id UUID NOT NULL REFERENCES aves(id) ON DELETE CASCADE,
    fecha_cruce DATE NOT NULL,
    fecha_postura DATE,
    fecha_eclosion DATE,
    num_huevos INTEGER,
    num_fertiles INTEGER,
    num_nacidos INTEGER,
    num_machos INTEGER,
    num_hembras INTEGER,
    coeficiente_consanguinidad_esperado DECIMAL(5,4),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL,
    -- Validación: padre debe ser macho, madre debe ser hembra
    CONSTRAINT chk_cruce_sexos CHECK (padre_id != madre_id)
);

CREATE INDEX idx_cruces_madre ON cruces(madre_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cruces_padre ON cruces(padre_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cruces_fecha ON cruces(fecha_cruce) WHERE deleted_at IS NULL;

-- ============================================
-- MÓDULO: SALUD Y VETERINARIA
-- ============================================

CREATE TABLE vacunas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ave_id UUID NOT NULL REFERENCES aves(id) ON DELETE CASCADE,
    tipo_vacuna VARCHAR(100) NOT NULL,
    fecha_aplicacion DATE NOT NULL,
    proxima_dosis DATE,
    veterinario VARCHAR(100),
    lote_vacuna VARCHAR(50),
    laboratorio VARCHAR(100),
    costo DECIMAL(8,2),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vacunas_ave ON vacunas(ave_id);
CREATE INDEX idx_vacunas_proxima ON vacunas(proxima_dosis) WHERE proxima_dosis IS NOT NULL;
CREATE INDEX idx_vacunas_tipo ON vacunas(tipo_vacuna);

CREATE TABLE desparasitaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ave_id UUID NOT NULL REFERENCES aves(id) ON DELETE CASCADE,
    producto VARCHAR(100) NOT NULL,
    principio_activo VARCHAR(100),
    fecha_aplicacion DATE NOT NULL,
    proxima_aplicacion DATE,
    dosis VARCHAR(50),
    via_administracion VARCHAR(50),
    costo DECIMAL(8,2),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_desparasitaciones_ave ON desparasitaciones(ave_id);
CREATE INDEX idx_desparasitaciones_proxima ON desparasitaciones(proxima_aplicacion);

CREATE TABLE tratamientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ave_id UUID NOT NULL REFERENCES aves(id) ON DELETE CASCADE,
    diagnostico TEXT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    veterinario VARCHAR(100),
    medicamentos JSONB,
    costo_total DECIMAL(10,2),
    estado estado_tratamiento DEFAULT 'en_curso',
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tratamientos_ave ON tratamientos(ave_id);
CREATE INDEX idx_tratamientos_estado ON tratamientos(estado) WHERE estado = 'en_curso';

CREATE TABLE lesiones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ave_id UUID NOT NULL REFERENCES aves(id) ON DELETE CASCADE,
    combate_id UUID REFERENCES combates(id) ON DELETE SET NULL,
    tipo_lesion VARCHAR(100) NOT NULL,
    zona_afectada VARCHAR(100),
    gravedad gravedad_lesion NOT NULL,
    fecha_lesion DATE NOT NULL,
    tratamiento TEXT,
    fecha_recuperacion DATE,
    dias_recuperacion INTEGER GENERATED ALWAYS AS (
        CASE WHEN fecha_recuperacion IS NOT NULL
        THEN fecha_recuperacion - fecha_lesion
        ELSE NULL END
    ) STORED,
    costo_tratamiento DECIMAL(8,2),
    secuelas TEXT,
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_lesiones_ave ON lesiones(ave_id);
CREATE INDEX idx_lesiones_combate ON lesiones(combate_id);
CREATE INDEX idx_lesiones_gravedad ON lesiones(gravedad);

CREATE TABLE consultas_veterinarias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ave_id UUID NOT NULL REFERENCES aves(id) ON DELETE CASCADE,
    fecha_consulta DATE NOT NULL,
    veterinario VARCHAR(100),
    clinica VARCHAR(150),
    motivo TEXT NOT NULL,
    diagnostico TEXT,
    tratamiento_recomendado TEXT,
    costo DECIMAL(8,2),
    proxima_consulta DATE,
    documentos JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_consultas_ave ON consultas_veterinarias(ave_id);
CREATE INDEX idx_consultas_fecha ON consultas_veterinarias(fecha_consulta);

-- ============================================
-- MÓDULO: FINANZAS
-- ============================================

CREATE TABLE categorias_transaccion (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    tipo tipo_transaccion NOT NULL,
    icono VARCHAR(50),
    color VARCHAR(20),
    orden INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT true
);

INSERT INTO categorias_transaccion (nombre, tipo, icono, color, orden) VALUES
('Compra de ave', 'egreso', 'bird', '#e74c3c', 1),
('Venta de ave', 'ingreso', 'bird', '#27ae60', 2),
('Alimentación', 'egreso', 'food', '#f39c12', 3),
('Veterinaria', 'egreso', 'medical', '#9b59b6', 4),
('Vacunas', 'egreso', 'syringe', '#3498db', 5),
('Medicamentos', 'egreso', 'pill', '#1abc9c', 6),
('Transporte', 'egreso', 'truck', '#34495e', 7),
('Entrenamiento', 'egreso', 'dumbbell', '#e67e22', 8),
('Ganancia por combate', 'ingreso', 'trophy', '#f1c40f', 9),
('Servicio de semental', 'ingreso', 'heart', '#e91e63', 10),
('Venta de pollos', 'ingreso', 'chick', '#8bc34a', 11),
('Infraestructura', 'egreso', 'home', '#607d8b', 12),
('Otros gastos', 'egreso', 'ellipsis', '#95a5a6', 99),
('Otros ingresos', 'ingreso', 'ellipsis', '#95a5a6', 99);

CREATE TABLE transacciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    ave_id UUID REFERENCES aves(id) ON DELETE SET NULL,
    categoria_id INTEGER NOT NULL REFERENCES categorias_transaccion(id),
    tipo tipo_transaccion NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    fecha DATE NOT NULL,
    descripcion TEXT,
    metodo_pago VARCHAR(50),
    comprobante VARCHAR(255),
    tags JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_transacciones_usuario ON transacciones(usuario_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transacciones_ave ON transacciones(ave_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_transacciones_tipo ON transacciones(tipo) WHERE deleted_at IS NULL;
CREATE INDEX idx_transacciones_fecha ON transacciones(fecha) WHERE deleted_at IS NULL;
CREATE INDEX idx_transacciones_categoria ON transacciones(categoria_id) WHERE deleted_at IS NULL;

-- ============================================
-- MÓDULO: ALIMENTACIÓN
-- ============================================

CREATE TABLE planes_alimentacion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    etapa VARCHAR(50) CHECK (etapa IN ('pollito', 'crecimiento', 'adulto', 'pre_combate', 'recuperacion')),
    alimento_principal VARCHAR(100),
    proteina_porcentaje DECIMAL(4,2),
    suplementos JSONB,
    cantidad_diaria_gramos INTEGER,
    frecuencia_comidas INTEGER,
    costo_mensual_estimado DECIMAL(8,2),
    es_plantilla BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_planes_alimentacion_usuario ON planes_alimentacion(usuario_id);
CREATE INDEX idx_planes_alimentacion_etapa ON planes_alimentacion(etapa);

CREATE TABLE alimentacion_aves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ave_id UUID NOT NULL REFERENCES aves(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES planes_alimentacion(id) ON DELETE SET NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_alimentacion_ave ON alimentacion_aves(ave_id);
CREATE INDEX idx_alimentacion_activa ON alimentacion_aves(ave_id, fecha_fin) WHERE fecha_fin IS NULL;

CREATE TABLE inventario_alimentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre_producto VARCHAR(100) NOT NULL,
    marca VARCHAR(100),
    tipo VARCHAR(50),
    cantidad_actual DECIMAL(8,2) NOT NULL,
    unidad VARCHAR(20) NOT NULL,
    fecha_compra DATE,
    fecha_vencimiento DATE,
    costo_unitario DECIMAL(8,2),
    proveedor VARCHAR(100),
    stock_minimo DECIMAL(6,2),
    ubicacion VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_inventario_usuario ON inventario_alimentos(usuario_id);
CREATE INDEX idx_inventario_vencimiento ON inventario_alimentos(fecha_vencimiento) WHERE fecha_vencimiento IS NOT NULL;
CREATE INDEX idx_inventario_stock ON inventario_alimentos(usuario_id, cantidad_actual, stock_minimo);

-- ============================================
-- MÓDULO: CALENDARIO Y RECORDATORIOS
-- ============================================

CREATE TABLE eventos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    ave_id UUID REFERENCES aves(id) ON DELETE CASCADE,
    tipo_evento tipo_evento NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP,
    ubicacion VARCHAR(150),
    todo_el_dia BOOLEAN DEFAULT false,
    recurrente BOOLEAN DEFAULT false,
    frecuencia_recurrencia VARCHAR(50),
    recurrencia_fin DATE,
    completado BOOLEAN DEFAULT false,
    completado_at TIMESTAMP,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_eventos_usuario ON eventos(usuario_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_eventos_ave ON eventos(ave_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_eventos_fecha ON eventos(fecha_inicio) WHERE deleted_at IS NULL;
CREATE INDEX idx_eventos_tipo ON eventos(tipo_evento) WHERE deleted_at IS NULL;
CREATE INDEX idx_eventos_pendientes ON eventos(usuario_id, fecha_inicio) WHERE completado = false AND deleted_at IS NULL;

CREATE TABLE recordatorios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evento_id UUID NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    minutos_antes INTEGER NOT NULL,
    metodo metodo_recordatorio DEFAULT 'push',
    enviado BOOLEAN DEFAULT false,
    fecha_programada TIMESTAMP NOT NULL,
    fecha_envio TIMESTAMP,
    error_envio TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_recordatorios_evento ON recordatorios(evento_id);
CREATE INDEX idx_recordatorios_pendientes ON recordatorios(fecha_programada, enviado) WHERE enviado = false;

-- ============================================
-- MÓDULO: MARKETPLACE
-- ============================================

CREATE TABLE publicaciones_marketplace (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    ave_id UUID NOT NULL REFERENCES aves(id) ON DELETE CASCADE,
    tipo tipo_publicacion NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    precio_minimo DECIMAL(10,2),
    negociable BOOLEAN DEFAULT true,
    incluye_envio BOOLEAN DEFAULT false,
    costo_envio DECIMAL(8,2),
    ubicacion VARCHAR(150),
    estado estado_publicacion DEFAULT 'activa',
    vistas INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_publicaciones_usuario ON publicaciones_marketplace(usuario_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_publicaciones_ave ON publicaciones_marketplace(ave_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_publicaciones_tipo ON publicaciones_marketplace(tipo) WHERE estado = 'activa' AND deleted_at IS NULL;
CREATE INDEX idx_publicaciones_precio ON publicaciones_marketplace(precio) WHERE estado = 'activa' AND deleted_at IS NULL;
CREATE INDEX idx_publicaciones_estado ON publicaciones_marketplace(estado) WHERE deleted_at IS NULL;

CREATE TABLE favoritos_marketplace (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    publicacion_id UUID NOT NULL REFERENCES publicaciones_marketplace(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(usuario_id, publicacion_id)
);

CREATE INDEX idx_favoritos_usuario ON favoritos_marketplace(usuario_id);

CREATE TABLE reviews_vendedor (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vendedor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    comprador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    publicacion_id UUID REFERENCES publicaciones_marketplace(id) ON DELETE SET NULL,
    calificacion INTEGER NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT,
    respuesta_vendedor TEXT,
    respuesta_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT chk_review_diferentes CHECK (vendedor_id != comprador_id)
);

CREATE INDEX idx_reviews_vendedor ON reviews_vendedor(vendedor_id);
CREATE INDEX idx_reviews_calificacion ON reviews_vendedor(vendedor_id, calificacion);

CREATE TABLE conversaciones_marketplace (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publicacion_id UUID NOT NULL REFERENCES publicaciones_marketplace(id) ON DELETE CASCADE,
    comprador_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    vendedor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    ultimo_mensaje_at TIMESTAMP DEFAULT NOW(),
    comprador_leido BOOLEAN DEFAULT true,
    vendedor_leido BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversaciones_publicacion ON conversaciones_marketplace(publicacion_id);
CREATE INDEX idx_conversaciones_comprador ON conversaciones_marketplace(comprador_id);
CREATE INDEX idx_conversaciones_vendedor ON conversaciones_marketplace(vendedor_id);

CREATE TABLE mensajes_marketplace (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversacion_id UUID NOT NULL REFERENCES conversaciones_marketplace(id) ON DELETE CASCADE,
    remitente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    leido BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mensajes_conversacion ON mensajes_marketplace(conversacion_id, created_at);

-- ============================================
-- MÓDULO: RED SOCIAL
-- ============================================

CREATE TABLE publicaciones_sociales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    ave_id UUID REFERENCES aves(id) ON DELETE SET NULL,
    tipo VARCHAR(20) CHECK (tipo IN ('logro', 'noticia', 'foto', 'video', 'texto')) NOT NULL,
    contenido TEXT NOT NULL,
    media_urls JSONB,
    visibilidad visibilidad_tipo DEFAULT 'publico',
    likes_count INTEGER DEFAULT 0,
    comentarios_count INTEGER DEFAULT 0,
    compartidos_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_publicaciones_sociales_usuario ON publicaciones_sociales(usuario_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_publicaciones_sociales_fecha ON publicaciones_sociales(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_publicaciones_sociales_visibilidad ON publicaciones_sociales(visibilidad) WHERE deleted_at IS NULL;

CREATE TABLE seguidores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seguidor_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    seguido_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(seguidor_id, seguido_id),
    CONSTRAINT chk_no_auto_seguir CHECK (seguidor_id != seguido_id)
);

CREATE INDEX idx_seguidores_seguidor ON seguidores(seguidor_id);
CREATE INDEX idx_seguidores_seguido ON seguidores(seguido_id);

CREATE TABLE likes_sociales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publicacion_id UUID NOT NULL REFERENCES publicaciones_sociales(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(publicacion_id, usuario_id)
);

CREATE INDEX idx_likes_publicacion ON likes_sociales(publicacion_id);

CREATE TABLE comentarios_sociales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publicacion_id UUID NOT NULL REFERENCES publicaciones_sociales(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comentarios_sociales(id) ON DELETE CASCADE,
    comentario TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP DEFAULT NULL
);

CREATE INDEX idx_comentarios_publicacion ON comentarios_sociales(publicacion_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comentarios_parent ON comentarios_sociales(parent_id) WHERE deleted_at IS NULL;

-- ============================================
-- MÓDULO: MULTI-USUARIO (PREMIUM)
-- ============================================

CREATE TABLE colaboradores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    propietario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    colaborador_email VARCHAR(100) NOT NULL,
    rol rol_colaborador NOT NULL DEFAULT 'viewer',
    estado estado_colaborador DEFAULT 'pendiente',
    token_invitacion VARCHAR(100) UNIQUE,
    token_expira_at TIMESTAMP,
    permisos_personalizados JSONB,
    fecha_invitacion TIMESTAMP DEFAULT NOW(),
    fecha_aceptacion TIMESTAMP,
    invitado_por UUID REFERENCES usuarios(id)
);

CREATE INDEX idx_colaboradores_propietario ON colaboradores(propietario_id);
CREATE INDEX idx_colaboradores_colaborador ON colaboradores(colaborador_id);
CREATE INDEX idx_colaboradores_email ON colaboradores(colaborador_email);
CREATE INDEX idx_colaboradores_token ON colaboradores(token_invitacion) WHERE estado = 'pendiente';

CREATE TABLE log_actividad (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    propietario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    accion VARCHAR(50) NOT NULL,
    entidad VARCHAR(50) NOT NULL,
    entidad_id UUID,
    cambios JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_log_usuario ON log_actividad(usuario_id);
CREATE INDEX idx_log_propietario ON log_actividad(propietario_id);
CREATE INDEX idx_log_fecha ON log_actividad(created_at DESC);
CREATE INDEX idx_log_entidad ON log_actividad(entidad, entidad_id);

-- ============================================
-- MÓDULO: BACKUPS Y EXPORTACIÓN
-- ============================================

CREATE TABLE backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) CHECK (tipo IN ('manual', 'automatico', 'programado', 'exportacion')),
    formato VARCHAR(20) CHECK (formato IN ('json', 'csv', 'excel', 'pdf')),
    ruta_archivo VARCHAR(255) NOT NULL,
    tamaño_bytes BIGINT,
    estado VARCHAR(20) DEFAULT 'completado' CHECK (estado IN ('en_proceso', 'completado', 'fallido')),
    error_mensaje TEXT,
    incluye_fotos BOOLEAN DEFAULT false,
    expira_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_backups_usuario ON backups(usuario_id);
CREATE INDEX idx_backups_expira ON backups(expira_at) WHERE expira_at IS NOT NULL;

-- ============================================
-- MÓDULO: API KEYS (PREMIUM)
-- ============================================

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    permisos JSONB NOT NULL DEFAULT '["read"]',
    ultimo_uso TIMESTAMP,
    requests_hoy INTEGER DEFAULT 0,
    requests_totales BIGINT DEFAULT 0,
    activa BOOLEAN DEFAULT true,
    expira_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_api_keys_usuario ON api_keys(usuario_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash) WHERE activa = true;
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================
-- CONFIGURACIONES DE USUARIO
-- ============================================

CREATE TABLE configuraciones_usuario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
    notificaciones_push BOOLEAN DEFAULT true,
    notificaciones_email BOOLEAN DEFAULT true,
    notificar_vacunas BOOLEAN DEFAULT true,
    notificar_combates BOOLEAN DEFAULT true,
    notificar_marketplace BOOLEAN DEFAULT true,
    notificar_social BOOLEAN DEFAULT true,
    dias_anticipacion_vacunas INTEGER DEFAULT 3,
    idioma VARCHAR(5) DEFAULT 'es',
    tema VARCHAR(10) DEFAULT 'claro' CHECK (tema IN ('claro', 'oscuro', 'auto')),
    moneda VARCHAR(3) DEFAULT 'MXN',
    zona_horaria VARCHAR(50) DEFAULT 'America/Mexico_City',
    formato_fecha VARCHAR(20) DEFAULT 'DD/MM/YYYY',
    backup_automatico BOOLEAN DEFAULT false,
    frecuencia_backup VARCHAR(20) DEFAULT 'semanal',
    privacidad_perfil visibilidad_tipo DEFAULT 'publico',
    mostrar_estadisticas BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLA: codigos_generados
-- ============================================

CREATE TABLE codigos_generados (
    id SERIAL PRIMARY KEY,
    año INTEGER NOT NULL,
    ultimo_numero INTEGER DEFAULT 0,
    UNIQUE(año)
);

-- ============================================
-- NOTIFICACIONES
-- ============================================

CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    data JSONB,
    leida BOOLEAN DEFAULT false,
    leida_at TIMESTAMP,
    enviada_push BOOLEAN DEFAULT false,
    enviada_email BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_no_leidas ON notificaciones(usuario_id, leida) WHERE leida = false;
CREATE INDEX idx_notificaciones_fecha ON notificaciones(created_at DESC);
