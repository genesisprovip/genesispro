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
  Package,
  ClipboardList,
  UtensilsCrossed,
  Calendar,
  DollarSign,
  Scale,
  FileText,
  User,
  Clock,
} from 'lucide-react-native';
import { useAves } from '@/context/AvesContext';
import { useAlimentacion } from '@/context/AlimentacionContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

type FormType = 'inventario' | 'registro' | 'dieta';
type TipoAlimento = 'concentrado' | 'suplemento' | 'vitamina' | 'mineral' | 'otro';
type UnidadAlimento = 'kg' | 'lb' | 'g' | 'litro' | 'unidad';
type TipoComida = 'desayuno' | 'almuerzo' | 'cena' | 'suplemento' | 'otro';

const TIPOS_ALIMENTO: { key: TipoAlimento; label: string; color: string }[] = [
  { key: 'concentrado', label: 'Concentrado', color: '#4CAF50' },
  { key: 'suplemento', label: 'Suplemento', color: '#2196F3' },
  { key: 'vitamina', label: 'Vitamina', color: '#FF9800' },
  { key: 'mineral', label: 'Mineral', color: '#9C27B0' },
  { key: 'otro', label: 'Otro', color: '#607D8B' },
];

const UNIDADES: { key: UnidadAlimento; label: string }[] = [
  { key: 'kg', label: 'Kg' },
  { key: 'lb', label: 'Lb' },
  { key: 'g', label: 'g' },
  { key: 'litro', label: 'Litro' },
  { key: 'unidad', label: 'Unidad' },
];

const TIPOS_COMIDA: { key: TipoComida; label: string; color: string }[] = [
  { key: 'desayuno', label: 'Desayuno', color: '#FF9800' },
  { key: 'almuerzo', label: 'Almuerzo', color: '#4CAF50' },
  { key: 'cena', label: 'Cena', color: '#2196F3' },
  { key: 'suplemento', label: 'Suplemento', color: '#9C27B0' },
  { key: 'otro', label: 'Otro', color: '#607D8B' },
];

