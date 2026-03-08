import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Bird, ArrowDown, Crown } from 'lucide-react-native';
import { Ave } from '@/types';
import { useAves } from '@/context/AvesContext';
import { COLORS } from '@/constants/colors';
import { SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';

interface GenealogyTreeProps {
  ave: Ave;
  onAvePress?: (aveId: string) => void;
}

export default function GenealogyTree({ ave, onAvePress }: GenealogyTreeProps) {
  const { aves, getAveById } = useAves();

  const padre = ave.padre_id ? getAveById(ave.padre_id) : null;
  const madre = ave.madre_id ? getAveById(ave.madre_id) : null;
  const hijos = aves.filter(a => a.padre_id === ave.id || a.madre_id === ave.id);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Árbol Genealógico</Text>

      {/* Parents Row */}
      {(padre || madre || ave.padre_id || ave.madre_id) && (
        <>
          <View style={styles.parentsRow}>
            <AveNode
              ave={padre}
              label="Padre"
              placeholder={ave.padre_id ? 'No encontrado' : 'Sin registrar'}
              gender="M"
              onPress={padre && onAvePress ? () => onAvePress(padre.id) : undefined}
            />
            <View style={styles.connector}>
              <View style={styles.connectorLineH} />
            </View>
            <AveNode
              ave={madre}
              label="Madre"
              placeholder={ave.madre_id ? 'No encontrada' : 'Sin registrar'}
              gender="H"
              onPress={madre && onAvePress ? () => onAvePress(madre.id) : undefined}
            />
          </View>
          <View style={styles.verticalConnector}>
            <View style={styles.connectorLineV} />
            <ArrowDown size={16} color={COLORS.border} />
          </View>
        </>
      )}

      {/* Current Ave (Center) */}
      <View style={styles.currentAveContainer}>
        <View style={[styles.currentAve, SHADOWS.lg]}>
          <View style={styles.crownBadge}>
            <Crown size={14} color={COLORS.secondary} />
          </View>
          <Image
            source={{ uri: ave.foto_principal || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=200' }}
            style={styles.currentAveImage}
            contentFit="cover"
          />
          <Text style={styles.currentAveCodigo} numberOfLines={1}>{ave.codigo_identidad}</Text>
          <View style={[styles.genderPill, { backgroundColor: ave.sexo === 'M' ? COLORS.male : COLORS.female }]}>
            <Text style={styles.genderPillText}>{ave.sexo === 'M' ? 'Macho' : 'Hembra'}</Text>
          </View>
        </View>
      </View>

      {/* Children */}
      {hijos.length > 0 && (
        <>
          <View style={styles.verticalConnector}>
            <ArrowDown size={16} color={COLORS.border} />
            <View style={styles.connectorLineV} />
          </View>

          <Text style={styles.childrenLabel}>
            Descendencia ({hijos.length})
          </Text>

          <View style={styles.childrenRow}>
            {hijos.slice(0, 4).map((hijo) => (
              <AveNode
                key={hijo.id}
                ave={hijo}
                label={hijo.sexo === 'M' ? 'Hijo' : 'Hija'}
                gender={hijo.sexo}
                compact
                onPress={onAvePress ? () => onAvePress(hijo.id) : undefined}
              />
            ))}
            {hijos.length > 4 && (
              <View style={styles.moreChildren}>
                <Text style={styles.moreText}>+{hijos.length - 4}</Text>
                <Text style={styles.moreLabel}>más</Text>
              </View>
            )}
          </View>
        </>
      )}

      {!padre && !madre && !ave.padre_id && !ave.madre_id && hijos.length === 0 && (
        <View style={styles.emptyState}>
          <Bird size={32} color={COLORS.textDisabled} />
          <Text style={styles.emptyText}>Sin datos genealógicos</Text>
          <Text style={styles.emptySubtext}>
            Asigna padre y madre al editar esta ave
          </Text>
        </View>
      )}
    </View>
  );
}

function AveNode({
  ave,
  label,
  placeholder,
  gender,
  compact,
  onPress,
}: {
  ave: Ave | null | undefined;
  label: string;
  placeholder?: string;
  gender?: 'M' | 'H';
  compact?: boolean;
  onPress?: () => void;
}) {
  const genderColor = gender === 'M' ? COLORS.male : COLORS.female;

  if (!ave) {
    return (
      <View style={[styles.node, compact && styles.nodeCompact, styles.nodeEmpty]}>
        <View style={[styles.nodeImagePlaceholder, compact && styles.nodeImageCompact]}>
          <Bird size={compact ? 16 : 20} color={COLORS.textDisabled} />
        </View>
        <Text style={[styles.nodeLabel, { color: genderColor }]}>{label}</Text>
        <Text style={styles.nodePlaceholder}>{placeholder || 'N/A'}</Text>
      </View>
    );
  }

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.node, compact && styles.nodeCompact]}
      {...(onPress ? { onPress, activeOpacity: 0.7 } : {})}
    >
      <View style={styles.nodeImageWrapper}>
        <Image
          source={{ uri: ave.foto_principal || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=200' }}
          style={[styles.nodeImage, compact && styles.nodeImageCompact]}
          contentFit="cover"
        />
        <View style={[styles.nodeGenderDot, { backgroundColor: genderColor }]} />
      </View>
      <Text style={[styles.nodeLabel, { color: genderColor }]}>{label}</Text>
      <Text style={styles.nodeCodigo} numberOfLines={1}>{ave.codigo_identidad}</Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  parentsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  connector: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 24,
  },
  connectorLineH: {
    width: 20,
    height: 2,
    backgroundColor: COLORS.border,
    borderRadius: 1,
  },
  verticalConnector: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  connectorLineV: {
    width: 2,
    height: 12,
    backgroundColor: COLORS.border,
  },
  currentAveContainer: {
    alignItems: 'center',
  },
  currentAve: {
    backgroundColor: COLORS.primary + '08',
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary + '30',
    width: 130,
  },
  crownBadge: {
    position: 'absolute',
    top: -8,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.secondary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  currentAveImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.divider,
    marginBottom: SPACING.sm,
  },
  currentAveCodigo: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  genderPill: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.round,
    marginTop: 4,
  },
  genderPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  childrenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  childrenRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  node: {
    alignItems: 'center',
    width: 100,
  },
  nodeCompact: {
    width: 72,
  },
  nodeEmpty: {
    opacity: 0.5,
  },
  nodeImageWrapper: {
    position: 'relative',
  },
  nodeImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.divider,
  },
  nodeImageCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  nodeImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.divider,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  nodeGenderDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: COLORS.card,
  },
  nodeLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nodeCodigo: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 1,
  },
  nodePlaceholder: {
    fontSize: 10,
    color: COLORS.textDisabled,
    fontStyle: 'italic',
  },
  moreChildren: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  moreText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  moreLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    fontSize: 12,
    color: COLORS.textDisabled,
    textAlign: 'center',
  },
});
