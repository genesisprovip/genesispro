import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Plus,
  Trophy,
  Calendar,
  MapPin,
  Users,
  Swords,
  ChevronRight,
  Globe,
  Lock,
  Search,
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import LiveStreamBanner from '@/components/streaming/LiveStreamBanner';

type TabType = 'mis_eventos' | 'publicos';

type EstadoEvento = 'programado' | 'en_curso' | 'finalizado' | 'cancelado' | 'pausado';

interface EventoPalenque {
  id: string;
  nombre: string;
  fecha: string;
  hora_inicio: string;
  lugar: string;
  estado: EstadoEvento;
  tipo_derby: string;
  total_peleas: number;
  pelea_actual: number | null;
  total_participantes?: number | string;
  es_publico: boolean;
  codigo_acceso?: string;
}

const ESTADO_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  programado: { color: COLORS.info, bg: COLORS.info + '18', label: 'Programado' },
  en_curso: { color: COLORS.success, bg: COLORS.success + '18', label: 'En Curso' },
  finalizado: { color: COLORS.textSecondary, bg: COLORS.textSecondary + '18', label: 'Finalizado' },
  cancelado: { color: COLORS.error, bg: COLORS.error + '18', label: 'Cancelado' },
  pausado: { color: COLORS.warning, bg: COLORS.warning + '18', label: 'Pausado' },
};

