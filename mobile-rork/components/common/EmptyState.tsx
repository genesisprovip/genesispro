import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Bird, Calendar, TrendingUp, AlertCircle } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { SPACING, TYPOGRAPHY } from '@/constants/theme';

interface EmptyStateProps {
  icon?: 'bird' | 'calendar' | 'chart' | 'alert';
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const iconMap = {
  bird: Bird,
  calendar: Calendar,
  chart: TrendingUp,
  alert: AlertCircle,
};

export default function EmptyState({
  icon = 'bird',
  title,
  message,
  actionLabel,
  onAction
}: EmptyStateProps) {
  const IconComponent = iconMap[icon];

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <IconComponent size={64} color={COLORS.textDisabled} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    minHeight: 300,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
    opacity: 0.5,
  },
  title: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  button: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
