import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowLeft,
  Crown,
  Check,
  X,
  Bird,
  Swords,
  Camera,
  GitBranch,
  BarChart3,
  Users,
  Download,
  Headphones,
  Zap,
  Star,
  CreditCard,
  Receipt,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import api from '@/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Stripe Price IDs
const PRICE_IDS = {
  basico: {
    monthly: 'price_1T7G1v2QogbirSNpV6hzIhoW',
    yearly: 'price_1T7G1x2QogbirSNpgIAr6rcm',
  },
  pro: {
    monthly: 'price_1T7G2K2QogbirSNpoPz14GZY',
    yearly: 'price_1T7G2L2QogbirSNphcujsBCJ',
  },
  premium: {
    monthly: 'price_1T7G4Q2QogbirSNpZLHH8fOK',
    yearly: 'price_1T7G4T2QogbirSNpyznIt4QX',
  },
};

interface PlanFeature {
  icon: React.ReactNode;
  label: string;
  value: string | boolean;
}

interface PlanData {
  name: string;
  key: 'basico' | 'pro' | 'premium';
  monthlyPrice: number;
  yearlyPrice: number;
  color: string;
  icon: React.ReactNode;
  tagline: string;
  features: PlanFeature[];
  popular?: boolean;
}

const PLANS: PlanData[] = [
  {
    name: 'Básico',
    key: 'basico',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    color: COLORS.primary,
    icon: <Bird size={24} color={COLORS.primary} />,
    tagline: 'Para iniciar tu criadero',
    features: [
      { icon: <Bird size={16} color={COLORS.textSecondary} />, label: 'Aves', value: '10' },
      { icon: <Swords size={16} color={COLORS.textSecondary} />, label: 'Combates', value: '5' },
      { icon: <Camera size={16} color={COLORS.textSecondary} />, label: 'Fotos por ave', value: '3' },
      { icon: <GitBranch size={16} color={COLORS.textSecondary} />, label: 'Genealogía', value: '2 generaciones' },
      { icon: <BarChart3 size={16} color={COLORS.textSecondary} />, label: 'Analytics avanzado', value: false },
      { icon: <Users size={16} color={COLORS.textSecondary} />, label: 'Multi-usuario', value: false },
      { icon: <Download size={16} color={COLORS.textSecondary} />, label: 'Exportación', value: false },
      { icon: <Headphones size={16} color={COLORS.textSecondary} />, label: 'Soporte prioritario', value: false },
    ],
  },
  {
    name: 'Pro',
    key: 'pro',
    monthlyPrice: 599,
    yearlyPrice: 5990,
    color: COLORS.accent,
    icon: <Star size={24} color={COLORS.accent} />,
    tagline: 'El más popular',
    popular: true,
    features: [
      { icon: <Bird size={16} color={COLORS.textSecondary} />, label: 'Aves', value: '50' },
      { icon: <Swords size={16} color={COLORS.textSecondary} />, label: 'Combates', value: '20' },
      { icon: <Camera size={16} color={COLORS.textSecondary} />, label: 'Fotos por ave', value: '10' },
      { icon: <GitBranch size={16} color={COLORS.textSecondary} />, label: 'Genealogía', value: '3 generaciones' },
      { icon: <BarChart3 size={16} color={COLORS.textSecondary} />, label: 'Analytics avanzado', value: false },
      { icon: <Users size={16} color={COLORS.textSecondary} />, label: 'Multi-usuario', value: false },
      { icon: <Download size={16} color={COLORS.textSecondary} />, label: 'Exportación', value: true },
      { icon: <Headphones size={16} color={COLORS.textSecondary} />, label: 'Soporte prioritario', value: false },
    ],
  },
  {
    name: 'Premium',
    key: 'premium',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    color: COLORS.secondary,
    icon: <Crown size={24} color={COLORS.secondary} />,
    tagline: 'Para criadores profesionales',
    features: [
      { icon: <Bird size={16} color={COLORS.textSecondary} />, label: 'Aves', value: 'Ilimitadas' },
      { icon: <Swords size={16} color={COLORS.textSecondary} />, label: 'Combates', value: 'Ilimitados' },
      { icon: <Camera size={16} color={COLORS.textSecondary} />, label: 'Fotos por ave', value: 'Ilimitadas' },
      { icon: <GitBranch size={16} color={COLORS.textSecondary} />, label: 'Genealogía', value: 'Completa' },
      { icon: <BarChart3 size={16} color={COLORS.textSecondary} />, label: 'Analytics avanzado', value: true },
      { icon: <Users size={16} color={COLORS.textSecondary} />, label: 'Multi-usuario', value: true },
      { icon: <Download size={16} color={COLORS.textSecondary} />, label: 'Exportación', value: true },
      { icon: <Headphones size={16} color={COLORS.textSecondary} />, label: 'Soporte prioritario', value: true },
    ],
  },
];

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();

  const [isYearly, setIsYearly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      const response = await api.getSubscriptionStatus();
      if (response.success) {
        setSubscriptionStatus(response.data);
      }
    } catch (error) {
      console.log('Error loading subscription status:', error);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSubscribe = useCallback(async (plan: PlanData) => {
    const interval = isYearly ? 'yearly' : 'monthly';
    const priceId = PRICE_IDS[plan.key][interval];

    setLoadingPlan(plan.key);
    try {
      const response = await api.createCheckoutSession(priceId);
      if (response.success && response.data.url) {
        await WebBrowser.openBrowserAsync(response.data.url);
        // Refresh status after returning from checkout
        await loadSubscriptionStatus();
        await refreshProfile();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo iniciar el pago');
    } finally {
      setLoadingPlan(null);
    }
  }, [isYearly]);

  const handleManageSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.createBillingPortalSession();
      if (response.success && response.data.url) {
        await WebBrowser.openBrowserAsync(response.data.url);
        await loadSubscriptionStatus();
        await refreshProfile();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo abrir el portal de facturación');
    } finally {
      setLoading(false);
    }
  }, []);

  const currentPlan = subscriptionStatus?.plan || user?.plan || 'basico';
  const hasActiveSubscription = subscriptionStatus?.hasSubscription;

  const savings = (plan: PlanData) => {
    const monthlyCost = plan.monthlyPrice * 12;
    const saved = monthlyCost - plan.yearlyPrice;
    return saved;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={22} color={COLORS.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Suscripción</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Current plan info */}
        {!statusLoading && (
          <View style={styles.currentPlanBanner}>
            <Crown size={18} color={COLORS.secondary} />
            <Text style={styles.currentPlanText}>
              Plan actual: <Text style={styles.currentPlanName}>{currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}</Text>
            </Text>
            {subscriptionStatus?.billingInterval && (
              <View style={styles.intervalBadge}>
                <Text style={styles.intervalBadgeText}>
                  {subscriptionStatus.billingInterval === 'anual' ? 'Anual' : 'Mensual'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Billing toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleOption, !isYearly && styles.toggleOptionActive]}
            onPress={() => setIsYearly(false)}
          >
            <Text style={[styles.toggleText, !isYearly && styles.toggleTextActive]}>Mensual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, isYearly && styles.toggleOptionActive]}
            onPress={() => setIsYearly(true)}
          >
            <Text style={[styles.toggleText, isYearly && styles.toggleTextActive]}>Anual</Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>-2 meses</Text>
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Plan cards */}
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.key;
          const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
          const isLoadingThis = loadingPlan === plan.key;

          return (
            <View
              key={plan.key}
              style={[
                styles.planCard,
                SHADOWS.md,
                plan.popular && styles.planCardPopular,
                plan.popular && { borderColor: plan.color },
              ]}
            >
              {/* Popular badge */}
              {plan.popular && (
                <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                  <Zap size={12} color={COLORS.textLight} />
                  <Text style={styles.popularBadgeText}>Más popular</Text>
                </View>
              )}

              {/* Plan header */}
              <View style={styles.planHeader}>
                <View style={[styles.planIconContainer, { backgroundColor: plan.color + '15' }]}>
                  {plan.icon}
                </View>
                <View style={styles.planHeaderInfo}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planTagline}>{plan.tagline}</Text>
                </View>
              </View>

              {/* Price */}
              <View style={styles.priceRow}>
                <Text style={styles.priceCurrency}>$</Text>
                <Text style={[styles.priceAmount, { color: plan.color }]}>
                  {price.toLocaleString()}
                </Text>
                <View style={styles.priceInterval}>
                  <Text style={styles.priceIntervalText}>MXN</Text>
                  <Text style={styles.priceIntervalText}>/{isYearly ? 'año' : 'mes'}</Text>
                </View>
              </View>

              {isYearly && (
                <Text style={styles.savingsText}>
                  Ahorras ${savings(plan).toLocaleString()} MXN al año
                </Text>
              )}

              {/* Features */}
              <View style={styles.featuresList}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <View style={styles.featureIcon}>
                      {feature.icon}
                    </View>
                    <Text style={styles.featureLabel}>{feature.label}</Text>
                    <View style={styles.featureValue}>
                      {typeof feature.value === 'boolean' ? (
                        feature.value ? (
                          <View style={[styles.featureCheck, { backgroundColor: plan.color + '20' }]}>
                            <Check size={14} color={plan.color} />
                          </View>
                        ) : (
                          <View style={styles.featureCross}>
                            <X size={14} color={COLORS.textDisabled} />
                          </View>
                        )
                      ) : (
                        <Text style={[styles.featureValueText, { color: plan.color }]}>{feature.value}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>

              {/* Action button */}
              {isCurrentPlan ? (
                hasActiveSubscription ? (
                  <TouchableOpacity
                    style={[styles.manageButton, { borderColor: plan.color }]}
                    onPress={handleManageSubscription}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color={plan.color} />
                    ) : (
                      <>
                        <CreditCard size={18} color={plan.color} />
                        <Text style={[styles.manageButtonText, { color: plan.color }]}>Gestionar suscripción</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.currentBadge, { backgroundColor: plan.color + '15' }]}>
                    <Check size={16} color={plan.color} />
                    <Text style={[styles.currentBadgeText, { color: plan.color }]}>Plan actual</Text>
                  </View>
                )
              ) : (
                <TouchableOpacity
                  style={[styles.subscribeButton, { backgroundColor: plan.color }, SHADOWS.colored(plan.color)]}
                  onPress={() => handleSubscribe(plan)}
                  disabled={isLoadingThis}
                  activeOpacity={0.8}
                >
                  {isLoadingThis ? (
                    <ActivityIndicator size="small" color={COLORS.textLight} />
                  ) : (
                    <Text style={styles.subscribeButtonText}>
                      {currentPlan !== 'basico' && PLANS.findIndex(p => p.key === plan.key) < PLANS.findIndex(p => p.key === currentPlan)
                        ? 'Cambiar plan'
                        : 'Mejorar a ' + plan.name}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {/* Usage section */}
        {subscriptionStatus && (
          <View style={[styles.usageCard, SHADOWS.sm]}>
            <Text style={styles.usageSectionTitle}>Tu uso actual</Text>
            <View style={styles.usageGrid}>
              <UsageBar
                label="Aves"
                used={subscriptionStatus.usage.aves}
                max={subscriptionStatus.limits.maxAves}
                color={COLORS.primary}
              />
              <UsageBar
                label="Combates"
                used={subscriptionStatus.usage.combates}
                max={subscriptionStatus.limits.maxCombates}
                color={COLORS.accent}
              />
            </View>
          </View>
        )}

        {/* Manage / Invoices */}
        {hasActiveSubscription && (
          <TouchableOpacity
            style={[styles.invoicesButton, SHADOWS.sm]}
            onPress={handleManageSubscription}
          >
            <Receipt size={20} color={COLORS.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.invoicesButtonLabel}>Facturas y pagos</Text>
              <Text style={styles.invoicesButtonSubtext}>Ver historial y descargar facturas</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
}

function UsageBar({ label, used, max, color }: { label: string; used: number; max: number | null; color: string }) {
  const percentage = max ? Math.min((used / max) * 100, 100) : 0;
  const isUnlimited = max === null;

  return (
    <View style={styles.usageItem}>
      <View style={styles.usageHeader}>
        <Text style={styles.usageLabel}>{label}</Text>
        <Text style={styles.usageCount}>
          {used}{!isUnlimited ? ` / ${max}` : ''}
          {isUnlimited && <Text style={{ color: COLORS.textDisabled }}> (sin límite)</Text>}
        </Text>
      </View>
      {!isUnlimited && (
        <View style={styles.usageBarBg}>
          <View
            style={[
              styles.usageBarFill,
              {
                width: `${percentage}%`,
                backgroundColor: percentage > 85 ? COLORS.error : color,
              },
            ]}
          />
        </View>
      )}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  currentPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm + 2,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  currentPlanText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    flex: 1,
  },
  currentPlanName: {
    fontWeight: '700',
    color: COLORS.textLight,
  },
  intervalBadge: {
    backgroundColor: COLORS.secondary + '30',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  intervalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.md,
    padding: 3,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.sm + 1,
    gap: 6,
  },
  toggleOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  toggleTextActive: {
    color: COLORS.textLight,
  },
  saveBadge: {
    backgroundColor: COLORS.primary + '30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  planCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  planCardPopular: {
    borderWidth: 2,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    gap: 4,
    marginBottom: SPACING.sm,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  planHeaderInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  planTagline: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  priceCurrency: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
  },
  priceInterval: {
    marginLeft: 6,
    marginBottom: 6,
  },
  priceIntervalText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 15,
  },
  savingsText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  featuresList: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  featureIcon: {
    width: 28,
    alignItems: 'center',
  },
  featureLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginLeft: SPACING.sm,
  },
  featureValue: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  featureValueText: {
    fontSize: 14,
    fontWeight: '700',
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCross: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeButton: {
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    gap: SPACING.sm,
  },
  manageButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
  },
  currentBadgeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  usageCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  usageSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  usageGrid: {
    gap: SPACING.md,
  },
  usageItem: {
    gap: 6,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  usageCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  usageBarBg: {
    height: 8,
    backgroundColor: COLORS.divider,
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  invoicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  invoicesButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  invoicesButtonSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
