import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  ScrollView, 
  TextInput, 
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { 
  ArrowLeft, 
  Camera, 
  X,
  Check,
  ChevronDown
} from 'lucide-react-native';
import { useAves } from '@/context/AvesContext';
import { Ave } from '@/types';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

type SexoType = 'M' | 'H';
type EstadoType = 'activo' | 'vendido' | 'muerto' | 'retirado';

const COLORES_OPTIONS = ['Giro', 'Cenizo', 'Colorado', 'Negro', 'Jabado', 'Blanco', 'Giro Claro', 'Otro'];
const LINEAS_OPTIONS = ['Kelso', 'Hatch', 'Sweater', 'Roundhead', 'Albany', 'Asil', 'Otro'];

// Sistema de marcas de patas (1-16)
// Izq Afuera=1, Izq Dentro=2, Der Afuera=4, Der Dentro=8
interface MarcasPata {
  izqAfuera: boolean;  // 1
  izqDentro: boolean;  // 2
  derAfuera: boolean;  // 4
  derDentro: boolean;  // 8
}

const calcularNumeroLote = (marcas: MarcasPata): number => {
  let total = 0;
  if (marcas.izqAfuera) total += 1;
  if (marcas.izqDentro) total += 2;
  if (marcas.derAfuera) total += 4;
  if (marcas.derDentro) total += 8;
  return total;
};

const marcasDesdeNumero = (numero: number): MarcasPata => {
  return {
    izqAfuera: (numero & 1) !== 0,
    izqDentro: (numero & 2) !== 0,
    derAfuera: (numero & 4) !== 0,
    derDentro: (numero & 8) !== 0,
  };
};

