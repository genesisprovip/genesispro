export const COLORS = {
  // Primary - Deep emerald green
  primary: '#10B981',
  primaryLight: '#34D399',
  primaryDark: '#059669',
  primaryMuted: '#D1FAE5',

  // Secondary - Warm amber
  secondary: '#F59E0B',
  secondaryLight: '#FBBF24',
  secondaryDark: '#D97706',

  // Accent - Rich indigo
  accent: '#6366F1',
  accentLight: '#818CF8',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Dark backgrounds
  backgroundDark: '#0F172A',
  backgroundDarkAlt: '#1E293B',

  // Light backgrounds
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  // Text
  text: '#0F172A',
  textSecondary: '#64748B',
  textDisabled: '#CBD5E1',
  textLight: '#FFFFFF',

  // Borders
  border: '#E2E8F0',
  divider: '#F1F5F9',

  // Misc
  disabled: '#CBD5E1',
  placeholder: '#94A3B8',

  // Gradients
  gradientStart: '#10B981',
  gradientEnd: '#059669',
  gradientDark: '#0F172A',
  gradientDarkEnd: '#1E293B',

  // Gender
  male: '#3B82F6',
  female: '#EC4899',

  // Results
  victory: '#10B981',
  defeat: '#EF4444',
  draw: '#F59E0B',

  // Overlay
  overlay: 'rgba(15, 23, 42, 0.6)',
};

export default {
  light: {
    text: COLORS.text,
    background: COLORS.background,
    tint: COLORS.primary,
    tabIconDefault: COLORS.textSecondary,
    tabIconSelected: COLORS.primary,
  },
};
