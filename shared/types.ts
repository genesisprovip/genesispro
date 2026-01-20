/**
 * GenesisPro - Tipos Compartidos v2.0
 * Estos tipos son compartidos entre Backend y Frontend
 * Mantener sincronizados ambos lados
 */

// ============================================
// TIPOS BASE
// ============================================

export type UUID = string;

export type PlanTipo = 'basico' | 'pro' | 'premium';
export type SexoTipo = 'M' | 'H';
export type EstadoAve = 'activo' | 'vendido' | 'fallecido' | 'prestamo';
export type ResultadoCombate = 'victoria' | 'empate' | 'derrota';
export type TipoCombate = 'oficial' | 'entrenamiento' | 'amistoso';
export type TipoTransaccion = 'ingreso' | 'egreso';
export type GravedadLesion = 'leve' | 'moderada' | 'grave';
export type EstadoTratamiento = 'en_curso' | 'completado' | 'suspendido';
export type EstadoSuscripcion = 'activa' | 'cancelada' | 'expirada' | 'pendiente';
export type EstadoPago = 'pendiente' | 'completado' | 'fallido' | 'reembolsado';
export type TipoEvento = 'combate' | 'vacuna' | 'desparasitacion' | 'cruce' | 'medicion' | 'consulta' | 'otro';
export type MetodoRecordatorio = 'push' | 'email' | 'ambos';
export type TipoPublicacion = 'venta' | 'semental';
export type EstadoPublicacion = 'activa' | 'vendida' | 'pausada' | 'cancelada';
export type VisibilidadTipo = 'publico' | 'seguidores' | 'privado';
export type RolColaborador = 'admin' | 'editor' | 'viewer';
export type EstadoColaborador = 'pendiente' | 'activo' | 'revocado';
export type TemaTipo = 'claro' | 'oscuro' | 'auto';

// ============================================
// RESPUESTAS DE API
// ============================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    field?: string; // Para errores de validación
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Códigos de error estándar
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'LIMIT_EXCEEDED'
  | 'SUBSCRIPTION_EXPIRED'
  | 'SUBSCRIPTION_REQUIRED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'EMAIL_NOT_VERIFIED'
  | 'INVALID_CREDENTIALS'
  | 'DUPLICATE_ENTRY';

// ============================================
// AUTENTICACIÓN
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
  device_info?: DeviceInfo;
}

export interface LoginResponse {
  user: Usuario;
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number; // segundos
  };
}

export interface RegisterRequest {
  email: string;
  password: string;
  nombre: string;
  telefono?: string;
  ubicacion?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  device_name?: string;
  app_version?: string;
  os_version?: string;
}

// ============================================
// USUARIO
// ============================================

export interface Usuario {
  id: UUID;
  email: string;
  nombre: string | null;
  telefono: string | null;
  ubicacion: string | null;
  foto_perfil: string | null;
  email_verificado: boolean;
  plan_actual: PlanTipo;
  created_at: string;
}

export interface UsuarioCompleto extends Usuario {
  suscripcion?: Suscripcion;
  limites: LimitesUsuario;
  configuracion: ConfiguracionUsuario;
}

export interface LimitesUsuario {
  max_aves: number | null;
  max_fotos_por_ave: number | null;
  max_combates: number | null;
  profundidad_genealogia: number | null;
  analytics_avanzado: boolean;
  multi_usuario: boolean;
  max_colaboradores: number;
  exportacion: boolean;
  api_access: boolean;
  api_requests_por_dia: number;
  marketplace_sin_comision: boolean;
  suscripcion_valida: boolean;
  aves_actuales: number;
  colaboradores_actuales: number;
}

export interface ConfiguracionUsuario {
  notificaciones_push: boolean;
  notificaciones_email: boolean;
  notificar_vacunas: boolean;
  notificar_combates: boolean;
  notificar_marketplace: boolean;
  notificar_social: boolean;
  dias_anticipacion_vacunas: number;
  idioma: string;
  tema: TemaTipo;
  moneda: string;
  zona_horaria: string;
  formato_fecha: string;
  backup_automatico: boolean;
  frecuencia_backup: string;
  privacidad_perfil: VisibilidadTipo;
  mostrar_estadisticas: boolean;
}

export interface ActualizarPerfilRequest {
  nombre?: string;
  telefono?: string;
  ubicacion?: string;
}

