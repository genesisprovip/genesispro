import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Syringe,
  Pill,
  Stethoscope,
  Bug,
  Calendar,
  User,
  DollarSign,
  FileText,
  AlertCircle,
  Trash2,
  Heart,
} from 'lucide-react-native';
import { useSalud } from '@/context/SaludContext';
import { useAves } from '@/context/AvesContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

const TIPO_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  vacuna: { icon: Syringe, color: '#4CAF50', label: 'Vacuna' },
  tratamiento: { icon: Pill, color: '#2196F3', label: 'Tratamiento' },
  enfermedad: { icon: Bug, color: '#F44336', label: 'Enfermedad' },
  revision: { icon: Stethoscope, color: '#9C27B0', label: 'Revisión' },
  desparasitacion: { icon: Bug, color: '#FF9800', label: 'Desparasitación' },
};

export default function SaludDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { registros, deleteRegistro } = useSalud();
  const { getAveById } = useAves();

  const registro = registros.find(r => r.id === id);

  if (!registro) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Heart size={64} color={COLORS.textDisabled} />
        <Text style={styles.notFoundTitle}>Registro no encontrado</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ave = getAveById(registro.ave_id);
  const config = TIPO_CONFIG[registro.tipo] || TIPO_CONFIG.revision;
  const Icon = config.icon;

  const diasProxima = registro.fecha_proxima
    ? Math.ceil((new Date(registro.fecha_proxima).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Registro',
      `¿Estás seguro de eliminar "${registro.nombre}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteRegistro(registro.id);
            if (result.success) {
              router.back();
            } else {
              Alert.alert('Error', result.error || 'No se pudo eliminar');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.backgroundDark, COLORS.backgroundDarkAlt]}
        style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}
      >
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.navButton}>
            <ChevronLeft size={28} color={COLORS.textLight} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.navButton}>
            <Trash2 size={20} color="#F87171" />
          </TouchableOpacity>
        </View>

        {/* Hero */}
        <View style={styles.heroSection}>
          <View style={[styles.heroIcon, { backgroundColor: config.color + '25' }]}>
            <Icon size={32} color={config.color} />
          </View>
          <View style={styles.heroInfo}>
            <View style={[styles.tipoBadge, { backgroundColor: config.color + '20' }]}>
              <Text style={[styles.tipoBadgeText, { color: config.color }]}>{config.label}</Text>
            </View>
            <Text style={styles.heroTitle}>{registro.nombre}</Text>
            {ave && (
              <Text style={styles.heroAve}>{ave.codigo_identidad}</Text>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Proxima Dosis Alert */}
        {registro.fecha_proxima && (
          <View style={[
            styles.alertCard,
            diasProxima !== null && diasProxima <= 7 && styles.alertCardUrgent
          ]}>
            <AlertCircle
              size={20}
              color={diasProxima !== null && diasProxima <= 7 ? COLORS.error : COLORS.warning}
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>
                {diasProxima !== null && diasProxima <= 0
                  ? 'Dosis vencida'
                  : `Próxima dosis en ${diasProxima} días`}
              </Text>
              <Text style={styles.alertDate}>
                {registro.fecha_proxima ? new Date(registro.fecha_proxima).toLocaleDateString('es-ES', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                }) : '-'}
              </Text>
            </View>
          </View>
        )}

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <DetailCard
            icon={<Calendar size={18} color={COLORS.primary} />}
            label="Fecha"
            value={registro.fecha ? new Date(registro.fecha).toLocaleDateString('es-ES', {
              day: 'numeric', month: 'long', year: 'numeric'
            }) : 'Sin fecha'}
          />
          {registro.veterinario && (
            <DetailCard
              icon={<User size={18} color={COLORS.info} />}
              label="Veterinario"
              value={registro.veterinario}
            />
          )}
          {registro.medicamentos && (
            <DetailCard
              icon={<Pill size={18} color={COLORS.accent} />}
              label="Medicamentos"
              value={registro.medicamentos}
            />
          )}
          {registro.dosis && (
            <DetailCard
              icon={<Syringe size={18} color={config.color} />}
              label="Dosis"
              value={registro.dosis}
            />
          )}
          {registro.costo != null && registro.costo > 0 && (
            <DetailCard
              icon={<DollarSign size={18} color={COLORS.success} />}
              label="Costo"
              value={`$${registro.costo.toLocaleString()}`}
            />
          )}
        </View>

        {/* Descripcion */}
        {registro.descripcion && (
          <View style={[styles.section, SHADOWS.sm]}>
            <View style={styles.sectionHeader}>
              <FileText size={16} color={COLORS.textSecondary} />
              <Text style={styles.sectionTitle}>Descripción</Text>
            </View>
            <Text style={styles.sectionText}>{registro.descripcion}</Text>
          </View>
        )}

        {/* Notas */}
        {registro.notas && (
          <View style={[styles.section, SHADOWS.sm]}>
            <View style={styles.sectionHeader}>
              <FileText size={16} color={COLORS.textSecondary} />
              <Text style={styles.sectionTitle}>Notas</Text>
            </View>
            <Text style={styles.sectionText}>{registro.notas}</Text>
          </View>
        )}

        {/* Ave Info */}
        {ave && (
          <TouchableOpacity
            style={[styles.aveCard, SHADOWS.sm]}
            onPress={() => router.push(`/ave/${ave.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.aveCardLeft}>
              <View style={[styles.aveGenderDot, {
                backgroundColor: ave.sexo === 'M' ? COLORS.male : COLORS.female
              }]} />
              <View>
                <Text style={styles.aveCardCode}>{ave.codigo_identidad}</Text>
                <Text style={styles.aveCardSub}>
                  {ave.sexo === 'M' ? 'Macho' : 'Hembra'}
                  {ave.linea_genetica ? ` • ${ave.linea_genetica}` : ''}
                </Text>
              </View>
            </View>
            <Text style={styles.aveCardLink}>Ver ave →</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function DetailCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={[styles.detailCard, SHADOWS.sm]}>
      {icon}
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
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
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  heroInfo: {
    flex: 1,
  },
  tipoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    marginBottom: SPACING.xs,
  },
  tipoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  heroAve: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '12',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    gap: SPACING.md,
  },
  alertCardUrgent: {
    backgroundColor: COLORS.error + '12',
    borderLeftColor: COLORS.error,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  alertDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  detailCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    gap: 4,
    flexGrow: 1,
    minWidth: 150,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
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
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  aveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  aveCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  aveGenderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  aveCardCode: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  aveCardSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  aveCardLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
