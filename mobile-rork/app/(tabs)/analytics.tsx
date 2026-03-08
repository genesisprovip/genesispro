import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TrendingUp,
  Bird,
  Trophy,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  Wallet,
} from 'lucide-react-native';
import { useAves } from '@/context/AvesContext';
import { useCombates } from '@/context/CombatesContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

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

  const tabs = [
    { key: 'general' as const, label: 'General', icon: PieChart },
    { key: 'combates' as const, label: 'Combates', icon: BarChart3 },
    { key: 'financiero' as const, label: 'Finanzas', icon: Wallet },
  ];

  if (isLoading && combates.length === 0 && aves.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.accent, '#4F46E5']}
        style={[styles.header, { paddingTop: insets.top + SPACING.md }]}
      >
        <Text style={styles.headerTitle}>Estadísticas</Text>
        <Text style={styles.headerSubtitle}>Análisis de tu operación</Text>
      </LinearGradient>

      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Icon size={16} color={isActive ? COLORS.textLight : COLORS.textSecondary} />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
                icon={<Bird size={22} color={COLORS.primary} />}
                title="Total Aves"
                value={aves.length.toString()}
                detail={`${avesPorSexo.machos}M / ${avesPorSexo.hembras}H`}
                color={COLORS.primary}
              />
              <KPICard
                icon={<Trophy size={22} color={COLORS.secondary} />}
                title="Combates"
                value={totalCombates.toString()}
                detail={`${porcentajeVictorias}% victorias`}
                color={COLORS.secondary}
              />
            </View>

            <View style={[styles.sectionCard, SHADOWS.md]}>
              <Text style={styles.cardTitle}>Distribución por Sexo</Text>
              <View style={styles.distRow}>
                <View style={styles.distItem}>
                  <View style={[styles.distDot, { backgroundColor: COLORS.male }]} />
                  <Text style={styles.distLabel}>Machos</Text>
                  <Text style={styles.distValue}>{avesPorSexo.machos}</Text>
                </View>
                <View style={styles.distItem}>
                  <View style={[styles.distDot, { backgroundColor: COLORS.female }]} />
                  <Text style={styles.distLabel}>Hembras</Text>
                  <Text style={styles.distValue}>{avesPorSexo.hembras}</Text>
                </View>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${aves.length > 0 ? (avesPorSexo.machos / aves.length) * 100 : 50}%`,
                      backgroundColor: COLORS.male,
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                    }
                  ]}
                />
                <View
                  style={[
                    styles.barFill,
                    {
                      flex: 1,
                      backgroundColor: COLORS.female,
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                    }
                  ]}
                />
              </View>
            </View>

            <View style={[styles.sectionCard, SHADOWS.md]}>
              <Text style={styles.cardTitle}>Estado de Aves</Text>
              <View style={styles.stateRow}>
                <StateChip label="Activos" value={avesPorEstado.activos} color={COLORS.success} total={aves.length} />
                <StateChip label="Vendidos" value={avesPorEstado.vendidos} color={COLORS.info} total={aves.length} />
                <StateChip label="Retirados" value={avesPorEstado.retirados} color={COLORS.warning} total={aves.length} />
              </View>
            </View>
          </>
        )}

        {activeTab === 'combates' && (
          <>
            <View style={styles.kpiRow}>
              <KPICard
                icon={<Activity size={22} color={COLORS.success} />}
                title="Victorias"
                value={victorias.toString()}
                color={COLORS.success}
              />
              <KPICard
                icon={<Activity size={22} color={COLORS.error} />}
                title="Derrotas"
                value={derrotas.toString()}
                color={COLORS.error}
              />
            </View>

            <View style={[styles.sectionCard, SHADOWS.md]}>
              <Text style={styles.cardTitle}>Rendimiento Global</Text>
              <View style={styles.perfRow}>
                <View style={styles.perfRing}>
                  <View style={[styles.ringCircle, { borderColor: COLORS.primary }]}>
                    <Text style={styles.ringPct}>{porcentajeVictorias}%</Text>
                    <Text style={styles.ringLbl}>Win Rate</Text>
                  </View>
                </View>
                <View style={styles.perfBars}>
                  <ResultBar label="Victorias" value={victorias} total={totalCombates} color={COLORS.victory} />
                  <ResultBar label="Derrotas" value={derrotas} total={totalCombates} color={COLORS.defeat} />
                  <ResultBar label="Empates" value={stats.empates} total={totalCombates} color={COLORS.draw} />
                </View>
              </View>
            </View>

            <View style={[styles.sectionCard, SHADOWS.md]}>
              <Text style={styles.cardTitle}>Historial Reciente</Text>
              {combates.length === 0 ? (
                <Text style={styles.emptyText}>No hay combates registrados</Text>
              ) : (
                combates.slice(0, 5).map((combate) => (
                  <View key={combate.id} style={styles.histItem}>
                    <View style={[
                      styles.histDot,
                      { backgroundColor: combate.resultado === 'victoria' ? COLORS.success : combate.resultado === 'derrota' ? COLORS.error : COLORS.warning }
                    ]} />
                    <View style={styles.histInfo}>
                      <Text style={styles.histDate}>
                        {new Date(combate.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                      </Text>
                      <Text style={styles.histPlace}>{combate.lugar}</Text>
                    </View>
                    <View style={[
                      styles.histBadge,
                      { backgroundColor: combate.resultado === 'victoria' ? COLORS.success + '15' : combate.resultado === 'derrota' ? COLORS.error + '15' : COLORS.warning + '15' }
                    ]}>
                      <Text style={[
                        styles.histResult,
                        { color: combate.resultado === 'victoria' ? COLORS.success : combate.resultado === 'derrota' ? COLORS.error : COLORS.warning }
                      ]}>
                        {combate.resultado === 'victoria' ? 'V' : combate.resultado === 'derrota' ? 'D' : 'E'}
                      </Text>
                    </View>
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
                icon={<DollarSign size={22} color={COLORS.success} />}
                title="Ganado"
                value={`$${totalGanado.toLocaleString()}`}
                color={COLORS.success}
              />
              <KPICard
                icon={<TrendingUp size={22} color={roi >= 0 ? COLORS.success : COLORS.error} />}
                title="ROI"
                value={`${roi >= 0 ? '+' : ''}$${roi.toLocaleString()}`}
                detail={`${roiPercentage >= 0 ? '+' : ''}${roiPercentage}%`}
                color={roi >= 0 ? COLORS.success : COLORS.error}
              />
            </View>

            <View style={[styles.sectionCard, SHADOWS.md]}>
              <Text style={styles.cardTitle}>Resumen Financiero</Text>
              <FinRow label="Total Apostado" value={`$${totalApostado.toLocaleString()}`} />
              <View style={styles.finDivider} />
              <FinRow label="Total Ganado" value={`$${totalGanado.toLocaleString()}`} color={COLORS.success} />
              <View style={styles.finDivider} />
              <FinRow
                label="Balance Neto"
                value={`${roi >= 0 ? '+' : ''}$${roi.toLocaleString()}`}
                color={roi >= 0 ? COLORS.success : COLORS.error}
                bold
              />
            </View>

            <View style={[styles.sectionCard, SHADOWS.md]}>
              <Text style={styles.cardTitle}>Últimas Transacciones</Text>
              {combates.filter(c => c.ganado || c.apostado).length === 0 ? (
                <Text style={styles.emptyText}>No hay transacciones registradas</Text>
              ) : (
                combates.filter(c => c.ganado || c.apostado).slice(0, 5).map((combate) => {
                  const neto = (combate.ganado || 0) - (combate.apostado || 0);
                  return (
                    <View key={combate.id} style={styles.txRow}>
                      <View style={[styles.txIcon, { backgroundColor: neto >= 0 ? COLORS.success + '15' : COLORS.error + '15' }]}>
                        <DollarSign size={16} color={neto >= 0 ? COLORS.success : COLORS.error} />
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txPlace}>{combate.lugar}</Text>
                        <Text style={styles.txDate}>
                          {new Date(combate.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </Text>
                      </View>
                      <Text style={[styles.txAmount, { color: neto >= 0 ? COLORS.success : COLORS.error }]}>
                        {neto >= 0 ? '+' : ''}${Math.abs(neto).toLocaleString()}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
}

function KPICard({ icon, title, value, detail, color }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail?: string;
  color: string;
}) {
  return (
    <View style={[styles.kpiCard, SHADOWS.md]}>
      <View style={[styles.kpiIcon, { backgroundColor: color + '12' }]}>
        {icon}
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiTitle}>{title}</Text>
      {detail && (
        <Text style={[styles.kpiDetail, { color }]}>{detail}</Text>
      )}
    </View>
  );
}

function StateChip({ label, value, color, total }: { label: string; value: number; color: string; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View style={styles.stateChip}>
      <View style={[styles.stateBar, { backgroundColor: color + '20' }]}>
        <View style={[styles.stateBarFill, { height: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.stateValue}>{value}</Text>
      <Text style={styles.stateLabel}>{label}</Text>
    </View>
  );
}

function ResultBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <View style={styles.resultBarBg}>
        <View style={[styles.resultBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.resultNum}>{value}</Text>
    </View>
  );
}

function FinRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={styles.finRow}>
      <Text style={styles.finLabel}>{label}</Text>
      <Text style={[
        styles.finValue,
        color ? { color } : undefined,
        bold ? { fontWeight: '700', fontSize: 18 } : undefined,
      ]}>
        {value}
      </Text>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: -SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    ...SHADOWS.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm + 2,
    borderRadius: BORDER_RADIUS.md,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.accent,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
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
    paddingTop: SPACING.md,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
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
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  kpiTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  kpiDetail: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  distRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  distItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  distDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  distLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  distValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  barTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  stateRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  stateChip: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stateBar: {
    width: '100%',
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  stateBarFill: {
    width: '100%',
    borderRadius: BORDER_RADIUS.md,
  },
  stateValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  stateLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  perfRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perfRing: {
    marginRight: SPACING.lg,
  },
  ringCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '08',
  },
  ringPct: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ringLbl: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: -2,
  },
  perfBars: {
    flex: 1,
    gap: SPACING.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  resultLabel: {
    width: 70,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  resultBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  resultBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  resultNum: {
    width: 24,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'right',
  },
  histItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  histDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.md,
  },
  histInfo: {
    flex: 1,
  },
  histDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  histPlace: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  histBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  histResult: {
    fontSize: 14,
    fontWeight: '700',
  },
  finRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  finDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  finLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  finValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  txInfo: {
    flex: 1,
  },
  txPlace: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  txDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SPACING.lg,
  },
});
