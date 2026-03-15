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
  Platform,
  Modal,
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
  ChevronDown,
  Plus,
  Trash2,
  Dna
} from 'lucide-react-native';
import { useAves } from '@/context/AvesContext';
import api from '@/services/api';
import { Ave, ComposicionGenetica } from '@/types';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import DatePickerField from '@/components/common/DatePickerField';

type SexoType = 'M' | 'H';
type EstadoType = 'activo' | 'vendido' | 'muerto' | 'retirado';
type TipoAdquisicion = 'cria_propia' | 'compra' | 'regalo' | 'intercambio';

const COLORES_OPTIONS = ['Giro', 'Cenizo', 'Colorado', 'Negro', 'Jabado', 'Blanco', 'Giro Claro', 'Otro'];
const FRACCIONES_OPTIONS = [
  '1/32', '1/16', '1/8', '3/16', '1/4', '5/16', '3/8', '7/16',
  '1/2', '9/16', '5/8', '11/16', '3/4', '13/16', '7/8', '15/16', '1/1',
];
const FRACCION_TO_DECIMAL: Record<string, number> = {
  '1/32': 1/32, '1/16': 1/16, '3/32': 3/32, '1/8': 1/8,
  '3/16': 3/16, '1/4': 1/4, '5/16': 5/16, '3/8': 3/8, '7/16': 7/16,
  '1/2': 1/2, '9/16': 9/16, '5/8': 5/8, '11/16': 11/16, '3/4': 3/4,
  '13/16': 13/16, '7/8': 7/8, '15/16': 15/16, '1/1': 1,
};

// Convert decimal to nearest fraction string
const decimalToFraccion = (decimal: number): string => {
  // Find the closest fraction in 32nds
  const thirtySeconds = Math.round(decimal * 32);
  if (thirtySeconds === 0) return '0';
  if (thirtySeconds === 32) return '1/1';
  // Simplify fraction
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(thirtySeconds, 32);
  return `${thirtySeconds / divisor}/${32 / divisor}`;
};

