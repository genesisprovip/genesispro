import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Edit3,
  Scale,
  Calendar,
  Bird,
  Heart,
  Swords,
  Tag,
  MapPin,
  DollarSign,
  Trash2,
  Dna,
  FileDown,
  Home,
  User,
} from 'lucide-react-native';
import { useAves } from '@/context/AvesContext';
import { useCombates } from '@/context/CombatesContext';
import { useSalud } from '@/context/SaludContext';
import GenealogyTree from '@/components/aves/GenealogyTree';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import api from '@/services/api';

const GENETIC_COLORS = ['#10B981', '#F59E0B', '#6366F1', '#EF4444', '#3B82F6', '#EC4899', '#14B8A6', '#8B5CF6'];

const TIPO_ADQUISICION_LABELS: Record<string, string> = {
  'cria_propia': 'Cría Propia',
  'compra': 'Compra',
  'regalo': 'Regalo',
  'intercambio': 'Intercambio',
};

export default function AveDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { getAveById, deleteAve } = useAves();
  const { combates } = useCombates();
  const { registros } = useSalud();

  const ave = getAveById(id || '');

  const aveCombates = useMemo(() => {
    if (!ave) return [];
    return combates.filter(c => c.ave_id === ave.id);
  }, [combates, ave]);

  const aveRegistrosSalud = useMemo(() => {
    if (!ave) return [];
    return registros.filter(r => r.ave_id === ave.id);
  }, [registros, ave]);

  const stats = useMemo(() => {
    const victorias = aveCombates.filter(c => c.resultado === 'victoria').length;
    const derrotas = aveCombates.filter(c => c.resultado === 'derrota').length;
    const totalCombates = aveCombates.length;
    const winRate = totalCombates > 0 ? Math.round((victorias / totalCombates) * 100) : 0;
    return { victorias, derrotas, totalCombates, winRate };
  }, [aveCombates]);

  const calcAge = (fechaNacimiento: string) => {
    const birth = new Date(fechaNacimiento);
    const now = new Date();
    const diffMs = now.getTime() - birth.getTime();
    const totalMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (years > 0) return `${years}a ${months}m`;
    return `${months} meses`;
  };

  const getEstadoStyle = (estado: string) => {
    switch (estado) {
      case 'activo': return { bg: COLORS.success + '15', color: COLORS.success, label: 'Activo' };
      case 'vendido': return { bg: COLORS.info + '15', color: COLORS.info, label: 'Vendido' };
      case 'muerto': return { bg: COLORS.error + '15', color: COLORS.error, label: 'Muerto' };
      case 'retirado': return { bg: COLORS.warning + '15', color: COLORS.warning, label: 'Retirado' };
      default: return { bg: COLORS.textSecondary + '15', color: COLORS.textSecondary, label: estado };
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Ave',
      `¿Estás seguro de eliminar "${ave?.codigo_identidad}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (ave) {
              const result = await deleteAve(ave.id);
              if (result.success) {
                router.back();
              } else {
                Alert.alert('Error', result.error || 'No se pudo eliminar');
              }
            }
          },
        },
      ]
    );
  };

  if (!ave) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Bird size={64} color={COLORS.textDisabled} />
        <Text style={styles.notFoundTitle}>Ave no encontrada</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const estadoStyle = getEstadoStyle(ave.estado);
  const genderColor = ave.sexo === 'M' ? COLORS.male : COLORS.female;

  return (
    <View style={styles.container}>
      {/* Hero Header */}
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
            <ChevronLeft size={28} color={COLORS.textLight} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleDelete} style={styles.navButton}>
              <Trash2 size={20} color="#F87171" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.heroContent}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: ave.foto_principal || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=400' }}
              style={styles.avatar}
              contentFit="cover"
            />
            <View style={[styles.genderBadge, { backgroundColor: genderColor }]}>
              <Text style={styles.genderBadgeText}>{ave.sexo === 'M' ? '♂' : '♀'}</Text>
            </View>
          </View>

          <View style={styles.heroInfo}>
            <Text style={styles.heroCode}>{ave.codigo_identidad}</Text>
            <View style={styles.heroMeta}>
              {ave.linea_genetica && (
                <View style={styles.metaChip}>
                  <Tag size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.metaChipText}>{ave.linea_genetica}</Text>
                </View>
              )}
              <View style={[styles.estadoBadge, { backgroundColor: estadoStyle.bg }]}>
                <View style={[styles.estadoDot, { backgroundColor: estadoStyle.color }]} />
                <Text style={[styles.estadoText, { color: estadoStyle.color }]}>
                  {estadoStyle.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {ave.fecha_nacimiento ? calcAge(ave.fecha_nacimiento) : '—'}
            </Text>
            <Text style={styles.quickStatLabel}>Edad</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {ave.peso_actual ? `${ave.peso_actual}g` : '—'}
            </Text>
            <Text style={styles.quickStatLabel}>Peso</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickStatValue}>
              {stats.totalCombates > 0 ? `${stats.victorias}W-${stats.derrotas}L` : '—'}
            </Text>
            <Text style={styles.quickStatLabel}>Récord</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStat}>
            <Text style={[styles.quickStatValue, { color: COLORS.primaryLight }]}>
              {stats.winRate > 0 ? `${stats.winRate}%` : '—'}
            </Text>
            <Text style={styles.quickStatLabel}>Win Rate</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Cards */}
        <View style={styles.infoGrid}>
          <InfoCard
            icon={<Calendar size={18} color={COLORS.primary} />}
            label="Nacimiento"
            value={ave.fecha_nacimiento
              ? new Date(ave.fecha_nacimiento).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Sin registrar'}
          />
          <InfoCard
            icon={<Scale size={18} color={COLORS.secondary} />}
            label="Peso nacimiento"
            value={ave.peso_nacimiento ? `${ave.peso_nacimiento}g` : '—'}
          />
          <InfoCard
            icon={<Scale size={18} color={COLORS.info} />}
            label="Peso 3 meses"
            value={ave.peso_3meses ? `${ave.peso_3meses}g` : '—'}
          />
          <InfoCard
            icon={<MapPin size={18} color={COLORS.accent} />}
            label="Criadero"
            value={ave.criadero_origen || 'Propio'}
          />
          {ave.color && (
            <InfoCard
              icon={<Bird size={18} color={genderColor} />}
              label="Color"
              value={ave.color}
            />
          )}
          {ave.disponible_venta && (
            <InfoCard
              icon={<DollarSign size={18} color={COLORS.success} />}
              label="Precio venta"
              value={ave.precio_venta ? `$${Number(ave.precio_venta).toLocaleString()}` : 'Consultar'}
            />
          )}
        </View>

        {/* Notas */}
        {ave.notas && (
          <View style={[styles.section, SHADOWS.sm]}>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.notasText}>{ave.notas}</Text>
          </View>
        )}

        {/* Composición Genética */}
        {ave.composicion_genetica && ave.composicion_genetica.length > 0 && (
          <View style={[styles.section, SHADOWS.sm]}>
            <View style={styles.sectionHeader}>
              <Dna size={18} color={COLORS.accent} />
              <Text style={styles.sectionTitle}>Composición Genética</Text>
              {ave.es_puro && (
                <View style={styles.puroBadge}>
                  <Text style={styles.puroBadgeText}>PURO</Text>
                </View>
              )}
            </View>

            {/* Barra visual de composición */}
            <View style={styles.composicionBar}>
              {ave.composicion_genetica.map((comp, i) => (
                <View
                  key={i}
                  style={[
                    styles.composicionBarSegment,
                    {
                      flex: comp.decimal,
                      backgroundColor: GENETIC_COLORS[i % GENETIC_COLORS.length],
                      borderTopLeftRadius: i === 0 ? 6 : 0,
                      borderBottomLeftRadius: i === 0 ? 6 : 0,
                      borderTopRightRadius: i === ave.composicion_genetica!.length - 1 ? 6 : 0,
                      borderBottomRightRadius: i === ave.composicion_genetica!.length - 1 ? 6 : 0,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Detalle por línea */}
            {ave.composicion_genetica.map((comp, i) => (
              <View key={i} style={styles.composicionRow}>
                <View style={[styles.composicionDot, { backgroundColor: GENETIC_COLORS[i % GENETIC_COLORS.length] }]} />
                <Text style={styles.composicionLinea}>{comp.linea}</Text>
                <Text style={styles.composicionFraccion}>{comp.fraccion}</Text>
                <Text style={styles.composicionPct}>{Math.round(comp.decimal * 100)}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Origen y Procedencia */}
        {((ave as any).criador_nombre || (ave as any).tipo_adquisicion || (ave as any).notas_origen) && (
          <View style={[styles.section, SHADOWS.sm]}>
            <View style={styles.sectionHeader}>
              <Home size={18} color={COLORS.info} />
              <Text style={styles.sectionTitle}>Origen</Text>
            </View>
            {(ave as any).tipo_adquisicion && (
              <View style={styles.origenRow}>
                <Text style={styles.origenLabel}>Adquisición</Text>
                <Text style={styles.origenValue}>{TIPO_ADQUISICION_LABELS[(ave as any).tipo_adquisicion] || (ave as any).tipo_adquisicion}</Text>
              </View>
            )}
            {ave.criadero_origen && (
              <View style={styles.origenRow}>
                <Text style={styles.origenLabel}>Criadero</Text>
                <Text style={styles.origenValue}>{ave.criadero_origen}</Text>
              </View>
            )}
            {(ave as any).criador_nombre && (
              <View style={styles.origenRow}>
                <Text style={styles.origenLabel}>Criador</Text>
                <Text style={styles.origenValue}>{(ave as any).criador_nombre}</Text>
              </View>
            )}
            {(ave as any).fecha_adquisicion && (
              <View style={styles.origenRow}>
                <Text style={styles.origenLabel}>Fecha</Text>
                <Text style={styles.origenValue}>
                  {new Date((ave as any).fecha_adquisicion).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            )}
            {(ave as any).notas_origen && (
              <View style={[styles.origenRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.origenLabel}>Notas</Text>
                <Text style={[styles.origenValue, { flex: 1 }]}>{(ave as any).notas_origen}</Text>
              </View>
            )}
          </View>
        )}

        {/* Botón Pedigree */}
        <TouchableOpacity
          style={[styles.pedigreeButton, SHADOWS.sm]}
          onPress={async () => {
            const url = await api.getAvePedigreeUrl(ave.id);
            Linking.openURL(url);
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[COLORS.accent, '#4F46E5']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.pedigreeButtonGradient}
          >
            <FileDown size={20} color="#fff" />
            <Text style={styles.pedigreeButtonText}>Descargar Pedigree PDF</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Genealogy Tree */}
        <View style={styles.genealogySection}>
          <GenealogyTree
            ave={ave}
            onAvePress={(aveId) => router.push(`/ave/${aveId}`)}
          />
        </View>

        {/* Combat History */}
        {aveCombates.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Swords size={18} color={COLORS.secondary} />
              <Text style={styles.sectionTitle}>Historial de Combates</Text>
              <Text style={styles.sectionCount}>{aveCombates.length}</Text>
            </View>
            {aveCombates.slice(0, 5).map((combate) => {
              const isWin = combate.resultado === 'victoria';
              const isLoss = combate.resultado === 'derrota';
              return (
                <View key={combate.id} style={styles.historyItem}>
                  <View style={[
                    styles.historyDot,
                    { backgroundColor: isWin ? COLORS.success : isLoss ? COLORS.error : COLORS.warning }
                  ]} />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyResult}>
                      {(combate.resultado || 'pendiente').charAt(0).toUpperCase() + (combate.resultado || 'pendiente').slice(1)}
                    </Text>
                    <Text style={styles.historyMeta}>
                      {combate.fecha ? new Date(combate.fecha).toLocaleDateString('es-ES') : 'Sin fecha'}
                      {combate.ubicacion ? ` • ${combate.ubicacion}` : ''}
                      {combate.oponente_codigo ? ` vs ${combate.oponente_codigo}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.historyWeight}>{combate.peso_combate || combate.peso_ave || '-'}g</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Health Records */}
        {aveRegistrosSalud.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Heart size={18} color={COLORS.error} />
              <Text style={styles.sectionTitle}>Registros de Salud</Text>
              <Text style={styles.sectionCount}>{aveRegistrosSalud.length}</Text>
            </View>
            {aveRegistrosSalud.slice(0, 5).map((registro) => (
              <View key={registro.id} style={styles.historyItem}>
                <View style={[styles.historyDot, { backgroundColor: COLORS.primary }]} />
                <View style={styles.historyContent}>
                  <Text style={styles.historyResult}>{registro.nombre}</Text>
                  <Text style={styles.historyMeta}>
                    {registro.tipo} • {registro.fecha ? new Date(registro.fecha).toLocaleDateString('es-ES') : 'Sin fecha'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={[styles.infoCard, SHADOWS.sm]}>
      {icon}
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  backLink: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  backLinkText: {
    color: COLORS.textLight,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.divider,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  genderBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.backgroundDark,
  },
  genderBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  heroInfo: {
    flex: 1,
  },
  heroCode: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textLight,
    marginBottom: SPACING.xs,
  },
  heroMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  metaChipText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.round,
  },
  estadoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  estadoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  quickStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  quickStatLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  infoCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: 4,
    flexGrow: 1,
    minWidth: 150,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  section: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    backgroundColor: COLORS.divider,
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  notasText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  genealogySection: {
    marginBottom: SPACING.md,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.md,
  },
  historyContent: {
    flex: 1,
  },
  historyResult: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  historyMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  historyWeight: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  // Composición genética
  composicionBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  composicionBarSegment: {
    height: '100%',
  },
  composicionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  composicionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  composicionLinea: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  composicionFraccion: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    width: 36,
    textAlign: 'right',
  },
  composicionPct: {
    fontSize: 12,
    color: COLORS.textSecondary,
    width: 36,
    textAlign: 'right',
  },
  puroBadge: {
    backgroundColor: COLORS.accent + '20',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  puroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accent,
    letterSpacing: 1,
  },
  // Origen
  origenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  origenLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginRight: SPACING.md,
  },
  origenValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  // Pedigree button
  pedigreeButton: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  pedigreeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  pedigreeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
