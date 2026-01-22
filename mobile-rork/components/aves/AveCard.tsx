import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, Tag } from 'lucide-react-native';
import { Ave } from '@/types';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

interface AveCardProps {
  ave: Ave;
  onPress: () => void;
}

export default function AveCard({ ave, onPress }: AveCardProps) {
  const getSexoColor = () => ave.sexo === 'M' ? COLORS.male : COLORS.female;
  const getSexoLabel = () => ave.sexo === 'M' ? 'Macho' : 'Hembra';

  const getEstadoStyle = () => {
    switch (ave.estado) {
      case 'activo':
        return { backgroundColor: COLORS.success + '20', color: COLORS.success };
      case 'vendido':
        return { backgroundColor: COLORS.info + '20', color: COLORS.info };
      case 'retirado':
        return { backgroundColor: COLORS.warning + '20', color: COLORS.warning };
      case 'muerto':
        return { backgroundColor: COLORS.error + '20', color: COLORS.error };
      default:
        return { backgroundColor: COLORS.textDisabled + '20', color: COLORS.textDisabled };
    }
  };

  const estadoStyle = getEstadoStyle();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: ave.foto_principal || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=200' }}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.codigo}>{ave.codigo_identidad}</Text>
          <View style={[styles.estadoBadge, { backgroundColor: estadoStyle.backgroundColor }]}>
            <Text style={[styles.estadoText, { color: estadoStyle.color }]}>
              {ave.estado.charAt(0).toUpperCase() + ave.estado.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.chips}>
          <View style={[styles.chip, { backgroundColor: getSexoColor() + '20' }]}>
            <Text style={[styles.chipText, { color: getSexoColor() }]}>
              {getSexoLabel()}
            </Text>
          </View>

          {ave.color && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{ave.color}</Text>
            </View>
          )}

          {ave.linea_genetica && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>{ave.linea_genetica}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.date}>
            {new Date(ave.fecha_nacimiento).toLocaleDateString('es-ES')}
          </Text>

          {ave.disponible_venta && (
            <View style={styles.ventaBadge}>
              <Tag size={12} color={COLORS.secondary} />
              <Text style={styles.ventaText}>
                ${ave.precio_venta || 'Consultar'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.chevronContainer}>
        <ChevronRight size={20} color={COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.divider,
  },
  content: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codigo: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  estadoText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  chip: {
    backgroundColor: COLORS.divider,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500' as const,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  ventaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.secondary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  ventaText: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '600' as const,
  },
  chevronContainer: {
    justifyContent: 'center',
    paddingLeft: SPACING.sm,
  },
});
