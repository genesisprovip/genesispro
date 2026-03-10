export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  foto_perfil?: string;
  plan: 'basico' | 'pro' | 'premium';
  plan_actual?: 'basico' | 'pro' | 'premium';
  plan_elegido?: 'basico' | 'pro' | 'premium';
  estado_cuenta?: 'trial' | 'activa' | 'activo' | 'vencido' | 'suspendido';
  trial_inicio?: string;
  trial_fin?: string;
  trial_dias_restantes?: number;
  fecha_registro: string;
  plan_empresario?: 'empresario_basico' | 'empresario_pro' | 'empresario_premium' | null;
}

export interface ComposicionGenetica {
  linea: string;
  fraccion: string;
  decimal: number;
  via?: string; // 'padre', 'madre', 'padre+madre', 'puro'
}

export interface Ave {
  id: string;
  codigo_identidad: string;
  sexo: 'M' | 'H';
  fecha_nacimiento: string;
  color?: string;
  linea_genetica?: string;
  peso_nacimiento?: number;
  peso_3meses?: number;
  peso_actual?: number;
  estado: 'activo' | 'vendido' | 'muerto' | 'retirado';
  disponible_venta: boolean;
  precio_venta?: number;
  foto_principal?: string;
  notas?: string;
  padre_id?: string;
  madre_id?: string;
  // Composición genética
  composicion_genetica?: ComposicionGenetica[];
  es_puro?: boolean;
  // Origen
  criadero_origen?: string;
  criador_nombre?: string;
  fecha_adquisicion?: string;
  tipo_adquisicion?: 'cria_propia' | 'compra' | 'regalo' | 'intercambio';
  notas_origen?: string;
  created_at: string;
  updated_at: string;
}

export interface Combate {
  id: string;
  ave_id: string;
  fecha: string;
  ubicacion: string;
  oponente_codigo?: string;
  peso_combate: number;
  peso_oponente?: number;
  resultado: 'victoria' | 'derrota' | 'empate' | 'cancelado';
  duracion_minutos?: number;
  tipo_victoria?: string;
  notas?: string;
  created_at: string;
  // Legacy aliases (local data may still use these)
  lugar?: string;
  oponente_info?: string;
  peso_ave?: number;
}

export interface RegistroSalud {
  id: string;
  ave_id: string;
  tipo: 'vacuna' | 'tratamiento' | 'enfermedad' | 'revision';
  nombre: string;
  fecha: string;
  fecha_proxima?: string;
  descripcion?: string;
  veterinario?: string;
  costo?: number;
  created_at: string;
}

export interface Transaccion {
  id: string;
  tipo: 'ingreso' | 'egreso';
  categoria: string;
  monto: number;
  fecha: string;
  descripcion?: string;
  ave_id?: string;
  created_at: string;
}

export interface Evento {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  tipo: 'vacuna' | 'combate' | 'revision' | 'otro';
  ave_id?: string;
  completado: boolean;
  created_at: string;
}

export interface DashboardStats {
  totalAves: number;
  avesActivas: number;
  combatesMes: number;
  victoriasMes: number;
  derrotasMes: number;
  porcentajeVictorias: number;
  roiGlobal: number;
  alertasPendientes: number;
}

export interface Alerta {
  id: string;
  tipo: 'vacuna' | 'combate' | 'salud' | 'otro';
  mensaje: string;
  fecha: string;
  ave_id?: string;
}

export interface FotoAve {
  id: string;
  ave_id: string;
  url: string;
  es_principal: boolean;
  descripcion?: string;
  fecha: string;
}
