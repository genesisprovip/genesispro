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
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Trophy,
  Calendar,
  Clock,
  MapPin,
  FileText,
  Globe,
  ChevronDown,
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import { api } from '@/services/api';

const TIPOS_DERBY = [
  { key: '3_cocks', label: '3 Cocks' },
  { key: '5_cocks', label: '5 Cocks' },
  { key: '7_cocks', label: '7 Cocks' },
  { key: 'hack_fight', label: 'Hack Fight' },
  { key: 'derby_abierto', label: 'Derby Abierto' },
  { key: 'torneo', label: 'Torneo' },
  { key: 'otro', label: 'Otro' },
];

export default function NuevoPalenqueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(false);
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [horaInicio, setHoraInicio] = useState('10:00');
  const [lugar, setLugar] = useState('');
  const [tipoDerby, setTipoDerby] = useState('');
  const [showTipoPicker, setShowTipoPicker] = useState(false);
  const [reglas, setReglas] = useState('');
  const [esPublico, setEsPublico] = useState(true);
  const [totalPeleas, setTotalPeleas] = useState('');

  const selectedTipoLabel = TIPOS_DERBY.find(t => t.key === tipoDerby)?.label || '';

  // TODO: Replace with API call to POST /api/v1/palenque/eventos
  const handleSubmit = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del evento es requerido');
      return;
    }
    if (!fecha) {
      Alert.alert('Error', 'La fecha es requerida');
      return;
    }
    if (!lugar.trim()) {
      Alert.alert('Error', 'El lugar es requerido');
      return;
    }
    if (!tipoDerby) {
      Alert.alert('Error', 'Selecciona el tipo de derby');
      return;
    }

    setIsLoading(true);

    try {
      const eventoData = {
        nombre: nombre.trim(),
        fecha,
        hora_inicio: horaInicio,
        lugar: lugar.trim(),
        tipo_derby: tipoDerby,
        reglas: reglas.trim() || undefined,
        es_publico: esPublico,
        total_peleas: totalPeleas ? parseInt(totalPeleas) : undefined,
      };

      const res = await api.crearEvento(eventoData);
      if (res.success) {
        Alert.alert('Evento Creado', 'El evento se ha creado correctamente', [
          { text: 'Ver Evento', onPress: () => router.replace(`/palenque/${res.data.id}`) },
        ]);
      } else {
        Alert.alert('Error', 'No se pudo crear el evento');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo crear el evento');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color={COLORS.textLight} />
          </TouchableOpacity>
          <View style={styles.headerTitleRow}>
            <Trophy size={20} color={COLORS.secondary} />
            <Text style={styles.headerTitle}>Nuevo Evento</Text>
          </View>
          <View style={styles.placeholder} />
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
          {/* Event Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nombre del Evento</Text>
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Trophy size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ej: Derby Regional Jalisco"
                placeholderTextColor={COLORS.placeholder}
                value={nombre}
                onChangeText={setNombre}
              />
            </View>
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fecha y Hora</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <View style={styles.inputIcon}>
                  <Calendar size={20} color={COLORS.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.placeholder}
                  value={fecha}
                  onChangeText={setFecha}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <View style={styles.inputIcon}>
                  <Clock size={20} color={COLORS.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM"
                  placeholderTextColor={COLORS.placeholder}
                  value={horaInicio}
                  onChangeText={setHoraInicio}
                />
              </View>
            </View>
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lugar</Text>
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <MapPin size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Palenque o arena"
                placeholderTextColor={COLORS.placeholder}
                value={lugar}
                onChangeText={setLugar}
              />
            </View>
          </View>

          {/* Derby Type Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de Derby</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTipoPicker(!showTipoPicker)}
            >
              <Text style={[
                styles.pickerButtonText,
                !tipoDerby && { color: COLORS.placeholder },
              ]}>
                {selectedTipoLabel || 'Seleccionar tipo'}
              </Text>
              <ChevronDown size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {showTipoPicker && (
              <View style={[styles.pickerOptions, SHADOWS.md]}>
                {TIPOS_DERBY.map((tipo) => (
                  <TouchableOpacity
                    key={tipo.key}
                    style={[
                      styles.pickerOption,
                      tipoDerby === tipo.key && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setTipoDerby(tipo.key);
                      setShowTipoPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      tipoDerby === tipo.key && styles.pickerOptionTextSelected,
                    ]}>
                      {tipo.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Total Peleas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Total de Peleas (opcional)</Text>
            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <FileText size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ej: 20"
                placeholderTextColor={COLORS.placeholder}
                value={totalPeleas}
                onChangeText={setTotalPeleas}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Rules */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reglas (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Descripción de las reglas del evento..."
              placeholderTextColor={COLORS.placeholder}
              value={reglas}
              onChangeText={setReglas}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Public Toggle */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Globe size={20} color={COLORS.textSecondary} />
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleLabel}>Evento Público</Text>
                  <Text style={styles.toggleDescription}>
                    {esPublico
                      ? 'Cualquier usuario puede ver y unirse al evento'
                      : 'Solo accesible con código de invitación'}
                  </Text>
                </View>
              </View>
              <Switch
                value={esPublico}
                onValueChange={setEsPublico}
                trackColor={{ false: COLORS.border, true: COLORS.primary + '60' }}
                thumbColor={esPublico ? COLORS.primary : COLORS.textDisabled}
              />
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[COLORS.secondary, COLORS.secondaryDark]}
              style={styles.submitGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.textLight} />
              ) : (
                <Text style={styles.submitText}>Crear Evento</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
    paddingBottom: SPACING.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  placeholder: {
    width: 44,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
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
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfInput: {
    flex: 1,
  },
  textArea: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    minHeight: 100,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  pickerButtonText: {
    fontSize: 16,
    color: COLORS.text,
  },
  pickerOptions: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  pickerOption: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  pickerOptionSelected: {
    backgroundColor: COLORS.secondary + '15',
  },
  pickerOptionText: {
    fontSize: 15,
    color: COLORS.text,
  },
  pickerOptionTextSelected: {
    color: COLORS.secondary,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    marginRight: SPACING.md,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  toggleDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  submitButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight,
  },
});
