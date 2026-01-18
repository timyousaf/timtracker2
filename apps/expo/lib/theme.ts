/**
 * Shadcn-inspired design system for TimTracker
 * Based on https://ui.shadcn.com/ neutral theme
 */

export const colors = {
  // Background colors
  background: '#ffffff',
  backgroundMuted: '#fafafa',
  backgroundSubtle: '#f4f4f5', // zinc-100
  
  // Foreground/text colors
  foreground: '#09090b', // zinc-950
  foregroundMuted: '#71717a', // zinc-500
  foregroundSubtle: '#a1a1aa', // zinc-400
  
  // Card styling
  card: '#ffffff',
  cardBorder: '#e4e4e7', // zinc-200
  
  // Primary (black theme like shadcn)
  primary: '#18181b', // zinc-900
  primaryForeground: '#fafafa',
  
  // Accent/secondary
  accent: '#f4f4f5', // zinc-100
  accentForeground: '#18181b',
  
  // Borders
  border: '#e4e4e7', // zinc-200
  borderInput: '#d4d4d8', // zinc-300
  
  // Semantic colors
  destructive: '#ef4444', // red-500
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  info: '#3b82f6', // blue-500
  
  // Chart-specific colors (keeping existing palette)
  chartSleep: '#22c55e', // green
  chartSleepGoal: '#ef4444', // red for goal line
  chartMindful: '#a855f7', // purple
  chartExercise: '#22c55e', // green
  chartMeal: '#f97316', // orange
  chartStrength: '#3b82f6', // blue
  chartHeart: '#ec4899', // pink
  chartWeight: '#b45a5d', // muted red/pink
};

export const fonts = {
  // Geist font family (same as shadcn)
  regular: 'Geist_400Regular',
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
};

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  full: 9999,
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
};

// Pre-built style objects for common patterns
export const cardStyles = {
  backgroundColor: colors.card,
  borderRadius: borderRadius.xl,
  borderWidth: 1,
  borderColor: colors.cardBorder,
  ...shadows.sm,
};

export const inputStyles = {
  backgroundColor: colors.background,
  borderWidth: 1,
  borderColor: colors.borderInput,
  borderRadius: borderRadius.lg,
  paddingHorizontal: spacing[4],
  paddingVertical: spacing[3],
  fontSize: fontSizes.sm,
  color: colors.foreground,
};

export const buttonPrimaryStyles = {
  backgroundColor: colors.primary,
  borderRadius: borderRadius.lg,
  paddingHorizontal: spacing[4],
  paddingVertical: spacing[3],
};

export const buttonPrimaryTextStyles = {
  color: colors.primaryForeground,
  fontSize: fontSizes.sm,
  fontFamily: fonts.regular,
  textAlign: 'center' as const,
};
