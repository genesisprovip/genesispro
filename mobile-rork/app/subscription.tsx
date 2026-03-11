import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  AppState,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Crown,
  Star,
  Zap,
  Check,
  ChevronLeft,
  ExternalLink,
  Radio,
  Users,
  BarChart3,
  Globe,
  Megaphone,
  Trophy,
} from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

interface PlanInfo {
  id: string;
  name: string;
  price: number;
  iconColor: string;
  features: string[];
  highlight?: boolean;
}

// ── User plans (galleros) ──
const USER_PLANS: PlanInfo[] = [
  {
    id: 'basico',
    name: 'Basico',
    price: 299,
    iconColor: COLORS.primary,
    features: [
      'Hasta 10 aves',
      '3 fotos por ave',
      'Genealogia 2 generaciones',
      'Salud basica',
      'Soporte por email',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 599,
    iconColor: COLORS.secondary,
    highlight: true,
    features: [
      'Hasta 50 aves',
      '10 fotos por ave',
      'Genealogia 3 generaciones',
      'Salud completa',
      'Finanzas y alimentacion',
      'Exportacion de datos',
      'Soporte prioritario',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 999,
    iconColor: COLORS.accent,
    features: [
      'Aves ilimitadas',
      'Fotos ilimitadas',
      'Genealogia completa',
      'Analytics avanzado',
      'Multi-usuario (3 colaboradores)',
      'Exportacion de datos',
      'API access',
      'Soporte premium',
    ],
  },
];

// ── Empresario plans (organizadores de eventos) ──
const EMPRESARIO_PLANS: PlanInfo[] = [
  {
    id: 'empresario_basico',
    name: 'Empresario Basico',
    price: 799,
    iconColor: COLORS.primary,
    features: [
      '4 eventos por mes',
      '2 eventos simultaneos',
      'Cartel de evento',
      'Avisos a participantes',
      'Participantes ilimitados',
      'Soporte por email',
    ],
  },
  {
    id: 'empresario_pro',
    name: 'Empresario Pro',
    price: 1999,
    iconColor: COLORS.secondary,
    highlight: true,
    features: [
      'Eventos ilimitados',
      '5 eventos simultaneos',
      'Cartel de evento',
      'Avisos a participantes',
      'Participantes ilimitados',
      'Estadisticas de evento',
      'Soporte prioritario',
    ],
  },
  {
    id: 'empresario_premium',
    name: 'Empresario Premium',
    price: 2999,
    iconColor: COLORS.accent,
    features: [
      'Eventos ilimitados',
      '10 eventos simultaneos',
      'Cartel de evento',
      'Avisos a participantes',
      'Participantes ilimitados',
      'Estadisticas de evento',
      'Streaming en vivo',
      'Estadisticas de alcance',
      'Comisiones por referidos',
      'Soporte premium',
    ],
  },
];

const USER_PLAN_ORDER: Record<string, number> = { basico: 0, pro: 1, premium: 2 };
const EMPRESARIO_PLAN_ORDER: Record<string, number> = { empresario_basico: 0, empresario_pro: 1, empresario_premium: 2 };

function PlanIcon({ planId, color, size }: { planId: string; color: string; size: number }) {
  if (planId.startsWith('empresario')) {
    switch (planId) {
      case 'empresario_premium':
        return <Crown size={size} color={color} />;
      case 'empresario_pro':
        return <Trophy size={size} color={color} />;
      default:
        return <Globe size={size} color={color} />;
    }
  }
  switch (planId) {
    case 'premium':
      return <Crown size={size} color={color} />;
    case 'pro':
      return <Zap size={size} color={color} />;
    default:
      return <Star size={size} color={color} />;
  }
}

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [empresarioPlansData, setEmpresarioPlansData] = useState<any[]>([]);

  const isEmpresario = !!user?.plan_empresario;

  // Auto-refresh profile when returning from Stripe checkout
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        refreshProfile();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // Load empresario plans with priceIds if user is empresario
  useEffect(() => {
    if (isEmpresario) {
      api.getEmpresarioPlans().then(res => {
        if (res.success && res.data?.plans) {
          setEmpresarioPlansData(res.data.plans);
        }
      }).catch(() => {});
    }
  }, [isEmpresario]);

  const plans = isEmpresario ? EMPRESARIO_PLANS : USER_PLANS;
  const planOrder = isEmpresario ? EMPRESARIO_PLAN_ORDER : USER_PLAN_ORDER;

  const currentPlan = isEmpresario
    ? (user?.plan_empresario || '')
    : (user?.plan || 'basico');

  const estadoCuenta = user?.estado_cuenta || 'trial';
  const trialDays = user?.trial_dias_restantes ?? 0;

  const getEstadoLabel = () => {
    switch (estadoCuenta) {
      case 'trial':
        return 'Prueba gratuita';
      case 'activo':
        return 'Activa';
      case 'vencido':
        return 'Vencida';
      case 'suspendido':
        return 'Suspendida';
      default:
        return estadoCuenta;
    }
  };

  const getCurrentPlanDisplay = () => {
    if (isEmpresario) {
      const labels: Record<string, string> = {
        empresario_basico: 'Emp. Basico',
        empresario_pro: 'Emp. Pro',
        empresario_premium: 'Emp. Premium',
      };
      return labels[currentPlan] || 'Empresario';
    }
    return currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
  };

  const handleSelectPlan = (plan: PlanInfo) => {
    if (plan.id === currentPlan && estadoCuenta !== 'vencido') return;

    if (isEmpresario) {
      handleEmpresarioSelect(plan);
    } else {
      handleUserSelect(plan);
    }
  };

  const handleUserSelect = (plan: PlanInfo) => {
    const hasActiveSub = user?.has_subscription && estadoCuenta === 'activo';

    if (hasActiveSub) {
      Alert.alert(
        `Cambiar a ${plan.name}`,
        `Tu plan cambiara a ${plan.name}. El cambio se aplicara al final del periodo actual.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Confirmar', onPress: () => changePlanOnly(plan) },
        ]
      );
      return;
    }

    Alert.alert(
      `Suscribirse a ${plan.name}`,
      `Se te cobrara $${plan.price.toLocaleString()} MXN/mes. Seras redirigido a la pagina de pago seguro.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar al Pago', onPress: () => startCheckout(plan) },
      ]
    );
  };

  const handleEmpresarioSelect = (plan: PlanInfo) => {
    // Find priceId from empresario plans data
    const planData = empresarioPlansData.find(p => p.id === plan.id);
    const priceId = planData?.priceId;

    if (!priceId) {
      Alert.alert('Error', 'No se encontro el precio para este plan. Contacta a soporte.');
      return;
    }

    Alert.alert(
      `Suscribirse a ${plan.name}`,
      `Se te cobrara $${plan.price.toLocaleString()} MXN/mes. Seras redirigido a la pagina de pago seguro.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Continuar al Pago', onPress: () => startEmpresarioCheckout(priceId) },
      ]
    );
  };

  const startCheckout = async (plan: PlanInfo) => {
    setLoading(true);
    try {
      const res = await api.createCheckoutSession(plan.id, 'mensual');
      if (res.data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          res.data.url,
          'genesispro://subscription'
        );
        if (result.type === 'success' || result.type === 'dismiss') {
          await refreshProfile();
        }
      } else {
        throw new Error('No se recibio URL de pago');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'No se pudo iniciar el proceso de pago. Intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const startEmpresarioCheckout = async (priceId: string) => {
    setLoading(true);
    try {
      const res = await api.createEmpresarioCheckout(priceId);
      if (res.data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          res.data.url,
          'genesispro://subscription'
        );
        if (result.type === 'success' || result.type === 'dismiss') {
          await refreshProfile();
        }
      } else {
        throw new Error('No se recibio URL de pago');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'No se pudo iniciar el proceso de pago. Intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const changePlanOnly = async (plan: PlanInfo) => {
    setLoading(true);
    try {
      await api.changePlan(plan.id);
      await refreshProfile();
      Alert.alert(
        'Plan actualizado',
        `Tu plan cambiara a ${plan.name} al finalizar el periodo actual.`
      );
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'No se pudo cambiar el plan. Intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  const openBillingPortal = async () => {
    setLoading(true);
    try {
      // Use empresario portal if empresario, else regular portal
      const res = isEmpresario
        ? await api.createEmpresarioPortal()
        : await api.createBillingPortalSession();
      if (res.data?.url) {
        await WebBrowser.openAuthSessionAsync(
          res.data.url,
          'genesispro://subscription'
        );
        await refreshProfile();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo abrir el portal de facturacion.');
    } finally {
      setLoading(false);
    }
  };

  const getButtonLabel = (planId: string) => {
    if (planId === currentPlan && estadoCuenta !== 'vencido') return 'Plan Actual';
    const hasActiveSub = user?.has_subscription && estadoCuenta === 'activo';
    if (estadoCuenta === 'vencido' || estadoCuenta === 'trial' || !hasActiveSub) return 'Suscribirse';
    return (planOrder[planId] ?? 0) > (planOrder[currentPlan] ?? 0)
      ? 'Mejorar Plan'
      : 'Cambiar Plan';
  };

  const isCurrentPlan = (planId: string) =>
    planId === currentPlan && estadoCuenta !== 'vencido';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
            <ChevronLeft size={28} color={COLORS.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEmpresario ? 'Plan Empresario' : 'Suscripcion'}
          </Text>
          <View style={styles.navButton} />
        </View>

        <View style={styles.currentPlanBadge}>
          {isEmpresario && (
            <View style={styles.empresarioBadge}>
              <Crown size={12} color={COLORS.secondary} />
              <Text style={styles.empresarioBadgeText}>EMPRESARIO</Text>
            </View>
          )}
          <Text style={styles.currentPlanLabel}>Plan actual</Text>
          <Text style={styles.currentPlanName}>{getCurrentPlanDisplay()}</Text>
          <Text style={styles.currentPlanStatus}>{getEstadoLabel()}</Text>
        </View>
      </LinearGradient>

      {estadoCuenta === 'vencido' && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            Tu prueba gratuita ha vencido. Tus datos estan en modo solo lectura. Elige
            un plan para continuar.
          </Text>
        </View>
      )}

      {estadoCuenta === 'trial' && trialDays > 0 && (
        <View style={styles.trialBanner}>
          <Text style={styles.trialText}>
            Te quedan {trialDays} dia{trialDays !== 1 ? 's' : ''} de prueba gratuita
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.id);
          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                SHADOWS.md,
                isCurrent && styles.planCardCurrent,
                plan.highlight && !isCurrent && styles.planCardHighlight,
              ]}
            >
              {isCurrent && (
                <View style={styles.planActualTag}>
                  <Text style={styles.planActualTagText}>Plan Actual</Text>
                </View>
              )}
              {plan.highlight && !isCurrent && (
                <View style={styles.planRecommendedTag}>
                  <Text style={styles.planRecommendedTagText}>Recomendado</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View
                  style={[
                    styles.planIconContainer,
                    { backgroundColor: plan.iconColor + '15' },
                  ]}
                >
                  <PlanIcon planId={plan.id} color={plan.iconColor} size={28} />
                </View>
                <View style={styles.planTitleContainer}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.planPrice}>${plan.price.toLocaleString()}</Text>
                    <Text style={styles.planPricePeriod}> MXN/mes</Text>
                  </View>
                </View>
              </View>

              <View style={styles.featuresList}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Check size={16} color={plan.iconColor} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.planButton,
                  isCurrent && styles.planButtonCurrent,
                  !isCurrent && { backgroundColor: plan.iconColor },
                ]}
                onPress={() => handleSelectPlan(plan)}
                disabled={isCurrent || loading}
                activeOpacity={0.8}
              >
                {loading && !isCurrent ? (
                  <ActivityIndicator size="small" color={COLORS.textLight} />
                ) : (
                  <Text
                    style={[
                      styles.planButtonText,
                      isCurrent && styles.planButtonTextCurrent,
                    ]}
                  >
                    {getButtonLabel(plan.id)}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {((user?.has_subscription && estadoCuenta === 'activo') || isEmpresario) && (
          <TouchableOpacity
            style={styles.portalButton}
            onPress={openBillingPortal}
            disabled={loading}
            activeOpacity={0.8}
          >
            <ExternalLink size={18} color={COLORS.primary} />
            <Text style={styles.portalButtonText}>Gestionar Suscripcion</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Los cargos se realizan de forma mensual a traves de Stripe (pago seguro). Puedes cancelar en cualquier momento.
          </Text>
        </View>
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
    paddingBottom: SPACING.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
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
  currentPlanBadge: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  empresarioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary + '25',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    marginBottom: 6,
  },
  empresarioBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 1,
  },
  currentPlanLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  currentPlanName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textLight,
    marginTop: 2,
  },
  currentPlanStatus: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  warningBanner: {
    backgroundColor: COLORS.error + '18',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  warningText: {
    fontSize: 13,
    color: COLORS.error,
    lineHeight: 18,
    fontWeight: '500',
  },
  trialBanner: {
    backgroundColor: COLORS.secondary + '18',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.secondary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
  },
  trialText: {
    fontSize: 13,
    color: COLORS.secondaryDark,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  planCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardCurrent: {
    borderColor: COLORS.primary,
  },
  planCardHighlight: {
    borderColor: COLORS.secondary + '40',
  },
  planActualTag: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.primary + '18',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  planActualTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  planRecommendedTag: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: COLORS.secondary + '18',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  planRecommendedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  planIconContainer: {
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  planTitleContainer: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  planPricePeriod: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  featuresList: {
    marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs + 2,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  planButton: {
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planButtonCurrent: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  planButtonTextCurrent: {
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  portalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
    marginBottom: SPACING.md,
  },
  portalButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textDisabled,
    textAlign: 'center',
    lineHeight: 18,
  },
});
