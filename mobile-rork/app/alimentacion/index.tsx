import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Plus,
  Package,
  ClipboardList,
  UtensilsCrossed,
  AlertTriangle,
  Calendar,
  Trash2,
  Edit,
} from 'lucide-react-native';
import { useAlimentacion, Alimento, RegistroAlimentacion, Dieta } from '@/context/AlimentacionContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

type TabType = 'inventario' | 'registros' | 'dietas';

export default function AlimentacionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    alimentos,
    registros,
    dietas,
    stats,
    isLoading,
    deleteAlimento,
    deleteRegistro,
    deleteDieta,
    refreshData,
  } = useAlimentacion();

  const [activeTab, setActiveTab] = useState<TabType>('inventario');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleDeleteAlimento = (id: string, nombre: string) => {
    Alert.alert(
      'Eliminar Alimento',
      `¿Estás seguro de eliminar "${nombre}" del inventario?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteAlimento(id),
        },
      ]
    );
  };

  const handleDeleteRegistro = (id: string) => {
    Alert.alert(
      'Eliminar Registro',
      '¿Estás seguro de eliminar este registro de alimentación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteRegistro(id),
        },
      ]
    );
  };

  const handleDeleteDieta = (id: string, nombre: string) => {
    Alert.alert(
      'Eliminar Dieta',
      `¿Estás seguro de eliminar la dieta "${nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteDieta(id),
        },
      ]
    );
  };

  const getTipoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      concentrado: '#4CAF50',
      suplemento: '#2196F3',
      vitamina: '#FF9800',
      mineral: '#9C27B0',
      otro: '#607D8B',
    };
    return colors[tipo] || colors.otro;
  };

  const getTipoComidaColor = (tipo: string) => {
    const colors: Record<string, string> = {
      desayuno: '#FF9800',
      almuerzo: '#4CAF50',
      cena: '#2196F3',
      suplemento: '#9C27B0',
      otro: '#607D8B',
    };
    return colors[tipo] || colors.otro;
  };

  const renderInventario = () => (
    <View style={styles.tabContent}>
      {alimentos.length === 0 ? (
        <View style={styles.emptyState}>
          <Package size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Sin inventario</Text>
          <Text style={styles.emptySubtitle}>
            Agrega alimentos a tu inventario
          </Text>
        </View>
      ) : (
        alimentos.map((alimento) => (
          <View key={alimento.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.tipoBadge, { backgroundColor: getTipoColor(alimento.tipo) + '20' }]}>
                <Text style={[styles.tipoBadgeText, { color: getTipoColor(alimento.tipo) }]}>
                  {alimento.tipo.charAt(0).toUpperCase() + alimento.tipo.slice(1)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteAlimento(alimento.id, alimento.nombre)}
                style={styles.deleteButton}
              >
                <Trash2 size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardTitle}>{alimento.nombre}</Text>
            <View style={styles.cardDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cantidad:</Text>
                <Text style={[
                  styles.detailValue,
                  alimento.cantidad < 5 && styles.lowStock
                ]}>
                  {alimento.cantidad} {alimento.unidad}
                  {alimento.cantidad < 5 && ' ⚠️'}
                </Text>
              </View>
              {alimento.precio_unitario && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Precio:</Text>
                  <Text style={styles.detailValue}>
                    ${alimento.precio_unitario.toFixed(2)}/{alimento.unidad}
                  </Text>
                </View>
              )}
              {alimento.fecha_vencimiento && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vence:</Text>
                  <Text style={styles.detailValue}>{alimento.fecha_vencimiento}</Text>
                </View>
              )}
              {alimento.proveedor && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Proveedor:</Text>
                  <Text style={styles.detailValue}>{alimento.proveedor}</Text>
                </View>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderRegistros = () => (
    <View style={styles.tabContent}>
      {registros.length === 0 ? (
        <View style={styles.emptyState}>
          <ClipboardList size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Sin registros</Text>
          <Text style={styles.emptySubtitle}>
            Registra las comidas de tus aves
          </Text>
        </View>
      ) : (
        registros.map((registro) => (
          <View key={registro.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.tipoBadge, { backgroundColor: getTipoComidaColor(registro.tipo_comida) + '20' }]}>
                <Text style={[styles.tipoBadgeText, { color: getTipoComidaColor(registro.tipo_comida) }]}>
                  {registro.tipo_comida.charAt(0).toUpperCase() + registro.tipo_comida.slice(1)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteRegistro(registro.id)}
                style={styles.deleteButton}
              >
                <Trash2 size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardTitle}>{registro.alimento_nombre}</Text>
            <View style={styles.cardDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Cantidad:</Text>
                <Text style={styles.detailValue}>
                  {registro.cantidad} {registro.unidad}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Calendar size={14} color={COLORS.textSecondary} />
                <Text style={styles.detailValue}>
                  {registro.fecha} {registro.hora && `a las ${registro.hora}`}
                </Text>
              </View>
              {registro.notas && (
                <Text style={styles.notasText}>{registro.notas}</Text>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderDietas = () => (
    <View style={styles.tabContent}>
      {dietas.length === 0 ? (
        <View style={styles.emptyState}>
          <UtensilsCrossed size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Sin dietas</Text>
          <Text style={styles.emptySubtitle}>
            Crea planes de alimentación para tus aves
          </Text>
        </View>
      ) : (
        dietas.map((dieta) => (
          <View key={dieta.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[
                styles.tipoBadge,
                { backgroundColor: dieta.activa ? COLORS.success + '20' : COLORS.textSecondary + '20' }
              ]}>
                <Text style={[
                  styles.tipoBadgeText,
                  { color: dieta.activa ? COLORS.success : COLORS.textSecondary }
                ]}>
                  {dieta.activa ? 'Activa' : 'Inactiva'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDeleteDieta(dieta.id, dieta.nombre)}
                style={styles.deleteButton}
              >
                <Trash2 size={18} color={COLORS.error} />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardTitle}>{dieta.nombre}</Text>
            {dieta.descripcion && (
              <Text style={styles.descripcionText}>{dieta.descripcion}</Text>
            )}
            <View style={styles.alimentosList}>
              <Text style={styles.alimentosTitle}>Alimentos:</Text>
              {dieta.alimentos.map((item, index) => (
                <View key={index} style={styles.alimentoItem}>
                  <Text style={styles.alimentoItemText}>
                    • {item.alimento_nombre}: {item.cantidad} {item.unidad} ({item.frecuencia})
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  );

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
          <Text style={styles.headerTitle}>Alimentación</Text>
          <TouchableOpacity
            onPress={() => router.push('/alimentacion/new')}
            style={styles.addButton}
          >
            <Plus size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalAlimentos}</Text>
            <Text style={styles.statLabel}>Productos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, stats.alimentosBajoStock > 0 && styles.statWarning]}>
              {stats.alimentosBajoStock}
            </Text>
            <Text style={styles.statLabel}>Bajo Stock</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.registrosHoy}</Text>
            <Text style={styles.statLabel}>Hoy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>${stats.gastoMensual.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Este Mes</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inventario' && styles.tabActive]}
          onPress={() => setActiveTab('inventario')}
        >
          <Package size={18} color={activeTab === 'inventario' ? COLORS.warning : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'inventario' && styles.tabTextActive]}>
            Inventario
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'registros' && styles.tabActive]}
          onPress={() => setActiveTab('registros')}
        >
          <ClipboardList size={18} color={activeTab === 'registros' ? COLORS.warning : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'registros' && styles.tabTextActive]}>
            Registros
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dietas' && styles.tabActive]}
          onPress={() => setActiveTab('dietas')}
        >
          <UtensilsCrossed size={18} color={activeTab === 'dietas' ? COLORS.warning : COLORS.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'dietas' && styles.tabTextActive]}>
            Dietas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alerta de bajo stock */}
      {stats.alimentosBajoStock > 0 && (
        <View style={styles.alertBanner}>
          <AlertTriangle size={18} color={COLORS.warning} />
          <Text style={styles.alertText}>
            {stats.alimentosBajoStock} producto(s) con bajo stock
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.warning]}
            tintColor={COLORS.warning}
          />
        }
      >
        {activeTab === 'inventario' && renderInventario()}
        {activeTab === 'registros' && renderRegistros()}
        {activeTab === 'dietas' && renderDietas()}
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
    paddingBottom: SPACING.md,
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  statWarning: {
    color: '#FFEB3B',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md,
    marginTop: -SPACING.sm,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xs,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  tabActive: {
    backgroundColor: COLORS.warning + '15',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.warning,
    fontWeight: '600',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '15',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  alertText: {
    fontSize: 13,
    color: COLORS.warning,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  tabContent: {
    gap: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  tipoBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  tipoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  lowStock: {
    color: COLORS.error,
  },
  notasText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  descripcionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  alimentosList: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  alimentosTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  alimentoItem: {
    paddingVertical: 2,
  },
  alimentoItemText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
