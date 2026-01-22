import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Settings,
  Bell,
  Shield,
  HelpCircle,
  FileText,
  LogOut,
  ChevronRight,
  Calendar,
  Heart,
  Utensils,
  Crown
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  showBadge?: boolean;
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
            router.replace('/login');
          }
        },
      ]
    );
  };

  const menuSections: MenuSection[] = [
    {
      title: 'Módulos',
      items: [
        {
          icon: <Calendar size={22} color={COLORS.primary} />,
          label: 'Calendario',
          subtitle: 'Eventos y recordatorios',
          onPress: () => router.push('/calendario'),
        },
        {
          icon: <Heart size={22} color={COLORS.error} />,
          label: 'Salud',
          subtitle: 'Vacunas y tratamientos',
          onPress: () => router.push('/salud'),
        },
        {
          icon: <Utensils size={22} color={COLORS.warning} />,
          label: 'Alimentación',
          subtitle: 'Dietas e inventario',
          onPress: () => router.push('/alimentacion'),
        },
      ],
    },
    {
      title: 'Cuenta',
      items: [
        {
          icon: <User size={22} color={COLORS.info} />,
          label: 'Mi Perfil',
          subtitle: user?.email,
          onPress: () => Alert.alert('Mi Perfil', 'Configuración de perfil próximamente'),
        },
        {
          icon: <Crown size={22} color={COLORS.warning} />,
          label: 'Mi Suscripción',
          subtitle: `Plan ${user?.plan || 'Gratuito'}`,
          onPress: () => Alert.alert('Suscripción', 'Gestión de planes próximamente'),
          showBadge: user?.plan === 'gratuito',
          badgeColor: COLORS.warning,
        },
        {
          icon: <Bell size={22} color={COLORS.secondary} />,
          label: 'Notificaciones',
          subtitle: 'Configurar alertas',
          onPress: () => Alert.alert('Notificaciones', 'Configuración de notificaciones próximamente'),
        },
      ],
    },
    {
      title: 'Configuración',
      items: [
        {
          icon: <Settings size={22} color={COLORS.textSecondary} />,
          label: 'Ajustes',
          subtitle: 'Preferencias de la app',
          onPress: () => Alert.alert('Ajustes', 'Configuración general próximamente'),
        },
        {
          icon: <Shield size={22} color={COLORS.success} />,
          label: 'Privacidad',
          subtitle: 'Seguridad y datos',
          onPress: () => Alert.alert('Privacidad', 'Configuración de privacidad próximamente'),
        },
      ],
    },
    {
      title: 'Soporte',
      items: [
        {
          icon: <HelpCircle size={22} color={COLORS.info} />,
          label: 'Ayuda',
          subtitle: 'Centro de ayuda',
          onPress: () => Alert.alert('Ayuda', 'Centro de ayuda próximamente'),
        },
        {
          icon: <FileText size={22} color={COLORS.textSecondary} />,
          label: 'Términos y Condiciones',
          onPress: () => Alert.alert('Términos', 'Términos y condiciones próximamente'),
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={[styles.header, { paddingTop: insets.top + SPACING.md }]}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.nombre?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.nombre} {user?.apellido}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.planBadge}>
              <Crown size={12} color={COLORS.warning} />
              <Text style={styles.planText}>
                Plan {user?.plan?.charAt(0).toUpperCase()}{user?.plan?.slice(1) || 'Gratuito'}
              </Text>
            </View>
          </View>
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
            <View style={styles.sectionCard}>
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
                      <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                  <View style={styles.menuItemRight}>
                    {item.showBadge && (
                      <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
                        <Text style={styles.badgeText}>Upgrade</Text>
                      </View>
                    )}
                    <ChevronRight size={20} color={COLORS.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={22} color={COLORS.error} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>GenesisPro v1.0.0</Text>
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: COLORS.textLight,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.textLight,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    gap: 4,
  },
  planText: {
    fontSize: 12,
    fontWeight: '600' as const,
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
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    width: 40,
    height: 40,
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
    fontSize: 16,
    fontWeight: '500' as const,
    color: COLORS.text,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: COLORS.textLight,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error + '15',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.error,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
  },
});
