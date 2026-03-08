import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Crown,
  Radio,
  Plus,
  Calendar,
  Users,
  Swords,
  ChevronRight,
  BarChart3,
  Settings,
  Globe,
  Lock,
  Trophy,
  Share2,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { api } from '@/services/api';
import LiveStreamBanner from '@/components/streaming/LiveStreamBanner';

interface EmpresarioEvent {
  id: string;
  nombre: string;
  fecha: string;
  hora_inicio: string;
  lugar: string;
  estado: string;
  total_peleas: number;
  pelea_actual: number | null;
  total_participantes?: number | string;
  es_publico: boolean;
  codigo_acceso?: string;
}

interface EmpresarioStatus {
  plan: string | null;
  hasSubscription: boolean;
  isActive: boolean;
  eventosEsteMes: number;
  limiteEventos: number | null;
  streamingEnVivo: boolean;
  maxEventosSimultaneos: number | null;
}

const ESTADO_CONFIG: Record<string, { color: string; label: string }> = {
  programado: { color: COLORS.info, label: 'Programado' },
  en_curso: { color: COLORS.success, label: 'En Curso' },
  finalizado: { color: COLORS.textSecondary, label: 'Finalizado' },
  cancelado: { color: COLORS.error, label: 'Cancelado' },
  pausado: { color: COLORS.warning, label: 'Pausado' },
};

