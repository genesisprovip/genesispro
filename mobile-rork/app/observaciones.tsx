import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  X,
  FileText,
  Tag,
} from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import api from '@/services/api';

const CATEGORIAS = [
  { value: 'general', label: 'General', color: COLORS.textSecondary },
  { value: 'salud', label: 'Salud', color: COLORS.error },
  { value: 'alimentacion', label: 'Alimentación', color: COLORS.secondary },
  { value: 'combate', label: 'Combate', color: COLORS.accent },
  { value: 'crianza', label: 'Crianza', color: COLORS.primary },
  { value: 'instalaciones', label: 'Instalaciones', color: COLORS.info },
];

interface Observacion {
  id: string;
  titulo: string | null;
  contenido: string;
  categoria: string;
  fecha: string;
  created_at: string;
}

export default function ObservacionesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtroCategoria, setFiltroCategoria] = useState<string | null>(null);

  // Form
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [categoria, setCategoria] = useState('general');

  const fetchObservaciones = useCallback(async () => {
    try {
      const params = filtroCategoria ? { categoria: filtroCategoria } : undefined;
      const res = await api.getObservaciones(params);
      if (res.success) setObservaciones(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filtroCategoria]);

  useEffect(() => {
    fetchObservaciones();
  }, [fetchObservaciones]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchObservaciones();
    setRefreshing(false);
  };

  const openNew = () => {
    setEditingId(null);
    setTitulo('');
    setContenido('');
    setCategoria('general');
    setModalVisible(true);
  };

  const openEdit = (obs: Observacion) => {
    setEditingId(obs.id);
    setTitulo(obs.titulo || '');
    setContenido(obs.contenido);
    setCategoria(obs.categoria || 'general');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!contenido.trim()) {
      Alert.alert('Error', 'El contenido es requerido');
      return;
    }
    try {
      if (editingId) {
        await api.updateObservacion(editingId, {
          titulo: titulo.trim() || undefined,
          contenido: contenido.trim(),
          categoria,
        });
      } else {
        await api.createObservacion({
          titulo: titulo.trim() || undefined,
          contenido: contenido.trim(),
          categoria,
        });
      }
      setModalVisible(false);
      fetchObservaciones();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la observación');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Eliminar', '¿Eliminar esta observación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteObservacion(id);
            fetchObservaciones();
          } catch {
            Alert.alert('Error', 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  const getCategoriaInfo = (cat: string) => {
    return CATEGORIAS.find(c => c.value === cat) || CATEGORIAS[0];
  };

  const renderItem = ({ item }: { item: Observacion }) => {
    const catInfo = getCategoriaInfo(item.categoria);
    const fecha = new Date(item.fecha).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return (
      <View style={[styles.card, SHADOWS.sm]}>
        <View style={styles.cardHeader}>
          <View style={[styles.catBadge, { backgroundColor: catInfo.color + '20' }]}>
            <View style={[styles.catDot, { backgroundColor: catInfo.color }]} />
            <Text style={[styles.catLabel, { color: catInfo.color }]}>{catInfo.label}</Text>
          </View>
          <Text style={styles.cardDate}>{fecha}</Text>
        </View>
        {item.titulo && <Text style={styles.cardTitle}>{item.titulo}</Text>}
        <Text style={styles.cardContent} numberOfLines={4}>{item.contenido}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.cardAction} onPress={() => openEdit(item)}>
            <Edit3 size={16} color={COLORS.primary} />
            <Text style={[styles.cardActionText, { color: COLORS.primary }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardAction} onPress={() => handleDelete(item.id)}>
            <Trash2 size={16} color={COLORS.error} />
            <Text style={[styles.cardActionText, { color: COLORS.error }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.textLight} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Observaciones</Text>
            <Text style={styles.headerSub}>Notas de tu gallera</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openNew}>
            <Plus size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        {/* Category filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          <TouchableOpacity
            style={[styles.filterChip, !filtroCategoria && styles.filterChipActive]}
            onPress={() => setFiltroCategoria(null)}
          >
            <Text style={[styles.filterChipText, !filtroCategoria && styles.filterChipTextActive]}>Todas</Text>
          </TouchableOpacity>
          {CATEGORIAS.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[styles.filterChip, filtroCategoria === cat.value && styles.filterChipActive]}
              onPress={() => setFiltroCategoria(filtroCategoria === cat.value ? null : cat.value)}
            >
              <Text style={[styles.filterChipText, filtroCategoria === cat.value && styles.filterChipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>

      <FlatList
        data={observaciones}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <FileText size={48} color={COLORS.textDisabled} />
            <Text style={styles.emptyTitle}>Sin observaciones</Text>
            <Text style={styles.emptyText}>Registra notas sobre tu gallera, aves, o instalaciones</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openNew}>
              <Text style={styles.emptyBtnText}>Crear primera nota</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Editar' : 'Nueva'} Observación</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Título (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: Revisión del corral norte"
                placeholderTextColor={COLORS.placeholder}
                value={titulo}
                onChangeText={setTitulo}
              />

              <Text style={styles.label}>Contenido *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Escribe tu observación..."
                placeholderTextColor={COLORS.placeholder}
                value={contenido}
                onChangeText={setContenido}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              <Text style={styles.label}>Categoría</Text>
              <View style={styles.catGrid}>
                {CATEGORIAS.map(cat => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.catOption,
                      categoria === cat.value && { borderColor: cat.color, backgroundColor: cat.color + '15' },
                    ]}
                    onPress={() => setCategoria(cat.value)}
                  >
                    <View style={[styles.catOptionDot, { backgroundColor: cat.color }]} />
                    <Text
                      style={[
                        styles.catOptionText,
                        categoria === cat.value && { color: cat.color },
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{editingId ? 'Guardar Cambios' : 'Crear Observación'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textLight },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  filterScroll: { marginTop: SPACING.sm },
  filterContent: { gap: 8, paddingBottom: SPACING.sm },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  filterChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  filterChipTextActive: { color: COLORS.primary },
  list: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  card: {
    backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catLabel: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 11, color: COLORS.textSecondary },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardContent: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  cardActions: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.divider },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardActionText: { fontSize: 12, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80, gap: SPACING.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  emptyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: BORDER_RADIUS.round, marginTop: SPACING.sm },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.textLight },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: SPACING.lg, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, marginTop: SPACING.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: COLORS.background, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, fontSize: 15, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: { minHeight: 120 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  catOptionDot: { width: 10, height: 10, borderRadius: 5 },
  catOptionText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.lg,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.textLight },
});
