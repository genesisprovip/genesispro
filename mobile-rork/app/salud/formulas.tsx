import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Edit3,
  Beaker,
  X,
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';
import api from '@/services/api';

interface Ingrediente {
  nombre: string;
  cantidad: number | string;
  unidad: string;
}

interface Formula {
  id: string;
  nombre: string;
  descripcion?: string;
  categoria: string;
  ingredientes: Ingrediente[];
}

const CATEGORIAS = ['general', 'vitaminas', 'minerales', 'antibiotico', 'desparasitante', 'otro'];
const UNIDADES = ['ml', 'mg', 'gr', 'gotas', 'cc', 'unidades'];

export default function FormulasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState('general');
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([
    { nombre: '', cantidad: '', unidad: 'ml' },
  ]);
  const [saving, setSaving] = useState(false);

  const loadFormulas = useCallback(async () => {
    try {
      const res = await api.getFormulas();
      if (res.success) setFormulas(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFormulas(); }, [loadFormulas]);

  const resetForm = () => {
    setNombre('');
    setDescripcion('');
    setCategoria('general');
    setIngredientes([{ nombre: '', cantidad: '', unidad: 'ml' }]);
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEdit = (f: Formula) => {
    setEditingId(f.id);
    setNombre(f.nombre);
    setDescripcion(f.descripcion || '');
    setCategoria(f.categoria);
    setIngredientes(f.ingredientes.length > 0
      ? f.ingredientes.map(i => ({ ...i, cantidad: String(i.cantidad) }))
      : [{ nombre: '', cantidad: '', unidad: 'ml' }]
    );
    setModalVisible(true);
  };

  const addIngrediente = () => {
    setIngredientes([...ingredientes, { nombre: '', cantidad: '', unidad: 'ml' }]);
  };

  const removeIngrediente = (index: number) => {
    if (ingredientes.length <= 1) return;
    setIngredientes(ingredientes.filter((_, i) => i !== index));
  };

  const updateIngrediente = (index: number, field: keyof Ingrediente, value: string) => {
    setIngredientes(ingredientes.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    const validIngredientes = ingredientes.filter(i => i.nombre.trim());
    if (validIngredientes.length === 0) {
      Alert.alert('Error', 'Agrega al menos un ingrediente');
      return;
    }

    setSaving(true);
    try {
      const data = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        categoria,
        ingredientes: validIngredientes.map(i => ({
          nombre: i.nombre.trim(),
          cantidad: parseFloat(String(i.cantidad)) || 0,
          unidad: i.unidad,
        })),
      };

      if (editingId) {
        await api.updateFormula(editingId, data);
      } else {
        await api.createFormula(data);
      }

      setModalVisible(false);
      resetForm();
      loadFormulas();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, nombre: string) => {
    Alert.alert('Eliminar Formula', `Eliminar "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteFormula(id);
            loadFormulas();
          } catch {
            Alert.alert('Error', 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  const renderFormula = ({ item }: { item: Formula }) => (
    <View style={styles.formulaCard}>
      <View style={styles.formulaHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.formulaName}>{item.nombre}</Text>
          {item.descripcion ? (
            <Text style={styles.formulaDesc}>{item.descripcion}</Text>
          ) : null}
          <View style={styles.categoriaBadge}>
            <Text style={styles.categoriaText}>{item.categoria}</Text>
          </View>
        </View>
        <View style={styles.formulaActions}>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
            <Edit3 size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id, item.nombre)} style={styles.actionBtn}>
            <Trash2 size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
      {item.ingredientes && item.ingredientes.length > 0 && (
        <View style={styles.ingredientesList}>
          {item.ingredientes.map((ing, i) => (
            <View key={i} style={styles.ingredienteRow}>
              <Text style={styles.ingName}>{ing.nombre}</Text>
              <Text style={styles.ingDosis}>{ing.cantidad} {ing.unidad}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
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
          <Text style={styles.headerTitle}>Formulas / Dosis</Text>
          <TouchableOpacity onPress={openNew} style={styles.backButton}>
            <Plus size={28} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : formulas.length === 0 ? (
        <View style={styles.center}>
          <Beaker size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No tienes formulas registradas</Text>
          <Text style={styles.emptySubtext}>Crea dosis personalizadas con tus propios ingredientes</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={openNew}>
            <Text style={styles.emptyBtnText}>+ Crear Formula</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={formulas}
          renderItem={renderFormula}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + SPACING.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingId ? 'Editar Formula' : 'Nueva Formula'}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <X size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
              <TextInput
                style={styles.modalInput}
                placeholder="Nombre de la formula"
                placeholderTextColor={COLORS.textSecondary}
                value={nombre}
                onChangeText={setNombre}
              />

              <TextInput
                style={styles.modalInput}
                placeholder="Descripcion (opcional)"
                placeholderTextColor={COLORS.textSecondary}
                value={descripcion}
                onChangeText={setDescripcion}
              />

              <Text style={styles.label}>Categoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.md }}>
                {CATEGORIAS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, categoria === c && styles.catChipActive]}
                    onPress={() => setCategoria(c)}
                  >
                    <Text style={[styles.catChipText, categoria === c && styles.catChipTextActive]}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Ingredientes</Text>
              {ingredientes.map((ing, index) => (
                <View key={index} style={styles.ingRow}>
                  <TextInput
                    style={[styles.modalInput, { flex: 2, marginBottom: 0 }]}
                    placeholder="Ingrediente"
                    placeholderTextColor={COLORS.textSecondary}
                    value={ing.nombre}
                    onChangeText={v => updateIngrediente(index, 'nombre', v)}
                  />
                  <TextInput
                    style={[styles.modalInput, { flex: 1, marginBottom: 0, marginHorizontal: SPACING.xs }]}
                    placeholder="Cant."
                    placeholderTextColor={COLORS.textSecondary}
                    value={String(ing.cantidad)}
                    onChangeText={v => updateIngrediente(index, 'cantidad', v)}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity
                    style={styles.unidadBtn}
                    onPress={() => {
                      const currentIdx = UNIDADES.indexOf(ing.unidad);
                      const next = UNIDADES[(currentIdx + 1) % UNIDADES.length];
                      updateIngrediente(index, 'unidad', next);
                    }}
                  >
                    <Text style={styles.unidadBtnText}>{ing.unidad}</Text>
                  </TouchableOpacity>
                  {ingredientes.length > 1 && (
                    <TouchableOpacity onPress={() => removeIngrediente(index)} style={{ padding: 4 }}>
                      <Trash2 size={16} color={COLORS.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <TouchableOpacity style={styles.addIngBtn} onPress={addIngrediente}>
                <Plus size={16} color={COLORS.primary} />
                <Text style={styles.addIngText}>Agregar Ingrediente</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={styles.saveBtnGradient}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingId ? 'Actualizar' : 'Guardar Formula'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textLight },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: SPACING.md },
  emptySubtext: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
  emptyBtn: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary + '15',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  emptyBtnText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  list: { padding: SPACING.md, paddingBottom: 40 },
  formulaCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formulaHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  formulaName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  formulaDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  categoriaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
    marginTop: SPACING.xs,
  },
  categoriaText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  formulaActions: { flexDirection: 'row', gap: SPACING.sm },
  actionBtn: { padding: SPACING.xs },
  ingredientesList: {
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
  },
  ingredienteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  ingName: { fontSize: 14, color: COLORS.text },
  ingDosis: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    padding: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  modalScroll: { maxHeight: 400 },
  modalInput: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    fontSize: 15,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.xs },
  catChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.xs,
  },
  catChipActive: { backgroundColor: COLORS.primary + '15', borderColor: COLORS.primary },
  catChipText: { fontSize: 13, color: COLORS.textSecondary },
  catChipTextActive: { color: COLORS.primary, fontWeight: '600' },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  unidadBtn: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    minWidth: 50,
    alignItems: 'center',
  },
  unidadBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.sm,
    gap: SPACING.xs,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  addIngText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  saveBtn: { borderRadius: BORDER_RADIUS.md, overflow: 'hidden', marginTop: SPACING.sm },
  saveBtnGradient: { paddingVertical: SPACING.md, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
