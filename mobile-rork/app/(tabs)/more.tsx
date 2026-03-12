import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import {
  User,
  Settings,
  Shield,
  FileText,
  LogOut,
  ChevronRight,
  Calendar,
  Heart,
  Utensils,
  Crown,
  Smartphone,
  Trophy,
  Radio,
  LifeBuoy,
  MessageCircle,
  Beaker,
  ClipboardList,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  showBadge?: boolean;
  badgeText?: string;
  badgeColor?: string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/welcome');
          }
        },
      ]
    );
  };

  const planNames: Record<string, string> = { basico: 'Básico', pro: 'Pro', premium: 'Premium' };
  const planDisplay = planNames[user?.plan || 'basico'] || 'Básico';
  const isTrial = user?.estado_cuenta === 'trial';
  const trialDays = user?.trial_dias_restantes;

  const isEmpresario = !!user?.plan_empresario;

  const menuSections: MenuSection[] = [
    ...(isEmpresario ? [{
      title: 'Empresario',
      items: [
        {
          icon: <Crown size={20} color={COLORS.secondary} />,
          label: 'Panel Empresario',
          subtitle: 'Dashboard, eventos y transmision',
          onPress: () => router.push('/empresario/dashboard'),
          showBadge: true,
          badgeText: 'Pro',
          badgeColor: COLORS.secondary,
        },
        {
          icon: <Radio size={20} color={COLORS.error} />,
          label: 'Transmitir En Vivo',
          subtitle: 'Inicia un stream desde tu evento',
          onPress: () => router.push('/empresario/broadcast'),
        },
      ],
    }] : []),
    {
      title: 'Módulos',
      items: [
        ...(isEmpresario ? [{
          icon: <Trophy size={20} color={COLORS.secondary} />,
          label: 'Palenque',
          subtitle: 'Gestionar eventos y transmisiones',
          onPress: () => router.push('/palenque'),
        }] : []),
        {
          icon: <Calendar size={20} color={COLORS.accent} />,
          label: 'Calendario',
          subtitle: 'Eventos y recordatorios',
          onPress: () => router.push('/calendario'),
        },
        ...(!isEmpresario ? [
          {
            icon: <Heart size={20} color={COLORS.error} />,
            label: 'Salud',
            subtitle: 'Vacunas y tratamientos',
            onPress: () => router.push('/salud'),
          },
          {
            icon: <Beaker size={20} color={COLORS.primary} />,
            label: 'Formulas / Dosis',
            subtitle: 'Dosis personalizadas con ingredientes',
            onPress: () => router.push('/salud/formulas'),
          },
          {
            icon: <Utensils size={20} color={COLORS.secondary} />,
            label: 'Alimentación',
            subtitle: 'Dietas e inventario',
            onPress: () => router.push('/alimentacion'),
          },
          {
            icon: <ClipboardList size={20} color={COLORS.info} />,
            label: 'Observaciones',
            subtitle: 'Notas de tu gallera',
            onPress: () => router.push('/observaciones' as any),
          },
        ] : []),
      ],
    },
    {
      title: 'Cuenta',
      items: [
        {
          icon: <User size={20} color={COLORS.info} />,
          label: 'Mi Perfil',
          subtitle: user?.email,
          onPress: () => router.push('/profile'),
        },
        {
          icon: <Crown size={20} color={COLORS.secondary} />,
          label: 'Mi Suscripción',
          subtitle: `Plan ${planDisplay || 'Gratuito'}`,
          onPress: () => router.push('/subscription'),
          showBadge: user?.plan === 'basico',
          badgeText: 'Upgrade',
          badgeColor: COLORS.secondary,
        },
        {
          icon: <Settings size={20} color={COLORS.textSecondary} />,
          label: 'Ajustes',
          subtitle: 'Preferencias y notificaciones',
          onPress: () => router.push('/settings'),
        },
      ],
    },
    {
      title: 'Soporte',
      items: [
        {
          icon: <LifeBuoy size={20} color={COLORS.primary} />,
          label: 'Centro de Ayuda',
          subtitle: 'Preguntas frecuentes y guias',
          onPress: () => Linking.openURL('https://api.genesispro.vip/ayuda'),
        },
        {
          icon: <MessageCircle size={20} color={COLORS.info} />,
          label: 'Contactar Soporte',
          subtitle: 'soporte@genesispro.vip',
          onPress: () => Linking.openURL('mailto:soporte@genesispro.vip'),
        },
      ],
    },
    {
      title: 'Legal',
      items: [
        {
          icon: <FileText size={20} color={COLORS.textSecondary} />,
          label: 'Terminos y Condiciones',
          subtitle: 'Uso del servicio',
          onPress: () => Linking.openURL('https://api.genesispro.vip/terminos'),
        },
        {
          icon: <Shield size={20} color={COLORS.success} />,
          label: 'Aviso de Privacidad',
          subtitle: 'Proteccion de datos',
          onPress: () => Linking.openURL('https://api.genesispro.vip/privacidad'),
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.md }]}
      >
        <View style={styles.profileSection}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.avatar}
            contentFit="contain"
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.nombre} {user?.apellido}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.planCard}>
          <Crown size={16} color={COLORS.secondary} />
          <Text style={styles.planLabel}>
            {isTrial ? `Trial Premium (${trialDays ?? '?'} dias)` : `Plan ${planDisplay || 'Gratuito'}`}
          </Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.planButton} onPress={() => router.push('/subscription')}>
            <Text style={styles.planButtonText}>
              {!user?.plan || user.plan === 'basico' ? 'Mejorar' : 'Gestionar'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.sectionCard, SHADOWS.sm]}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 && styles.menuItemBorder
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemIcon}>
                    {item.icon}
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                    {item.subtitle && (
                      <Text style={styles.menuItemSubtitle} numberOfLines={1}>{item.subtitle}</Text>
                    )}
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.showBadge && (
                      <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
                        <Text style={styles.badgeText}>{item.badgeText}</Text>
                      </View>
                    )}
                    <ChevronRight size={18} color={COLORS.textDisabled} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.logoutButton, SHADOWS.sm]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={20} color={COLORS.error} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Smartphone size={14} color={COLORS.textDisabled} />
          <Text style={styles.versionText}>GenesisPro v1.8.4</Text>
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
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    marginRight: SPACING.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  planLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  planButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.round,
  },
  planButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  menuItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.error + '20',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.error,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textDisabled,
  },
});
