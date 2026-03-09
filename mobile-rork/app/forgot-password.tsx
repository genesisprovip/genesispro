import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Mail, Key, Lock } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import { api } from '@/services/api';

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Ingresa tu correo electronico');
      return;
    }
    setIsLoading(true);
    try {
      await api.forgotPassword(email.trim().toLowerCase());
      Alert.alert('Codigo enviado', 'Revisa tu correo electronico para el codigo de recuperacion');
      setStep('code');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar el codigo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Ingresa el codigo de 6 digitos');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.verifyResetCode(email.trim().toLowerCase(), code);
      if (res.success && res.data?.reset_token) {
        setResetToken(res.data.reset_token);
        setStep('password');
      } else {
        Alert.alert('Error', 'Codigo incorrecto o expirado');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Codigo invalido');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    setIsLoading(true);
    try {
      await api.resetPassword(resetToken, password);
      Alert.alert(
        'Contraseña actualizada',
        'Tu contraseña ha sido restablecida. Inicia sesion con tu nueva contraseña.',
        [{ text: 'Ir a Login', onPress: () => router.replace('/login') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo restablecer la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <>
            <Text style={styles.stepTitle}>Recuperar Contraseña</Text>
            <Text style={styles.stepDesc}>
              Ingresa tu correo electronico y te enviaremos un codigo de recuperacion.
            </Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Mail size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Correo electronico"
                placeholderTextColor={COLORS.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.actionButton, isLoading && { opacity: 0.7 }]}
              onPress={handleSendCode}
              disabled={isLoading}
            >
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.actionGradient}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Enviar Codigo</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        );

      case 'code':
        return (
          <>
            <Text style={styles.stepTitle}>Ingresa el Codigo</Text>
            <Text style={styles.stepDesc}>
              Enviamos un codigo de 6 digitos a {email}
            </Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Key size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={[styles.input, { letterSpacing: 8, fontSize: 22, fontWeight: '700', textAlign: 'center' }]}
                placeholder="000000"
                placeholderTextColor={COLORS.placeholder}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <TouchableOpacity
              style={[styles.actionButton, isLoading && { opacity: 0.7 }]}
              onPress={handleVerifyCode}
              disabled={isLoading}
            >
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.actionGradient}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Verificar Codigo</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSendCode} style={{ marginTop: SPACING.md }}>
              <Text style={{ color: COLORS.textSecondary, textAlign: 'center', fontSize: 13 }}>
                ¿No recibiste el codigo? Reenviar
              </Text>
            </TouchableOpacity>
          </>
        );

      case 'password':
        return (
          <>
            <Text style={styles.stepTitle}>Nueva Contraseña</Text>
            <Text style={styles.stepDesc}>
              Establece tu nueva contraseña.
            </Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Lock size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Nueva contraseña"
                placeholderTextColor={COLORS.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Lock size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Confirmar contraseña"
                placeholderTextColor={COLORS.placeholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.actionButton, isLoading && { opacity: 0.7 }]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.actionGradient}>
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionText}>Restablecer Contraseña</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt, '#0F172A']}
      style={styles.container}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => step === 'email' ? router.back() : setStep(step === 'password' ? 'code' : 'email')}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={COLORS.textLight} />
          </TouchableOpacity>

          <View style={styles.formCard}>
            {renderStep()}
          </View>

          {step === 'email' && (
            <TouchableOpacity onPress={() => router.push('/login')} style={{ marginTop: SPACING.lg }}>
              <Text style={{ color: COLORS.textSecondary, textAlign: 'center', fontSize: 14 }}>
                Volver al inicio de sesion
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  stepDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  inputIcon: {
    padding: SPACING.md,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  actionButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.sm,
  },
  actionGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight,
  },
});