export default function AveFormScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { addAve, updateAve, getAveById, aves } = useAves();

  const existingAve = editId ? getAveById(editId) : undefined;
  const isEditing = !!existingAve;

  const [formData, setFormData] = useState({
    codigo_identidad: '',
    codigo_personal: '',
    nombre: '',
    sexo: 'M' as SexoType,
    fecha_nacimiento: new Date().toISOString().split('T')[0],
    color: '',
    linea_genetica: '',
    peso_nacimiento: '',
    peso_actual: '',
    estado: 'activo' as EstadoType,
    disponible_venta: false,
    precio_venta: '',
    foto_principal: '',
    notas: '',
    criadero_origen: '',
    padre_id: '',
    madre_id: '',
    marca_nariz: '',
  });

  const [marcasPata, setMarcasPata] = useState<MarcasPata>({
    izqAfuera: false,
    izqDentro: false,
    derAfuera: false,
    derDentro: false,
  });

  const numeroLote = calcularNumeroLote(marcasPata);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to extract date from ISO string
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  useEffect(() => {
    if (existingAve) {
      setFormData({
        codigo_identidad: existingAve.codigo_identidad,
        codigo_personal: (existingAve as any).codigo_personal || '',
        nombre: (existingAve as any).nombre || '',
        sexo: existingAve.sexo,
        fecha_nacimiento: formatDate(existingAve.fecha_nacimiento),
        color: existingAve.color || '',
        linea_genetica: existingAve.linea_genetica || '',
        peso_nacimiento: existingAve.peso_nacimiento?.toString() || '',
        peso_actual: existingAve.peso_actual?.toString() || '',
        estado: existingAve.estado,
        disponible_venta: existingAve.disponible_venta,
        precio_venta: existingAve.precio_venta?.toString() || '',
        foto_principal: existingAve.foto_principal || '',
        notas: existingAve.notas || '',
        criadero_origen: existingAve.criadero_origen || '',
        padre_id: existingAve.padre_id || '',
        madre_id: existingAve.madre_id || '',
        marca_nariz: (existingAve as any).marca_nariz || '',
      });

      // Cargar marcas de patas desde el número de lote guardado
      const marcaIzq = (existingAve as any).marca_pata_izquierda;
      const marcaDer = (existingAve as any).marca_pata_derecha;
      if (marcaIzq || marcaDer) {
        // Si hay marcas guardadas como texto, intentar parsear el número
        const numLote = parseInt(marcaIzq) || parseInt(marcaDer) || 0;
        if (numLote > 0 && numLote <= 15) {
          setMarcasPata(marcasDesdeNumero(numLote));
        }
      }
    }
  }, [existingAve]);

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateField('foto_principal', result.assets[0].uri);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // codigo_identidad es auto-generado por el backend, no se valida

    if (!formData.fecha_nacimiento) {
      newErrors.fecha_nacimiento = 'La fecha de nacimiento es requerida';
    }

    if (!formData.sexo) {
      newErrors.sexo = 'El sexo es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Build ave data - codigo_identidad is auto-generated by backend for new aves
      const aveData: any = {
        sexo: formData.sexo,
        fecha_nacimiento: formatDate(formData.fecha_nacimiento),
        color: formData.color || undefined,
        linea_genetica: formData.linea_genetica || undefined,
        peso_nacimiento: formData.peso_nacimiento ? parseFloat(formData.peso_nacimiento) : undefined,
        peso_actual: formData.peso_actual ? parseFloat(formData.peso_actual) : undefined,
        estado: formData.estado,
        disponible_venta: formData.disponible_venta,
        precio_venta: formData.precio_venta ? parseFloat(formData.precio_venta) : undefined,
        notas: formData.notas || undefined,
        criadero_origen: formData.criadero_origen || undefined,
        padre_id: formData.padre_id || undefined,
        madre_id: formData.madre_id || undefined,
        // Nuevos campos de identificación
        codigo_personal: formData.codigo_personal || undefined,
        nombre: formData.nombre || undefined,
        marca_nariz: formData.marca_nariz || undefined,
        // Marcas de patas - guardamos el número de lote y descripción
        marca_pata_izquierda: numeroLote > 0 ? String(numeroLote) : undefined,
        marca_pata_derecha: numeroLote > 0 ? `Lote ${numeroLote}` : undefined,
      };

      let result;
      if (isEditing && existingAve) {
        result = await updateAve(existingAve.id, aveData);
        if (result.success) {
          Alert.alert('Éxito', 'Ave actualizada correctamente', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        } else {
          Alert.alert('Error', result.error || 'No se pudo actualizar el ave');
        }
      } else {
        result = await addAve(aveData);
        if (result.success) {
          Alert.alert('Éxito', 'Ave registrada correctamente', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        } else {
          Alert.alert('Error', result.error || 'No se pudo registrar el ave');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar el ave');
    } finally {
      setIsSubmitting(false);
    }
  };

  const machos = aves.filter(a => a.sexo === 'M' && a.id !== editId);
  const hembras = aves.filter(a => a.sexo === 'H' && a.id !== editId);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top }]}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={COLORS.textLight} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Editar Ave' : 'Nueva Ave'}
          </Text>
          <View style={styles.headerButton} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.formContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.imagePickerContainer} onPress={pickImage}>
            {formData.foto_principal ? (
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: formData.foto_principal }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => updateField('foto_principal', '')}
                >
                  <X size={16} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Camera size={32} color={COLORS.textSecondary} />
                <Text style={styles.imagePlaceholderText}>Agregar foto</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Básica</Text>

            {/* Código de Identidad - auto-generado o solo lectura */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Código de Identidad</Text>
              {isEditing ? (
                <View style={[styles.input, styles.inputDisabled]}>
                  <Text style={styles.disabledText}>{formData.codigo_identidad}</Text>
                </View>
              ) : (
                <View style={[styles.input, styles.inputDisabled]}>
                  <Text style={styles.autoGeneratedText}>Se generará automáticamente</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sexo *</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    formData.sexo === 'M' && styles.segmentButtonActive,
                    formData.sexo === 'M' && { backgroundColor: COLORS.male }
                  ]}
                  onPress={() => updateField('sexo', 'M')}
                >
                  <Text style={[
                    styles.segmentButtonText,
                    formData.sexo === 'M' && styles.segmentButtonTextActive
                  ]}>Macho</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    formData.sexo === 'H' && styles.segmentButtonActive,
                    formData.sexo === 'H' && { backgroundColor: COLORS.female }
                  ]}
                  onPress={() => updateField('sexo', 'H')}
                >
                  <Text style={[
                    styles.segmentButtonText,
                    formData.sexo === 'H' && styles.segmentButtonTextActive
                  ]}>Hembra</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fecha de Nacimiento *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={COLORS.placeholder}
                value={formData.fecha_nacimiento}
                onChangeText={(v) => updateField('fecha_nacimiento', v)}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Color</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Giro"
                  placeholderTextColor={COLORS.placeholder}
                  value={formData.color}
                  onChangeText={(v) => updateField('color', v)}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Línea Genética</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Kelso"
                  placeholderTextColor={COLORS.placeholder}
                  value={formData.linea_genetica}
                  onChangeText={(v) => updateField('linea_genetica', v)}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identificación Personal</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Código Personal</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Tu código"
                  placeholderTextColor={COLORS.placeholder}
                  value={formData.codigo_personal}
                  onChangeText={(v) => updateField('codigo_personal', v)}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Nombre/Apodo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: El Campeón"
                  placeholderTextColor={COLORS.placeholder}
                  value={formData.nombre}
                  onChangeText={(v) => updateField('nombre', v)}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Marcas en Patas (Número de Lote: {numeroLote || '-'})</Text>
              <View style={styles.marcasContainer}>
                {/* Pata Izquierda */}
                <View style={styles.pataSection}>
                  <Text style={styles.pataLabel}>Izquierda</Text>
                  <View style={styles.pataVisual}>
                    <TouchableOpacity
                      style={[
                        styles.marcaCircle,
                        styles.marcaAfuera,
                        marcasPata.izqAfuera && styles.marcaCircleActive
                      ]}
                      onPress={() => setMarcasPata(prev => ({ ...prev, izqAfuera: !prev.izqAfuera }))}
                    >
                      <Text style={[styles.marcaValue, marcasPata.izqAfuera && styles.marcaValueActive]}>1</Text>
                    </TouchableOpacity>
                    <View style={styles.pataCenter}>
                      <View style={styles.pataIcon} />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.marcaCircle,
                        styles.marcaDentro,
                        marcasPata.izqDentro && styles.marcaCircleActive
                      ]}
                      onPress={() => setMarcasPata(prev => ({ ...prev, izqDentro: !prev.izqDentro }))}
                    >
                      <Text style={[styles.marcaValue, marcasPata.izqDentro && styles.marcaValueActive]}>2</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Número de Lote Central */}
                <View style={styles.loteDisplay}>
                  <Text style={styles.loteLabel}>Lote</Text>
                  <View style={styles.loteNumber}>
                    <Text style={styles.loteNumberText}>{numeroLote || '0'}</Text>
                  </View>
                </View>

                {/* Pata Derecha */}
                <View style={styles.pataSection}>
                  <Text style={styles.pataLabel}>Derecha</Text>
                  <View style={styles.pataVisual}>
                    <TouchableOpacity
                      style={[
                        styles.marcaCircle,
                        styles.marcaDentro,
                        marcasPata.derDentro && styles.marcaCircleActive
                      ]}
                      onPress={() => setMarcasPata(prev => ({ ...prev, derDentro: !prev.derDentro }))}
                    >
                      <Text style={[styles.marcaValue, marcasPata.derDentro && styles.marcaValueActive]}>8</Text>
                    </TouchableOpacity>
                    <View style={styles.pataCenter}>
                      <View style={styles.pataIcon} />
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.marcaCircle,
                        styles.marcaAfuera,
                        marcasPata.derAfuera && styles.marcaCircleActive
                      ]}
                      onPress={() => setMarcasPata(prev => ({ ...prev, derAfuera: !prev.derAfuera }))}
                    >
                      <Text style={[styles.marcaValue, marcasPata.derAfuera && styles.marcaValueActive]}>4</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <Text style={styles.marcasHint}>
                Toca los círculos para marcar las posiciones. Izq Afuera=1, Izq Dentro=2, Der Afuera=4, Der Dentro=8
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Marca en Nariz</Text>
              <View style={styles.narizContainer}>
                <TouchableOpacity
                  style={[
                    styles.narizOption,
                    formData.marca_nariz === 'ninguna' && styles.narizOptionActive
                  ]}
                  onPress={() => updateField('marca_nariz', 'ninguna')}
                >
                  <View style={styles.narizVisual}>
                    <View style={styles.narizHole} />
                    <View style={styles.narizHole} />
                  </View>
                  <Text style={[styles.narizLabel, formData.marca_nariz === 'ninguna' && styles.narizLabelActive]}>Ninguna</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.narizOption,
                    formData.marca_nariz === 'izquierda' && styles.narizOptionActive
                  ]}
                  onPress={() => updateField('marca_nariz', 'izquierda')}
                >
                  <View style={styles.narizVisual}>
                    <View style={[styles.narizHole, styles.narizMarked]} />
                    <View style={styles.narizHole} />
                  </View>
                  <Text style={[styles.narizLabel, formData.marca_nariz === 'izquierda' && styles.narizLabelActive]}>Izquierda</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.narizOption,
                    formData.marca_nariz === 'derecha' && styles.narizOptionActive
                  ]}
                  onPress={() => updateField('marca_nariz', 'derecha')}
                >
                  <View style={styles.narizVisual}>
                    <View style={styles.narizHole} />
                    <View style={[styles.narizHole, styles.narizMarked]} />
                  </View>
                  <Text style={[styles.narizLabel, formData.marca_nariz === 'derecha' && styles.narizLabelActive]}>Derecha</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.narizOption,
                    formData.marca_nariz === 'ambas' && styles.narizOptionActive
                  ]}
                  onPress={() => updateField('marca_nariz', 'ambas')}
                >
                  <View style={styles.narizVisual}>
                    <View style={[styles.narizHole, styles.narizMarked]} />
                    <View style={[styles.narizHole, styles.narizMarked]} />
                  </View>
                  <Text style={[styles.narizLabel, formData.marca_nariz === 'ambas' && styles.narizLabelActive]}>Ambas</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Peso</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Peso al nacer (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.045"
                  placeholderTextColor={COLORS.placeholder}
                  value={formData.peso_nacimiento}
                  onChangeText={(v) => updateField('peso_nacimiento', v)}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Peso actual (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2.3"
                  placeholderTextColor={COLORS.placeholder}
                  value={formData.peso_actual}
                  onChangeText={(v) => updateField('peso_actual', v)}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Venta</Text>
            
            <TouchableOpacity 
              style={styles.checkboxRow}
              onPress={() => updateField('disponible_venta', !formData.disponible_venta)}
            >
              <View style={[
                styles.checkbox,
                formData.disponible_venta && styles.checkboxChecked
              ]}>
                {formData.disponible_venta && <Check size={16} color={COLORS.textLight} />}
              </View>
              <Text style={styles.checkboxLabel}>Disponible para venta</Text>
            </TouchableOpacity>

            {formData.disponible_venta && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Precio de venta ($)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="150"
                  placeholderTextColor={COLORS.placeholder}
                  value={formData.precio_venta}
                  onChangeText={(v) => updateField('precio_venta', v)}
                  keyboardType="decimal-pad"
                />
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información Adicional</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Criadero de Origen</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre del criadero"
                placeholderTextColor={COLORS.placeholder}
                value={formData.criadero_origen}
                onChangeText={(v) => updateField('criadero_origen', v)}
              />
            </View>

            {/* Genealogia - Padre y Madre */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { marginBottom: 8 }]}>Genealogia</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: COLORS.male, fontWeight: '600', marginBottom: 4 }}>Padre</Text>
                  <TouchableOpacity
                    style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                    onPress={() => {
                      const machos = aves.filter(a => a.sexo === 'M' && a.id !== existingAve?.id);
                      if (machos.length === 0) { Alert.alert('Sin machos', 'No hay machos registrados para asignar como padre.'); return; }
                      Alert.alert('Seleccionar Padre', undefined, [
                        { text: 'Sin padre', onPress: () => updateField('padre_id', '') },
                        ...machos.slice(0, 15).map(m => ({
                          text: `${m.codigo_identidad}${m.linea_genetica ? ' (' + m.linea_genetica + ')' : ''}`,
                          onPress: () => updateField('padre_id', m.id),
                        })),
                        { text: 'Cancelar', style: 'cancel' as const },
                      ]);
                    }}
                  >
                    <Text style={{ fontSize: 13, color: formData.padre_id ? COLORS.text : COLORS.placeholder, flex: 1 }} numberOfLines={1}>
                      {formData.padre_id ? (aves.find(a => a.id === formData.padre_id)?.codigo_identidad || 'Seleccionado') : 'Seleccionar...'}
                    </Text>
                    <ChevronDown size={14} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: COLORS.female, fontWeight: '600', marginBottom: 4 }}>Madre</Text>
                  <TouchableOpacity
                    style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                    onPress={() => {
                      const hembras = aves.filter(a => a.sexo === 'H' && a.id !== existingAve?.id);
                      if (hembras.length === 0) { Alert.alert('Sin hembras', 'No hay hembras registradas para asignar como madre.'); return; }
                      Alert.alert('Seleccionar Madre', undefined, [
                        { text: 'Sin madre', onPress: () => updateField('madre_id', '') },
                        ...hembras.slice(0, 15).map(h => ({
                          text: `${h.codigo_identidad}${h.linea_genetica ? ' (' + h.linea_genetica + ')' : ''}`,
                          onPress: () => updateField('madre_id', h.id),
                        })),
                        { text: 'Cancelar', style: 'cancel' as const },
                      ]);
                    }}
                  >
                    <Text style={{ fontSize: 13, color: formData.madre_id ? COLORS.text : COLORS.placeholder, flex: 1 }} numberOfLines={1}>
                      {formData.madre_id ? (aves.find(a => a.id === formData.madre_id)?.codigo_identidad || 'Seleccionada') : 'Seleccionar...'}
                    </Text>
                    <ChevronDown size={14} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notas</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Observaciones adicionales..."
                placeholderTextColor={COLORS.placeholder}
                value={formData.notas}
                onChangeText={(v) => updateField('notas', v)}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            style={styles.submitButtonGradient}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Ave'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: COLORS.textLight,
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  imagePreview: {
    position: 'relative',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  removeImageButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    color: COLORS.text,
    height: 48,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    height: 100,
    paddingTop: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: SPACING.xs,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  halfInput: {
    flex: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.sm,
  },
  segmentButtonActive: {
    backgroundColor: COLORS.primary,
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.textSecondary,
  },
  segmentButtonTextActive: {
    color: COLORS.textLight,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 16,
    color: COLORS.text,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  submitButton: {
    flex: 2,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.textLight,
  },
  inputDisabled: {
    backgroundColor: COLORS.background,
    justifyContent: 'center',
  },
  disabledText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500' as const,
  },
  autoGeneratedText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  // Estilos para el sistema de marcas de patas
  marcasContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pataSection: {
    alignItems: 'center',
    flex: 1,
  },
  pataLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  pataVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pataCenter: {
    width: 24,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pataIcon: {
    width: 12,
    height: 30,
    backgroundColor: COLORS.textSecondary,
    borderRadius: 6,
    opacity: 0.3,
  },
  marcaCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marcaCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  marcaAfuera: {
    // Estilo adicional para marcas externas
  },
  marcaDentro: {
    // Estilo adicional para marcas internas
  },
  marcaValue: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.textSecondary,
  },
  marcaValueActive: {
    color: COLORS.textLight,
  },
  loteDisplay: {
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  loteLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  loteNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loteNumberText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.textLight,
  },
  marcasHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Estilos para selector de marca de nariz
  narizContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.xs,
  },
  narizOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
  },
  narizOptionActive: {
    backgroundColor: COLORS.primary,
  },
  narizVisual: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  narizHole: {
    width: 10,
    height: 14,
    borderRadius: 5,
    backgroundColor: COLORS.textSecondary,
    opacity: 0.3,
  },
  narizMarked: {
    backgroundColor: COLORS.warning,
    opacity: 1,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  narizLabel: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  narizLabelActive: {
    color: COLORS.textLight,
  },
});