// Calculate child genetics from parents (each parent contributes 50%)
const calcularGeneticaCria = (
  padreComp: ComposicionGenetica[] | undefined,
  madreComp: ComposicionGenetica[] | undefined
): ComposicionGenetica[] => {
  const lineas: Record<string, { decimal: number; via: string }> = {};

  if (padreComp && padreComp.length > 0) {
    for (const comp of padreComp) {
      const halfDecimal = comp.decimal / 2;
      if (lineas[comp.linea]) {
        lineas[comp.linea].decimal += halfDecimal;
        lineas[comp.linea].via = 'padre+madre';
      } else {
        lineas[comp.linea] = { decimal: halfDecimal, via: 'padre' };
      }
    }
  }

  if (madreComp && madreComp.length > 0) {
    for (const comp of madreComp) {
      const halfDecimal = comp.decimal / 2;
      if (lineas[comp.linea]) {
        lineas[comp.linea].decimal += halfDecimal;
        lineas[comp.linea].via = lineas[comp.linea].via === 'padre' ? 'padre+madre' : comp.via || 'madre';
      } else {
        lineas[comp.linea] = { decimal: halfDecimal, via: 'madre' };
      }
    }
  }

  return Object.entries(lineas)
    .filter(([_, v]) => v.decimal > 0.001)
    .sort((a, b) => b[1].decimal - a[1].decimal)
    .map(([linea, v]) => ({
      linea,
      fraccion: decimalToFraccion(v.decimal),
      decimal: Math.round(v.decimal * 10000) / 10000,
      via: v.via,
    }));
};
const TIPO_ADQUISICION_LABELS: Record<TipoAdquisicion, string> = {
  'cria_propia': 'Cría Propia',
  'compra': 'Compra',
  'regalo': 'Regalo',
  'intercambio': 'Intercambio',
};

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
    precio_compra: '',
    padre_id: '',
    madre_id: '',
    marca_nariz: '',
    anillo_metalico: '',
    anillo_color: '',
    anillo_codigo: '',
    anillo_pata: '',
  });

  const [marcasPata, setMarcasPata] = useState<MarcasPata>({
    izqAfuera: false,
    izqDentro: false,
    derAfuera: false,
    derDentro: false,
  });

  const numeroLote = calcularNumeroLote(marcasPata);

  // Composición genética
  const [composicionGenetica, setComposicionGenetica] = useState<ComposicionGenetica[]>([]);
  const [esPuro, setEsPuro] = useState(false);

  // Origen
  const [criadorNombre, setCriadorNombre] = useState('');
  const [tipoAdquisicion, setTipoAdquisicion] = useState<TipoAdquisicion>('cria_propia');
  const [fechaAdquisicion, setFechaAdquisicion] = useState('');
  const [notasOrigen, setNotasOrigen] = useState('');

  // Ubicación
  const [zona, setZona] = useState('');
  const [subZona, setSubZona] = useState('');
  const [loteUbicacion, setLoteUbicacion] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fraccionModalIndex, setFraccionModalIndex] = useState<number | null>(null);

  // Helpers para composición genética
  const addLineaGenetica = () => {
    setComposicionGenetica(prev => [...prev, { linea: '', fraccion: '1/4', decimal: 0.25 }]);
  };

  const removeLineaGenetica = (index: number) => {
    setComposicionGenetica(prev => prev.filter((_, i) => i !== index));
  };

  const updateLineaGenetica = (index: number, field: keyof ComposicionGenetica, value: string | number) => {
    setComposicionGenetica(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (field === 'fraccion') {
        return { ...item, fraccion: value as string, decimal: FRACCION_TO_DECIMAL[value as string] || 0 };
      }
      return { ...item, [field]: value };
    }));
  };

  const togglePuro = () => {
    if (!esPuro) {
      // Activar puro: limpiar composición y poner 1/1 de la línea genética
      setEsPuro(true);
      if (formData.linea_genetica) {
        setComposicionGenetica([{ linea: formData.linea_genetica, fraccion: '1/1', decimal: 1.0, via: 'puro' }]);
      } else {
        setComposicionGenetica([]);
      }
    } else {
      setEsPuro(false);
      setComposicionGenetica([]);
    }
  };

  const sumaFracciones = composicionGenetica.reduce((sum, c) => sum + c.decimal, 0);

  // Auto-calculate genetics from parents
  const padre = formData.padre_id ? getAveById(formData.padre_id) : undefined;
  const madre = formData.madre_id ? getAveById(formData.madre_id) : undefined;
  const padreHasGenetics = padre?.composicion_genetica && padre.composicion_genetica.length > 0;
  const madreHasGenetics = madre?.composicion_genetica && madre.composicion_genetica.length > 0;
  const canAutoCalc = padreHasGenetics || madreHasGenetics;

  const autoCalcularGenetica = () => {
    if (!canAutoCalc) return;
    const result = calcularGeneticaCria(padre?.composicion_genetica, madre?.composicion_genetica);
    if (result.length > 0) {
      setComposicionGenetica(result);
      setEsPuro(false);
    } else {
      Alert.alert('Sin datos', 'Los padres seleccionados no tienen composición genética registrada.');
    }
  };

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
        precio_compra: (existingAve as any).precio_compra?.toString() || '',
        padre_id: existingAve.padre_id || '',
        madre_id: existingAve.madre_id || '',
        marca_nariz: (existingAve as any).marca_nariz || '',
        anillo_metalico: (existingAve as any).anillo_metalico || '',
        anillo_color: (existingAve as any).anillo_color || '',
        anillo_codigo: (existingAve as any).anillo_codigo || '',
        anillo_pata: (existingAve as any).anillo_pata || '',
      });

      // Cargar marcas de patas desde el número de lote guardado
      const marcaIzq = (existingAve as any).marca_pata_izquierda;
      const marcaDer = (existingAve as any).marca_pata_derecha;
      if (marcaIzq || marcaDer) {
        const numLote = parseInt(marcaIzq) || parseInt(marcaDer) || 0;
        if (numLote > 0 && numLote <= 15) {
          setMarcasPata(marcasDesdeNumero(numLote));
        }
      }

      // Cargar composición genética (puede venir como string JSON del API)
      if (existingAve.composicion_genetica) {
        let comp = existingAve.composicion_genetica;
        if (typeof comp === 'string') {
          try { comp = JSON.parse(comp); } catch { comp = []; }
        }
        if (Array.isArray(comp)) {
          setComposicionGenetica(comp);
        }
      }
      if (existingAve.es_puro) {
        setEsPuro(true);
      }

      // Cargar origen
      setCriadorNombre((existingAve as any).criador_nombre || '');
      setTipoAdquisicion((existingAve as any).tipo_adquisicion || 'cria_propia');
      setFechaAdquisicion((existingAve as any).fecha_adquisicion ? formatDate((existingAve as any).fecha_adquisicion) : '');
      setNotasOrigen((existingAve as any).notas_origen || '');

      // Cargar ubicación
      setZona((existingAve as any).zona || '');
      setSubZona((existingAve as any).sub_zona || '');
      setLoteUbicacion((existingAve as any).lote || '');
    }
  }, [existingAve]);

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitas permitir acceso a la cámara para tomar fotos');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      updateField('foto_principal', result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
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

  const pickImage = () => {
    Alert.alert('Foto del ave', '¿Cómo quieres agregar la foto?', [
      { text: 'Tomar foto', onPress: takePhoto },
      { text: 'Elegir de galería', onPress: pickFromGallery },
      { text: 'Cancelar', style: 'cancel' },
    ]);
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
        // Marcas de patas
        marca_pata_izquierda: numeroLote > 0 ? String(numeroLote) : undefined,
        marca_pata_derecha: numeroLote > 0 ? `Lote ${numeroLote}` : undefined,
        // Anillos
        anillo_metalico: formData.anillo_metalico || undefined,
        anillo_color: formData.anillo_color || undefined,
        anillo_codigo: formData.anillo_codigo || undefined,
        anillo_pata: formData.anillo_pata || undefined,
        // Precio de compra
        precio_compra: formData.precio_compra ? parseFloat(formData.precio_compra) : undefined,
        // Composición genética
        composicion_genetica: composicionGenetica.length > 0 ? composicionGenetica : undefined,
        es_puro: esPuro || undefined,
        // Origen
        criador_nombre: criadorNombre || undefined,
        tipo_adquisicion: tipoAdquisicion || undefined,
        fecha_adquisicion: fechaAdquisicion || undefined,
        notas_origen: notasOrigen || undefined,
        // Ubicación
        zona: zona.trim() || undefined,
        sub_zona: subZona.trim() || undefined,
        lote: loteUbicacion.trim() || undefined,
      };

      let result;
      if (isEditing && existingAve) {
        result = await updateAve(existingAve.id, aveData);
        if (result.success) {
          // Upload photo if selected and it's a new local file
          if (formData.foto_principal && formData.foto_principal.startsWith('file')) {
            try {
              await api.uploadAveFoto(existingAve.id, formData.foto_principal);
            } catch (e) {
              console.warn('Photo upload failed:', e);
            }
          }
          Alert.alert('Éxito', 'Ave actualizada correctamente', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        } else {
          Alert.alert('Error', result.error || 'No se pudo actualizar el ave');
        }
      } else {
        result = await addAve(aveData);
        if (result.success) {
          // Upload photo if selected
          const aveId = result.data?.id;
          if (aveId && formData.foto_principal && formData.foto_principal.startsWith('file')) {
            try {
              await api.uploadAveFoto(aveId, formData.foto_principal);
            } catch (e) {
              console.warn('Photo upload failed:', e);
            }
          }
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
          keyboardShouldPersistTaps="handled"
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
              <DatePickerField
                value={formData.fecha_nacimiento}
                onChange={(v) => updateField('fecha_nacimiento', v)}
                placeholder="Seleccionar fecha"
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

          {/* Anillos e Identificación */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Anillos e Identificacion</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Anillo metalico (numero grabado)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 2847"
                placeholderTextColor={COLORS.placeholder}
                value={formData.anillo_metalico}
                onChangeText={(v) => updateField('anillo_metalico', v)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Color del anillo</Text>
              <View style={styles.anilloColorContainer}>
                {[
                  { label: 'Rojo', value: 'rojo', hex: '#EF4444' },
                  { label: 'Azul', value: 'azul', hex: '#3B82F6' },
                  { label: 'Verde', value: 'verde', hex: '#22C55E' },
                  { label: 'Amarillo', value: 'amarillo', hex: '#EAB308' },
                  { label: 'Naranja', value: 'naranja', hex: '#F97316' },
                  { label: 'Blanco', value: 'blanco', hex: '#F8FAFC' },
                  { label: 'Negro', value: 'negro', hex: '#1E293B' },
                  { label: 'Morado', value: 'morado', hex: '#A855F7' },
                ].map((color) => (
                  <TouchableOpacity
                    key={color.value}
                    style={[
                      styles.anilloColorBtn,
                      formData.anillo_color === color.value && styles.anilloColorBtnActive,
                    ]}
                    onPress={() => updateField('anillo_color', formData.anillo_color === color.value ? '' : color.value)}
                  >
                    <View style={[
                      styles.anilloColorDot,
                      { backgroundColor: color.hex },
                      color.value === 'negro' && { borderWidth: 1, borderColor: '#475569' },
                      color.value === 'blanco' && { borderWidth: 1, borderColor: '#CBD5E1' },
                    ]} />
                    <Text style={[
                      styles.anilloColorLabel,
                      formData.anillo_color === color.value && styles.anilloColorLabelActive,
                    ]}>{color.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, { marginTop: SPACING.sm }]}
                placeholder="O escribe un color personalizado..."
                placeholderTextColor={COLORS.placeholder}
                value={['rojo','azul','verde','amarillo','naranja','blanco','negro','morado'].includes(formData.anillo_color) ? '' : formData.anillo_color}
                onChangeText={(v) => updateField('anillo_color', v)}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Codigo del anillo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: A-15"
                  placeholderTextColor={COLORS.placeholder}
                  value={formData.anillo_codigo}
                  onChangeText={(v) => updateField('anillo_codigo', v)}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Pata del anillo</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      formData.anillo_pata === 'izquierda' && styles.segmentButtonActive,
                    ]}
                    onPress={() => updateField('anillo_pata', formData.anillo_pata === 'izquierda' ? '' : 'izquierda')}
                  >
                    <Text style={[
                      styles.segmentButtonText,
                      formData.anillo_pata === 'izquierda' && styles.segmentButtonTextActive,
                    ]}>Izquierda</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      formData.anillo_pata === 'derecha' && styles.segmentButtonActive,
                    ]}
                    onPress={() => updateField('anillo_pata', formData.anillo_pata === 'derecha' ? '' : 'derecha')}
                  >
                    <Text style={[
                      styles.segmentButtonText,
                      formData.anillo_pata === 'derecha' && styles.segmentButtonTextActive,
                    ]}>Derecha</Text>
                  </TouchableOpacity>
                </View>
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

          {/* Composición Genética */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Dna size={18} color={COLORS.accent} />
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Composición Genética</Text>
              </View>
              <TouchableOpacity
                style={[styles.puroToggle, esPuro && styles.puroToggleActive]}
                onPress={togglePuro}
              >
                <Text style={[styles.puroToggleText, esPuro && styles.puroToggleTextActive]}>
                  Puro
                </Text>
              </TouchableOpacity>
            </View>

            {esPuro ? (
              <View style={styles.puroInfo}>
                <Text style={styles.puroInfoText}>
                  {formData.linea_genetica
                    ? `Ave pura: 100% ${formData.linea_genetica}`
                    : 'Ingresa la Línea Genética arriba para marcar como puro'}
                </Text>
              </View>
            ) : (
              <>
                {/* Auto-calc button */}
                {canAutoCalc && (
                  <TouchableOpacity style={styles.autoCalcBtn} onPress={autoCalcularGenetica}>
                    <Dna size={14} color={COLORS.textLight} />
                    <Text style={styles.autoCalcBtnText}>
                      Calcular desde {padreHasGenetics && madreHasGenetics ? 'Padre + Madre' : padreHasGenetics ? 'Padre' : 'Madre'}
                    </Text>
                  </TouchableOpacity>
                )}

                {composicionGenetica.map((comp, index) => (
                  <View key={index} style={styles.geneticaRow}>
                    <TextInput
                      style={[styles.geneticaLineaInput, { flex: 3 }]}
                      placeholder="Ej: Sweater Dink Fair..."
                      placeholderTextColor={COLORS.placeholder}
                      value={comp.linea}
                      onChangeText={(v) => updateLineaGenetica(index, 'linea', v)}
                    />

                    <TouchableOpacity
                      style={[styles.geneticaFraccionBtn, { flex: 1 }]}
                      onPress={() => setFraccionModalIndex(index)}
                    >
                      <Text style={styles.geneticaFraccionText}>{comp.fraccion}</Text>
                      <Text style={styles.geneticaPctText}>{Math.round(comp.decimal * 100)}%</Text>
                    </TouchableOpacity>

                    {comp.via && (
                      <Text style={styles.geneticaViaText}>
                        {comp.via === 'padre+madre' ? 'P+M' : comp.via === 'padre' ? 'P' : comp.via === 'madre' ? 'M' : ''}
                      </Text>
                    )}

                    <TouchableOpacity
                      style={styles.geneticaRemoveBtn}
                      onPress={() => removeLineaGenetica(index)}
                    >
                      <Trash2 size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addLineaBtn} onPress={addLineaGenetica}>
                  <Plus size={16} color={COLORS.primary} />
                  <Text style={styles.addLineaBtnText}>Agregar línea genética</Text>
                </TouchableOpacity>

                {composicionGenetica.length > 0 && (
                  <View style={styles.sumaBar}>
                    <View style={[styles.sumaBarFill, {
                      width: `${Math.min(sumaFracciones * 100, 100)}%`,
                      backgroundColor: Math.abs(sumaFracciones - 1) < 0.01 ? COLORS.primary : sumaFracciones > 1 ? COLORS.error : COLORS.warning,
                    }]} />
                    <Text style={styles.sumaBarText}>
                      Total: {Math.round(sumaFracciones * 100)}%
                      {Math.abs(sumaFracciones - 1) < 0.01 ? ' ✓' : sumaFracciones > 1 ? ' (excede 100%)' : ''}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Fraction Picker Modal */}
          <Modal
            visible={fraccionModalIndex !== null}
            transparent
            animationType="slide"
            onRequestClose={() => setFraccionModalIndex(null)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setFraccionModalIndex(null)}
            >
              <View style={styles.fraccionModalContainer}>
                <Text style={styles.fraccionModalTitle}>Seleccionar Fracción</Text>
                <Text style={styles.fraccionModalSubtitle}>Toca una fracción para asignarla</Text>
                <View style={styles.fraccionGrid}>
                  {FRACCIONES_OPTIONS.map((f) => {
                    const pct = Math.round(FRACCION_TO_DECIMAL[f] * 100);
                    const isSelected = fraccionModalIndex !== null && composicionGenetica[fraccionModalIndex]?.fraccion === f;
                    return (
                      <TouchableOpacity
                        key={f}
                        style={[styles.fraccionGridItem, isSelected && styles.fraccionGridItemActive]}
                        onPress={() => {
                          if (fraccionModalIndex !== null) {
                            updateLineaGenetica(fraccionModalIndex, 'fraccion', f);
                            setFraccionModalIndex(null);
                          }
                        }}
                      >
                        <Text style={[styles.fraccionGridFrac, isSelected && styles.fraccionGridTextActive]}>{f}</Text>
                        <Text style={[styles.fraccionGridPct, isSelected && styles.fraccionGridTextActive]}>{pct}%</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity style={styles.fraccionModalCancel} onPress={() => setFraccionModalIndex(null)}>
                  <Text style={styles.fraccionModalCancelText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Origen y Procedencia */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Origen y Procedencia</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Tipo de Adquisición</Text>
              <View style={styles.adquisicionContainer}>
                {(Object.keys(TIPO_ADQUISICION_LABELS) as TipoAdquisicion[]).map(tipo => (
                  <TouchableOpacity
                    key={tipo}
                    style={[styles.adquisicionOption, tipoAdquisicion === tipo && styles.adquisicionOptionActive]}
                    onPress={() => setTipoAdquisicion(tipo)}
                  >
                    <Text style={[styles.adquisicionText, tipoAdquisicion === tipo && styles.adquisicionTextActive]}>
                      {TIPO_ADQUISICION_LABELS[tipo]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Criador / Vendedor</Text>
              <TextInput
                style={styles.input}
                placeholder="Nombre del criador"
                placeholderTextColor={COLORS.placeholder}
                value={criadorNombre}
                onChangeText={setCriadorNombre}
              />
            </View>

            {tipoAdquisicion !== 'cria_propia' && (
              <>
                <View style={styles.row}>
                  <View style={[styles.inputGroup, styles.halfInput]}>
                    <Text style={styles.inputLabel}>Fecha de Adquisición</Text>
                    <DatePickerField
                      value={fechaAdquisicion}
                      onChange={setFechaAdquisicion}
                      placeholder="Seleccionar fecha"
                    />
                  </View>
                  {tipoAdquisicion === 'compra' && (
                    <View style={[styles.inputGroup, styles.halfInput]}>
                      <Text style={styles.inputLabel}>Precio de Compra ($)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.placeholder}
                        value={formData.precio_compra}
                        onChangeText={(v) => updateField('precio_compra', v)}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  )}
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notas de Origen</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                placeholder="Detalles de procedencia, línea, etc."
                placeholderTextColor={COLORS.placeholder}
                value={notasOrigen}
                onChangeText={setNotasOrigen}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Ubicación / Zona */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicacion</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Zona / Rancho</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Rancho El Rey"
                placeholderTextColor={COLORS.placeholder}
                value={zona}
                onChangeText={setZona}
              />
            </View>
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Modulo / Corral</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Nave 2"
                  placeholderTextColor={COLORS.placeholder}
                  value={subZona}
                  onChangeText={setSubZona}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.inputLabel}>Lote</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 2024-A"
                  placeholderTextColor={COLORS.placeholder}
                  value={loteUbicacion}
                  onChangeText={setLoteUbicacion}
                />
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Genealogía y Notas</Text>

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
  // Composición genética
  puroToggle: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    backgroundColor: 'transparent',
  },
  puroToggleActive: {
    backgroundColor: COLORS.accent,
  },
  puroToggleText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: COLORS.accent,
  },
  puroToggleTextActive: {
    color: COLORS.textLight,
  },
  puroInfo: {
    backgroundColor: COLORS.accent + '15',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  puroInfoText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '500' as const,
  },
  geneticaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  geneticaLineaInput: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.text,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  geneticaFraccionBtn: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: 6,
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  geneticaFraccionText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: COLORS.primary,
  },
  geneticaPctText: {
    fontSize: 10,
    color: COLORS.primaryDark,
  },
  geneticaRemoveBtn: {
    width: 32,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLineaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    borderStyle: 'dashed',
    justifyContent: 'center',
    marginTop: 4,
  },
  addLineaBtnText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500' as const,
  },
  sumaBar: {
    marginTop: 10,
    height: 24,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  sumaBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
    opacity: 0.25,
  },
  sumaBarText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.text,
    textAlign: 'center',
  },
  autoCalcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    alignSelf: 'flex-start',
  },
  autoCalcBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.textLight,
  },
  geneticaViaText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: COLORS.textSecondary,
    width: 24,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  fraccionModalContainer: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  fraccionModalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  fraccionModalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  fraccionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  fraccionGridItem: {
    width: 70,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  fraccionGridItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  fraccionGridFrac: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  fraccionGridPct: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  fraccionGridTextActive: {
    color: COLORS.textLight,
  },
  fraccionModalCancel: {
    marginTop: SPACING.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  fraccionModalCancelText: {
    fontSize: 16,
    color: COLORS.error,
    fontWeight: '600' as const,
  },
  // Origen
  adquisicionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  adquisicionOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  adquisicionOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  adquisicionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
  adquisicionTextActive: {
    color: COLORS.textLight,
  },
  // Anillos
  anilloColorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  anilloColorBtn: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 64,
  },
  anilloColorBtnActive: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.primary + '10',
  },
  anilloColorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 4,
  },
  anilloColorLabel: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: COLORS.textSecondary,
  },
  anilloColorLabelActive: {
    color: COLORS.primary,
    fontWeight: '700' as const,
  },
});
