import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Plus,
  Trophy,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Swords,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useAves } from '@/context/AvesContext';
import { useCombates } from '@/context/CombatesContext';
import EmptyState from '@/components/common/EmptyState';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

type FilterType = 'todos' | 'victorias' | 'derrotas';

export default function CombatesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { getAveById } = useAves();
  const { combates, stats, isLoading, refreshCombates } = useCombates();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('todos');
  const [refreshing, setRefreshing] = useState(false);

  const handleAddCombate = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Crea tu cuenta gratis',
        'Registrate y obtiene 15 dias Premium gratis para usar todas las funciones.',
        [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Crear Cuenta', onPress: () => router.push('/register') },
        ]
      );
      return;
    }
    router.push('/combate/new');
  };

  const filteredCombates = useMemo(() => {
    if (selectedFilter === 'todos') return combates;
    if (selectedFilter === 'victorias') return combates.filter(c => c.resultado === 'victoria');
    if (selectedFilter === 'derrotas') return combates.filter(c => c.resultado === 'derrota');
    return combates;
  }, [combates, selectedFilter]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshCombates();
    setRefreshing(false);
  }, [refreshCombates]);

  const getResultadoStyle = (resultado: string) => {
    switch (resultado) {
      case 'victoria':
        return { bg: COLORS.success + '15', color: COLORS.success, icon: TrendingUp, label: 'Victoria' };
      case 'derrota':
        return { bg: COLORS.error + '15', color: COLORS.error, icon: TrendingDown, label: 'Derrota' };
      case 'empate':
        return { bg: COLORS.warning + '15', color: COLORS.warning, icon: Trophy, label: 'Empate' };
      default:
        return { bg: COLORS.textDisabled + '15', color: COLORS.textSecondary, icon: Swords, label: resultado };
    }
  };

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: combates.length },
    { key: 'victorias', label: 'Victorias', count: stats.victorias },
    { key: 'derrotas', label: 'Derrotas', count: stats.derrotas },
  ];

  if (isLoading && combates.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
        <Text style={styles.loadingText}>Cargando combates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Combates</Text>
            <Text style={styles.headerCount}>{combates.length} registrados</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddCombate}
          >
            <Plus size={22} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.victorias}W - {stats.derrotas}L</Text>
            <Text style={styles.statLabel}>Récord</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.primary }]}>{stats.porcentajeVictorias}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={[
              styles.statValue,
              { color: stats.roi >= 0 ? '#4ADE80' : '#F87171' }
            ]}>
              ${stats.roi >= 0 ? '+' : ''}{stats.roi.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Balance</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.filtersContainer}>
        {filters.map((filter) => {
          const isActive = selectedFilter === filter.key;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedFilter(filter.key)}
            >
              <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {filter.label}
              </Text>
              <View style={[styles.filterCount, isActive && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, isActive && styles.filterCountTextActive]}>
                  {filter.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredCombates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const ave = getAveById(item.ave_id || '');
          const resultStyle = getResultadoStyle(item.resultado);
          const ResultIcon = resultStyle.icon;

          return (
            <View style={[styles.combateCard, SHADOWS.md]}>
              <View style={styles.combateHeader}>
                <View style={[styles.resultadoBadge, { backgroundColor: resultStyle.bg }]}>
                  <ResultIcon size={14} color={resultStyle.color} />
                  <Text style={[styles.resultadoText, { color: resultStyle.color }]}>
                    {resultStyle.label}
                  </Text>
                </View>
                <View style={styles.combateDateContainer}>
                  <Calendar size={12} color={COLORS.textSecondary} />
                  <Text style={styles.combateDate}>
                    {new Date(item.fecha).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.combateBody}>
                <Text style={styles.aveCodigo}>{ave?.codigo_identidad || 'Ave desconocida'}</Text>
                {item.oponente_info && (
                  <Text style={styles.vsText}>vs {item.oponente_info}</Text>
                )}
              </View>

              <View style={styles.combateFooter}>
                <View style={styles.combateLocation}>
                  <MapPin size={12} color={COLORS.textSecondary} />
                  <Text style={styles.locationText}>{item.lugar || 'Sin ubicación'}</Text>
                </View>
                <View style={styles.combateStats}>
                  <Text style={styles.pesoText}>{item.peso_ave}g</Text>
                  {item.duracion_minutos != null && (
                    <Text style={styles.duracionText}>{item.duracion_minutos} min</Text>
                  )}
                </View>
              </View>

              {(item.apostado != null || item.ganado != null) && (
                <View style={styles.financialRow}>
                  <Text style={styles.financialLabel}>
                    Apostado: ${(item.apostado || 0).toLocaleString()}
                  </Text>
                  <Text style={[
                    styles.financialValue,
                    { color: (item.ganado || 0) > (item.apostado || 0) ? COLORS.success : COLORS.error }
                  ]}>
                    Ganado: ${(item.ganado || 0).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          );
        }}
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
          <EmptyState
            icon="bird"
            title="Sin combates"
            message="Registra el primer combate de tus aves"
            actionLabel="Registrar Combate"
            onAction={handleAddCombate}
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, SHADOWS.lg]}
        activeOpacity={0.8}
        onPress={handleAddCombate}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  headerCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.secondary,
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
    ...SHADOWS.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.textLight,
  },
  filterCount: {
    backgroundColor: COLORS.divider,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterCountTextActive: {
    color: COLORS.textLight,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  combateCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  combateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  resultadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    gap: 4,
  },
  resultadoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  combateDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  combateDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  combateBody: {
    marginBottom: SPACING.sm,
  },
  aveCodigo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  vsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  combateFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  combateLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  combateStats: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  pesoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  duracionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  financialLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  financialValue: {
    fontSize: 12,
    fontWeight: '700',
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
