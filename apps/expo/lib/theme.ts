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
  
  // Semantic colors (Tailwind)
  destructive: '#ef4444', // red-500
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  info: '#3b82f6', // blue-500
  
  // Chart color palette (Tailwind colors from shadcn)
  // Primary chart colors
  chart: {
    // Neutrals
    slate500: '#64748b',    // slate-500 - neutral for body measurements
    slate600: '#475569',    // slate-600 - softer dark for trend lines
    zinc900: '#18181b',     // zinc-900 - primary dark
    // Warm colors
    red500: '#ef4444',      // red-500
    orange400: '#fb923c',   // orange-400
    amber500: '#f59e0b',    // amber-500
    yellow500: '#eab308',   // yellow-500
    // Greens
    lime500: '#84cc16',     // lime-500
    green500: '#22c55e',    // green-500
    emerald500: '#10b981',  // emerald-500
    teal500: '#14b8a6',     // teal-500
    // Blues
    cyan500: '#06b6d4',     // cyan-500
    sky500: '#0ea5e9',      // sky-500 - outdoor/distance
    blue500: '#3b82f6',     // blue-500
    indigo500: '#6366f1',   // indigo-500 - HRV
    // Purples/Pinks
    violet500: '#8b5cf6',   // violet-500 - strength training
    purple500: '#a855f7',   // purple-500 - mindfulness
    fuchsia500: '#d946ef',  // fuchsia-500
    pink500: '#ec4899',     // pink-500 - heart rate
    rose500: '#f43f5e',     // rose-500
    rose400: '#fb7185',     // rose-400 (lighter)
  },
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
