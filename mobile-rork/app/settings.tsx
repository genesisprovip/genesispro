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
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import {
  ChevronLeft,
  Bell,
  Shield,
  FileText,
  HelpCircle,
  MessageCircle,
  ChevronRight,
  Wifi,
  Mail,
  CheckCircle,
  Home,
  Camera,
  Lock,
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';

const PREFS_KEY = 'notification_preferences';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifySending, setVerifySending] = useState(false);
  const [verifyStep, setVerifyStep] = useState<'idle' | 'sent'>('idle');
  const [vacunaAlerts, setVacunaAlerts] = useState(true);
  const [combateReminders, setCombateReminders] = useState(false);
  const [offlineMode, setOfflineMode] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Gallera state
  const [nombreGallera, setNombreGallera] = useState(user?.nombre_gallera || '');
  const [galleraSaving, setGalleraSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  // Sync gallera name when user data loads
  useEffect(() => {
    if (user?.nombre_gallera) {
      setNombreGallera(user.nombre_gallera);
    }
  }, [user?.nombre_gallera]);

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

  const handleSaveGallera = async () => {
    if (!nombreGallera.trim()) return;
    setGalleraSaving(true);
    try {
      const res = await api.updateProfile({ nombre_gallera: nombreGallera.trim() });
      if (res.success) {
        refreshProfile();
        Alert.alert('Guardado', 'Nombre de gallera actualizado');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar');
    } finally {
      setGalleraSaving(false);
    }
  };

  const handlePickLogo = async () => {
    const userPlan = user?.plan || user?.plan_actual || 'basico';
    if (userPlan === 'basico') {
      Alert.alert('Plan Pro requerido', 'Actualiza tu plan para subir el logo de tu gallera.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setLogoUploading(true);
    try {
      const res = await api.uploadGalleraLogo(result.assets[0].uri);
      if (res.success) {
        refreshProfile();
        Alert.alert('Logo actualizado', 'El logo de tu gallera se ha guardado');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo subir el logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const isProOrHigher = () => {
    const p = user?.plan || user?.plan_actual || 'basico';
    return p === 'pro' || p === 'premium';
  };

  const logoUrl = user?.logo_gallera_url
    ? (user.logo_gallera_url.startsWith('http') ? user.logo_gallera_url : `https://api.genesispro.vip${user.logo_gallera_url}`)
    : null;

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
        keyboardShouldPersistTaps="handled"
      >
        {/* Mi Gallera */}
        <Text style={styles.sectionLabel}>MI GALLERA</Text>
        <View style={[styles.card, SHADOWS.sm, { padding: SPACING.md }]}>
          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: SPACING.md }}>
            <TouchableOpacity
              onPress={handlePickLogo}
              activeOpacity={0.7}
              disabled={logoUploading}
              style={{
                width: 90,
                height: 90,
                borderRadius: 45,
                backgroundColor: COLORS.background,
                borderWidth: 2,
                borderColor: isProOrHigher() ? COLORS.primary : COLORS.border,
                borderStyle: isProOrHigher() ? 'solid' : 'dashed',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              {logoUploading ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : logoUrl ? (
                <Image source={{ uri: logoUrl }} style={{ width: 86, height: 86, borderRadius: 43 }} />
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Camera size={24} color={isProOrHigher() ? COLORS.textSecondary : COLORS.disabled} />
                  <Text style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 4 }}>Logo</Text>
                </View>
              )}
            </TouchableOpacity>
            {!isProOrHigher() && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: 8,
                backgroundColor: COLORS.secondary + '15',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: BORDER_RADIUS.sm,
                gap: 4,
              }}>
                <Lock size={12} color={COLORS.secondary} />
                <Text style={{ fontSize: 11, color: COLORS.secondary, fontWeight: '600' }}>
                  Disponible en Plan Pro
                </Text>
              </View>
            )}
          </View>

          {/* Nombre gallera */}
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 6 }}>
            Nombre de la gallera
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: COLORS.background,
                borderRadius: BORDER_RADIUS.md,
                padding: 12,
                fontSize: 15,
                color: COLORS.text,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
              placeholder="Ej: Gallera Los Reyes"
              placeholderTextColor={COLORS.placeholder}
              value={nombreGallera}
              onChangeText={setNombreGallera}
              maxLength={100}
            />
            <TouchableOpacity
              onPress={handleSaveGallera}
              disabled={galleraSaving || !nombreGallera.trim() || nombreGallera.trim() === (user?.nombre_gallera || '')}
              style={{
                backgroundColor: (!nombreGallera.trim() || nombreGallera.trim() === (user?.nombre_gallera || ''))
                  ? COLORS.disabled
                  : COLORS.primary,
                borderRadius: BORDER_RADIUS.md,
                paddingHorizontal: 16,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: COLORS.textLight, fontWeight: '700', fontSize: 13 }}>
                {galleraSaving ? '...' : 'Guardar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

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

        {/* Email Verification */}
        {user && !user.email_verificado && (
          <>
            <Text style={styles.sectionLabel}>VERIFICAR EMAIL</Text>
            <View style={[styles.card, SHADOWS.sm, { padding: SPACING.md }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Mail size={20} color={COLORS.warning} />
                <Text style={{ color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1 }}>
                  Tu email no está verificado
                </Text>
              </View>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 12 }}>
                Verifica {user.email} para respaldar tu cuenta y acceder a todas las funciones.
              </Text>
              {verifyStep === 'idle' ? (
                <TouchableOpacity
                  style={{ backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, padding: 12, alignItems: 'center' }}
                  disabled={verifySending}
                  onPress={async () => {
                    if (!user.email) return;
                    setVerifySending(true);
                    try {
                      await api.resendVerification(user.email);
                      setVerifyStep('sent');
                      Alert.alert('Código enviado', `Revisa tu bandeja de ${user.email}`);
                    } catch {
                      Alert.alert('Error', 'No se pudo enviar el código. Intenta más tarde.');
                    } finally {
                      setVerifySending(false);
                    }
                  }}
                >
                  <Text style={{ color: COLORS.textLight, fontWeight: '700', fontSize: 14 }}>
                    {verifySending ? 'Enviando...' : 'Enviar código de verificación'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <TextInput
                    style={{
                      backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md,
                      padding: 12, fontSize: 18, color: COLORS.text, textAlign: 'center',
                      borderWidth: 1, borderColor: COLORS.border, letterSpacing: 8, marginBottom: 10,
                    }}
                    placeholder="000000"
                    placeholderTextColor={COLORS.placeholder}
                    value={verifyCode}
                    onChangeText={setVerifyCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={{ backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, padding: 12, alignItems: 'center' }}
                    disabled={verifyCode.length < 6 || verifySending}
                    onPress={async () => {
                      if (!user.email) return;
                      setVerifySending(true);
                      try {
                        const res = await api.verifyEmail(user.email, verifyCode);
                        if (res.success) {
                          Alert.alert('Verificado', 'Tu email ha sido verificado correctamente.');
                          refreshProfile();
                          setVerifyStep('idle');
                          setVerifyCode('');
                        }
                      } catch {
                        Alert.alert('Error', 'Código inválido o expirado. Intenta de nuevo.');
                      } finally {
                        setVerifySending(false);
                      }
                    }}
                  >
                    <Text style={{ color: COLORS.textLight, fontWeight: '700', fontSize: 14 }}>
                      {verifySending ? 'Verificando...' : 'Verificar'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ alignItems: 'center', marginTop: 10 }}
                    onPress={() => { setVerifyStep('idle'); setVerifyCode(''); }}
                  >
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Reenviar código</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}
        {user?.email_verificado && (
          <>
            <Text style={styles.sectionLabel}>EMAIL</Text>
            <View style={[styles.card, SHADOWS.sm, { padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
              <CheckCircle size={20} color={COLORS.success} />
              <Text style={{ color: COLORS.success, fontSize: 14, fontWeight: '600' }}>Email verificado</Text>
            </View>
          </>
        )}

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
