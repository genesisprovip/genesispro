import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Plus,
  Syringe,
  Pill,
  Stethoscope,
  Bug,
  Heart,
  Calendar,
  AlertCircle,
  ChevronRight,
} from 'lucide-react-native';
import { useSalud, RegistroSalud } from '@/context/SaludContext';
import { useAves } from '@/context/AvesContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

type FilterType = 'todos' | 'vacuna' | 'tratamiento' | 'enfermedad' | 'desparasitacion' | 'revision';

const TIPO_CONFIG = {
  vacuna: { icon: Syringe, color: '#4CAF50', label: 'Vacuna' },
  tratamiento: { icon: Pill, color: '#2196F3', label: 'Tratamiento' },
  enfermedad: { icon: Bug, color: '#F44336', label: 'Enfermedad' },
  revision: { icon: Stethoscope, color: '#9C27B0', label: 'Revisión' },
  desparasitacion: { icon: Bug, color: '#FF9800', label: 'Desparasitación' },
};

export default function SaludScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { registros, stats, isLoading, refreshRegistros, getProximasVacunas } = useSalud();
  const { getAveById } = useAves();

  const [selectedFilter, setSelectedFilter] = useState<FilterType>('todos');
  const [refreshing, setRefreshing] = useState(false);

  const proximasVacunas = getProximasVacunas();

  const filteredRegistros = useMemo(() => {
    if (selectedFilter === 'todos') return registros;
    return registros.filter(r => r.tipo === selectedFilter);
  }, [registros, selectedFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshRegistros();
    setRefreshing(false);
  };

  const filters: { key: FilterType; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'vacuna', label: 'Vacunas' },
    { key: 'tratamiento', label: 'Tratamientos' },
    { key: 'enfermedad', label: 'Enfermedades' },
    { key: 'desparasitacion', label: 'Desparasitaciones' },
    { key: 'revision', label: 'Revisiones' },
  ];

  const renderRegistro = ({ item }: { item: RegistroSalud }) => {
    const config = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.revision;
    const Icon = config.icon;
    const ave = getAveById(item.ave_id);

    return (
      <TouchableOpacity
        style={styles.registroCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/salud/${item.id}`)}
      >
        <View style={[styles.registroIcon, { backgroundColor: config.color + '20' }]}>
          <Icon size={24} color={config.color} />
        </View>
        <View style={styles.registroContent}>
          <View style={styles.registroHeader}>
            <Text style={styles.registroNombre} numberOfLines={1}>{item.nombre}</Text>
            <View style={[styles.tipoBadge, { backgroundColor: config.color + '20' }]}>
              <Text style={[styles.tipoText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>
          {ave && (
            <Text style={styles.registroAve}>{ave.codigo_identidad}</Text>
          )}
          <View style={styles.registroMeta}>
            <View style={styles.metaItem}>
              <Calendar size={12} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>
                {item.fecha ? new Date(item.fecha).toLocaleDateString('es-ES') : 'Sin fecha'}
              </Text>
            </View>
            {item.fecha_proxima && (
              <View style={styles.metaItem}>
                <AlertCircle size={12} color={COLORS.warning} />
                <Text style={[styles.metaText, { color: COLORS.warning }]}>
                  Próxima: {item.fecha_proxima ? new Date(item.fecha_proxima).toLocaleDateString('es-ES') : '-'}
                </Text>
              </View>
            )}
          </View>
        </View>
        <ChevronRight size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>
    );
  };

  if (isLoading && registros.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.error} />
        <Text style={styles.loadingText}>Cargando registros...</Text>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Salud</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/salud/new')}
          >
            <Plus size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Heart size={20} color={COLORS.textLight} />
            <Text style={styles.statValue}>{stats.totalRegistros}</Text>
            <Text style={styles.statLabel}>Registros</Text>
          </View>
          <View style={styles.statCard}>
            <Syringe size={20} color={COLORS.textLight} />
            <Text style={styles.statValue}>{stats.vacunasPendientes}</Text>
            <Text style={styles.statLabel}>Próximas Vacunas</Text>
          </View>
          <View style={styles.statCard}>
            <Pill size={20} color={COLORS.textLight} />
            <Text style={styles.statValue}>{stats.tratamientosActivos}</Text>
            <Text style={styles.statLabel}>Tratamientos</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Próximas vacunas */}
      {proximasVacunas.length > 0 && (
        <View style={styles.alertSection}>
          <View style={styles.alertHeader}>
            <AlertCircle size={18} color={COLORS.warning} />
            <Text style={styles.alertTitle}>Próximas vacunas</Text>
          </View>
          <FlatList
            horizontal
            data={proximasVacunas.slice(0, 5)}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.alertList}
            renderItem={({ item }) => {
              const ave = getAveById(item.ave_id);
              const diasRestantes = Math.ceil(
                (new Date(item.fecha_proxima!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              return (
                <View style={styles.alertCard}>
                  <Text style={styles.alertVacuna}>{item.nombre}</Text>
                  <Text style={styles.alertAve}>{ave?.codigo_identidad || 'Ave'}</Text>
                  <Text style={[
                    styles.alertDias,
                    diasRestantes <= 7 && { color: COLORS.error }
                  ]}>
                    {diasRestantes <= 0 ? 'Vencida' : `En ${diasRestantes} días`}
                  </Text>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Filtros */}
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

      {/* Lista de registros */}
      <FlatList
        data={filteredRegistros}
        keyExtractor={(item) => item.id}
        renderItem={renderRegistro}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Heart size={64} color={COLORS.textDisabled} />
            <Text style={styles.emptyTitle}>Sin registros de salud</Text>
            <Text style={styles.emptyMessage}>
              Registra vacunas, tratamientos y revisiones de tus aves
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/salud/new')}
            >
              <Text style={styles.emptyButtonText}>Agregar Registro</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push('/salud/new')}
      >
        <LinearGradient
          colors={['#EC4899', '#DB2777']}
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
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'space-between',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textLight,
    marginTop: SPACING.xs,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textAlign: 'center',
  },
  alertSection: {
    padding: SPACING.md,
    backgroundColor: COLORS.warning + '10',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
  },
  alertList: {
    gap: SPACING.sm,
  },
  alertCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    minWidth: 120,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  alertVacuna: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  alertAve: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  alertDias: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
    marginTop: SPACING.xs,
  },
  filtersContainer: {
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
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  filterChipActive: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  filterChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: COLORS.textLight,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  registroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  registroIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  registroContent: {
    flex: 1,
  },
  registroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  registroNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  tipoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tipoText: {
    fontSize: 10,
    fontWeight: '600',
  },
  registroAve: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  registroMeta: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
    gap: SPACING.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.error,
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
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: COLORS.error,
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
