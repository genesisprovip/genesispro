import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Animated } from 'react-native';
import { Eye } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { BORDER_RADIUS } from '@/constants/theme';

interface LiveStreamBannerProps {
  viewersCount?: number;
}

export default function LiveStreamBanner({ viewersCount }: LiveStreamBannerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.2,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      <View style={styles.liveSection}>
        <Animated.View style={[styles.dot, { opacity: pulseAnim }]} />
        <Text style={styles.liveText}>EN VIVO</Text>
      </View>

      {viewersCount !== undefined && viewersCount > 0 && (
        <View style={styles.viewersSection}>
          <Eye size={10} color={COLORS.textLight} />
          <Text style={styles.viewersText}>{viewersCount.toLocaleString()}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.sm,
    gap: 6,
    alignSelf: 'flex-start',
  },
  liveSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.textLight,
  },
  liveText: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  viewersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
    paddingLeft: 6,
  },
  viewersText: {
    color: COLORS.textLight,
    fontSize: 10,
    fontWeight: '600',
  },
});
