import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
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
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

type TabType = 'mis_eventos' | 'publicos';

type EstadoEvento = 'programado' | 'en_curso' | 'finalizado' | 'cancelado';

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
  participantes: number;
  es_publico: boolean;
  codigo_acceso?: string;
}

// TODO: Replace with API call to GET /api/v1/palenque/eventos
const MOCK_MIS_EVENTOS: EventoPalenque[] = [
  {
    id: '1',
    nombre: 'Derby Regional Jalisco',
    fecha: '2026-03-15',
    hora_inicio: '10:00',
    lugar: 'Palenque El Dorado, Guadalajara',
    estado: 'en_curso',
    tipo_derby: '3 cocks',
    total_peleas: 20,
    pelea_actual: 8,
    participantes: 12,
    es_publico: true,
  },
  {
    id: '2',
    nombre: 'Torneo Primavera 2026',
    fecha: '2026-03-22',
    hora_inicio: '09:00',
    lugar: 'Arena Coliseo, León',
    estado: 'programado',
    tipo_derby: '5 cocks',
    total_peleas: 30,
    pelea_actual: null,
    participantes: 8,
    es_publico: false,
    codigo_acceso: 'PRIM26',
  },
  {
    id: '3',
    nombre: 'Copa Navideña 2025',
    fecha: '2025-12-20',
    hora_inicio: '11:00',
    lugar: 'Palenque San Marcos, Aguascalientes',
    estado: 'finalizado',
    tipo_derby: '3 cocks',
    total_peleas: 18,
    pelea_actual: null,
    participantes: 10,
    es_publico: true,
  },
];

// TODO: Replace with API call to GET /api/v1/palenque/eventos/publicos
const MOCK_PUBLICOS: EventoPalenque[] = [
  {
    id: '4',
    nombre: 'Gran Derby Nacional',
    fecha: '2026-04-05',
    hora_inicio: '10:00',
    lugar: 'Arena Nacional, CDMX',
    estado: 'programado',
    tipo_derby: '5 cocks',
    total_peleas: 40,
    pelea_actual: null,
    participantes: 20,
    es_publico: true,
  },
  {
    id: '5',
    nombre: 'Derby Costa Pacífico',
    fecha: '2026-03-10',
    hora_inicio: '09:30',
    lugar: 'Palenque del Mar, Mazatlán',
    estado: 'en_curso',
    tipo_derby: '3 cocks',
    total_peleas: 24,
    pelea_actual: 15,
    participantes: 16,
    es_publico: true,
  },
];

const ESTADO_CONFIG: Record<EstadoEvento, { color: string; bg: string; label: string }> = {
  programado: { color: COLORS.info, bg: COLORS.info + '18', label: 'Programado' },
  en_curso: { color: COLORS.success, bg: COLORS.success + '18', label: 'En Curso' },
  finalizado: { color: COLORS.textSecondary, bg: COLORS.textSecondary + '18', label: 'Finalizado' },
  cancelado: { color: COLORS.error, bg: COLORS.error + '18', label: 'Cancelado' },
};

export default function PalenqueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('mis_eventos');
  const [refreshing, setRefreshing] = useState(false);

  const eventos = activeTab === 'mis_eventos' ? MOCK_MIS_EVENTOS : MOCK_PUBLICOS;

  // TODO: Replace with actual API refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const renderEvento = ({ item }: { item: EventoPalenque }) => {
    const estadoConfig = ESTADO_CONFIG[item.estado];

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
          {item.es_publico ? (
            <Globe size={16} color={COLORS.textSecondary} />
          ) : (
            <Lock size={16} color={COLORS.textSecondary} />
          )}
        </View>

        <Text style={styles.eventoNombre} numberOfLines={1}>{item.nombre}</Text>

        <View style={styles.eventoMeta}>
          <View style={styles.metaItem}>
            <Calendar size={13} color={COLORS.textSecondary} />
            <Text style={styles.metaText}>
              {new Date(item.fecha).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })} - {item.hora_inicio}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <MapPin size={13} color={COLORS.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>{item.lugar}</Text>
          </View>
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
          <View style={styles.footerStat}>
            <Users size={14} color={COLORS.primary} />
            <Text style={styles.footerStatText}>{item.participantes}</Text>
          </View>
          <ChevronRight size={18} color={COLORS.textSecondary} />
        </View>

        {item.estado === 'en_curso' && item.pelea_actual && (
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
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/palenque/new')}
          >
            <Plus size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{MOCK_MIS_EVENTOS.length}</Text>
            <Text style={styles.statLabel}>Mis Eventos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>
              {MOCK_MIS_EVENTOS.filter(e => e.estado === 'en_curso').length}
            </Text>
            <Text style={styles.statLabel}>En Curso</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.secondary }]}>
              {MOCK_MIS_EVENTOS.filter(e => e.estado === 'programado').length}
            </Text>
            <Text style={styles.statLabel}>Próximos</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab selector */}
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
            Públicos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Event list */}
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
              {activeTab === 'mis_eventos' ? 'Sin eventos' : 'No hay eventos públicos'}
            </Text>
            <Text style={styles.emptyMessage}>
              {activeTab === 'mis_eventos'
                ? 'Crea tu primer evento de palenque'
                : 'No hay eventos públicos disponibles en este momento'}
            </Text>
            {activeTab === 'mis_eventos' && (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/palenque/new')}
              >
                <Text style={styles.emptyButtonText}>Crear Evento</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, SHADOWS.lg]}
        activeOpacity={0.8}
        onPress={() => router.push('/palenque/new')}
      >
        <LinearGradient
          colors={[COLORS.secondary, COLORS.secondaryDark]}
          style={styles.fabGradient}
        >
          <Plus size={26} color={COLORS.textLight} />
        </LinearGradient>
      </TouchableOpacity>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
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
  tabActive: {
    backgroundColor: COLORS.secondary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.textLight,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 100,
  },
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    gap: 6,
  },
  estadoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  eventoNombre: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  eventoMeta: {
    gap: 6,
    marginBottom: SPACING.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  eventoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: SPACING.md,
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  footerStatText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xl,
    marginTop: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    maxWidth: 280,
  },
  emptyButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    borderRadius: 20,
    overflow: 'hidden',
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
