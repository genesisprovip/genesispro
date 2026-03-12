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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Syringe,
  Pill,
  Stethoscope,
  Bug,
  Calendar,
  FileText,
  User,
  DollarSign,
} from 'lucide-react-native';
import { useAves } from '@/context/AvesContext';
import { useSalud } from '@/context/SaludContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import DatePickerField from '@/components/common/DatePickerField';

type TipoRegistro = 'vacuna' | 'tratamiento' | 'enfermedad' | 'revision' | 'desparasitacion';

const TIPOS: { key: TipoRegistro; label: string; icon: any; color: string }[] = [
  { key: 'vacuna', label: 'Vacuna', icon: Syringe, color: '#4CAF50' },
  { key: 'tratamiento', label: 'Tratamiento', icon: Pill, color: '#2196F3' },
  { key: 'enfermedad', label: 'Enfermedad', icon: Bug, color: '#F44336' },
  { key: 'revision', label: 'Revisión', icon: Stethoscope, color: '#9C27B0' },
  { key: 'desparasitacion', label: 'Desparasitación', icon: Bug, color: '#FF9800' },
];

export default function NuevoRegistroSaludScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { aves } = useAves();
  const { addRegistro } = useSalud();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedAveId, setSelectedAveId] = useState<string>('');
  const [tipo, setTipo] = useState<TipoRegistro>('vacuna');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [fechaProxima, setFechaProxima] = useState('');
  const [veterinario, setVeterinario] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [dosis, setDosis] = useState('');
  const [costo, setCosto] = useState('');
  const [notas, setNotas] = useState('');

  const handleSubmit = async () => {
    if (!selectedAveId) {
      Alert.alert('Error', 'Selecciona un ave');
      return;
    }

    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre del registro es requerido');
      return;
    }

    if (!fecha) {
      Alert.alert('Error', 'La fecha es requerida');
      return;
    }

    setIsLoading(true);

    try {
      const registroData = {
        ave_id: selectedAveId,
        tipo,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        fecha,
        fecha_proxima: fechaProxima || undefined,
        veterinario: veterinario.trim() || undefined,
        medicamentos: medicamentos.trim() || undefined,
        dosis: dosis.trim() || undefined,
        costo: costo ? parseFloat(costo) : undefined,
        notas: notas.trim() || undefined,
      };

      const result = await addRegistro(registroData);

      if (result.success) {
        Alert.alert('Éxito', 'Registro de salud guardado', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', result.error || 'No se pudo guardar el registro');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Ocurrió un error');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedTipo = TIPOS.find(t => t.key === tipo);

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
          <Text style={styles.headerTitle}>Nuevo Registro</Text>
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Selección de Ave */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seleccionar Ave</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.avesRow}>
                {aves.filter(a => a.estado === 'activo').length === 0 ? (
                  <Text style={styles.emptyText}>No hay aves activas</Text>
                ) : (
                  aves.filter(a => a.estado === 'activo').map(ave => (
                    <TouchableOpacity
                      key={ave.id}
                      style={[
                        styles.aveChip,
                        selectedAveId === ave.id && styles.aveChipSelected
                      ]}
                      onPress={() => setSelectedAveId(ave.id)}
                    >
                      <Text style={[
                        styles.aveChipText,
                        selectedAveId === ave.id && styles.aveChipTextSelected
                      ]}>
                        {ave.codigo_identidad}
                      </Text>
                      <Text style={[
                        styles.aveChipSubtext,
                        selectedAveId === ave.id && styles.aveChipTextSelected
                      ]}>
                        {ave.sexo === 'M' ? 'Macho' : 'Hembra'}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
          </View>

          {/* Tipo de Registro */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tipo de Registro</Text>
            <View style={styles.tiposGrid}>
              {TIPOS.map((t) => {
                const Icon = t.icon;
                const isSelected = tipo === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.tipoCard,
                      isSelected && { backgroundColor: t.color + '20', borderColor: t.color }
                    ]}
                    onPress={() => setTipo(t.key)}
                  >
                    <Icon size={24} color={isSelected ? t.color : COLORS.textSecondary} />
                    <Text style={[
                      styles.tipoLabel,
                      isSelected && { color: t.color }
                    ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Información del Registro */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información</Text>

            <View style={styles.inputGroup}>
              <View style={[styles.inputIcon, { backgroundColor: selectedTipo?.color + '20' }]}>
                {selectedTipo && <selectedTipo.icon size={20} color={selectedTipo.color} />}
              </View>
              <TextInput
                style={styles.input}
                placeholder={`Nombre ${tipo === 'vacuna' || tipo === 'enfermedad' || tipo === 'desparasitacion' || tipo === 'revision' ? 'de la' : 'del'} ${TIPOS.find(t => t.key === tipo)?.label?.toLowerCase() || tipo}`}
                placeholderTextColor={COLORS.textSecondary}
                value={nombre}
                onChangeText={setNombre}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <FileText size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Descripción (opcional)"
                placeholderTextColor={COLORS.textSecondary}
                value={descripcion}
                onChangeText={setDescripcion}
              />
            </View>

            <DatePickerField
              value={fecha}
              onChange={setFecha}
              placeholder="Seleccionar fecha"
            />

            {(tipo === 'vacuna' || tipo === 'tratamiento') && (
              <DatePickerField
                value={fechaProxima}
                onChange={setFechaProxima}
                placeholder="Fecha proxima dosis"
                iconColor={COLORS.warning}
              />
            )}
          </View>

          {/* Detalles Médicos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalles Médicos (opcional)</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <User size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Veterinario"
                placeholderTextColor={COLORS.textSecondary}
                value={veterinario}
                onChangeText={setVeterinario}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Pill size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Medicamentos utilizados"
                placeholderTextColor={COLORS.textSecondary}
                value={medicamentos}
                onChangeText={setMedicamentos}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <TextInput
                  style={[styles.input, styles.inputAlone]}
                  placeholder="Dosis"
                  placeholderTextColor={COLORS.textSecondary}
                  value={dosis}
                  onChangeText={setDosis}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <View style={styles.inputIcon}>
                  <DollarSign size={20} color={COLORS.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Costo"
                  placeholderTextColor={COLORS.textSecondary}
                  value={costo}
                  onChangeText={setCosto}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Notas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Observaciones adicionales..."
              placeholderTextColor={COLORS.textSecondary}
              value={notas}
              onChangeText={setNotas}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Botón Guardar */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#EC4899', '#DB2777']}
              style={styles.submitGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.textLight} />
              ) : (
                <Text style={styles.submitText}>Guardar Registro</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
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
  avesRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  aveChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    minWidth: 100,
    alignItems: 'center',
  },
  aveChipSelected: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '10',
  },
  aveChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  aveChipSubtext: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  aveChipTextSelected: {
    color: COLORS.error,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  tiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tipoCard: {
    width: '31%',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  tipoLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
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
    borderRadius: BORDER_RADIUS.sm,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  inputAlone: {
    paddingLeft: SPACING.md,
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
