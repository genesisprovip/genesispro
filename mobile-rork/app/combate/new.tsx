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
import * as Location from 'expo-location';
import { ChevronLeft, Trophy, Calendar, MapPin, Scale, Clock, Search, X } from 'lucide-react-native';
import { useAves } from '@/context/AvesContext';
import { useCombates } from '@/context/CombatesContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import DatePickerField from '@/components/common/DatePickerField';

type Resultado = 'victoria' | 'derrota' | 'empate' | 'pendiente';

export default function NuevoCombateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { aves } = useAves();
  const { addCombate } = useCombates();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedAveId, setSelectedAveId] = useState<string>('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [lugar, setLugar] = useState('');
  const [oponenteInfo, setOponenteInfo] = useState('');
  const [pesoAve, setPesoAve] = useState('');
  const [pesoOponente, setPesoOponente] = useState('');
  const [resultado, setResultado] = useState<Resultado>('pendiente');
  const [duracionMin, setDuracionMin] = useState('');
  const [duracionSeg, setDuracionSeg] = useState('');
  const [tipoVictoria, setTipoVictoria] = useState('');
  const [notas, setNotas] = useState('');
  const [aveMurio, setAveMurio] = useState(false);
  const [motivoBaja, setMotivoBaja] = useState('Murio en combate');
  const [loadingGPS, setLoadingGPS] = useState(false);

  const [busquedaAve, setBusquedaAve] = useState('');

  const machos = aves.filter(ave => ave.sexo === 'M' && ave.estado === 'activo');

  const machosFiltrados = busquedaAve.trim()
    ? machos.filter(ave => {
        const q = busquedaAve.toLowerCase();
        return (
          ave.codigo_identidad?.toLowerCase().includes(q) ||
          ave.linea_genetica?.toLowerCase().includes(q) ||
          ave.anillo_metalico?.toLowerCase().includes(q) ||
          ave.anillo_codigo?.toLowerCase().includes(q) ||
          ave.anillo_color?.toLowerCase().includes(q) ||
          ave.color?.toLowerCase().includes(q)
        );
      })
    : machos;

  const getGPSLocation = async () => {
    setLoadingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitas permitir acceso a la ubicación');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = location.coords;

      // Reverse geocode using Google Maps API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyCN3YaVIo381yI4PVlHLmCeC7At061sUNc&language=es`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const components = data.results[0].address_components;
        const locality = components.find((c: any) => c.types.includes('locality'))?.long_name;
        const sublocality = components.find((c: any) => c.types.includes('sublocality'))?.long_name;
        const state = components.find((c: any) => c.types.includes('administrative_area_level_1'))?.short_name;

        let address = '';
        if (sublocality && locality) {
          address = `${sublocality}, ${locality}, ${state}`;
        } else if (locality) {
          address = `${locality}, ${state}`;
        } else {
          address = data.results[0].formatted_address;
        }

        setLugar(address);
      } else {
        setLugar(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo obtener la ubicación. Ingresa manualmente.');
    } finally {
      setLoadingGPS(false);
    }
  };

  const resultados: { key: Resultado; label: string; color: string }[] = [
    { key: 'victoria', label: 'Victoria', color: COLORS.success },
    { key: 'derrota', label: 'Derrota', color: COLORS.error },
    { key: 'empate', label: 'Empate', color: COLORS.warning },
    { key: 'pendiente', label: 'Pendiente', color: COLORS.textSecondary },
  ];

  const handleSubmit = async () => {
    if (!selectedAveId) {
      Alert.alert('Error', 'Selecciona un ave para el combate');
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

    if (!pesoAve) {
      Alert.alert('Error', 'El peso del ave es requerido');
      return;
    }

    setIsLoading(true);

    try {
      const combateData = {
        macho_id: selectedAveId,
        fecha,
        ubicacion: lugar.trim(),
        oponente_codigo: oponenteInfo.trim() || undefined,
        peso_combate: parseFloat(pesoAve),
        peso_oponente: pesoOponente ? parseFloat(pesoOponente) : undefined,
        resultado,
        duracion_minutos: (duracionMin || duracionSeg) ? (parseInt(duracionMin || '0') + (parseInt(duracionSeg || '0') / 60)) : undefined,
        tipo_victoria: tipoVictoria.trim() || undefined,
        notas: notas.trim() || undefined,
        ave_murio: aveMurio,
        motivo_baja: aveMurio ? motivoBaja.trim() : undefined,
      };

      const result = await addCombate(combateData as any);

      if (result.success) {
        Alert.alert('Exito', aveMurio
          ? 'Combate registrado. El ave fue marcada como fallecida.'
          : 'Combate registrado correctamente', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Error', result.error || 'No se pudo registrar el combate');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Ocurrió un error');
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
          <Text style={styles.headerTitle}>Nuevo Combate</Text>
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
            <Text style={styles.sectionTitle}>Seleccionar Gallo</Text>

            {/* Selected ave display */}
            {selectedAveId ? (
              <View style={styles.selectedAveCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedAveName}>
                    {machos.find(a => a.id === selectedAveId)?.codigo_identidad}
                  </Text>
                  <Text style={styles.selectedAveSub}>
                    {[
                      machos.find(a => a.id === selectedAveId)?.linea_genetica,
                      machos.find(a => a.id === selectedAveId)?.anillo_metalico && `Anillo: ${machos.find(a => a.id === selectedAveId)?.anillo_metalico}`,
                      machos.find(a => a.id === selectedAveId)?.peso_actual && `${machos.find(a => a.id === selectedAveId)?.peso_actual}g`,
                    ].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { setSelectedAveId(''); setPesoAve(''); }}>
                  <X size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Search input */}
                <View style={styles.searchAveContainer}>
                  <Search size={16} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.searchAveInput}
                    placeholder="Buscar por nombre, placa, anillo, color..."
                    placeholderTextColor={COLORS.placeholder}
                    value={busquedaAve}
                    onChangeText={setBusquedaAve}
                    autoCapitalize="none"
                  />
                  {busquedaAve.length > 0 && (
                    <TouchableOpacity onPress={() => setBusquedaAve('')}>
                      <X size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Filtered results */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.avesRow}>
                    {machosFiltrados.length === 0 ? (
                      <Text style={styles.emptyText}>
                        {machos.length === 0 ? 'No hay gallos disponibles' : 'Sin resultados'}
                      </Text>
                    ) : (
                      machosFiltrados.map(ave => (
                        <TouchableOpacity
                          key={ave.id}
                          style={styles.aveChip}
                          onPress={() => {
                            setSelectedAveId(ave.id);
                            setBusquedaAve('');
                            if (ave.peso_actual) {
                              setPesoAve(ave.peso_actual.toString());
                            }
                          }}
                        >
                          <Text style={styles.aveChipText}>
                            {ave.codigo_identidad}
                          </Text>
                          <Text style={styles.aveChipSubtext}>
                            {[ave.linea_genetica, ave.anillo_metalico].filter(Boolean).join(' · ') || ave.color || ''}
                          </Text>
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                </ScrollView>
              </>
            )}
          </View>

          {/* Información del Combate */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Combate</Text>

            <DatePickerField
              value={fecha}
              onChange={setFecha}
              placeholder="Fecha del combate"
            />

            <View style={styles.locationRow}>
              <View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
                <View style={styles.inputIcon}>
                  <MapPin size={20} color={COLORS.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Lugar del combate"
                  placeholderTextColor={COLORS.textSecondary}
                  value={lugar}
                  onChangeText={setLugar}
                />
              </View>
              <TouchableOpacity
                style={styles.gpsButton}
                onPress={getGPSLocation}
                disabled={loadingGPS}
              >
                {loadingGPS ? (
                  <ActivityIndicator size="small" color={COLORS.primary} />
                ) : (
                  <MapPin size={22} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.inputIcon}>
                <Trophy size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Info del oponente (opcional)"
                placeholderTextColor={COLORS.textSecondary}
                value={oponenteInfo}
                onChangeText={setOponenteInfo}
              />
            </View>
          </View>

          {/* Pesos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pesos (kg)</Text>
            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <View style={styles.inputIcon}>
                  <Scale size={20} color={COLORS.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Mi gallo"
                  placeholderTextColor={COLORS.textSecondary}
                  value={pesoAve}
                  onChangeText={setPesoAve}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <View style={styles.inputIcon}>
                  <Scale size={20} color={COLORS.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Oponente"
                  placeholderTextColor={COLORS.textSecondary}
                  value={pesoOponente}
                  onChangeText={setPesoOponente}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>

          {/* Resultado */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resultado</Text>
            <View style={styles.resultadosRow}>
              {resultados.map(r => (
                <TouchableOpacity
                  key={r.key}
                  style={[
                    styles.resultadoChip,
                    resultado === r.key && { backgroundColor: r.color + '20', borderColor: r.color }
                  ]}
                  onPress={() => setResultado(r.key)}
                >
                  <Text style={[
                    styles.resultadoChipText,
                    resultado === r.key && { color: r.color }
                  ]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {resultado === 'victoria' && (
              <TextInput
                style={[styles.input, styles.fullInput]}
                placeholder="Tipo de victoria (KO, Decisión, etc.)"
                placeholderTextColor={COLORS.textSecondary}
                value={tipoVictoria}
                onChangeText={setTipoVictoria}
              />
            )}

            <View style={styles.durationRow}>
              <View style={styles.inputIcon}>
                <Clock size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.durationInput}
                placeholder="00"
                placeholderTextColor={COLORS.placeholder}
                value={duracionMin}
                onChangeText={(t) => setDuracionMin(t.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
              />
              <Text style={styles.durationSeparator}>:</Text>
              <TextInput
                style={styles.durationInput}
                placeholder="00"
                placeholderTextColor={COLORS.placeholder}
                value={duracionSeg}
                onChangeText={(t) => {
                  const clean = t.replace(/[^0-9]/g, '').slice(0, 2);
                  if (parseInt(clean) > 59) return;
                  setDuracionSeg(clean);
                }}
                keyboardType="number-pad"
                maxLength={2}
                textAlign="center"
              />
              <Text style={styles.durationLabel}>min : seg</Text>
            </View>
          </View>

          {/* Muerte del Ave */}
          {resultado === 'derrota' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estado del Ave</Text>
              <TouchableOpacity
                style={[
                  styles.deathToggle,
                  aveMurio && styles.deathToggleActive,
                ]}
                onPress={() => setAveMurio(!aveMurio)}
              >
                <Text style={[
                  styles.deathToggleText,
                  aveMurio && styles.deathToggleTextActive,
                ]}>
                  {aveMurio ? 'El ave murio en este combate' : 'El ave sobrevivio'}
                </Text>
              </TouchableOpacity>
              {aveMurio && (
                <TextInput
                  style={[styles.input, styles.fullInput, { marginTop: SPACING.sm }]}
                  placeholder="Motivo de baja (ej: Murio en combate)"
                  placeholderTextColor={COLORS.textSecondary}
                  value={motivoBaja}
                  onChangeText={setMotivoBaja}
                />
              )}
            </View>
          )}

          {/* Notas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notas (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Observaciones del combate..."
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
              colors={['#F59E0B', '#D97706']}
              style={styles.submitGradient}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.textLight} />
              ) : (
                <Text style={styles.submitText}>Registrar Combate</Text>
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
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  durationInput: {
    width: 50,
    height: 48,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  durationSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  durationLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  searchAveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  searchAveInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: SPACING.sm,
  },
  selectedAveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    padding: SPACING.md,
  },
  selectedAveName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  selectedAveSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
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
    color: COLORS.primary,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontStyle: 'italic',
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
  fullInput: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfInput: {
    flex: 1,
  },
  resultadosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  resultadoChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  resultadoChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
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
  deathToggle: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  deathToggleActive: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error + '15',
  },
  deathToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  deathToggleTextActive: {
    color: COLORS.error,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  gpsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
});
