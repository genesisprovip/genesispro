import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
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
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

type EstadoEvento = 'programado' | 'en_curso' | 'pausado' | 'finalizado';

interface Pelea {
  id: string;
  numero_pelea: number;
  partido_rojo_nombre?: string;
  partido_verde_nombre?: string;
  anillo_rojo?: string;
  anillo_verde?: string;
  resultado?: string | null;
  duracion_minutos?: number;
  estado: string;
}

interface Participante {
  id: string;
  nombre: string;
  gallos_inscritos: number;
  victorias: number;
  derrotas: number;
}

const RESULTADO_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  rojo: { color: '#EF4444', label: 'R', bg: '#EF444420' },
  verde: { color: '#10B981', label: 'V', bg: '#10B98120' },
  empate: { color: COLORS.warning, label: 'E', bg: COLORS.warning + '20' },
  tabla: { color: COLORS.warning, label: 'T', bg: COLORS.warning + '20' },
  cancelada: { color: COLORS.textSecondary, label: 'X', bg: COLORS.textSecondary + '20' },
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
  const { user } = useAuth();

  const [evento, setEvento] = useState<any>(null);
  const [peleas, setPeleas] = useState<Pelea[]>([]);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [eventoRes, peleasRes, participantesRes] = await Promise.all([
        api.getEvento(id),
        api.getPeleasEvento(id, false).catch(() => ({ success: false, data: [] })),
        api.getParticipantesEvento(id).catch(() => ({ success: false, data: [] })),
      ]);
      if (eventoRes.success) setEvento(eventoRes.data);
      if (peleasRes.success) setPeleas(peleasRes.data || []);
      if (participantesRes.success) setParticipantes(participantesRes.data || []);
    } catch (err) {
      console.log('Error loading evento:', err);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  // Auto-refresh when en_curso
  useEffect(() => {
    if (evento?.estado !== 'en_curso') return;
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [evento?.estado, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading || !evento) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  const isOrganizer = evento.organizador_id === user?.id;
  const completedPeleas = peleas.filter(p => p.estado === 'finalizada').length;
  const rojoWins = peleas.filter(p => p.resultado === 'rojo').length;
  const verdeWins = peleas.filter(p => p.resultado === 'verde').length;

  const estadoColor = ESTADO_COLOR[evento.estado as EstadoEvento] || COLORS.textSecondary;

  const handleIniciarEvento = () => {
    Alert.alert('Iniciar Evento', 'Se iniciará el evento y se activará la primera pelea.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Iniciar',
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await api.iniciarEvento(id!);
            if (res.success) await loadData();
            else Alert.alert('Error', 'No se pudo iniciar el evento');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Error al iniciar');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleSiguientePelea = () => {
    Alert.alert(
      'Siguiente Pelea',
      `Avanzar a la pelea ${(evento.pelea_actual || 0) + 1}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Avanzar',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await api.siguientePelea(id!);
              if (res.success) await loadData();
              else Alert.alert('Error', 'No se pudo avanzar');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Error al avanzar');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handlePausar = async () => {
    setActionLoading(true);
    try {
      const res = await api.pausarEvento(id!);
      if (res.success) await loadData();
      else Alert.alert('Error', 'No se pudo pausar/reanudar');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizar = () => {
    Alert.alert('Finalizar Evento', 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            const res = await api.finalizarEvento(id!);
            if (res.success) await loadData();
            else Alert.alert('Error', 'No se pudo finalizar');
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Error al finalizar');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleCopyCodigo = async () => {
    try {
      await Clipboard.setStringAsync(evento.codigo_acceso || '');
      Alert.alert('Copiado', `Código: ${evento.codigo_acceso}`);
    } catch {
      Alert.alert('Código', evento.codigo_acceso);
    }
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
              {ESTADO_LABEL[evento.estado as EstadoEvento] || evento.estado}
            </Text>
          </View>
        </View>

        <View style={styles.headerDetails}>
          <View style={styles.headerDetailItem}>
            <Calendar size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.headerDetailText}>
              {evento.fecha ? new Date(evento.fecha).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }) : 'Sin fecha'}
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
        }
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
                  { width: `${(completedPeleas / (evento.total_peleas || 1)) * 100}%` },
                ]}
              />
            </View>
            <View style={styles.liveStatsRow}>
              <View style={styles.liveStat}>
                <Text style={[styles.liveStatValue, { color: '#EF4444' }]}>{rojoWins}</Text>
                <Text style={styles.liveStatLabel}>Rojo</Text>
              </View>
              <View style={styles.liveStat}>
                <Text style={[styles.liveStatValue, { color: COLORS.success }]}>{verdeWins}</Text>
                <Text style={styles.liveStatLabel}>Verde</Text>
              </View>
              <View style={styles.liveStat}>
                <Text style={styles.liveStatValue}>{completedPeleas}</Text>
                <Text style={styles.liveStatLabel}>Jugadas</Text>
              </View>
              <View style={styles.liveStat}>
                <Text style={styles.liveStatValue}>{(evento.total_peleas || 0) - completedPeleas}</Text>
                <Text style={styles.liveStatLabel}>Restantes</Text>
              </View>
            </View>
          </View>
        )}

        {/* Organizer Control Panel */}
        {isOrganizer && evento.estado !== 'finalizado' && (
          <View style={[styles.controlPanel, SHADOWS.sm]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
              <Text style={styles.controlTitle}>Panel de Control</Text>
              {actionLoading && <ActivityIndicator size="small" color={COLORS.secondary} />}
            </View>

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
            <Text style={styles.sectionCount}>{completedPeleas}/{evento.total_peleas || peleas.length}</Text>
          </View>

          {peleas.map((pelea) => {
            const isCurrent = pelea.estado === 'en_curso';
            const isCompleted = pelea.estado === 'finalizada';
            const resultConfig = pelea.resultado ? RESULTADO_CONFIG[pelea.resultado] : null;
            const rojoLabel = pelea.partido_rojo_nombre || pelea.anillo_rojo || 'Rojo';
            const verdeLabel = pelea.partido_verde_nombre || pelea.anillo_verde || 'Verde';

            return (
              <View
                key={pelea.id || pelea.numero_pelea}
                style={[
                  styles.peleaRow,
                  isCurrent && styles.peleaRowCurrent,
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
                    <Text style={styles.peleaNumeroText}>{pelea.numero_pelea}</Text>
                  )}
                </View>

                <View style={styles.peleaContent}>
                  <Text style={[
                    styles.peleaVs,
                    isCurrent && styles.peleaVsCurrent,
                    !isCompleted && !isCurrent && styles.peleaVsPending,
                  ]}>
                    {rojoLabel} vs {verdeLabel}
                  </Text>
                  {pelea.duracion_minutos ? (
                    <Text style={styles.peleaDuration}>{pelea.duracion_minutos} min</Text>
                  ) : null}
                </View>

                {isCurrent && (
                  <View style={styles.peleaLiveBadge}>
                    <Text style={styles.peleaLiveText}>LIVE</Text>
                  </View>
                )}

                <Text style={styles.peleaIndex}>#{pelea.numero_pelea}</Text>
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
                  {(p.nombre || '?').charAt(0)}
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
