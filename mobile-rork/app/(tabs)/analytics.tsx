import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp,
  TrendingDown,
  Bird,
  Trophy,
  DollarSign,
  Activity
} from 'lucide-react-native';
import { useAves } from '@/context/AvesContext';
import { useCombates } from '@/context/CombatesContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { aves, isLoading: loadingAves } = useAves();
  const { combates, stats, isLoading: loadingCombates } = useCombates();
  const [activeTab, setActiveTab] = useState<'general' | 'combates' | 'financiero'>('general');

  const isLoading = loadingAves || loadingCombates;

  const victorias = stats.victorias;
  const derrotas = stats.derrotas;
  const totalCombates = stats.total;
  const porcentajeVictorias = stats.porcentajeVictorias;

  const totalGanado = stats.totalGanado;
  const totalApostado = stats.totalApostado;
  const roi = stats.roi;
  const roiPercentage = totalApostado > 0 ? Math.round(((totalGanado - totalApostado) / totalApostado) * 100) : 0;

  const avesPorSexo = {
    machos: aves.filter(a => a.sexo === 'M').length,
    hembras: aves.filter(a => a.sexo === 'H').length,
  };

  const avesPorEstado = {
    activos: aves.filter(a => a.estado === 'activo').length,
    vendidos: aves.filter(a => a.estado === 'vendido').length,
    retirados: aves.filter(a => a.estado === 'retirado').length,
  };

  if (isLoading && combates.length === 0 && aves.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.info} />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.info, '#1565C0']}
        style={[styles.header, { paddingTop: insets.top + SPACING.md }]}
      >
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSubtitle}>Estadísticas de tu operación</Text>
      </LinearGradient>

      <View style={styles.tabs}>
        {(['general', 'combates', 'financiero'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'general' && (
          <>
            <View style={styles.kpiRow}>
              <KPICard
                icon={<Bird size={24} color={COLORS.primary} />}
                title="Total Aves"
                value={aves.length.toString()}
                trend={`${avesPorSexo.machos}M / ${avesPorSexo.hembras}H`}
                color={COLORS.primary}
              />
              <KPICard
                icon={<Trophy size={24} color={COLORS.success} />}
                title="Combates"
                value={totalCombates.toString()}
                trend={`${porcentajeVictorias}% victorias`}
                color={COLORS.success}
                positive={porcentajeVictorias >= 50}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Distribución de Aves</Text>
              <View style={styles.distributionCard}>
                <View style={styles.distributionRow}>
                  <View style={styles.distributionItem}>
                    <View style={[styles.dot, { backgroundColor: COLORS.male }]} />
                    <Text style={styles.distributionLabel}>Machos</Text>
                  </View>
                  <Text style={styles.distributionValue}>{avesPorSexo.machos}</Text>
                </View>
                <View style={styles.distributionRow}>
                  <View style={styles.distributionItem}>
                    <View style={[styles.dot, { backgroundColor: COLORS.female }]} />
                    <Text style={styles.distributionLabel}>Hembras</Text>
                  </View>
                  <Text style={styles.distributionValue}>{avesPorSexo.hembras}</Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${aves.length > 0 ? (avesPorSexo.machos / aves.length) * 100 : 50}%`,
                        backgroundColor: COLORS.male
                      }
                    ]}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estado de Aves</Text>
              <View style={styles.stateCards}>
                <StateCard label="Activos" value={avesPorEstado.activos} color={COLORS.success} />
                <StateCard label="Vendidos" value={avesPorEstado.vendidos} color={COLORS.info} />
                <StateCard label="Retirados" value={avesPorEstado.retirados} color={COLORS.warning} />
              </View>
            </View>
          </>
        )}

        {activeTab === 'combates' && (
          <>
            <View style={styles.kpiRow}>
              <KPICard
                icon={<Activity size={24} color={COLORS.success} />}
                title="Victorias"
                value={victorias.toString()}
                color={COLORS.success}
              />
              <KPICard
                icon={<Activity size={24} color={COLORS.error} />}
                title="Derrotas"
                value={derrotas.toString()}
                color={COLORS.error}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rendimiento</Text>
              <View style={styles.performanceCard}>
                <View style={styles.performanceCircle}>
                  <Text style={styles.performanceValue}>{porcentajeVictorias}%</Text>
                  <Text style={styles.performanceLabel}>Victorias</Text>
                </View>
                <View style={styles.performanceStats}>
                  <View style={styles.performanceStat}>
                    <View style={[styles.performanceBar, { backgroundColor: COLORS.success }]}>
                      <View
                        style={[
                          styles.performanceBarFill,
                          { width: `${porcentajeVictorias}%`, backgroundColor: COLORS.success }
                        ]}
                      />
                    </View>
                    <Text style={styles.performanceStatLabel}>Victorias ({victorias})</Text>
                  </View>
                  <View style={styles.performanceStat}>
                    <View style={[styles.performanceBar, { backgroundColor: COLORS.divider }]}>
                      <View
                        style={[
                          styles.performanceBarFill,
                          { width: `${100 - porcentajeVictorias}%`, backgroundColor: COLORS.error }
                        ]}
                      />
                    </View>
                    <Text style={styles.performanceStatLabel}>Derrotas ({derrotas})</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Últimos Combates</Text>
              {combates.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No hay combates registrados</Text>
                </View>
              ) : (
                combates.slice(0, 5).map((combate) => (
                  <View key={combate.id} style={styles.combateItem}>
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
                      {combate.resultado === 'victoria' ? 'V' : combate.resultado === 'derrota' ? 'D' : 'E'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {activeTab === 'financiero' && (
          <>
            <View style={styles.kpiRow}>
              <KPICard
                icon={<DollarSign size={24} color={COLORS.success} />}
                title="Total Ganado"
                value={`$${totalGanado.toLocaleString()}`}
                color={COLORS.success}
              />
              <KPICard
                icon={<TrendingUp size={24} color={roi >= 0 ? COLORS.success : COLORS.error} />}
                title="ROI"
                value={`${roi >= 0 ? '+' : ''}$${roi.toLocaleString()}`}
                trend={`${roiPercentage >= 0 ? '+' : ''}${roiPercentage}%`}
                color={roi >= 0 ? COLORS.success : COLORS.error}
                positive={roi >= 0}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Resumen Financiero</Text>
              <View style={styles.financialCard}>
                <View style={styles.financialRow}>
                  <Text style={styles.financialLabel}>Total Apostado</Text>
                  <Text style={styles.financialValue}>${totalApostado.toLocaleString()}</Text>
                </View>
                <View style={styles.financialDivider} />
                <View style={styles.financialRow}>
                  <Text style={styles.financialLabel}>Total Ganado</Text>
                  <Text style={[styles.financialValue, { color: COLORS.success }]}>${totalGanado.toLocaleString()}</Text>
                </View>
                <View style={styles.financialDivider} />
                <View style={styles.financialRow}>
                  <Text style={styles.financialLabel}>Balance</Text>
                  <Text style={[
                    styles.financialValue,
                    styles.financialBold,
                    { color: roi >= 0 ? COLORS.success : COLORS.error }
                  ]}>
                    {roi >= 0 ? '+' : ''}${roi.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Transacciones Recientes</Text>
              {combates.filter(c => c.ganado || c.apostado).length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No hay transacciones registradas</Text>
                </View>
              ) : (
                combates.filter(c => c.ganado || c.apostado).slice(0, 5).map((combate) => (
                  <View key={combate.id} style={styles.transactionItem}>
                    <View style={styles.transactionInfo}>
                      <Text style={styles.transactionDate}>
                        {new Date(combate.fecha).toLocaleDateString('es-ES')}
                      </Text>
                      <Text style={styles.transactionDesc}>Combate en {combate.lugar}</Text>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      { color: (combate.ganado || 0) > (combate.apostado || 0) ? COLORS.success : COLORS.error }
                    ]}>
                      {(combate.ganado || 0) > (combate.apostado || 0) ? '+' : '-'}
                      ${Math.abs((combate.ganado || 0) - (combate.apostado || 0)).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function KPICard({ icon, title, value, trend, color, positive }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  trend?: string;
  color: string;
  positive?: boolean;
}) {
  return (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '15' }]}>
        {icon}
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiTitle}>{title}</Text>
      {trend && (
        <Text style={[styles.kpiTrend, { color: positive !== false ? COLORS.success : COLORS.error }]}>
          {trend}
        </Text>
      )}
    </View>
  );
}

function StateCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stateCard}>
      <View style={[styles.stateIndicator, { backgroundColor: color }]} />
      <Text style={styles.stateValue}>{value}</Text>
      <Text style={styles.stateLabel}>{label}</Text>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: COLORS.textLight,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    margin: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
  },
  tabActive: {
    backgroundColor: COLORS.info,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.textLight,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  kpiIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  kpiTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  kpiTrend: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 4,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  distributionCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  distributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.sm,
  },
  distributionLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  distributionValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.female,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  stateCards: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  stateCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
  },
  stateIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: SPACING.sm,
  },
  stateValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  stateLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  performanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.success,
  },
  performanceLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  performanceStats: {
    flex: 1,
  },
  performanceStat: {
    marginBottom: SPACING.sm,
  },
  performanceBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  performanceBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  performanceStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  combateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
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
  financialCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  financialDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  financialLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.text,
  },
  financialBold: {
    fontWeight: '700' as const,
    fontSize: 18,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDate: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.text,
  },
  transactionDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptyState: {
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
