import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Play,
  Pause,
  SkipForward,
  Square,
  Trophy,
  Calendar,
  MapPin,
  Users,
  Swords,
  Clock,
  Hash,
  Eye,
  Copy,
  ChevronRight,
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

type EstadoEvento = 'programado' | 'en_curso' | 'pausado' | 'finalizado';

interface Pelea {
  numero: number;
  ave_local?: string;
  ave_visitante?: string;
  resultado?: 'victoria' | 'derrota' | 'empate' | null;
  duracion_minutos?: number;
  estado: 'pendiente' | 'en_curso' | 'finalizada';
  partido_propio?: boolean;
}

interface Participante {
  id: string;
  nombre: string;
  gallos_inscritos: number;
  victorias: number;
  derrotas: number;
}

// TODO: Replace with API call to GET /api/v1/palenque/eventos/:id
const MOCK_EVENTO = {
  id: '1',
  nombre: 'Derby Regional Jalisco',
  fecha: '2026-03-15',
  hora_inicio: '10:00',
  lugar: 'Palenque El Dorado, Guadalajara',
  estado: 'en_curso' as EstadoEvento,
  tipo_derby: '3 cocks',
  reglas: 'Navaja larga, peso libre. Tolerancia 50g.',
  total_peleas: 20,
  pelea_actual: 8,
  es_publico: true,
  codigo_acceso: 'DRJ2026',
  es_organizador: true, // TODO: Determine from auth user
};

// TODO: Replace with API call to GET /api/v1/palenque/eventos/:id/peleas
const MOCK_PELEAS: Pelea[] = [
  { numero: 1, ave_local: 'GP-001', ave_visitante: 'OPP-A1', resultado: 'victoria', duracion_minutos: 12, estado: 'finalizada' },
  { numero: 2, ave_local: 'GP-003', ave_visitante: 'OPP-B2', resultado: 'derrota', duracion_minutos: 8, estado: 'finalizada' },
  { numero: 3, ave_local: 'EXT-05', ave_visitante: 'OPP-C1', resultado: 'victoria', duracion_minutos: 15, estado: 'finalizada' },
  { numero: 4, ave_local: 'GP-007', ave_visitante: 'OPP-D3', resultado: 'empate', duracion_minutos: 20, estado: 'finalizada' },
  { numero: 5, ave_local: 'EXT-02', ave_visitante: 'OPP-E1', resultado: 'victoria', duracion_minutos: 6, estado: 'finalizada' },
  { numero: 6, ave_local: 'GP-012', ave_visitante: 'OPP-F2', resultado: 'victoria', duracion_minutos: 11, estado: 'finalizada' },
  { numero: 7, ave_local: 'EXT-08', ave_visitante: 'OPP-G1', resultado: 'derrota', duracion_minutos: 18, estado: 'finalizada' },
  { numero: 8, ave_local: 'GP-005', ave_visitante: 'OPP-H2', resultado: null, duracion_minutos: undefined, estado: 'en_curso' },
  { numero: 9, ave_local: 'EXT-11', ave_visitante: 'OPP-I3', resultado: null, estado: 'pendiente' },
  { numero: 10, ave_local: 'GP-009', ave_visitante: 'OPP-J1', resultado: null, estado: 'pendiente' },
  { numero: 11, ave_local: 'EXT-03', ave_visitante: 'OPP-K2', resultado: null, estado: 'pendiente' },
  { numero: 12, ave_local: 'GP-015', ave_visitante: 'OPP-L1', resultado: null, estado: 'pendiente', partido_propio: true },
  { numero: 13, ave_local: 'EXT-06', ave_visitante: 'OPP-M3', resultado: null, estado: 'pendiente' },
  { numero: 14, ave_local: 'GP-002', ave_visitante: 'OPP-N1', resultado: null, estado: 'pendiente' },
  { numero: 15, ave_local: 'EXT-09', ave_visitante: 'OPP-O2', resultado: null, estado: 'pendiente' },
  { numero: 16, ave_local: 'GP-011', ave_visitante: 'OPP-P1', resultado: null, estado: 'pendiente' },
  { numero: 17, ave_local: 'EXT-04', ave_visitante: 'OPP-Q3', resultado: null, estado: 'pendiente' },
  { numero: 18, ave_local: 'GP-008', ave_visitante: 'OPP-R2', resultado: null, estado: 'pendiente' },
  { numero: 19, ave_local: 'EXT-07', ave_visitante: 'OPP-S1', resultado: null, estado: 'pendiente' },
  { numero: 20, ave_local: 'GP-014', ave_visitante: 'OPP-T2', resultado: null, estado: 'pendiente' },
];

