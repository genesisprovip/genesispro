import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Plus,
  ChevronRight,
  Bird,
  Trophy,
  Swords,
  DollarSign
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useAves } from '@/context/AvesContext';
import { useCombates } from '@/context/CombatesContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { aves, refreshAves, isLoading: loadingAves } = useAves();
  const { combates, stats, refreshCombates, isLoading: loadingCombates } = useCombates();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshAves(), refreshCombates()]);
    setRefreshing(false);
  }, [refreshAves, refreshCombates]);

  const avesActivas = aves.filter(a => a.estado === 'activo').length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={[styles.header, { paddingTop: insets.top + SPACING.md }]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hola, {user?.nombre || 'Usuario'}!</Text>
            <Text style={styles.subtitle}>Bienvenido a GenesisPro</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatsCard
              title="Aves Activas"
              value={avesActivas.toString()}
              icon={<Bird size={20} color={COLORS.primary} />}
              color={COLORS.primary}
            />
            <StatsCard
              title="Combates"
              value={stats.total.toString()}
              icon={<Swords size={20} color={COLORS.secondary} />}
              color={COLORS.secondary}
            />
          </View>
          <View style={styles.statsRow}>
            <StatsCard
              title="% Victorias"
              value={`${stats.porcentajeVictorias}%`}
              icon={<Trophy size={20} color={COLORS.success} />}
              color={COLORS.success}
            />
            <StatsCard
              title="ROI"
              value={`$${stats.roi.toLocaleString()}`}
              icon={<DollarSign size={20} color={COLORS.info} />}
              color={stats.roi >= 0 ? COLORS.success : COLORS.error}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/ave/new')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            style={styles.quickActionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.quickActionContent}>
              <View style={styles.quickActionIcon}>
                <Plus size={24} color={COLORS.textLight} />
              </View>
              <View style={styles.quickActionText}>
                <Text style={styles.quickActionTitle}>Registrar Nueva Ave</Text>
                <Text style={styles.quickActionSubtitle}>Agrega un nuevo ejemplar a tu colección</Text>
              </View>
            </View>
            <ChevronRight size={24} color={COLORS.textLight} />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => router.push('/combate/new')}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.secondary, COLORS.secondaryDark]}
            style={styles.quickActionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.quickActionContent}>
              <View style={styles.quickActionIcon}>
                <Swords size={24} color={COLORS.textLight} />
              </View>
              <View style={styles.quickActionText}>
                <Text style={styles.quickActionTitle}>Registrar Combate</Text>
                <Text style={styles.quickActionSubtitle}>Registra un nuevo combate</Text>
              </View>
            </View>
            <ChevronRight size={24} color={COLORS.textLight} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bird size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Resumen de Aves</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/aves')}>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total de Aves</Text>
              <Text style={styles.summaryValue}>{aves.length}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Machos</Text>
              <Text style={[styles.summaryValue, { color: COLORS.male }]}>
                {aves.filter(a => a.sexo === 'M').length}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Hembras</Text>
              <Text style={[styles.summaryValue, { color: COLORS.female }]}>
                {aves.filter(a => a.sexo === 'H').length}
              </Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>En Venta</Text>
              <Text style={[styles.summaryValue, { color: COLORS.secondary }]}>
                {aves.filter(a => a.disponible_venta).length}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Swords size={20} color={COLORS.secondary} />
            <Text style={styles.sectionTitle}>Últimos Combates</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/combates')}>
              <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          {combates.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No hay combates registrados</Text>
            </View>
          ) : (
            combates.slice(0, 3).map((combate) => (
              <View key={combate.id} style={styles.combateCard}>
                <View style={[
                  styles.combateIndicator,
                  { backgroundColor: combate.resultado === 'victoria' ? COLORS.success : combate.resultado === 'derrota' ? COLORS.error : COLORS.warning }
                ]} />
                <View style={styles.combateInfo}>
                  <Text style={styles.combateDate}>
                    {new Date(combate.fecha).toLocaleDateString('es-ES')}
                  </Text>
                  <Text style={styles.combateLugar}>{combate.lugar}</Text>
                </View>
                <Text style={[
                  styles.combateResultado,
                  { color: combate.resultado === 'victoria' ? COLORS.success : combate.resultado === 'derrota' ? COLORS.error : COLORS.warning }
                ]}>
                  {combate.resultado.charAt(0).toUpperCase()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatsCard({ title, value, icon, color }: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <View style={styles.statsCard}>
      <View style={[styles.statsIcon, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <Text style={styles.statsValue}>{value}</Text>
      <Text style={styles.statsTitle}>{title}</Text>
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
    paddingBottom: SPACING.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginTop: -SPACING.md,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  statsContainer: {
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  statsCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  statsTitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quickActionButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.textLight,
  },
  quickActionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text,
    flex: 1,
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500' as const,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  combateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  combateIndicator: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: SPACING.md,
  },
  combateInfo: {
    flex: 1,
  },
  combateDate: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.text,
  },
  combateLugar: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  combateResultado: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
