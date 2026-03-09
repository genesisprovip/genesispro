import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
  LogIn,
  UserPlus,
  Compass,
  Ticket,
  ChevronRight,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { api } from '@/services/api';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [codigoEvento, setCodigoEvento] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinEvent = async () => {
    const code = codigoEvento.trim().toUpperCase();
    if (!code) {
      Alert.alert('Ingresa un codigo', 'Escribe el codigo de acceso del evento');
      return;
    }

    setIsJoining(true);
    try {
      const res = await api.getEventoPorCodigo(code);
      if (res.success) {
        router.push(`/palenque/live?code=${code}&eventoId=${res.data.id}`);
      }
    } catch (error: any) {
      Alert.alert('Codigo invalido', error.message || 'No se encontro el evento con ese codigo');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0F172A', '#1a2744', '#0F172A']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo & Branding */}
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logoImage}
            contentFit="contain"
          />
          <Text style={styles.appName}>GenesisPro</Text>
          <Text style={styles.tagline}>Gestion integral de aves de combate</Text>
        </View>

        {/* Join Event Section */}
        <View style={styles.joinSection}>
          <View style={styles.joinHeader}>
            <Ticket size={18} color={COLORS.secondary} />
            <Text style={styles.joinTitle}>Unirse a Evento</Text>
          </View>
          <View style={styles.joinRow}>
            <TextInput
              style={styles.codeInput}
              placeholder="CODIGO DE ACCESO"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={codigoEvento}
              onChangeText={setCodigoEvento}
              autoCapitalize="characters"
              maxLength={10}
            />
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoinEvent}
              disabled={isJoining}
            >
              {isJoining ? (
                <ActivityIndicator color={COLORS.textLight} size="small" />
              ) : (
                <ChevronRight size={22} color={COLORS.textLight} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.joinHint}>
            Ingresa el codigo que te compartio el organizador
          </Text>
        </View>

        {/* Main Actions */}
        <View style={styles.actionsSection}>
          {/* Demo / Explore */}
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardPrimary]}
            activeOpacity={0.8}
            onPress={async () => {
              await AsyncStorage.setItem('has_seen_welcome', 'true');
              router.replace('/(tabs)');
            }}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.actionIconWrap}>
                <Compass size={28} color={COLORS.textLight} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.actionTitle}>Explorar sin cuenta</Text>
                <Text style={styles.actionSubtitle}>
                  Usa todas las funciones. Tus datos se guardan en el telefono.
                </Text>
              </View>
              <ChevronRight size={22} color="rgba(255,255,255,0.6)" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Create Account */}
          <TouchableOpacity
            style={[styles.actionCard]}
            activeOpacity={0.8}
            onPress={() => router.push('/register')}
          >
            <View style={styles.actionRow}>
              <View style={[styles.actionIconCircle, { backgroundColor: COLORS.secondary + '20' }]}>
                <UserPlus size={22} color={COLORS.secondary} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, { color: COLORS.text }]}>Crear Cuenta</Text>
                <Text style={[styles.actionSubtitle, { color: COLORS.textSecondary }]}>
                  Respalda tus datos y accede desde cualquier dispositivo
                </Text>
              </View>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Login */}
          <TouchableOpacity
            style={[styles.actionCard]}
            activeOpacity={0.8}
            onPress={() => router.push('/login')}
          >
            <View style={styles.actionRow}>
              <View style={[styles.actionIconCircle, { backgroundColor: COLORS.accent + '20' }]}>
                <LogIn size={22} color={COLORS.accent} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, { color: COLORS.text }]}>Iniciar Sesion</Text>
                <Text style={[styles.actionSubtitle, { color: COLORS.textSecondary }]}>
                  Ya tengo una cuenta
                </Text>
              </View>
              <ChevronRight size={20} color={COLORS.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Features highlight */}
        <View style={styles.featuresRow}>
          {[
            { label: 'Registro', icon: '🐓' },
            { label: 'Genealogia', icon: '🧬' },
            { label: 'Salud', icon: '💊' },
            { label: 'Combates', icon: '⚔️' },
            { label: 'Palenque', icon: '🏆' },
          ].map((f, i) => (
            <View key={i} style={styles.featureChip}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureLabel}>{f.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.version}>v1.7.0 · genesispro.vip</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoImage: {
    width: 140,
    height: 140,
    marginBottom: SPACING.sm,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.textLight,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    marginTop: SPACING.xs,
  },

  // Join Event
  joinSection: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  joinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  joinTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  joinRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  codeInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textLight,
    letterSpacing: 2,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  joinButton: {
    width: 52,
    backgroundColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  // Actions
  actionsSection: {
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  actionCard: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    ...SHADOWS.md,
  },
  actionCardPrimary: {
    backgroundColor: 'transparent',
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  actionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // Features
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.round,
    gap: 6,
  },
  featureIcon: {
    fontSize: 14,
  },
  featureLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },

  version: {
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
  },
});