export default function NuevoAlimentacionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { aves } = useAves();
  const { alimentos, addAlimento, addRegistro, addDieta } = useAlimentacion();

  const [formType, setFormType] = useState<FormType>('inventario');
  const [isLoading, setIsLoading] = useState(false);

  // Inventario fields
  const [nombre, setNombre] = useState('');
  const [tipoAlimento, setTipoAlimento] = useState<TipoAlimento>('concentrado');
  const [cantidad, setCantidad] = useState('');
  const [unidad, setUnidad] = useState<UnidadAlimento>('kg');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split('T')[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');

  // Registro fields
  const [selectedAveId, setSelectedAveId] = useState('');
  const [selectedAlimentoId, setSelectedAlimentoId] = useState('');
  const [cantidadRegistro, setCantidadRegistro] = useState('');
  const [unidadRegistro, setUnidadRegistro] = useState('kg');
  const [tipoComida, setTipoComida] = useState<TipoComida>('almuerzo');
  const [fechaRegistro, setFechaRegistro] = useState(new Date().toISOString().split('T')[0]);
  const [horaRegistro, setHoraRegistro] = useState('');
  const [notasRegistro, setNotasRegistro] = useState('');

  // Dieta fields
  const [dietaAveId, setDietaAveId] = useState('');
  const [nombreDieta, setNombreDieta] = useState('');
  const [descripcionDieta, setDescripcionDieta] = useState('');
  const [dietaActiva, setDietaActiva] = useState(true);
  const [alimentosDieta, setAlimentosDieta] = useState<{
    alimento_nombre: string;
    cantidad: number;
    unidad: string;
    frecuencia: string;
  }[]>([]);
  const [nuevoAlimentoDieta, setNuevoAlimentoDieta] = useState('');
  const [nuevaCantidadDieta, setNuevaCantidadDieta] = useState('');
  const [nuevaUnidadDieta, setNuevaUnidadDieta] = useState('kg');
  const [nuevaFrecuenciaDieta, setNuevaFrecuenciaDieta] = useState('Diario');

  const handleSubmitInventario = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    if (!cantidad || parseFloat(cantidad) <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a 0');
      return;
    }

    setIsLoading(true);
    try {
      const result = await addAlimento({
        nombre: nombre.trim(),
        tipo: tipoAlimento,
        cantidad: parseFloat(cantidad),
        unidad,
        precio_unitario: precioUnitario ? parseFloat(precioUnitario) : undefined,
        fecha_compra: fechaCompra || undefined,
        fecha_vencimiento: fechaVencimiento || undefined,
        proveedor: proveedor.trim() || undefined,
        notas: notas.trim() || undefined,
      });

      if (result.success) {
        Alert.alert('Éxito', 'Alimento agregado al inventario', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', result.error || 'No se pudo guardar');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitRegistro = async () => {
    if (!cantidadRegistro || parseFloat(cantidadRegistro) <= 0) {
      Alert.alert('Error', 'La cantidad debe ser mayor a 0');
      return;
    }

    const alimentoSeleccionado = alimentos.find(a => a.id === selectedAlimentoId);
    const alimentoNombre = alimentoSeleccionado?.nombre || nombre.trim() || 'Alimento';

    setIsLoading(true);
    try {
      const result = await addRegistro({
        ave_id: selectedAveId || undefined,
        alimento_id: selectedAlimentoId || undefined,
        alimento_nombre: alimentoNombre,
        cantidad: parseFloat(cantidadRegistro),
        unidad: unidadRegistro,
        fecha: fechaRegistro,
        hora: horaRegistro || undefined,
        tipo_comida: tipoComida,
        notas: notasRegistro.trim() || undefined,
      });

      if (result.success) {
        Alert.alert('Éxito', 'Registro de alimentación guardado', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', result.error || 'No se pudo guardar');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addAlimentoToDieta = () => {
    if (!nuevoAlimentoDieta.trim() || !nuevaCantidadDieta) {
      Alert.alert('Error', 'Completa el alimento y cantidad');
      return;
    }
    setAlimentosDieta([
      ...alimentosDieta,
      {
        alimento_nombre: nuevoAlimentoDieta.trim(),
        cantidad: parseFloat(nuevaCantidadDieta),
        unidad: nuevaUnidadDieta,
        frecuencia: nuevaFrecuenciaDieta,
      }
    ]);
    setNuevoAlimentoDieta('');
    setNuevaCantidadDieta('');
  };

  const handleSubmitDieta = async () => {
    if (!dietaAveId) {
      Alert.alert('Error', 'Selecciona un ave');
      return;
    }
    if (!nombreDieta.trim()) {
      Alert.alert('Error', 'El nombre de la dieta es requerido');
      return;
    }
    if (alimentosDieta.length === 0) {
      Alert.alert('Error', 'Agrega al menos un alimento a la dieta');
      return;
    }

    setIsLoading(true);
    try {
      const result = await addDieta({
        ave_id: dietaAveId,
        nombre: nombreDieta.trim(),
        descripcion: descripcionDieta.trim() || undefined,
        alimentos: alimentosDieta,
        activa: dietaActiva,
      });

      if (result.success) {
        Alert.alert('Éxito', 'Dieta creada correctamente', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', result.error || 'No se pudo guardar');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    switch (formType) {
      case 'inventario':
        handleSubmitInventario();
        break;
      case 'registro':
        handleSubmitRegistro();
        break;
      case 'dieta':
        handleSubmitDieta();
        break;
    }
  };

  const renderInventarioForm = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipo de Alimento</Text>
        <View style={styles.tiposGrid}>
          {TIPOS_ALIMENTO.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tipoCard,
                tipoAlimento === t.key && { backgroundColor: t.color + '20', borderColor: t.color }
              ]}
              onPress={() => setTipoAlimento(t.key)}
            >
              <Text style={[
                styles.tipoLabel,
                tipoAlimento === t.key && { color: t.color }
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información del Producto</Text>

        <View style={styles.inputGroup}>
          <View style={styles.inputIcon}>
            <Package size={20} color={COLORS.textSecondary} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Nombre del producto"
            placeholderTextColor={COLORS.textSecondary}
            value={nombre}
            onChangeText={setNombre}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <View style={styles.inputIcon}>
              <Scale size={20} color={COLORS.textSecondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              placeholderTextColor={COLORS.textSecondary}
              value={cantidad}
              onChangeText={setCantidad}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.unidadesRow}>
                {UNIDADES.map((u) => (
                  <TouchableOpacity
                    key={u.key}
                    style={[
                      styles.unidadChip,
                      unidad === u.key && styles.unidadChipSelected
                    ]}
                    onPress={() => setUnidad(u.key)}
                  >
                    <Text style={[
                      styles.unidadChipText,
                      unidad === u.key && styles.unidadChipTextSelected
                    ]}>
                      {u.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <View style={styles.inputIcon}>
              <DollarSign size={20} color={COLORS.textSecondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Precio unitario"
              placeholderTextColor={COLORS.textSecondary}
              value={precioUnitario}
              onChangeText={setPrecioUnitario}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <View style={styles.inputIcon}>
              <User size={20} color={COLORS.textSecondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Proveedor"
              placeholderTextColor={COLORS.textSecondary}
              value={proveedor}
              onChangeText={setProveedor}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <View style={styles.inputIcon}>
              <Calendar size={20} color={COLORS.success} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Fecha compra"
              placeholderTextColor={COLORS.textSecondary}
              value={fechaCompra}
              onChangeText={setFechaCompra}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <View style={styles.inputIcon}>
              <Calendar size={20} color={COLORS.error} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Vencimiento"
              placeholderTextColor={COLORS.textSecondary}
              value={fechaVencimiento}
              onChangeText={setFechaVencimiento}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Observaciones adicionales..."
          placeholderTextColor={COLORS.textSecondary}
          value={notas}
          onChangeText={setNotas}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </>
  );

  const renderRegistroForm = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seleccionar Ave (opcional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.avesRow}>
            <TouchableOpacity
              style={[
                styles.aveChip,
                !selectedAveId && styles.aveChipSelected
              ]}
              onPress={() => setSelectedAveId('')}
            >
              <Text style={[
                styles.aveChipText,
                !selectedAveId && styles.aveChipTextSelected
              ]}>
                Todas
              </Text>
            </TouchableOpacity>
            {aves.filter(a => a.estado === 'activo').map(ave => (
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
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tipo de Comida</Text>
        <View style={styles.tiposGrid}>
          {TIPOS_COMIDA.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tipoCard,
                tipoComida === t.key && { backgroundColor: t.color + '20', borderColor: t.color }
              ]}
              onPress={() => setTipoComida(t.key)}
            >
              <Text style={[
                styles.tipoLabel,
                tipoComida === t.key && { color: t.color }
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alimento</Text>
        {alimentos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.sm }}>
            <View style={styles.avesRow}>
              {alimentos.map(a => (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    styles.aveChip,
                    selectedAlimentoId === a.id && styles.aveChipSelected
                  ]}
                  onPress={() => {
                    setSelectedAlimentoId(a.id);
                    setUnidadRegistro(a.unidad);
                  }}
                >
                  <Text style={[
                    styles.aveChipText,
                    selectedAlimentoId === a.id && styles.aveChipTextSelected
                  ]}>
                    {a.nombre}
                  </Text>
                  <Text style={[
                    styles.aveChipSubtext,
                    selectedAlimentoId === a.id && styles.aveChipTextSelected
                  ]}>
                    {a.cantidad} {a.unidad}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <View style={styles.inputIcon}>
              <Scale size={20} color={COLORS.textSecondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Cantidad"
              placeholderTextColor={COLORS.textSecondary}
              value={cantidadRegistro}
              onChangeText={setCantidadRegistro}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <TextInput
              style={[styles.input, { paddingLeft: SPACING.md }]}
              placeholder="Unidad"
              placeholderTextColor={COLORS.textSecondary}
              value={unidadRegistro}
              onChangeText={setUnidadRegistro}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <View style={styles.inputIcon}>
              <Calendar size={20} color={COLORS.textSecondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Fecha"
              placeholderTextColor={COLORS.textSecondary}
              value={fechaRegistro}
              onChangeText={setFechaRegistro}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <View style={styles.inputIcon}>
              <Clock size={20} color={COLORS.textSecondary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Hora (HH:MM)"
              placeholderTextColor={COLORS.textSecondary}
              value={horaRegistro}
              onChangeText={setHoraRegistro}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notas (opcional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Observaciones..."
          placeholderTextColor={COLORS.textSecondary}
          value={notasRegistro}
          onChangeText={setNotasRegistro}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>
    </>
  );

  const renderDietaForm = () => (
    <>
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
                    dietaAveId === ave.id && styles.aveChipSelected
                  ]}
                  onPress={() => setDietaAveId(ave.id)}
                >
                  <Text style={[
                    styles.aveChipText,
                    dietaAveId === ave.id && styles.aveChipTextSelected
                  ]}>
                    {ave.codigo_identidad}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información de la Dieta</Text>

        <View style={styles.inputGroup}>
          <View style={styles.inputIcon}>
            <UtensilsCrossed size={20} color={COLORS.textSecondary} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Nombre de la dieta"
            placeholderTextColor={COLORS.textSecondary}
            value={nombreDieta}
            onChangeText={setNombreDieta}
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
            value={descripcionDieta}
            onChangeText={setDescripcionDieta}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            dietaActiva && styles.toggleButtonActive
          ]}
          onPress={() => setDietaActiva(!dietaActiva)}
        >
          <Text style={[
            styles.toggleButtonText,
            dietaActiva && styles.toggleButtonTextActive
          ]}>
            {dietaActiva ? '✓ Dieta Activa' : 'Dieta Inactiva'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alimentos de la Dieta</Text>

        {alimentosDieta.map((item, index) => (
          <View key={index} style={styles.dietaItem}>
            <Text style={styles.dietaItemText}>
              {item.alimento_nombre}: {item.cantidad} {item.unidad} - {item.frecuencia}
            </Text>
            <TouchableOpacity
              onPress={() => setAlimentosDieta(alimentosDieta.filter((_, i) => i !== index))}
            >
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        <View style={styles.addAlimentoBox}>
          <TextInput
            style={[styles.input, styles.inputSmall]}
            placeholder="Alimento"
            placeholderTextColor={COLORS.textSecondary}
            value={nuevoAlimentoDieta}
            onChangeText={setNuevoAlimentoDieta}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.inputSmall, { flex: 1 }]}
              placeholder="Cant."
              placeholderTextColor={COLORS.textSecondary}
              value={nuevaCantidadDieta}
              onChangeText={setNuevaCantidadDieta}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, styles.inputSmall, { flex: 1 }]}
              placeholder="Unidad"
              placeholderTextColor={COLORS.textSecondary}
              value={nuevaUnidadDieta}
              onChangeText={setNuevaUnidadDieta}
            />
            <TextInput
              style={[styles.input, styles.inputSmall, { flex: 1.5 }]}
              placeholder="Frecuencia"
              placeholderTextColor={COLORS.textSecondary}
              value={nuevaFrecuenciaDieta}
              onChangeText={setNuevaFrecuenciaDieta}
            />
          </View>
          <TouchableOpacity style={styles.addAlimentoButton} onPress={addAlimentoToDieta}>
            <Text style={styles.addAlimentoButtonText}>+ Agregar Alimento</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

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
        >
          {/* Form Type Selector */}
          <View style={styles.formTypeSelector}>
            <TouchableOpacity
              style={[styles.formTypeTab, formType === 'inventario' && styles.formTypeTabActive]}
              onPress={() => setFormType('inventario')}
            >
              <Package size={18} color={formType === 'inventario' ? COLORS.textLight : COLORS.warning} />
              <Text style={[styles.formTypeText, formType === 'inventario' && styles.formTypeTextActive]}>
                Inventario
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formTypeTab, formType === 'registro' && styles.formTypeTabActive]}
              onPress={() => setFormType('registro')}
            >
              <ClipboardList size={18} color={formType === 'registro' ? COLORS.textLight : COLORS.warning} />
              <Text style={[styles.formTypeText, formType === 'registro' && styles.formTypeTextActive]}>
                Registro
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formTypeTab, formType === 'dieta' && styles.formTypeTabActive]}
              onPress={() => setFormType('dieta')}
            >
              <UtensilsCrossed size={18} color={formType === 'dieta' ? COLORS.textLight : COLORS.warning} />
              <Text style={[styles.formTypeText, formType === 'dieta' && styles.formTypeTextActive]}>
                Dieta
              </Text>
            </TouchableOpacity>
          </View>

          {formType === 'inventario' && renderInventarioForm()}
          {formType === 'registro' && renderRegistroForm()}
          {formType === 'dieta' && renderDietaForm()}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.submitGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.textLight} />
              ) : (
                <Text style={styles.submitText}>
                  {formType === 'inventario' ? 'Agregar al Inventario' :
                   formType === 'registro' ? 'Guardar Registro' : 'Crear Dieta'}
                </Text>
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
  formTypeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xs,
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  formTypeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.xs,
  },
  formTypeTabActive: {
    backgroundColor: COLORS.warning,
  },
  formTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },
  formTypeTextActive: {
    color: COLORS.textLight,
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
  tiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tipoCard: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  tipoLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textSecondary,
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
  inputSmall: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xs,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfInput: {
    flex: 1,
  },
  unidadesRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    padding: SPACING.xs,
  },
  unidadChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.background,
  },
  unidadChipSelected: {
    backgroundColor: COLORS.warning,
  },
  unidadChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  unidadChipTextSelected: {
    color: COLORS.textLight,
  },
  textArea: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    minHeight: 80,
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
    minWidth: 80,
    alignItems: 'center',
  },
  aveChipSelected: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warning + '10',
  },
  aveChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  aveChipSubtext: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  aveChipTextSelected: {
    color: COLORS.warning,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  toggleButton: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  toggleButtonActive: {
    borderColor: COLORS.success,
    backgroundColor: COLORS.success + '15',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  toggleButtonTextActive: {
    color: COLORS.success,
  },
  dietaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.xs,
  },
  dietaItemText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
  },
  removeText: {
    fontSize: 18,
    color: COLORS.error,
    paddingHorizontal: SPACING.sm,
  },
  addAlimentoBox: {
    backgroundColor: COLORS.card,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  addAlimentoButton: {
    backgroundColor: COLORS.warning + '20',
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  addAlimentoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.warning,
  },
  submitButton: {
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    marginTop: SPACING.lg,
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
