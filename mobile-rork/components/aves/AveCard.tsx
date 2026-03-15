import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Tag, Calendar, Scale } from 'lucide-react-native';
import { Ave } from '@/types';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

const ANILLO_COLOR_MAP: Record<string, string> = {
  rojo: '#EF4444',
  azul: '#3B82F6',
  verde: '#22C55E',
  amarillo: '#EAB308',
  naranja: '#F97316',
  blanco: '#F8FAFC',
  negro: '#1E293B',
  morado: '#A855F7',
};

interface AveCardProps {
  ave: Ave;
  onPress: () => void;
}

export default function AveCard({ ave, onPress }: AveCardProps) {
  const isMale = ave.sexo === 'M';
  const genderColor = isMale ? COLORS.male : COLORS.female;
  const genderLabel = isMale ? 'Macho' : 'Hembra';

  const estadoConfig: Record<string, { bg: string; color: string; label: string }> = {
    activo: { bg: COLORS.success + '15', color: COLORS.success, label: 'Activo' },
    vendido: { bg: COLORS.info + '15', color: COLORS.info, label: 'Vendido' },
    retirado: { bg: COLORS.warning + '15', color: COLORS.warning, label: 'Retirado' },
    muerto: { bg: COLORS.error + '15', color: COLORS.error, label: 'Fallecido' },
  };

  const estado = estadoConfig[ave.estado] || estadoConfig.activo;

  const edad = () => {
    if (!ave.fecha_nacimiento) return 'Sin fecha';
    const nacimiento = new Date(ave.fecha_nacimiento);
    if (isNaN(nacimiento.getTime())) return 'Sin fecha';
    const hoy = new Date();
    const meses = (hoy.getFullYear() - nacimiento.getFullYear()) * 12 + (hoy.getMonth() - nacimiento.getMonth());
    if (meses < 1) return 'Recién nacido';
    if (meses < 12) return `${meses}m`;
    const anos = Math.floor(meses / 12);
    const mesesRestantes = meses % 12;
    return mesesRestantes > 0 ? `${anos}a ${mesesRestantes}m` : `${anos}a`;
  };

  return (
    <TouchableOpacity
      style={[styles.card, SHADOWS.md]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: ave.foto_principal ? (ave.foto_principal.startsWith('http') ? ave.foto_principal : `https://api.genesispro.vip${ave.foto_principal}`) : 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=200' }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
        <View style={[styles.genderBadge, { backgroundColor: genderColor }]}>
          <Text style={styles.genderText}>{ave.sexo}</Text>
        </View>
        {ave.anillo_color && (
          <View style={[
            styles.anilloColorDot,
            { backgroundColor: ANILLO_COLOR_MAP[ave.anillo_color] || COLORS.textSecondary },
            ave.anillo_color === 'negro' && { borderWidth: 1.5, borderColor: '#475569' },
            ave.anillo_color === 'blanco' && { borderWidth: 1.5, borderColor: '#CBD5E1' },
          ]} />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.codigo} numberOfLines={1}>{ave.codigo_identidad}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: estado.bg }]}>
            <View style={[styles.estadoDot, { backgroundColor: estado.color }]} />
            <Text style={[styles.estadoText, { color: estado.color }]}>
              {estado.label}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          {ave.linea_genetica && (
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{ave.linea_genetica}</Text>
            </View>
          )}
          {ave.color && (
            <View style={styles.metaChip}>
              <Text style={styles.metaText}>{ave.color}</Text>
            </View>
          )}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.infoItem}>
            <Calendar size={12} color={COLORS.textSecondary} />
            <Text style={styles.infoText}>{edad()}</Text>
          </View>
          {ave.peso_actual && (
            <View style={styles.infoItem}>
              <Scale size={12} color={COLORS.textSecondary} />
              <Text style={styles.infoText}>{ave.peso_actual}g</Text>
            </View>
          )}
          {ave.disponible_venta && (
            <View style={styles.ventaBadge}>
              <Tag size={10} color={COLORS.secondary} />
              <Text style={styles.ventaText}>
                ${ave.precio_venta || 'Consultar'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.chevron}>
        <ChevronRight size={18} color={COLORS.textDisabled} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.divider,
  },
  genderBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  genderText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textLight,
  },
  anilloColorDot: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codigo: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: SPACING.sm,
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    gap: 4,
  },
  estadoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  estadoText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  ventaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary + '12',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.round,
    marginLeft: 'auto',
  },
  ventaText: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '700',
  },
  chevron: {
    paddingLeft: SPACING.sm,
  },
});