// TODO: Replace with API call to GET /api/v1/palenque/eventos/:id/participantes
const MOCK_PARTICIPANTES: Participante[] = [
  { id: '1', nombre: 'Rancho Los Gallos', gallos_inscritos: 5, victorias: 3, derrotas: 1 },
  { id: '2', nombre: 'Criadero El Dorado', gallos_inscritos: 4, victorias: 2, derrotas: 2 },
  { id: '3', nombre: 'Hacienda San Pedro', gallos_inscritos: 3, victorias: 1, derrotas: 1 },
  { id: '4', nombre: 'La Herradura GF', gallos_inscritos: 4, victorias: 1, derrotas: 2 },
  { id: '5', nombre: 'Mi Gallera', gallos_inscritos: 4, victorias: 3, derrotas: 1 },
];

const RESULTADO_CONFIG = {
  victoria: { color: COLORS.success, label: 'V', bg: COLORS.success + '20' },
  derrota: { color: COLORS.error, label: 'D', bg: COLORS.error + '20' },
  empate: { color: COLORS.warning, label: 'E', bg: COLORS.warning + '20' },
};

const ESTADO_COLOR: Record<EstadoEvento, string> = {
  programado: COLORS.info,
  en_curso: COLORS.success,
  pausado: COLORS.warning,
  finalizado: COLORS.textSecondary,
};

const ESTADO_LABEL: Record<EstadoEvento, string> = {
  programado: 'Programado',
  en_curso: 'En Curso',
  pausado: 'Pausado',
  finalizado: 'Finalizado',
};

