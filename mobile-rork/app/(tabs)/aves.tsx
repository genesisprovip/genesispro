import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Plus, X, Bird, SlidersHorizontal } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useAves } from '@/context/AvesContext';
import AveCard from '@/components/aves/AveCard';
import EmptyState from '@/components/common/EmptyState';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

type FilterType = 'todos' | 'machos' | 'hembras' | 'venta';

export default function AvesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const { aves, isLoading, refreshAves } = useAves();

  const handleAddAve = () => {
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
    router.push('/ave/new');
  };

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

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: 'todos', label: 'Todos', count: aves.length },
    { key: 'machos', label: 'Machos', count: aves.filter(a => a.sexo === 'M').length },
    { key: 'hembras', label: 'Hembras', count: aves.filter(a => a.sexo === 'H').length },
    { key: 'venta', label: 'En Venta', count: aves.filter(a => a.disponible_venta).length },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Mis Aves</Text>
            <Text style={styles.headerCount}>{aves.length} registradas</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddAve}
          >
            <Plus size={22} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={18} color={COLORS.placeholder} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por código, color, línea..."
            placeholderTextColor={COLORS.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <X size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <View style={styles.filtersContainer}>
        {filters.map((item) => {
          const isActive = selectedFilter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedFilter(item.key)}
            >
              <Text style={[
                styles.filterChipText,
                isActive && styles.filterChipTextActive
              ]}>
                {item.label}
              </Text>
              <View style={[
                styles.filterCount,
                isActive && styles.filterCountActive
              ]}>
                <Text style={[
                  styles.filterCountText,
                  isActive && styles.filterCountTextActive
                ]}>
                  {item.count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.resultsInfo}>
        <Bird size={14} color={COLORS.textSecondary} />
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
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
        style={[styles.fab, SHADOWS.lg]}
        onPress={() => router.push('/ave/new')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
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
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
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
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    height: 46,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textLight,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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
  resultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 6,
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
