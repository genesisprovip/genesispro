import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import {
  ChevronLeft,
  Trophy,
  Crown,
  Calendar,
  BarChart3,
  Megaphone,
  Users,
  Image,
  Check,
  X,
  Settings,
  Radio,
  DollarSign,
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { api } from '@/services/api';

interface EmpresarioPlan {
  id: string;
  nombre: string;
  precio: number;
  priceId: string | null;
  maxEventosMes: number | null;
  cartel: boolean;
  avisos: boolean;
  participantesIlimitados: boolean;
  estadisticasEvento: boolean;
}

interface EmpresarioStatus {
  plan: string | null;
  hasSubscription: boolean;
  isActive: boolean;
  fechaExpiracion: string | null;
  eventosEsteMes: number;
  limiteEventos: number | null;
  estadisticasEvento: boolean;
}

export default function EmpresarioScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [status, setStatus] = useState<EmpresarioStatus | null>(null);
  const [plans, setPlans] = useState<EmpresarioPlan[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [statusRes, plansRes] = await Promise.all([
        api.getEmpresarioStatus(),
        api.getEmpresarioPlans(),
      ]);
      if (statusRes.success) setStatus(statusRes.data);
      if (plansRes.success) setPlans(plansRes.data.plans);
    } catch (error) {
      console.error('Error loading empresario data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleSubscribe = async (priceId: string | null) => {
    if (!priceId) {
      Alert.alert('Error', 'Plan no disponible en este momento');
      return;
    }
    setSubscribing(true);
    try {
      const res = await api.createEmpresarioCheckout(priceId);
      if (res.success && res.data.url) {
        await WebBrowser.openBrowserAsync(res.data.url);
        // Refresh status after returning from browser
        const statusRes = await api.getEmpresarioStatus();
        if (statusRes.success) setStatus(statusRes.data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo iniciar el pago');
    } finally {
      setSubscribing(false);
    }
  };

  const handleManage = async () => {
    try {
      const res = await api.createEmpresarioPortal();
      if (res.success && res.data.url) {
        await WebBrowser.openBrowserAsync(res.data.url);
        const statusRes = await api.getEmpresarioStatus();
        if (statusRes.success) setStatus(statusRes.data);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo abrir el portal');
    }
  };

  const features = [
    { key: 'maxEventosMes', label: 'Eventos/mes', icon: Calendar },
    { key: 'cartel', label: 'Cartel personalizado', icon: Image },
    { key: 'avisos', label: 'Avisos push', icon: Megaphone },
    { key: 'participantesIlimitados', label: 'Participantes ilimitados', icon: Users },
    { key: 'estadisticasEvento', label: 'Estadisticas del evento', icon: BarChart3 },
    { key: 'streamingEnVivo', label: 'Transmision en vivo', icon: Radio },
    { key: 'estadisticasAlcance', label: 'Estadisticas de alcance', icon: BarChart3 },
    { key: 'comisionesReferidos', label: 'Comisiones por referidos', icon: DollarSign },
    { key: 'maxEventosSimultaneos', label: 'Eventos simultaneos', icon: Calendar },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={28} color={COLORS.textLight} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Crown size={24} color={COLORS.secondary} />
            <Text style={styles.headerTitle}>Empresario</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {status?.isActive && (
          <View style={styles.activeCard}>
            <View style={styles.activeBadge}>
              <Trophy size={16} color={COLORS.secondary} />
              <Text style={styles.activeBadgeText}>
                {status.plan === 'empresario_pro' ? 'Empresario Pro' : 'Empresario Basico'}
              </Text>
            </View>
            <View style={styles.activeStats}>
              <View style={styles.activeStat}>
                <Text style={styles.activeStatValue}>{status.eventosEsteMes}</Text>
                <Text style={styles.activeStatLabel}>
                  {status.limiteEventos ? `de ${status.limiteEventos}` : 'este mes'}
                </Text>
              </View>
              {status.limiteEventos && (
                <View style={styles.progressOuter}>
                  <View
                    style={[
                      styles.progressInner,
                      {
                        width: `${Math.min((status.eventosEsteMes / status.limiteEventos) * 100, 100)}%`,
                        backgroundColor:
                          status.eventosEsteMes >= status.limiteEventos
                            ? COLORS.error
                            : COLORS.success,
                      },
                    ]}
                  />
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.manageBtn} onPress={handleManage}>
              <Settings size={16} color={COLORS.textLight} />
              <Text style={styles.manageBtnText}>Gestionar</Text>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!status?.isActive && (
          <View style={styles.promoCard}>
            <Text style={styles.promoTitle}>Organiza eventos de palenque</Text>
            <Text style={styles.promoText}>
              Suscribete como Empresario para crear, publicar y administrar eventos desde el panel completo.
            </Text>
          </View>
        )}

        {plans.map((plan) => {
          const isCurrent = status?.plan === plan.id && status?.isActive;
          const isPro = plan.id === 'empresario_pro';

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                SHADOWS.md,
                isPro && styles.planCardPro,
                isCurrent && styles.planCardActive,
              ]}
            >
              {isPro && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>RECOMENDADO</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={[styles.planName, isPro && styles.planNamePro]}>
                  {plan.nombre}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.planPrice, isPro && styles.planPricePro]}>
                    ${plan.precio.toLocaleString()}
                  </Text>
                  <Text style={styles.planPeriod}> MXN/mes</Text>
                </View>
              </View>

              <View style={styles.featureList}>
                {features.map(({ key, label, icon: Icon }) => {
                  const value = plan[key as keyof EmpresarioPlan];
                  const isBoolean = typeof value === 'boolean';
                  const isIncluded = isBoolean ? value : true;
                  const displayValue =
                    key === 'maxEventosMes'
                      ? value === null
                        ? 'Ilimitados'
                        : `${value} eventos`
                      : key === 'maxEventosSimultaneos'
                        ? value === null
                          ? 'Ilimitados'
                          : `${value} eventos simultaneos`
                        : null;

                  return (
                    <View key={key} style={styles.featureRow}>
                      {isIncluded ? (
                        <Check size={16} color={COLORS.success} />
                      ) : (
                        <X size={16} color={COLORS.disabled} />
                      )}
                      <Text
                        style={[
                          styles.featureText,
                          !isIncluded && styles.featureDisabled,
                        ]}
                      >
                        {displayValue || label}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {isCurrent ? (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Plan actual</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.subscribeBtn, isPro && styles.subscribeBtnPro]}
                  onPress={() => handleSubscribe(plan.priceId)}
                  disabled={subscribing}
                >
                  {subscribing ? (
                    <ActivityIndicator size="small" color={COLORS.textLight} />
                  ) : (
                    <Text style={styles.subscribeBtnText}>
                      {status?.isActive ? 'Cambiar a este plan' : 'Suscribirme'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textLight },
  activeCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
  },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: SPACING.sm,
  },
  activeBadgeText: { color: COLORS.secondary, fontWeight: '700', fontSize: 16 },
  activeStats: { marginBottom: SPACING.sm },
  activeStat: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  activeStatValue: { color: COLORS.textLight, fontSize: 24, fontWeight: '700' },
  activeStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
  progressOuter: {
    height: 4, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2, marginTop: 8, overflow: 'hidden',
  },
  progressInner: { height: '100%', borderRadius: 2 },
  manageBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
  },
  manageBtnText: { color: COLORS.textLight, fontSize: 13, fontWeight: '600' },
  content: { padding: SPACING.md },
  promoCard: {
    backgroundColor: COLORS.secondary + '12',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.secondary + '30',
  },
  promoTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  promoText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  planCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planCardPro: { borderColor: COLORS.secondary + '50' },
  planCardActive: { borderColor: COLORS.success, borderWidth: 2 },
  popularBadge: {
    position: 'absolute', top: -1, right: 16,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12, paddingVertical: 4,
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
  },
  popularText: { color: COLORS.textLight, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  planHeader: { marginBottom: SPACING.md },
  planName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  planNamePro: { color: COLORS.secondary },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  planPrice: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  planPricePro: { color: COLORS.secondary },
  planPeriod: { fontSize: 14, color: COLORS.textSecondary },
  featureList: { gap: 10, marginBottom: SPACING.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: COLORS.text },
  featureDisabled: { color: COLORS.disabled },
  subscribeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  subscribeBtnPro: { backgroundColor: COLORS.secondary },
  subscribeBtnText: { color: COLORS.textLight, fontSize: 16, fontWeight: '700' },
  currentBadge: {
    backgroundColor: COLORS.success + '15',
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  currentBadgeText: { color: COLORS.success, fontSize: 14, fontWeight: '600' },
});