export interface CambiarPasswordRequest {
  password_actual: string;
  password_nuevo: string;
}

// ============================================
// AVES
// ============================================

export interface Ave {
  id: UUID;
  codigo_identidad: string;
  usuario_id: UUID;
  sexo: SexoTipo;
  fecha_nacimiento: string;
  peso_nacimiento: number | null;
  peso_actual: number | null;
  padre_id: UUID | null;
  madre_id: UUID | null;
  linea_genetica: string | null;
  color: string | null;
  estado: EstadoAve;
  precio_compra: number | null;
  precio_venta: number | null;
  disponible_venta: boolean;
  disponible_cruces: boolean;
  notas: string | null;
  qr_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface AveConRelaciones extends Ave {
  padre?: AveResumen | null;
  madre?: AveResumen | null;
  fotos: Foto[];
  foto_principal?: Foto | null;
  estadisticas_combate?: EstadisticasCombate | null;
  edad: EdadAve;
}

export interface AveResumen {
  id: UUID;
  codigo_identidad: string;
  sexo: SexoTipo;
  color: string | null;
  linea_genetica: string | null;
}

export interface EdadAve {
  años: number;
  meses: number;
  dias: number;
  total_meses: number;
  total_dias: number;
  descripcion: string;
}

export interface CrearAveRequest {
  sexo: SexoTipo;
  fecha_nacimiento: string;
  peso_nacimiento?: number;
  padre_id?: UUID;
  madre_id?: UUID;
  linea_genetica?: string;
  color?: string;
  precio_compra?: number;
  notas?: string;
}

export interface ActualizarAveRequest {
  sexo?: SexoTipo;
  fecha_nacimiento?: string;
  padre_id?: UUID | null;
  madre_id?: UUID | null;
  linea_genetica?: string;
  color?: string;
  estado?: EstadoAve;
  precio_compra?: number;
  precio_venta?: number;
  disponible_venta?: boolean;
  disponible_cruces?: boolean;
  notas?: string;
}

export interface BuscarAvesParams {
  q?: string;
  sexo?: SexoTipo;
  estado?: EstadoAve;
  linea_genetica?: string;
  color?: string;
  edad_min_meses?: number;
  edad_max_meses?: number;
  disponible_venta?: boolean;
  disponible_cruces?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'fecha_nacimiento' | 'codigo_identidad' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// ============================================
// FOTOS
// ============================================

export interface Foto {
  id: UUID;
  ave_id: UUID;
  ruta_archivo: string;
  ruta_thumbnail: string | null;
  nombre_original: string | null;
  descripcion: string | null;
  es_principal: boolean;
  created_at: string;
}

// ============================================
// GENEALOGÍA
// ============================================

export interface NodoGenealogico {
  id: UUID;
  codigo_identidad: string;
  sexo: SexoTipo;
  color: string | null;
  linea_genetica: string | null;
  fecha_nacimiento: string;
  padre_id: UUID | null;
  madre_id: UUID | null;
  nivel: number;
  relacion: string;
  rama: string;
}

export interface ArbolGenealogico {
  ave: AveResumen;
  ancestros: NodoGenealogico[];
  profundidad_max: number;
}

export interface Descendencia {
  ave: AveResumen;
  descendientes: NodoGenealogico[];
  total_hijos: number;
  total_nietos: number;
}

// ============================================
// COMBATES
// ============================================

export interface Combate {
  id: UUID;
  macho_id: UUID;
  fecha_combate: string;
  ubicacion: string | null;
  resultado: ResultadoCombate;
  duracion_minutos: number | null;
  peso_combate: number | null;
  oponente_codigo: string | null;
  oponente_info: string | null;
  oponente_linea: string | null;
  tipo_combate: TipoCombate;
  lesiones: string | null;
  notas: string | null;
  created_at: string;
}

export interface CombateConAve extends Combate {
  macho: AveResumen;
  medios: CombateMedio[];
}

export interface CombateMedio {
  id: UUID;
  combate_id: UUID;
  tipo: 'foto' | 'video';
  ruta_archivo: string;
  ruta_thumbnail: string | null;
  duracion_segundos: number | null;
}

export interface CrearCombateRequest {
  macho_id: UUID;
  fecha_combate: string;
  resultado: ResultadoCombate;
  ubicacion?: string;
  duracion_minutos?: number;
  peso_combate?: number;
  oponente_codigo?: string;
  oponente_info?: string;
  oponente_linea?: string;
  tipo_combate?: TipoCombate;
  lesiones?: string;
  notas?: string;
}

export interface EstadisticasCombate {
  total_combates: number;
  victorias: number;
  empates: number;
  derrotas: number;
  porcentaje_victorias: number;
  porcentaje_empates: number;
  porcentaje_derrotas: number;
  duracion_promedio: number | null;
  duracion_minima: number | null;
  duracion_maxima: number | null;
  racha_actual: number;
  racha_actual_tipo: ResultadoCombate | '';
  mejor_racha_victorias: number;
  ultimo_combate: string | null;
}

export interface RankingPeleador {
  posicion: number;
  ave_id: UUID;
  codigo_identidad: string;
  linea_genetica: string | null;
  total_combates: number;
  victorias: number;
  porcentaje_victorias: number;
  puntuacion: number;
}

// ============================================
// CRUCES
// ============================================

export interface Cruce {
  id: UUID;
  madre_id: UUID;
  padre_id: UUID;
  fecha_cruce: string;
  fecha_postura: string | null;
  fecha_eclosion: string | null;
  num_huevos: number | null;
  num_fertiles: number | null;
  num_nacidos: number | null;
  num_machos: number | null;
  num_hembras: number | null;
  coeficiente_consanguinidad_esperado: number | null;
  notas: string | null;
  created_at: string;
}

export interface CruceConAves extends Cruce {
  madre: AveResumen;
  padre: AveResumen;
  crias?: AveResumen[];
}

export interface ValidacionCruce {
  es_valido: boolean;
  coeficiente: number;
  nivel_riesgo: 'ninguno' | 'bajo' | 'moderado' | 'alto' | 'critico';
  advertencia: string;
  parentesco_cercano: boolean;
}

export interface CrearCruceRequest {
  madre_id: UUID;
  padre_id: UUID;
  fecha_cruce: string;
  num_huevos?: number;
  notas?: string;
}

// ============================================
// SALUD
// ============================================

export interface Vacuna {
  id: UUID;
  ave_id: UUID;
  tipo_vacuna: string;
  fecha_aplicacion: string;
  proxima_dosis: string | null;
  veterinario: string | null;
  lote_vacuna: string | null;
  laboratorio: string | null;
  costo: number | null;
  notas: string | null;
  created_at: string;
}

export interface Desparasitacion {
  id: UUID;
  ave_id: UUID;
  producto: string;
  principio_activo: string | null;
  fecha_aplicacion: string;
  proxima_aplicacion: string | null;
  dosis: string | null;
  via_administracion: string | null;
  costo: number | null;
  notas: string | null;
  created_at: string;
}

export interface Tratamiento {
  id: UUID;
  ave_id: UUID;
  diagnostico: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  veterinario: string | null;
  medicamentos: MedicamentoTratamiento[] | null;
  costo_total: number | null;
  estado: EstadoTratamiento;
  notas: string | null;
  created_at: string;
}

export interface MedicamentoTratamiento {
  nombre: string;
  dosis: string;
  frecuencia: string;
  via: string;
}

export interface Lesion {
  id: UUID;
  ave_id: UUID;
  combate_id: UUID | null;
  tipo_lesion: string;
  zona_afectada: string | null;
  gravedad: GravedadLesion;
  fecha_lesion: string;
  tratamiento: string | null;
  fecha_recuperacion: string | null;
  dias_recuperacion: number | null;
  costo_tratamiento: number | null;
  secuelas: string | null;
  notas: string | null;
  created_at: string;
}

export interface AlertaSalud {
  tipo_alerta: 'vacuna' | 'desparasitacion' | 'tratamiento';
  ave_id: UUID;
  codigo_identidad: string;
  descripcion: string;
  fecha_programada: string;
  dias_restantes: number;
  prioridad: 'urgente' | 'alta' | 'normal';
}

// ============================================
// FINANZAS
// ============================================

export interface CategoriaTransaccion {
  id: number;
  nombre: string;
  tipo: TipoTransaccion;
  icono: string | null;
  color: string | null;
}

export interface Transaccion {
  id: UUID;
  usuario_id: UUID;
  ave_id: UUID | null;
  categoria_id: number;
  tipo: TipoTransaccion;
  monto: number;
  fecha: string;
  descripcion: string | null;
  metodo_pago: string | null;
  comprobante: string | null;
  created_at: string;
}

export interface TransaccionConDetalles extends Transaccion {
  categoria: CategoriaTransaccion;
  ave?: AveResumen | null;
}

export interface CrearTransaccionRequest {
  ave_id?: UUID;
  categoria_id: number;
  tipo: TipoTransaccion;
  monto: number;
  fecha: string;
  descripcion?: string;
  metodo_pago?: string;
}

export interface ROIAve {
  total_ingresos: number;
  total_egresos: number;
  ganancia_neta: number;
  roi_porcentaje: number;
  costo_promedio_mensual: number;
  meses_activo: number;
  desglose_egresos: Record<string, number>;
  desglose_ingresos: Record<string, number>;
}

export interface DashboardFinanciero {
  total_ingresos: number;
  total_egresos: number;
  balance: number;
  ingresos_por_categoria: Record<string, number>;
  egresos_por_categoria: Record<string, number>;
  transacciones_por_mes: Record<string, { ingresos: number; egresos: number }>;
  top_aves_rentables: Array<{
    ave_id: UUID;
    codigo: string;
    ganancia: number;
  }>;
}

// ============================================
// CALENDARIO
// ============================================

export interface Evento {
  id: UUID;
  usuario_id: UUID;
  ave_id: UUID | null;
  tipo_evento: TipoEvento;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  ubicacion: string | null;
  todo_el_dia: boolean;
  recurrente: boolean;
  frecuencia_recurrencia: string | null;
  completado: boolean;
  completado_at: string | null;
  color: string | null;
  created_at: string;
}

export interface EventoConAve extends Evento {
  ave?: AveResumen | null;
}

export interface CrearEventoRequest {
  ave_id?: UUID;
  tipo_evento: TipoEvento;
  titulo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  ubicacion?: string;
  todo_el_dia?: boolean;
  recurrente?: boolean;
  frecuencia_recurrencia?: string;
  color?: string;
}

export interface Recordatorio {
  id: UUID;
  evento_id: UUID;
  minutos_antes: number;
  metodo: MetodoRecordatorio;
  enviado: boolean;
  fecha_programada: string;
}

// ============================================
// SUSCRIPCIONES
// ============================================

export interface Plan {
  id: number;
  nombre: PlanTipo;
  precio_mensual: number;
  precio_anual: number;
  max_aves: number | null;
  max_fotos_por_ave: number | null;
  max_combates: number | null;
  profundidad_genealogia: number | null;
  analytics_avanzado: boolean;
  multi_usuario: boolean;
  max_colaboradores: number;
  exportacion: boolean;
  api_access: boolean;
  api_requests_por_dia: number;
  marketplace_sin_comision: boolean;
  soporte_prioritario: boolean;
}

export interface Suscripcion {
  id: UUID;
  usuario_id: UUID;
  plan_id: number;
  tipo_pago: 'mensual' | 'anual';
  fecha_inicio: string;
  fecha_expiracion: string;
  estado: EstadoSuscripcion;
  auto_renovacion: boolean;
  created_at: string;
}

export interface SuscripcionConPlan extends Suscripcion {
  plan: Plan;
}

export interface CrearSuscripcionRequest {
  plan_id: number;
  tipo_pago: 'mensual' | 'anual';
}

export interface Pago {
  id: UUID;
  suscripcion_id: UUID | null;
  usuario_id: UUID;
  monto: number;
  moneda: string;
  metodo_pago: string | null;
  estado: EstadoPago;
  fecha_pago: string;
  factura_url: string | null;
}

// ============================================
// MARKETPLACE
// ============================================

export interface PublicacionMarketplace {
  id: UUID;
  usuario_id: UUID;
  ave_id: UUID;
  tipo: TipoPublicacion;
  titulo: string;
  descripcion: string | null;
  precio: number;
  precio_minimo: number | null;
  negociable: boolean;
  incluye_envio: boolean;
  costo_envio: number | null;
  ubicacion: string | null;
  estado: EstadoPublicacion;
  vistas: number;
  created_at: string;
}

export interface PublicacionConDetalles extends PublicacionMarketplace {
  ave: AveConRelaciones;
  vendedor: {
    id: UUID;
    nombre: string;
    ubicacion: string | null;
    calificacion_promedio: number;
    total_reviews: number;
  };
  es_favorito?: boolean;
}

export interface CrearPublicacionRequest {
  ave_id: UUID;
  tipo: TipoPublicacion;
  titulo: string;
  descripcion?: string;
  precio: number;
  precio_minimo?: number;
  negociable?: boolean;
  incluye_envio?: boolean;
  costo_envio?: number;
  ubicacion?: string;
}

export interface BuscarPublicacionesParams {
  q?: string;
  tipo?: TipoPublicacion;
  precio_min?: number;
  precio_max?: number;
  linea_genetica?: string;
  ubicacion?: string;
  page?: number;
  limit?: number;
  sort_by?: 'precio' | 'fecha' | 'vistas';
  sort_order?: 'asc' | 'desc';
}

export interface ReviewVendedor {
  id: UUID;
  vendedor_id: UUID;
  comprador_id: UUID;
  calificacion: number;
  comentario: string | null;
  respuesta_vendedor: string | null;
  created_at: string;
}

export interface MensajeMarketplace {
  id: UUID;
  conversacion_id: UUID;
  remitente_id: UUID;
  mensaje: string;
  leido: boolean;
  created_at: string;
}

export interface ConversacionMarketplace {
  id: UUID;
  publicacion_id: UUID;
  comprador_id: UUID;
  vendedor_id: UUID;
  ultimo_mensaje_at: string;
  no_leidos: number;
  publicacion: {
    titulo: string;
    precio: number;
  };
  otro_usuario: {
    id: UUID;
    nombre: string;
    foto_perfil: string | null;
  };
}

// ============================================
// DASHBOARD / ANALYTICS
// ============================================

export interface DashboardUsuario {
  total_aves: number;
  total_machos: number;
  total_hembras: number;
  aves_activas: number;
  total_combates: number;
  total_victorias: number;
  porcentaje_victorias: number;
  total_cruces: number;
  eventos_proximos: number;
  alertas_salud: AlertaSalud[];
  aves_recientes: AveResumen[];
  combates_recientes: CombateConAve[];
}

export interface AnalyticsRendimiento {
  rendimiento_por_linea: Array<{
    linea_genetica: string;
    total_combates: number;
    victorias: number;
    porcentaje: number;
  }>;
  rendimiento_por_edad: Array<{
    rango_edad: string;
    total_combates: number;
    porcentaje_victorias: number;
  }>;
  tendencia_mensual: Array<{
    mes: string;
    combates: number;
    victorias: number;
  }>;
}

// ============================================
// NOTIFICACIONES
// ============================================

export interface Notificacion {
  id: UUID;
  usuario_id: UUID;
  tipo: string;
  titulo: string;
  mensaje: string;
  data: Record<string, unknown> | null;
  leida: boolean;
  leida_at: string | null;
  created_at: string;
}

// ============================================
// COLABORADORES
// ============================================

export interface Colaborador {
  id: UUID;
  propietario_id: UUID;
  colaborador_id: UUID | null;
  colaborador_email: string;
  rol: RolColaborador;
  estado: EstadoColaborador;
  permisos_personalizados: PermisosColaborador | null;
  fecha_invitacion: string;
  fecha_aceptacion: string | null;
}

export interface PermisosColaborador {
  puede_crear_aves: boolean;
  puede_editar_aves: boolean;
  puede_eliminar_aves: boolean;
  puede_ver_finanzas: boolean;
  puede_editar_finanzas: boolean;
  puede_registrar_combates: boolean;
  puede_gestionar_salud: boolean;
}

export interface InvitarColaboradorRequest {
  email: string;
  rol: RolColaborador;
  permisos_personalizados?: PermisosColaborador;
}

// ============================================
// MEDICIONES
// ============================================

export interface Medicion {
  id: UUID;
  ave_id: UUID;
  fecha_medicion: string;
  peso: number | null;
  altura_cm: number | null;
  longitud_espolon_cm: number | null;
  circunferencia_pata_cm: number | null;
  envergadura_cm: number | null;
  notas: string | null;
  created_at: string;
}

export interface CrearMedicionRequest {
  fecha_medicion: string;
  peso?: number;
  altura_cm?: number;
  longitud_espolon_cm?: number;
  circunferencia_pata_cm?: number;
  envergadura_cm?: number;
  notas?: string;
}
