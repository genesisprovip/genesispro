import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
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
  MapPin
} from 'lucide-react-native';
import { useAves } from '@/context/AvesContext';
import { useCombates } from '@/context/CombatesContext';
import EmptyState from '@/components/common/EmptyState';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

type FilterType = 'todos' | 'victorias' | 'derrotas';

export default function CombatesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getAveById } = useAves();
  const { combates, stats, isLoading, refreshCombates } = useCombates();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('todos');
  const [refreshing, setRefreshing] = useState(false);

  const handleAddCombate = () => {
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
        return { bg: COLORS.success + '20', color: COLORS.success, icon: TrendingUp };
      case 'derrota':
        return { bg: COLORS.error + '20', color: COLORS.error, icon: TrendingDown };
      default:
        return { bg: COLORS.warning + '20', color: COLORS.warning, icon: Trophy };
    }
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'victorias', label: 'Victorias' },
    { key: 'derrotas', label: 'Derrotas' },
  ];

  if (isLoading && combates.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando combates...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.secondary, COLORS.secondaryDark]}
        style={[styles.header, { paddingTop: insets.top + SPACING.md }]}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Combates</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Trophy size={20} color={COLORS.textLight} />
            </View>
            <Text style={styles.statValue}>{stats.victorias}W - {stats.derrotas}L</Text>
            <Text style={styles.statLabel}>Récord</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <TrendingUp size={20} color={COLORS.textLight} />
            </View>
            <Text style={styles.statValue}>{stats.porcentajeVictorias}%</Text>
            <Text style={styles.statLabel}>% Victorias</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Text style={styles.dollarIcon}>$</Text>
            </View>
            <Text style={[styles.statValue, stats.roi >= 0 ? styles.positive : styles.negative]}>
              {stats.roi >= 0 ? '+' : ''}{stats.roi.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>ROI</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.filtersContainer}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterChip,
              selectedFilter === filter.key && styles.filterChipActive
            ]}
            onPress={() => setSelectedFilter(filter.key)}
          >
            <Text style={[
              styles.filterChipText,
              selectedFilter === filter.key && styles.filterChipTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredCombates}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const ave = getAveById(item.ave_id || item.macho_id || '');
          const resultStyle = getResultadoStyle(item.resultado);
          const ResultIcon = resultStyle.icon;

          return (
            <TouchableOpacity style={styles.combateCard} activeOpacity={0.7}>
              <View style={styles.combateHeader}>
                <View style={[styles.resultadoBadge, { backgroundColor: resultStyle.bg }]}>
                  <ResultIcon size={14} color={resultStyle.color} />
                  <Text style={[styles.resultadoText, { color: resultStyle.color }]}>
                    {item.resultado.charAt(0).toUpperCase() + item.resultado.slice(1)}
                  </Text>
                </View>
                <View style={styles.combateDateContainer}>
                  <Calendar size={12} color={COLORS.textSecondary} />
                  <Text style={styles.combateDate}>
                    {new Date(item.fecha).toLocaleDateString('es-ES')}
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
                  <Text style={styles.pesoText}>{item.peso_ave} kg</Text>
                  {item.duracion_minutos && (
                    <Text style={styles.duracionText}>{item.duracion_minutos} min</Text>
                  )}
                </View>
              </View>

              {(item.apostado || item.ganado) && (
                <View style={styles.financialRow}>
                  <Text style={styles.financialLabel}>
                    Apostado: ${(item.apostado || 0).toLocaleString()}
                  </Text>
                  <Text style={[
                    styles.financialValue,
                    (item.ganado || 0) > (item.apostado || 0) ? styles.positive : styles.negative
                  ]}>
                    Ganado: ${(item.ganado || 0).toLocaleString()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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

      <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={handleAddCombate}>
        <LinearGradient
          colors={[COLORS.secondary, COLORS.secondaryDark]}
          style={styles.fabGradient}
        >
          <Plus size={28} color={COLORS.textLight} />
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: COLORS.textLight,
  },
  placeholder: {
    width: 44,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  dollarIcon: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.textLight,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.textLight,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  positive: {
    color: '#4ADE80',
  },
  negative: {
    color: '#F87171',
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
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
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: COLORS.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
