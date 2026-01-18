/**
 * Chart card wrapper component
 * Shadcn-inspired design with subtle borders and clean typography
 */
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fontSizes, fonts, spacing, borderRadius, shadows } from '@/lib/theme';

interface ChartCardProps {
  title: string;
  loading?: boolean;
  children: React.ReactNode;
}

export function ChartCard({ title, loading, children }: ChartCardProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.foregroundMuted} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: spacing[3],
    paddingHorizontal: 0, // No horizontal padding - charts go edge to edge
    marginBottom: spacing[3],
    overflow: 'hidden', // Clip chart to card bounds
    ...shadows.sm,
  },
  title: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foreground,
    marginBottom: spacing[3],
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing[2],
    color: colors.foregroundMuted,
    fontSize: fontSizes.sm,
  },
});
