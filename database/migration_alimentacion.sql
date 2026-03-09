-- Migration: Alimentacion module (inventario, registros, dietas)

-- Inventario de alimentos
CREATE TABLE IF NOT EXISTS alimentos (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'otro', -- concentrado, suplemento, vitamina, mineral, otro
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 0,
  unidad VARCHAR(20) NOT NULL DEFAULT 'kg', -- kg, lb, g, litro, unidad
  precio_unitario DECIMAL(10,2),
  fecha_compra DATE,
  fecha_vencimiento DATE,
  proveedor VARCHAR(255),
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Registros de alimentación diarios
CREATE TABLE IF NOT EXISTS registros_alimentacion (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ave_id UUID REFERENCES aves(id) ON DELETE SET NULL,
  alimento_id INTEGER REFERENCES alimentos(id) ON DELETE SET NULL,
  alimento_nombre VARCHAR(255) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  unidad VARCHAR(20) NOT NULL DEFAULT 'kg',
  fecha DATE NOT NULL,
  hora VARCHAR(10),
  tipo_comida VARCHAR(50) NOT NULL DEFAULT 'otro', -- desayuno, almuerzo, cena, suplemento, otro
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Dietas (planes de alimentación)
CREATE TABLE IF NOT EXISTS dietas (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ave_id UUID REFERENCES aves(id) ON DELETE SET NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  alimentos JSONB NOT NULL DEFAULT '[]', -- [{alimento_nombre, cantidad, unidad, frecuencia}]
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alimentos_usuario ON alimentos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_registros_alim_usuario ON registros_alimentacion(usuario_id);
CREATE INDEX IF NOT EXISTS idx_registros_alim_fecha ON registros_alimentacion(usuario_id, fecha);
CREATE INDEX IF NOT EXISTS idx_registros_alim_ave ON registros_alimentacion(ave_id);
CREATE INDEX IF NOT EXISTS idx_dietas_usuario ON dietas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_dietas_ave ON dietas(ave_id);
