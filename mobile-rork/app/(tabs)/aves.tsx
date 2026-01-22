import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus } from 'lucide-react-native';
import { useAves } from '@/context/AvesContext';
import AveCard from '@/components/aves/AveCard';
import EmptyState from '@/components/common/EmptyState';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

type FilterType = 'todos' | 'machos' | 'hembras' | 'venta';

export default function AvesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { aves, isLoading, refreshAves } = useAves();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('todos');
  const [refreshing, setRefreshing] = useState(false);

  const filteredAves = useMemo(() => {
    return aves.filter(ave => {
      const matchesSearch = !searchQuery ||
        ave.codigo_identidad.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ave.color?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ave.linea_genetica?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = selectedFilter === 'todos' ||
        (selectedFilter === 'machos' && ave.sexo === 'M') ||
        (selectedFilter === 'hembras' && ave.sexo === 'H') ||
        (selectedFilter === 'venta' && ave.disponible_venta);

      return matchesSearch && matchesFilter;
    });
  }, [aves, searchQuery, selectedFilter]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshAves();
    setRefreshing(false);
  }, [refreshAves]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'machos', label: 'Machos' },
    { key: 'hembras', label: 'Hembras' },
    { key: 'venta', label: 'En Venta' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={[styles.header, { paddingTop: insets.top + SPACING.md }]}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Mis Aves</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/ave/new')}
          >
            <Plus size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={COLORS.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por código, color, línea..."
            placeholderTextColor={COLORS.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearText}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === item.key && styles.filterChipActive
              ]}
              onPress={() => setSelectedFilter(item.key)}
            >
              <Text style={[
                styles.filterChipText,
                selectedFilter === item.key && styles.filterChipTextActive
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          {filteredAves.length} {filteredAves.length === 1 ? 'ave encontrada' : 'aves encontradas'}
        </Text>
      </View>

      <FlatList
        data={filteredAves}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AveCard
            ave={item}
            onPress={() => router.push(`/ave/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="bird"
            title="No hay aves"
            message={searchQuery
              ? "No se encontraron aves con esos criterios"
              : "Agrega tu primera ave para comenzar"
            }
            actionLabel={!searchQuery ? "Agregar Ave" : undefined}
            onAction={!searchQuery ? () => router.push('/ave/new') : undefined}
          />
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/ave/new')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
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
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  clearText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  filtersContainer: {
    backgroundColor: COLORS.card,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  filtersList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
  filterChipTextActive: {
    color: COLORS.textLight,
  },
  resultsInfo: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  resultsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.lg,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
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
