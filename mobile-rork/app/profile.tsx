import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const [nombre, setNombre] = useState(user?.nombre || '');
  const [apellido, setApellido] = useState(user?.apellido || '');
  const [telefono, setTelefono] = useState(user?.telefono || '');
  const [isLoading, setIsLoading] = useState(false);

  const hasChanges =
    nombre !== (user?.nombre || '') ||
    apellido !== (user?.apellido || '') ||
    telefono !== (user?.telefono || '');

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    setIsLoading(true);
    try {
      // Persist to API first
      const response = await api.updateProfile({
        nombre: nombre.trim(),
        telefono: telefono.trim() || undefined,
      });

      // Update local state with API response or form values
      if (user) {
        updateUser({
          ...user,
          ...(response.data?.user || {}),
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telefono.trim() || undefined,
        });
      }
      Alert.alert('Perfil actualizado', 'Tus datos han sido guardados', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      // Fallback: update local state even if API fails
      if (user) {
        updateUser({
          ...user,
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          telefono: telefono.trim() || undefined,
        });
      }
      Alert.alert(
        'Guardado localmente',
        'No se pudo sincronizar con el servidor. Los cambios se guardaron localmente.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const planMap: Record<string, string> = { basico: 'Básico', pro: 'Pro', premium: 'Premium' };
  const planLabel = planMap[user?.plan || 'basico'] || 'Básico';

  const memberSince = user?.fecha_registro
    ? new Date(user.fecha_registro).toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
            <ChevronLeft size={28} color={COLORS.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <View style={styles.navButton} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.avatarImage}
              contentFit="contain"
            />
          </View>
          <Text style={styles.avatarName}>
            {user?.nombre} {user?.apellido}
          </Text>
          <Text style={styles.avatarEmail}>{user?.email}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info chips */}
          <View style={styles.chipsRow}>
            <View style={styles.chip}>
              <Shield size={14} color={COLORS.secondary} />
              <Text style={styles.chipText}>Plan {planLabel}</Text>
            </View>
            {memberSince && (
              <View style={styles.chip}>
                <Calendar size={14} color={COLORS.primary} />
                <Text style={styles.chipText}>Desde {memberSince}</Text>
              </View>
            )}
          </View>

          {/* Form */}
          <Text style={styles.sectionLabel}>INFORMACIÓN PERSONAL</Text>

          <View style={[styles.formCard, SHADOWS.sm]}>
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <User size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre"
                  placeholderTextColor={COLORS.placeholder}
                  value={nombre}
                  onChangeText={setNombre}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <User size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Apellido</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tu apellido"
                  placeholderTextColor={COLORS.placeholder}
                  value={apellido}
                  onChangeText={setApellido}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Phone size={20} color={COLORS.textSecondary} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Número de teléfono"
                  placeholderTextColor={COLORS.placeholder}
                  value={telefono}
                  onChangeText={setTelefono}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Mail size={20} color={COLORS.textDisabled} />
              </View>
              <View style={styles.inputContent}>
                <Text style={styles.inputLabel}>Correo electrónico</Text>
                <Text style={styles.inputReadonly}>{user?.email}</Text>
              </View>
            </View>
          </View>

          {/* Save Button */}
          {hasChanges && (
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isLoading}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={styles.saveGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.textLight} />
                ) : (
                  <Text style={styles.saveText}>Guardar Cambios</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
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
  avatarSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatarImage: {
    width: 88,
    height: 88,
  },
  avatarName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  avatarEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    ...SHADOWS.sm,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  inputIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  input: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    paddingVertical: 2,
  },
  inputReadonly: {
    fontSize: 16,
    color: COLORS.textDisabled,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: 72,
  },
  saveButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.lg,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight,
  },
});
