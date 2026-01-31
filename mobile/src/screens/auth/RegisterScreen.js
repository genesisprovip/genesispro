import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

const COLORS = {
  primary: '#1a472a',
  white: '#ffffff',
  gray: '#666666',
  lightGray: '#e0e0e0',
  background: '#f5f5f5',
};

const RegisterScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
    pais: 'MX',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegister = async () => {
    const { nombre, apellido, email, password, confirmPassword, pais } = formData;

    if (!nombre || !apellido || !email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    const result = await register({ nombre, apellido, email, password, pais });
    setLoading(false);

    if (!result.success) {
      Alert.alert('Error', result.error);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.form}>
        <Text style={styles.title}>Crear tu cuenta</Text>

        <Text style={styles.label}>Nombre *</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          value={formData.nombre}
          onChangeText={(v) => updateField('nombre', v)}
        />

        <Text style={styles.label}>Apellido *</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu apellido"
          value={formData.apellido}
          onChangeText={(v) => updateField('apellido', v)}
        />

        <Text style={styles.label}>Correo Electrónico *</Text>
        <TextInput
          style={styles.input}
          placeholder="correo@ejemplo.com"
          value={formData.email}
          onChangeText={(v) => updateField('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Contraseña *</Text>
        <TextInput
          style={styles.input}
          placeholder="Mínimo 6 caracteres"
          value={formData.password}
          onChangeText={(v) => updateField('password', v)}
          secureTextEntry
        />

        <Text style={styles.label}>Confirmar Contraseña *</Text>
        <TextInput
          style={styles.input}
          placeholder="Repite tu contraseña"
          value={formData.confirmPassword}
          onChangeText={(v) => updateField('confirmPassword', v)}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Crear Cuenta</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.linkText}>
            ¿Ya tienes cuenta? <Text style={styles.linkTextBold}>Inicia sesión</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
  },
  form: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  linkText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  linkTextBold: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;