export default function PalenqueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isEmpresario = !!user?.plan_empresario;
  const [activeTab, setActiveTab] = useState<TabType>(isEmpresario ? 'mis_eventos' : 'publicos');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [misEventos, setMisEventos] = useState<EventoPalenque[]>([]);
  const [publicos, setPublicos] = useState<EventoPalenque[]>([]);
  const [empresarioActivo, setEmpresarioActivo] = useState(false);
  const [liveEventIds, setLiveEventIds] = useState<Set<string>>(new Set());
  const [codigoAcceso, setCodigoAcceso] = useState('');

  const eventos = activeTab === 'mis_eventos' ? misEventos : publicos;

  const handleCodigoAcceso = async () => {
    const code = codigoAcceso.trim().toUpperCase();
    if (code.length < 4) {
      Alert.alert('Error', 'Ingresa un codigo de acceso valido');
      return;
    }
    try {
      const res = await api.getEventoByCodigo(code);
      if (res.success && res.data?.id) {
        setCodigoAcceso('');
        router.push(`/palenque/live?eventoId=${res.data.id}&code=${code}`);
      } else {
        Alert.alert('No encontrado', 'No se encontro ningun evento con ese codigo');
      }
    } catch {
      Alert.alert('Error', 'No se pudo buscar el evento. Verifica el codigo e intenta de nuevo.');
    }
  };

  const loadData = useCallback(async () => {
    try {
      if (activeTab === 'mis_eventos' && isEmpresario && api.isAuthenticated()) {
        const [eventosRes, empresarioRes] = await Promise.all([
          api.getEventos(),
          api.getEmpresarioStatus().catch(() => null),
        ]);
        if (eventosRes.success) setMisEventos(eventosRes.data);
        if (empresarioRes?.success) setEmpresarioActivo(empresarioRes.data.isActive);
      } else {
        const res = await api.getEventosPublicos();
        if (res.success) setPublicos(res.data);
      }
      // Load active streams for both tabs
      try {
        const streamsRes = await api.getActiveStreams();
        if (streamsRes.success && streamsRes.data?.streams) {
          setLiveEventIds(new Set(streamsRes.data.streams.map((s: any) => s.evento_id)));
        }
      } catch { /* ignore */ }
    } catch (error) {
      console.log('Error loading eventos:', error);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const enCurso = misEventos.filter(e => e.estado === 'en_curso').length;
  const programados = misEventos.filter(e => e.estado === 'programado').length;

  const handleCreateEvento = () => {
    if (empresarioActivo) {
      router.push('/palenque/new');
    } else {
      router.push('/empresario');
    }
  };

  const renderEvento = ({ item }: { item: EventoPalenque }) => {
    const estadoConfig = ESTADO_CONFIG[item.estado] || ESTADO_CONFIG.programado;
    const participantes = parseInt(String(item.total_participantes || '0'));

    return (
      <TouchableOpacity
        style={[styles.eventoCard, SHADOWS.sm]}
        activeOpacity={0.7}
        onPress={() => router.push(`/palenque/${item.id}`)}
      >
        <View style={styles.eventoHeader}>
          <View style={[styles.estadoBadge, { backgroundColor: estadoConfig.bg }]}>
            <View style={[styles.estadoDot, { backgroundColor: estadoConfig.color }]} />
            <Text style={[styles.estadoText, { color: estadoConfig.color }]}>
              {estadoConfig.label}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {liveEventIds.has(item.id) && <LiveStreamBanner />}
            {item.es_publico ? (
              <Globe size={16} color={COLORS.textSecondary} />
            ) : (
              <Lock size={16} color={COLORS.textSecondary} />
            )}
          </View>
        </View>

        <Text style={styles.eventoNombre} numberOfLines={1}>{item.nombre}</Text>

        <View style={styles.eventoMeta}>
          <View style={styles.metaItem}>
            <Calendar size={13} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>
              {item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              }) : 'Sin fecha'} {item.hora_inicio ? `- ${item.hora_inicio.slice(0, 5)}` : ''}
            </Text>
          </View>
          {item.lugar && (
            <View style={styles.metaItem}>
              <MapPin size={13} color={COLORS.textSecondary} />
              <Text style={styles.metaText} numberOfLines={1}>{item.lugar}</Text>
            </View>
          )}
        </View>

        <View style={styles.eventoFooter}>
          <View style={styles.footerStat}>
            <Swords size={14} color={COLORS.accent} />
            <Text style={styles.footerStatText}>
              {item.estado === 'en_curso' && item.pelea_actual
                ? `Pelea ${item.pelea_actual} de ${item.total_peleas}`
                : `${item.total_peleas} peleas`}
            </Text>
          </View>
          {participantes > 0 && (
            <View style={styles.footerStat}>
              <Users size={14} color={COLORS.primary} />
              <Text style={styles.footerStatText}>{participantes}</Text>
            </View>
          )}
          <ChevronRight size={18} color={COLORS.textSecondary} />
        </View>

        {item.estado === 'en_curso' && item.pelea_actual && item.total_peleas > 0 && (
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                { width: `${(item.pelea_actual / item.total_peleas) * 100}%` },
              ]}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color={COLORS.textLight} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Trophy size={24} color={COLORS.secondary} />
            <Text style={styles.headerTitle}>Palenque</Text>
          </View>
          {isEmpresario ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleCreateEvento}
            >
              <Plus size={24} color={COLORS.textLight} />
            </TouchableOpacity>
          ) : (
            <View style={styles.addButton} />
          )}
        </View>

        {isEmpresario ? (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{misEventos.length}</Text>
              <Text style={styles.statLabel}>Mis Eventos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.success }]}>{enCurso}</Text>
              <Text style={styles.statLabel}>En Curso</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: COLORS.secondary }]}>{programados}</Text>
              <Text style={styles.statLabel}>Proximos</Text>
            </View>
          </View>
        ) : (
          <View style={styles.codigoAccesoRow}>
            <View style={styles.codigoInputContainer}>
              <Search size={18} color={COLORS.textSecondary} />
              <TextInput
                style={styles.codigoInput}
                placeholder="Codigo de acceso"
                placeholderTextColor={COLORS.placeholder}
                value={codigoAcceso}
                onChangeText={setCodigoAcceso}
                autoCapitalize="characters"
                maxLength={8}
              />
            </View>
            <TouchableOpacity style={styles.codigoButton} onPress={handleCodigoAcceso}>
              <Text style={styles.codigoButtonText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {isEmpresario && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'mis_eventos' && styles.tabActive]}
            onPress={() => setActiveTab('mis_eventos')}
          >
            <Text style={[styles.tabText, activeTab === 'mis_eventos' && styles.tabTextActive]}>
              Mis Eventos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'publicos' && styles.tabActive]}
            onPress={() => setActiveTab('publicos')}
          >
            <Text style={[styles.tabText, activeTab === 'publicos' && styles.tabTextActive]}>
              Publicos
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondary} />
        </View>
      ) : (
        <FlatList
          data={eventos}
          keyExtractor={(item) => item.id}
          renderItem={renderEvento}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.secondary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Trophy size={64} color={COLORS.textDisabled} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'mis_eventos' ? 'Sin eventos' : 'No hay eventos publicos'}
              </Text>
              <Text style={styles.emptyMessage}>
                {activeTab === 'mis_eventos'
                  ? 'Crea tu primer evento de palenque'
                  : 'No hay eventos publicos disponibles en este momento'}
              </Text>
              {activeTab === 'mis_eventos' && isEmpresario && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={handleCreateEvento}
                >
                  <Text style={styles.emptyButtonText}>Crear Evento</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {isEmpresario && (
        <TouchableOpacity
          style={[styles.fab, SHADOWS.lg]}
          activeOpacity={0.8}
          onPress={handleCreateEvento}
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryDark]}
            style={styles.fabGradient}
          >
            <Plus size={26} color={COLORS.textLight} />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  backButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textLight },
  addButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
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
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  tabActive: { backgroundColor: COLORS.secondary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.textLight },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 100,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  eventoCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  eventoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  estadoBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round, gap: 6,
  },
  estadoDot: { width: 7, height: 7, borderRadius: 4 },
  estadoText: { fontSize: 12, fontWeight: '600' },
  eventoNombre: {
    fontSize: 17, fontWeight: '700',
    color: COLORS.text, marginBottom: SPACING.sm,
  },
  eventoMeta: { gap: 6, marginBottom: SPACING.sm },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  eventoFooter: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1, borderTopColor: COLORS.divider,
    gap: SPACING.md,
  },
  footerStat: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footerStatText: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  progressBarContainer: {
    height: 3, backgroundColor: COLORS.divider,
    borderRadius: 2, marginTop: SPACING.sm, overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: COLORS.success, borderRadius: 2 },
  emptyState: { alignItems: 'center', padding: SPACING.xl, marginTop: SPACING.xl },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md },
  emptyMessage: {
    fontSize: 14, color: COLORS.textSecondary,
    textAlign: 'center', marginTop: SPACING.sm, maxWidth: 280,
  },
  emptyButton: {
    marginTop: SPACING.lg, backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyButtonText: { color: COLORS.textLight, fontSize: 16, fontWeight: '600' },
  fab: {
    position: 'absolute', right: SPACING.lg, bottom: SPACING.lg,
    borderRadius: 20, overflow: 'hidden',
  },
  fabGradient: {
    width: 56, height: 56, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  codigoAccesoRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    alignItems: 'center',
  },
  codigoInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  codigoInput: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    fontSize: 15,
    color: COLORS.textLight,
    fontWeight: '600',
    letterSpacing: 1,
  },
  codigoButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
  },
  codigoButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textLight,
  },
});