export default function EmpresarioDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<EmpresarioStatus | null>(null);
  const [eventos, setEventos] = useState<EmpresarioEvent[]>([]);
  const [activeStreamIds, setActiveStreamIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      const [statusRes, eventosRes, streamsRes] = await Promise.all([
        api.getEmpresarioStatus(),
        api.getEventos(),
        api.getActiveStreams().catch(() => null),
      ]);
      if (statusRes.success) setStatus(statusRes.data);
      if (eventosRes.success) setEventos(eventosRes.data);
      if (streamsRes?.success && streamsRes.data?.streams) {
        setActiveStreamIds(new Set(streamsRes.data.streams.map((s: any) => s.evento_id)));
      }
    } catch (error) {
      console.error('Error loading empresario dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStartStream = (eventoId: string, eventoNombre: string) => {
    if (!status?.streamingEnVivo) {
      Alert.alert(
        'Transmision no disponible',
        'Tu plan actual no incluye transmision en vivo. Actualiza a Premium para transmitir.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver planes', onPress: () => router.push('/empresario') },
        ]
      );
      return;
    }

    router.push({
      pathname: '/empresario/broadcast',
      params: { eventoId, eventoNombre },
    });
  };

  const handleStopStream = async (eventoId: string) => {
    Alert.alert(
      'Detener Transmision',
      'Se finalizara la transmision en vivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Detener',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.stopStream(eventoId);
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo detener el stream');
            }
          },
        },
      ]
    );
  };

  const handleShareEvent = async (evento: EmpresarioEvent) => {
    if (!evento.codigo_acceso) {
      Alert.alert('Error', 'Este evento no tiene codigo de acceso');
      return;
    }
    try {
      await Share.share({
        message: `${evento.nombre} - Evento en vivo en GenesisPro\nhttps://api.genesispro.vip/evento/${evento.codigo_acceso}`,
      });
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        Alert.alert('Error', 'No se pudo compartir el evento');
      }
    }
  };

  const planLabel = (plan: string | null) => {
    const labels: Record<string, string> = {
      empresario_basico: 'Basico',
      empresario_pro: 'Pro',
      empresario_premium: 'Premium',
    };
    return plan ? labels[plan] || plan : 'Sin plan';
  };

  const enCurso = eventos.filter(e => e.estado === 'en_curso');
  const programados = eventos.filter(e => e.estado === 'programado');

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Crown size={22} color={COLORS.secondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Panel Empresario</Text>
          <TouchableOpacity onPress={() => router.push('/empresario')} style={styles.headerBtn}>
            <Settings size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Plan info */}
        <View style={styles.planRow}>
          <View style={styles.planBadge}>
            <Crown size={14} color={COLORS.secondary} />
            <Text style={styles.planText}>{planLabel(status?.plan)}</Text>
          </View>
          <Text style={styles.planMeta}>
            {status?.limiteEventos
              ? `${status.eventosEsteMes}/${status.limiteEventos} eventos`
              : `${status?.eventosEsteMes ?? 0} eventos este mes`}
          </Text>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{enCurso.length}</Text>
            <Text style={styles.statLabel}>En Curso</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.secondary }]}>{programados.length}</Text>
            <Text style={styles.statLabel}>Proximos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{eventos.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.secondary} />
        }
      >
        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionCard, SHADOWS.sm]}
            onPress={() => router.push('/palenque/new')}
          >
            <LinearGradient
              colors={[COLORS.secondary, COLORS.secondaryDark]}
              style={styles.actionGradient}
            >
              <Plus size={24} color={COLORS.textLight} />
              <Text style={styles.actionText}>Crear Evento</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, SHADOWS.sm]}
            onPress={() => router.push('/palenque')}
          >
            <View style={styles.actionContent}>
              <Trophy size={24} color={COLORS.secondary} />
              <Text style={[styles.actionText, { color: COLORS.text }]}>Mis Eventos</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Active Events with Stream Controls */}
        {enCurso.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Eventos En Curso</Text>
            {enCurso.map(evento => {
              const isStreaming = activeStreamIds.has(evento.id);
              return (
                <View key={evento.id} style={[styles.eventCard, SHADOWS.sm]}>
                  <View style={styles.eventHeader}>
                    <View style={styles.eventBadgeRow}>
                      <View style={[styles.estadoBadge, { backgroundColor: COLORS.success + '18' }]}>
                        <View style={[styles.estadoDot, { backgroundColor: COLORS.success }]} />
                        <Text style={[styles.estadoText, { color: COLORS.success }]}>En Curso</Text>
                      </View>
                      {isStreaming && <LiveStreamBanner />}
                    </View>
                    {evento.es_publico ? (
                      <Globe size={14} color={COLORS.textSecondary} />
                    ) : (
                      <Lock size={14} color={COLORS.textSecondary} />
                    )}
                  </View>

                  <Text style={styles.eventName} numberOfLines={1}>{evento.nombre}</Text>

                  <View style={styles.eventMeta}>
                    <View style={styles.metaItem}>
                      <Swords size={13} color={COLORS.accent} />
                      <Text style={styles.metaText}>
                        Pelea {evento.pelea_actual || 0} de {evento.total_peleas}
                      </Text>
                    </View>
                    {evento.total_participantes && (
                      <View style={styles.metaItem}>
                        <Users size={13} color={COLORS.primary} />
                        <Text style={styles.metaText}>{evento.total_participantes}</Text>
                      </View>
                    )}
                  </View>

                  {/* Stream + Share + Manage buttons */}
                  <View style={styles.eventActions}>
                    {status?.streamingEnVivo && (
                      <TouchableOpacity
                        style={[
                          styles.streamBtn,
                          isStreaming && styles.streamBtnActive,
                        ]}
                        onPress={() =>
                          isStreaming
                            ? handleStopStream(evento.id)
                            : handleStartStream(evento.id, evento.nombre)
                        }
                      >
                        <Radio size={16} color={isStreaming ? COLORS.textLight : COLORS.error} />
                        <Text
                          style={[
                            styles.streamBtnText,
                            isStreaming && { color: COLORS.textLight },
                          ]}
                        >
                          {isStreaming ? 'Detener' : 'Transmitir'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {evento.codigo_acceso && (
                      <TouchableOpacity
                        style={styles.shareBtn}
                        onPress={() => handleShareEvent(evento)}
                      >
                        <Share2 size={16} color={COLORS.accent} />
                        <Text style={styles.shareBtnText}>Compartir</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.manageEventBtn}
                      onPress={() => router.push(`/palenque/${evento.id}`)}
                    >
                      <Text style={styles.manageEventText}>Administrar</Text>
                      <ChevronRight size={16} color={COLORS.secondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Upcoming Events */}
        {programados.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proximos Eventos</Text>
            {programados.map(evento => (
              <View key={evento.id} style={[styles.eventCard, SHADOWS.sm]}>
                <TouchableOpacity onPress={() => router.push(`/palenque/${evento.id}`)}>
                  <View style={styles.eventHeader}>
                    <View style={[styles.estadoBadge, { backgroundColor: COLORS.info + '18' }]}>
                      <View style={[styles.estadoDot, { backgroundColor: COLORS.info }]} />
                      <Text style={[styles.estadoText, { color: COLORS.info }]}>Programado</Text>
                    </View>
                    <ChevronRight size={18} color={COLORS.textSecondary} />
                  </View>
                  <Text style={styles.eventName} numberOfLines={1}>{evento.nombre}</Text>
                  <View style={styles.metaItem}>
                    <Calendar size={13} color={COLORS.textSecondary} />
                    <Text style={styles.metaText}>
                      {new Date(evento.fecha).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                      })} {evento.hora_inicio ? `- ${evento.hora_inicio.slice(0, 5)}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
                {evento.codigo_acceso && (
                  <View style={[styles.eventActions, { marginTop: SPACING.sm }]}>
                    <TouchableOpacity
                      style={styles.shareBtn}
                      onPress={() => handleShareEvent(evento)}
                    >
                      <Share2 size={16} color={COLORS.accent} />
                      <Text style={styles.shareBtnText}>Compartir</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Empty state */}
        {eventos.length === 0 && (
          <View style={styles.emptyState}>
            <Trophy size={56} color={COLORS.textDisabled} />
            <Text style={styles.emptyTitle}>Sin eventos</Text>
            <Text style={styles.emptyText}>
              Crea tu primer evento de palenque para comenzar
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/palenque/new')}
            >
              <Text style={styles.emptyBtnText}>Crear Evento</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  headerBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textLight },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.secondary + '20',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: BORDER_RADIUS.round,
  },
  planText: { color: COLORS.secondary, fontSize: 13, fontWeight: '700' },
  planMeta: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statCard: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.12)' },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.textLight },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  content: { padding: SPACING.md },
  actionsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  actionCard: { flex: 1, borderRadius: BORDER_RADIUS.lg, overflow: 'hidden' },
  actionGradient: {
    padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm,
  },
  actionContent: {
    padding: SPACING.lg, alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.card,
  },
  actionText: { fontSize: 14, fontWeight: '700', color: COLORS.textLight },
  section: { marginBottom: SPACING.lg },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
    marginBottom: SPACING.sm, marginLeft: SPACING.xs,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  eventBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  estadoBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round, gap: 6,
  },
  estadoDot: { width: 7, height: 7, borderRadius: 4 },
  estadoText: { fontSize: 12, fontWeight: '600' },
  eventName: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.sm },
  eventMeta: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 13, color: COLORS.textSecondary },
  eventActions: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.divider,
  },
  streamBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.error,
  },
  streamBtnActive: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  streamBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.error },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.accent,
  },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
  manageEventBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginLeft: 'auto',
  },
  manageEventText: { fontSize: 13, fontWeight: '600', color: COLORS.secondary },
  emptyState: { alignItems: 'center', padding: SPACING.xl, marginTop: SPACING.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md },
  emptyText: {
    fontSize: 14, color: COLORS.textSecondary,
    textAlign: 'center', marginTop: SPACING.sm, maxWidth: 260,
  },
  emptyBtn: {
    marginTop: SPACING.lg, backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyBtnText: { color: COLORS.textLight, fontSize: 16, fontWeight: '600' },
});
