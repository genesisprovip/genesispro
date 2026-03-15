import React, { useState, useEffect, useMemo } from 'react';
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
  ChartColumn,
  ChartPie,
  Wallet,
  Award,
} from 'lucide-react-native';
import { useAves } from '@/context/AvesContext';
import { useCombates } from '@/context/CombatesContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import api from '@/services/api';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { aves, isLoading: loadingAves } = useAves();
  const { combates, stats, isLoading: loadingCombates } = useCombates();
  const [activeTab, setActiveTab] = useState<'general' | 'combates' | 'financiero'>('general');
  const [apiDashboard, setApiDashboard] = useState<any>(null);
  const [apiFinanciero, setApiFinanciero] = useState<any>(null);
  const [topAves, setTopAves] = useState<any[]>([]);

  useEffect(() => {
    loadApiData();
  }, []);

  async function loadApiData() {
    try {
      const [dashRes, finRes, topRes] = await Promise.all([
        api.getAnalyticsDashboard().catch(() => null),
        api.getFinancialSummary('12m').catch(() => null),
        api.getTopAves(5).catch(() => null),
      ]);
      if (dashRes?.data) setApiDashboard(dashRes.data);
      if (finRes?.data) setApiFinanciero(finRes.data);
      if (topRes?.data) setTopAves(topRes.data);
    } catch { /* use local data as fallback */ }
  }

  const isLoading = loadingAves || loadingCombates;

  // Prefer API data when available, fallback to local context
  const dashboard = apiDashboard || {};
  const victorias = dashboard.victorias ?? stats.victorias;
  const derrotas = dashboard.derrotas ?? stats.derrotas;
  const totalCombates = dashboard.total_combates ?? stats.total;
  const empates = dashboard.empates ?? stats.empates;
  const porcentajeVictorias = totalCombates > 0 ? Math.round((victorias / totalCombates) * 100) : 0;

  const fin = apiFinanciero || {};
  const totalIngresos = Number(fin.total_ingresos || stats.totalGanado || 0);
  const totalEgresos = Number(fin.total_egresos || stats.totalApostado || 0);
  const balanceNeto = Number(fin.balance_neto ?? (totalIngresos - totalEgresos));
  const roiPercentage = totalEgresos > 0 ? Math.round(((totalIngresos - totalEgresos) / totalEgresos) * 100) : 0;

  const totalAves = dashboard.total_aves ?? aves.length;
  const avesPorSexo = {
    machos: dashboard.machos ?? aves.filter(a => a.sexo === 'M').length,
    hembras: dashboard.hembras ?? aves.filter(a => a.sexo === 'H').length,
  };

  const avesPorEstado = {
    activos: dashboard.activos ?? aves.filter(a => a.estado === 'activo').length,
    vendidos: dashboard.vendidos ?? aves.filter(a => a.estado === 'vendido').length,
    retirados: dashboard.retirados ?? aves.filter(a => a.estado === 'retirado').length,
  };

  // === Bajas y Mortalidad ===
  const bajasData = useMemo(() => {
    const bajas = aves.filter(a => a.estado !== 'activo');
    const motivoCounts: Record<string, number> = {};
    bajas.forEach(a => {
      const motivo = a.motivo_baja || a.estado || 'Sin especificar';
      motivoCounts[motivo] = (motivoCounts[motivo] || 0) + 1;
    });

    const motivoCategories = [
      { key: 'Muerte en combate', aliases: ['Murió en combate', 'Muerte en combate', 'muerte en combate', 'muerto'], color: COLORS.error },
      { key: 'Enfermedad', aliases: ['Enfermedad', 'enfermedad', 'enfermo'], color: '#DC2626' },
      { key: 'Vendido', aliases: ['Vendido', 'vendido', 'venta'], color: COLORS.info },
      { key: 'Retirado', aliases: ['Retirado', 'retirado', 'retiro'], color: COLORS.warning },
    ];

    const categorized: { label: string; count: number; color: string }[] = [];
    const counted = new Set<string>();

    motivoCategories.forEach(cat => {
      let count = 0;
      cat.aliases.forEach(alias => {
        if (motivoCounts[alias]) {
          count += motivoCounts[alias];
          counted.add(alias);
        }
      });
      if (count > 0) {
        categorized.push({ label: cat.key, count, color: cat.color });
      }
    });

    // "Otros" bucket
    let otrosCount = 0;
    Object.entries(motivoCounts).forEach(([key, val]) => {
      if (!counted.has(key)) otrosCount += val;
    });
    if (otrosCount > 0) {
      categorized.push({ label: 'Otros', count: otrosCount, color: COLORS.textSecondary });
    }

    return { total: bajas.length, categories: categorized };
  }, [aves]);

  // === Rendimiento por Línea Genética ===
  const lineaData = useMemo(() => {
    const lineaStats: Record<string, { victorias: number; derrotas: number; empates: number; total: number }> = {};
    combates.forEach(c => {
      const ave = aves.find(a => a.id === (c as any).macho_id || a.id === (c as any).ave_id);
      if (!ave || !ave.linea_genetica) return;
      const linea = ave.linea_genetica;
      if (!lineaStats[linea]) lineaStats[linea] = { victorias: 0, derrotas: 0, empates: 0, total: 0 };
      lineaStats[linea].total++;
      if (c.resultado === 'victoria') lineaStats[linea].victorias++;
      else if (c.resultado === 'derrota') lineaStats[linea].derrotas++;
      else lineaStats[linea].empates++;
    });

    const sorted = Object.entries(lineaStats)
      .map(([name, s]) => ({
        name,
        ...s,
        winPct: s.total > 0 ? Math.round((s.victorias / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.winPct - a.winPct || b.victorias - a.victorias);

    return sorted;
  }, [aves, combates]);

  const tabs = [
    { key: 'general' as const, label: 'General', icon: ChartPie },
    { key: 'combates' as const, label: 'Combates', icon: ChartColumn },
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
                value={totalAves.toString()}
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
                <StateChip label="Activos" value={avesPorEstado.activos} color={COLORS.success} total={totalAves} />
                <StateChip label="Vendidos" value={avesPorEstado.vendidos} color={COLORS.info} total={totalAves} />
                <StateChip label="Retirados" value={avesPorEstado.retirados} color={COLORS.warning} total={totalAves} />
              </View>
            </View>

            {bajasData.total > 0 && (
              <View style={[styles.sectionCard, SHADOWS.md]}>
                <Text style={styles.cardTitle}>Bajas y Mortalidad</Text>
                <View style={styles.bajasHeader}>
                  <Text style={styles.bajasTotal}>{bajasData.total}</Text>
                  <Text style={styles.bajasTotalLabel}>aves no activas</Text>
                </View>
                {bajasData.categories.map((cat, i) => {
                  const pct = bajasData.total > 0 ? (cat.count / bajasData.total) * 100 : 0;
                  return (
                    <View key={i} style={styles.bajaRow}>
                      <View style={styles.bajaLabelRow}>
                        <View style={[styles.distDot, { backgroundColor: cat.color }]} />
                        <Text style={styles.bajaLabel}>{cat.label}</Text>
                        <Text style={styles.bajaCount}>{cat.count}</Text>
                      </View>
                      <View style={styles.bajaBarTrack}>
                        <View style={[styles.bajaBarFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                      </View>
                      <Text style={[styles.bajaPct, { color: cat.color }]}>{Math.round(pct)}%</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {topAves.length > 0 && (
              <View style={[styles.sectionCard, SHADOWS.md]}>
                <Text style={styles.cardTitle}>Top Aves por Victorias</Text>
                {topAves.map((ave: any, i: number) => (
                  <View key={ave.id || i} style={styles.histItem}>
                    <View style={[styles.histBadge, { backgroundColor: i === 0 ? COLORS.secondary + '20' : COLORS.primary + '10' }]}>
                      <Text style={[styles.histResult, { color: i === 0 ? COLORS.secondary : COLORS.primary }]}>
                        {i + 1}
                      </Text>
                    </View>
                    <View style={[styles.histInfo, { marginLeft: SPACING.sm }]}>
                      <Text style={styles.histDate}>{ave.codigo_identidad || ave.nombre || `Ave ${i + 1}`}</Text>
                      <Text style={styles.histPlace}>{ave.victorias || 0}V · {ave.derrotas || 0}D · {ave.total_combates || 0} peleas</Text>
                    </View>
                    <Text style={[styles.kpiDetail, { color: COLORS.primary }]}>
                      {ave.total_combates > 0 ? Math.round((ave.victorias / ave.total_combates) * 100) : 0}%
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {activeTab === 'combates' && (
          <>
            {lineaData.length >= 2 && (
              <View style={styles.kpiRow}>
                <View style={[styles.highlightCard, SHADOWS.md, { borderLeftColor: COLORS.success }]}>
                  <Text style={styles.highlightLabel}>Linea Top</Text>
                  <Text style={styles.highlightName} numberOfLines={1}>{lineaData[0].name}</Text>
                  <Text style={[styles.highlightPct, { color: COLORS.success }]}>{lineaData[0].winPct}% win</Text>
                </View>
                <View style={[styles.highlightCard, SHADOWS.md, { borderLeftColor: COLORS.error }]}>
                  <Text style={styles.highlightLabel}>Linea a Mejorar</Text>
                  <Text style={styles.highlightName} numberOfLines={1}>{lineaData[lineaData.length - 1].name}</Text>
                  <Text style={[styles.highlightPct, { color: COLORS.error }]}>{lineaData[lineaData.length - 1].winPct}% win</Text>
                </View>
              </View>
            )}

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
                  <ResultBar label="Empates" value={empates} total={totalCombates} color={COLORS.draw} />
                </View>
              </View>
            </View>

            {lineaData.length > 0 && (
              <View style={[styles.sectionCard, SHADOWS.md]}>
                <Text style={styles.cardTitle}>Rendimiento por Linea Genetica</Text>
                {lineaData.map((linea, i) => {
                  const isTop = i === 0 && lineaData.length > 1;
                  const isWorst = i === lineaData.length - 1 && lineaData.length > 1;
                  return (
                    <View
                      key={linea.name}
                      style={[
                        styles.lineaRow,
                        isTop && styles.lineaTop,
                        isWorst && styles.lineaWorst,
                        i < lineaData.length - 1 && { borderBottomWidth: 1, borderBottomColor: COLORS.divider },
                      ]}
                    >
                      <View style={styles.lineaHeader}>
                        <View style={styles.lineaNameRow}>
                          {isTop && <Award size={14} color={COLORS.secondary} style={{ marginRight: 4 }} />}
                          <Text style={[styles.lineaName, isTop && { color: COLORS.secondary }]} numberOfLines={1}>
                            {linea.name}
                          </Text>
                        </View>
                        <Text style={styles.lineaRecord}>
                          {linea.victorias}V-{linea.derrotas}D-{linea.empates}E
                        </Text>
                      </View>
                      <View style={styles.lineaBarRow}>
                        <View style={styles.resultBarBg}>
                          <View style={[
                            styles.resultBarFill,
                            {
                              width: `${linea.winPct}%`,
                              backgroundColor: isTop ? COLORS.success : isWorst ? COLORS.error : COLORS.primary,
                            }
                          ]} />
                        </View>
                        <Text style={[
                          styles.lineaPct,
                          { color: isTop ? COLORS.success : isWorst ? COLORS.error : COLORS.primary }
                        ]}>
                          {linea.winPct}%
                        </Text>
                      </View>
                      {isTop && <Text style={styles.lineaBadgeText}>Linea Mas Ganadora</Text>}
                      {isWorst && <Text style={[styles.lineaBadgeText, { color: COLORS.error }]}>Linea con Mas Derrotas</Text>}
                    </View>
                  );
                })}
              </View>
            )}

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
                        {combate.fecha ? new Date(combate.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
                      </Text>
                      <Text style={styles.histPlace}>{combate.ubicacion}</Text>
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
                title="Ingresos"
                value={`$${totalIngresos.toLocaleString()}`}
                color={COLORS.success}
              />
              <KPICard
                icon={<TrendingUp size={22} color={balanceNeto >= 0 ? COLORS.success : COLORS.error} />}
                title="Balance"
                value={`${balanceNeto >= 0 ? '+' : ''}$${balanceNeto.toLocaleString()}`}
                detail={`${roiPercentage >= 0 ? '+' : ''}${roiPercentage}%`}
                color={balanceNeto >= 0 ? COLORS.success : COLORS.error}
              />
            </View>

            <View style={[styles.sectionCard, SHADOWS.md]}>
              <Text style={styles.cardTitle}>Resumen Financiero</Text>
              <FinRow label="Total Ingresos" value={`$${totalIngresos.toLocaleString()}`} color={COLORS.success} />
              <View style={styles.finDivider} />
              <FinRow label="Total Egresos" value={`$${totalEgresos.toLocaleString()}`} color={COLORS.error} />
              <View style={styles.finDivider} />
              <FinRow
                label="Balance Neto"
                value={`${balanceNeto >= 0 ? '+' : ''}$${balanceNeto.toLocaleString()}`}
                color={balanceNeto >= 0 ? COLORS.success : COLORS.error}
                bold
              />
              {fin.por_periodo && fin.por_periodo.length > 0 && (
                <>
                  <View style={[styles.finDivider, { marginTop: SPACING.md }]} />
                  <Text style={[styles.cardTitle, { marginTop: SPACING.md }]}>Por Periodo</Text>
                  {fin.por_periodo.slice(0, 6).map((p: any, i: number) => (
                    <View key={i}>
                      <FinRow
                        label={p.periodo || p.mes || `Periodo ${i + 1}`}
                        value={`$${Number(p.ingresos || 0).toLocaleString()}`}
                        color={Number(p.balance || p.ingresos - p.egresos) >= 0 ? COLORS.success : COLORS.error}
                      />
                      {i < Math.min(fin.por_periodo.length, 6) - 1 && <View style={styles.finDivider} />}
                    </View>
                  ))}
                </>
              )}
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
                        <Text style={styles.txPlace}>{combate.ubicacion}</Text>
                        <Text style={styles.txDate}>
                          {combate.fecha ? new Date(combate.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'Sin fecha'}
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
  // Bajas y Mortalidad
  bajasHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  bajasTotal: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.error,
  },
  bajasTotalLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  bajaRow: {
    marginBottom: SPACING.sm,
  },
  bajaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 4,
  },
  bajaLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  bajaCount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  bajaBarTrack: {
    height: 6,
    backgroundColor: COLORS.divider,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 2,
  },
  bajaBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  bajaPct: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  // Highlight cards (Linea Top / Linea a Mejorar)
  highlightCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderLeftWidth: 4,
  },
  highlightLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  highlightName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  highlightPct: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  // Rendimiento por Linea Genetica
  lineaRow: {
    paddingVertical: SPACING.sm + 2,
  },
  lineaTop: {
    backgroundColor: COLORS.secondary + '08',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    marginHorizontal: -SPACING.sm,
  },
  lineaWorst: {
    backgroundColor: COLORS.error + '06',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    marginHorizontal: -SPACING.sm,
  },
  lineaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lineaNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  lineaName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flexShrink: 1,
  },
  lineaRecord: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  lineaBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  lineaPct: {
    fontSize: 13,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  lineaBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.secondary,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
