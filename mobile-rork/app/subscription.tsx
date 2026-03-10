import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Star, Zap, Check, ChevronLeft } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

interface PlanInfo {
  id: 'basico' | 'pro' | 'premium';
  name: string;
  price: number;
  iconColor: string;
  features: string[];
}

const PLANS: PlanInfo[] = [
  {
    id: 'basico',
    name: 'Basico',
    price: 299,
    iconColor: COLORS.primary,
    features: [
      'Hasta 50 aves',
      '1 foto por ave',
      'Genealogia 2 generaciones',
      'Soporte por email',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 599,
    iconColor: COLORS.secondary,
    features: [
      'Hasta 200 aves',
      '5 fotos por ave',
      'Genealogia 5 generaciones',
      'Analytics avanzado',
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
      '20 fotos por ave',
      'Genealogia completa',
      'Analytics avanzado',
      'Multi-usuario',
      'Exportacion de datos',
      'API access',
      'Soporte premium',
    ],
  },
];

const PLAN_ORDER: Record<string, number> = { basico: 0, pro: 1, premium: 2 };

function PlanIcon({ planId, color, size }: { planId: string; color: string; size: number }) {
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

  const currentPlan = user?.plan || 'basico';
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

  const handleSelectPlan = (plan: PlanInfo) => {
    if (plan.id === currentPlan && estadoCuenta !== 'vencido') return;

    const isUpgrade = PLAN_ORDER[plan.id] > PLAN_ORDER[currentPlan];
    const action = isUpgrade ? 'mejorara' : 'cambiara';

    Alert.alert(
      `Cambiar a ${plan.name}`,
      `Tu plan se ${action} a ${plan.name} al finalizar tu periodo actual. Se te cobrara $${plan.price} MXN/mes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => confirmPlanChange(plan),
        },
      ]
    );
  };

  const confirmPlanChange = async (plan: PlanInfo) => {
    setLoading(true);
    try {
      await api.changePlan(plan.id);
      await refreshProfile();
      Alert.alert(
        'Plan actualizado',
        `Tu plan ha sido cambiado a ${plan.name} exitosamente.`
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

  const getButtonLabel = (planId: string) => {
    if (planId === currentPlan && estadoCuenta !== 'vencido') return 'Plan Actual';
    if (estadoCuenta === 'vencido') return 'Seleccionar';
    return PLAN_ORDER[planId] > PLAN_ORDER[currentPlan]
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
          <Text style={styles.headerTitle}>Suscripcion</Text>
          <View style={styles.navButton} />
        </View>

        <View style={styles.currentPlanBadge}>
          <Text style={styles.currentPlanLabel}>Plan actual</Text>
          <Text style={styles.currentPlanName}>
            {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
          </Text>
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
        {PLANS.map((plan) => {
          const isCurrent = isCurrentPlan(plan.id);
          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                SHADOWS.md,
                isCurrent && styles.planCardCurrent,
              ]}
            >
              {isCurrent && (
                <View style={styles.planActualTag}>
                  <Text style={styles.planActualTagText}>Plan Actual</Text>
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
                    <Text style={styles.planPrice}>${plan.price}</Text>
                    <Text style={styles.planPricePeriod}> MXN/mes</Text>
                  </View>
                </View>
              </View>

              <View style={styles.featuresList}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Check size={16} color={COLORS.primary} />
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

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Los cargos se realizan de forma mensual. Puedes cancelar en cualquier
            momento.
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
