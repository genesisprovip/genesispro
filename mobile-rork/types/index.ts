export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  foto_perfil?: string;
  plan: 'gratuito' | 'basico' | 'profesional' | 'elite';
  fecha_registro: string;
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
  criadero_origen?: string;
  created_at: string;
  updated_at: string;
}

export interface Combate {
  id: string;
  ave_id: string;
  fecha: string;
  lugar: string;
  oponente_info?: string;
  peso_ave: number;
  peso_oponente?: number;
  resultado: 'victoria' | 'derrota' | 'empate' | 'cancelado';
  duracion_minutos?: number;
  tipo_victoria?: string;
  apostado?: number;
  ganado?: number;
  notas?: string;
  created_at: string;
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
