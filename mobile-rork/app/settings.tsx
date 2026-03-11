import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  ChevronLeft,
  Bell,
  Shield,
  FileText,
  HelpCircle,
  MessageCircle,
  ChevronRight,
  Wifi,
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import api from '@/services/api';

const PREFS_KEY = 'notification_preferences';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [vacunaAlerts, setVacunaAlerts] = useState(true);
  const [combateReminders, setCombateReminders] = useState(false);
  const [offlineMode, setOfflineMode] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFS_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        setPushNotifications(prefs.push_habilitado ?? true);
        setVacunaAlerts(prefs.alerta_vacunas ?? true);
        setCombateReminders(prefs.recordatorio_combates ?? false);
        setOfflineMode(prefs.offline_mode ?? true);
      }

      // Try to load from server too
      if (api.isAuthenticated()) {
        try {
          const response = await api.getNotificationPreferences();
          if (response.success && response.data) {
            setPushNotifications(response.data.push_habilitado ?? true);
            setVacunaAlerts(response.data.alerta_vacunas ?? true);
            setCombateReminders(response.data.recordatorio_combates ?? false);
          }
        } catch (e) {
          // Use local prefs if server fails
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
    setLoaded(true);
  };

  const savePreferences = useCallback(async (key: string, value: boolean) => {
    const prefs = {
      push_habilitado: pushNotifications,
      alerta_vacunas: vacunaAlerts,
      recordatorio_combates: combateReminders,
      offline_mode: offlineMode,
      [key]: value,
    };

    // Save locally
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));

    // Save to server if authenticated
    if (api.isAuthenticated()) {
      try {
        await api.updateNotificationPreferences({
          push_habilitado: prefs.push_habilitado,
          alerta_vacunas: prefs.alerta_vacunas,
          recordatorio_combates: prefs.recordatorio_combates,
          avisos_evento: true,
        });
      } catch (e) {
        // Silent fail, local prefs are saved
      }
    }
  }, [pushNotifications, vacunaAlerts, combateReminders, offlineMode]);

  const handleTogglePush = async (value: boolean) => {
    setPushNotifications(value);

    if (value) {
      // Request permission and register token
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Necesitas habilitar notificaciones en la configuracion del dispositivo');
        setPushNotifications(false);
        return;
      }

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'genesispro',
        });
        await api.registerPushToken(tokenData.data, Platform.OS);
      } catch (e) {
        console.error('Error registering push token:', e);
      }
    }

    savePreferences('push_habilitado', value);
  };

  const handleToggleVacunas = (value: boolean) => {
    setVacunaAlerts(value);
    savePreferences('alerta_vacunas', value);
  };

  const handleToggleCombates = (value: boolean) => {
    setCombateReminders(value);
    savePreferences('recordatorio_combates', value);
  };

  const handleToggleOffline = (value: boolean) => {
    setOfflineMode(value);
    savePreferences('offline_mode', value);
  };

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
          <Text style={styles.headerTitle}>Ajustes</Text>
          <View style={styles.navButton} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications */}
        <Text style={styles.sectionLabel}>NOTIFICACIONES</Text>
        <View style={[styles.card, SHADOWS.sm]}>
          <ToggleRow
            icon={<Bell size={20} color={COLORS.primary} />}
            label="Notificaciones push"
            subtitle="Recibir alertas en el dispositivo"
            value={pushNotifications}
            onToggle={handleTogglePush}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={<Bell size={20} color={COLORS.error} />}
            label="Alertas de vacunas"
            subtitle="Recordatorios de proximas dosis"
            value={vacunaAlerts}
            onToggle={handleToggleVacunas}
          />
          <View style={styles.divider} />
          <ToggleRow
            icon={<Bell size={20} color={COLORS.secondary} />}
            label="Recordatorios de combate"
            subtitle="Avisos de eventos programados"
            value={combateReminders}
            onToggle={handleToggleCombates}
          />
        </View>

        {/* Data */}
        <Text style={styles.sectionLabel}>DATOS</Text>
        <View style={[styles.card, SHADOWS.sm]}>
          <ToggleRow
            icon={<Wifi size={20} color={COLORS.info} />}
            label="Modo offline"
            subtitle="Guardar datos localmente"
            value={offlineMode}
            onToggle={handleToggleOffline}
          />
        </View>

        {/* Legal */}
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <View style={[styles.card, SHADOWS.sm]}>
          <LinkRow
            icon={<Shield size={20} color={COLORS.success} />}
            label="Politica de Privacidad"
            subtitle="Como manejamos tus datos"
            onPress={() => Linking.openURL('https://api.genesispro.vip/privacidad')}
          />
          <View style={styles.divider} />
          <LinkRow
            icon={<FileText size={20} color={COLORS.textSecondary} />}
            label="Terminos y Condiciones"
            subtitle="Condiciones de uso"
            onPress={() => Linking.openURL('https://api.genesispro.vip/terminos')}
          />
        </View>

        {/* Support */}
        <Text style={styles.sectionLabel}>SOPORTE</Text>
        <View style={[styles.card, SHADOWS.sm]}>
          <LinkRow
            icon={<HelpCircle size={20} color={COLORS.info} />}
            label="Centro de Ayuda"
            subtitle="Preguntas frecuentes"
            onPress={() => Linking.openURL('https://api.genesispro.vip/ayuda')}
          />
          <View style={styles.divider} />
          <LinkRow
            icon={<MessageCircle size={20} color={COLORS.primary} />}
            label="Contactar Soporte"
            subtitle="Enviar un mensaje"
            onPress={() => Linking.openURL('mailto:soporte@genesispro.vip')}
          />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>GenesisPro v1.8.4</Text>
          <Text style={styles.appInfoSub}>Gestion avicola profesional</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ToggleRow({
  icon, label, subtitle, value, onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  value: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.border, true: COLORS.primary + '50' }}
        thumbColor={value ? COLORS.primary : COLORS.textDisabled}
      />
    </View>
  );
}

function LinkRow({
  icon, label, subtitle, onPress,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color={COLORS.textDisabled} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
    marginTop: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  rowSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 72,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  appInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textDisabled,
  },
  appInfoSub: {
    fontSize: 12,
    color: COLORS.textDisabled,
    marginTop: 2,
  },
});