export default function PalenqueDetalleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  // TODO: Fetch event data from API using id
  const [evento, setEvento] = useState(MOCK_EVENTO);
  const [peleas] = useState(MOCK_PELEAS);
  const [participantes] = useState(MOCK_PARTICIPANTES);

  const completedPeleas = peleas.filter(p => p.estado === 'finalizada').length;
  const victorias = peleas.filter(p => p.resultado === 'victoria').length;
  const derrotas = peleas.filter(p => p.resultado === 'derrota').length;

  // Find user's next fight (partido propio)
  const miPelea = peleas.find(p => p.partido_propio && p.estado === 'pendiente');
  const peleasFaltantes = miPelea
    ? miPelea.numero - (evento.pelea_actual || 0)
    : null;

  const estadoColor = ESTADO_COLOR[evento.estado];

  // TODO: Replace with API calls
  const handleIniciarEvento = () => {
    Alert.alert('Iniciar Evento', 'Se iniciará el evento y se activará la primera pelea.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Iniciar',
        onPress: () => {
          setEvento(prev => ({ ...prev, estado: 'en_curso', pelea_actual: 1 }));
        },
      },
    ]);
  };

  const handleSiguientePelea = () => {
    // TODO: API call to POST /api/v1/palenque/eventos/:id/siguiente-pelea
    Alert.alert(
      'Siguiente Pelea',
      `Avanzar a la pelea ${(evento.pelea_actual || 0) + 1}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Avanzar',
          onPress: () => {
            setEvento(prev => ({
              ...prev,
              pelea_actual: (prev.pelea_actual || 0) + 1,
            }));
          },
        },
      ]
    );
  };

  const handlePausar = () => {
    // TODO: API call to POST /api/v1/palenque/eventos/:id/pausar
    setEvento(prev => ({
      ...prev,
      estado: prev.estado === 'pausado' ? 'en_curso' : 'pausado',
    }));
  };

  const handleFinalizar = () => {
    // TODO: API call to POST /api/v1/palenque/eventos/:id/finalizar
    Alert.alert('Finalizar Evento', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: () => {
          setEvento(prev => ({ ...prev, estado: 'finalizado', pelea_actual: null }));
        },
      },
    ]);
  };

  const handleCopyCodigo = () => {
    // TODO: Use Clipboard API
    Alert.alert('Copiado', `Código: ${evento.codigo_acceso}`);
  };

  return (
    <View style={styles.container}>
      {/* Dark Header */}
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color={COLORS.textLight} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>{evento.nombre}</Text>
            <View style={styles.headerMeta}>
              <MapPin size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.headerSubtitle} numberOfLines={1}>{evento.lugar}</Text>
            </View>
          </View>
          <View style={[styles.statusBadgeHeader, { backgroundColor: estadoColor + '30' }]}>
            <View style={[styles.statusDot, { backgroundColor: estadoColor }]} />
            <Text style={[styles.statusBadgeText, { color: estadoColor }]}>
              {ESTADO_LABEL[evento.estado]}
            </Text>
          </View>
        </View>

        <View style={styles.headerDetails}>
          <View style={styles.headerDetailItem}>
            <Calendar size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.headerDetailText}>
              {new Date(evento.fecha).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.headerDetailItem}>
            <Clock size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.headerDetailText}>{evento.hora_inicio}</Text>
          </View>
          <View style={styles.headerDetailItem}>
            <Trophy size={14} color={COLORS.secondary} />
            <Text style={styles.headerDetailText}>{evento.tipo_derby}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Counter */}
        {(evento.estado === 'en_curso' || evento.estado === 'pausado') && evento.pelea_actual && (
          <View style={[styles.liveCounterCard, SHADOWS.md]}>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>EN VIVO</Text>
            </View>
            <Text style={styles.liveCounterLabel}>Pelea</Text>
            <Text style={styles.liveCounterNumber}>{evento.pelea_actual}</Text>
            <Text style={styles.liveCounterTotal}>de {evento.total_peleas}</Text>
            <View style={styles.liveProgressContainer}>
              <View
                style={[
                  styles.liveProgressBar,
                  { width: `${(completedPeleas / evento.total_peleas) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.liveStatsRow}>
              <View style={styles.liveStat}>
                <Text style={[styles.liveStatValue, { color: COLORS.success }]}>{victorias}</Text>
                <Text style={styles.liveStatLabel}>V</Text>
              </View>
              <View style={styles.liveStat}>
                <Text style={[styles.liveStatValue, { color: COLORS.error }]}>{derrotas}</Text>
                <Text style={styles.liveStatLabel}>D</Text>
              </View>
              <View style={styles.liveStat}>
                <Text style={styles.liveStatValue}>{completedPeleas}</Text>
                <Text style={styles.liveStatLabel}>Jugadas</Text>
              </View>
              <View style={styles.liveStat}>
                <Text style={styles.liveStatValue}>{evento.total_peleas - completedPeleas}</Text>
                <Text style={styles.liveStatLabel}>Restantes</Text>
              </View>
            </View>
          </View>
        )}

        {/* Partido View - User's next fight */}
        {miPelea && evento.estado !== 'finalizado' && (
          <View style={[styles.partidoCard, SHADOWS.md]}>
            <View style={styles.partidoHeader}>
              <Eye size={18} color={COLORS.accent} />
              <Text style={styles.partidoTitle}>Tu Pelea</Text>
            </View>
            <View style={styles.partidoContent}>
              <Text style={styles.partidoNumber}>#{miPelea.numero}</Text>
              <Text style={styles.partidoVs}>
                {miPelea.ave_local} vs {miPelea.ave_visitante}
              </Text>
              {peleasFaltantes !== null && peleasFaltantes > 0 && (
                <View style={styles.partidoCountdown}>
                  <Text style={styles.partidoCountdownText}>
                    Faltan <Text style={styles.partidoCountdownBold}>{peleasFaltantes}</Text> peleas
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Organizer Control Panel */}
        {evento.es_organizador && evento.estado !== 'finalizado' && (
          <View style={[styles.controlPanel, SHADOWS.sm]}>
            <Text style={styles.controlTitle}>Panel de Control</Text>

            {evento.estado === 'programado' && (
              <TouchableOpacity
                style={styles.controlButtonPrimary}
                onPress={handleIniciarEvento}
              >
                <LinearGradient
                  colors={[COLORS.success, COLORS.primaryDark]}
                  style={styles.controlButtonGradient}
                >
                  <Play size={22} color={COLORS.textLight} />
                  <Text style={styles.controlButtonText}>Iniciar Evento</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {(evento.estado === 'en_curso' || evento.estado === 'pausado') && (
              <>
                <TouchableOpacity
                  style={styles.controlButtonBig}
                  onPress={handleSiguientePelea}
                >
                  <LinearGradient
                    colors={[COLORS.secondary, COLORS.secondaryDark]}
                    style={styles.controlButtonGradientBig}
                  >
                    <SkipForward size={28} color={COLORS.textLight} />
                    <Text style={styles.controlButtonTextBig}>Siguiente Pelea</Text>
                    <Text style={styles.controlButtonSubtext}>
                      Avanzar a pelea {(evento.pelea_actual || 0) + 1}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.controlRow}>
                  <TouchableOpacity
                    style={[
                      styles.controlButtonSecondary,
                      evento.estado === 'pausado' && styles.controlButtonResuming,
                    ]}
                    onPress={handlePausar}
                  >
                    {evento.estado === 'pausado' ? (
                      <>
                        <Play size={18} color={COLORS.success} />
                        <Text style={[styles.controlSecondaryText, { color: COLORS.success }]}>
                          Reanudar
                        </Text>
                      </>
                    ) : (
                      <>
                        <Pause size={18} color={COLORS.warning} />
                        <Text style={[styles.controlSecondaryText, { color: COLORS.warning }]}>
                          Pausar
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.controlButtonSecondary}
                    onPress={handleFinalizar}
                  >
                    <Square size={18} color={COLORS.error} />
                    <Text style={[styles.controlSecondaryText, { color: COLORS.error }]}>
                      Finalizar
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* Cotejo List */}
        <View style={[styles.sectionCard, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Swords size={18} color={COLORS.accent} />
            <Text style={styles.sectionTitle}>Cotejo</Text>
            <Text style={styles.sectionCount}>{completedPeleas}/{evento.total_peleas}</Text>
          </View>

          {peleas.map((pelea) => {
            const isCurrent = pelea.estado === 'en_curso';
            const isCompleted = pelea.estado === 'finalizada';
            const resultConfig = pelea.resultado ? RESULTADO_CONFIG[pelea.resultado] : null;

            return (
              <View
                key={pelea.numero}
                style={[
                  styles.peleaRow,
                  isCurrent && styles.peleaRowCurrent,
                  pelea.partido_propio && styles.peleaRowPropio,
                ]}
              >
                <View style={[
                  styles.peleaNumero,
                  isCurrent && { backgroundColor: COLORS.success + '20' },
                  isCompleted && resultConfig && { backgroundColor: resultConfig.bg },
                ]}>
                  {isCompleted && resultConfig ? (
                    <Text style={[styles.peleaNumeroText, { color: resultConfig.color }]}>
                      {resultConfig.label}
                    </Text>
                  ) : isCurrent ? (
                    <View style={styles.peleaCurrentDot} />
                  ) : (
                    <Text style={styles.peleaNumeroText}>{pelea.numero}</Text>
                  )}
                </View>

                <View style={styles.peleaContent}>
                  <Text style={[
                    styles.peleaVs,
                    isCurrent && styles.peleaVsCurrent,
                    !isCompleted && !isCurrent && styles.peleaVsPending,
                  ]}>
                    {pelea.ave_local} vs {pelea.ave_visitante}
                  </Text>
                  {pelea.duracion_minutos && (
                    <Text style={styles.peleaDuration}>{pelea.duracion_minutos} min</Text>
                  )}
                  {pelea.partido_propio && (
                    <Text style={styles.peleaPropioBadge}>TU PELEA</Text>
                  )}
                </View>

                {isCurrent && (
                  <View style={styles.peleaLiveBadge}>
                    <Text style={styles.peleaLiveText}>LIVE</Text>
                  </View>
                )}

                <Text style={styles.peleaIndex}>#{pelea.numero}</Text>
              </View>
            );
          })}
        </View>

        {/* Participants */}
        <View style={[styles.sectionCard, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Users size={18} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Participantes</Text>
            <Text style={styles.sectionCount}>{participantes.length}</Text>
          </View>

          {participantes.map((p) => (
            <View key={p.id} style={styles.participanteRow}>
              <View style={styles.participanteAvatar}>
                <Text style={styles.participanteInitial}>
                  {p.nombre.charAt(0)}
                </Text>
              </View>
              <View style={styles.participanteInfo}>
                <Text style={styles.participanteNombre}>{p.nombre}</Text>
                <Text style={styles.participanteDetail}>
                  {p.gallos_inscritos} gallos inscritos
                </Text>
              </View>
              <View style={styles.participanteRecord}>
                <Text style={[styles.recordText, { color: COLORS.success }]}>{p.victorias}V</Text>
                <Text style={styles.recordSeparator}>-</Text>
                <Text style={[styles.recordText, { color: COLORS.error }]}>{p.derrotas}D</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Event Info */}
        <View style={[styles.sectionCard, SHADOWS.sm]}>
          <View style={styles.sectionHeader}>
            <Hash size={18} color={COLORS.textSecondary} />
            <Text style={styles.sectionTitle}>Información</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reglas</Text>
            <Text style={styles.infoValue}>{evento.reglas}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Código de Acceso</Text>
            <TouchableOpacity style={styles.codigoRow} onPress={handleCopyCodigo}>
              <Text style={styles.codigoText}>{evento.codigo_acceso}</Text>
              <Copy size={16} color={COLORS.accent} />
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Visibilidad</Text>
            <Text style={styles.infoValue}>{evento.es_publico ? 'Público' : 'Privado'}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
  },
  statusBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerDetails: {
    flexDirection: 'row',
    gap: SPACING.md,
    flexWrap: 'wrap',
  },
  headerDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerDetailText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },

  // Live Counter
  liveCounterCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.sm,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.error,
    letterSpacing: 1.5,
  },
  liveCounterLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  liveCounterNumber: {
    fontSize: 64,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 72,
  },
  liveCounterTotal: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  liveProgressContainer: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.divider,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  liveProgressBar: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 3,
  },
  liveStatsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
  },
  liveStat: {
    alignItems: 'center',
  },
  liveStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  liveStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Partido Card
  partidoCard: {
    backgroundColor: COLORS.accent + '10',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.accent + '30',
  },
  partidoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  partidoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partidoContent: {
    alignItems: 'center',
  },
  partidoNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.accent,
  },
  partidoVs: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  partidoCountdown: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.accent + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  partidoCountdownText: {
    fontSize: 14,
    color: COLORS.accent,
  },
  partidoCountdownBold: {
    fontWeight: '800',
    fontSize: 16,
  },

  // Control Panel
  controlPanel: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  controlButtonPrimary: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  controlButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  controlButtonBig: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  controlButtonGradientBig: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.xs,
  },
  controlButtonTextBig: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textLight,
  },
  controlButtonSubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  controlRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  controlButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  controlButtonResuming: {
    borderColor: COLORS.success + '40',
    backgroundColor: COLORS.success + '08',
  },
  controlSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Section Card
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },

  // Pelea Row
  peleaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: 2,
    gap: SPACING.sm,
  },
  peleaRowCurrent: {
    backgroundColor: COLORS.success + '10',
    borderWidth: 1,
    borderColor: COLORS.success + '30',
    borderRadius: BORDER_RADIUS.md,
  },
  peleaRowPropio: {
    backgroundColor: COLORS.accent + '08',
  },
  peleaNumero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  peleaNumeroText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  peleaCurrentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  peleaContent: {
    flex: 1,
  },
  peleaVs: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  peleaVsCurrent: {
    fontWeight: '700',
    color: COLORS.success,
  },
  peleaVsPending: {
    color: COLORS.textSecondary,
  },
  peleaDuration: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  peleaPropioBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  peleaLiveBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  peleaLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textLight,
    letterSpacing: 1,
  },
  peleaIndex: {
    fontSize: 12,
    color: COLORS.textDisabled,
    fontWeight: '500',
    width: 28,
    textAlign: 'right',
  },

  // Participants
  participanteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  participanteAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participanteInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  participanteInfo: {
    flex: 1,
  },
  participanteNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  participanteDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  participanteRecord: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  recordText: {
    fontSize: 14,
    fontWeight: '700',
  },
  recordSeparator: {
    fontSize: 14,
    color: COLORS.textDisabled,
  },

  // Info
  infoRow: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
  },
  codigoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  codigoText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.accent,
    letterSpacing: 2,
  },
});
