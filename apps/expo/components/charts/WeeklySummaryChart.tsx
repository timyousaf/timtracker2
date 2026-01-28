/**
 * Weekly Summary Chart
 * A 4x7 grid showing exercise, diet, sleep, and mindfulness for the current week
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { colors, fontSizes, fonts, spacing, borderRadius } from '@/lib/theme';
import type { WeeklySummaryData } from '@timtracker/ui/types';

const screenWidth = Dimensions.get('window').width;
const CARD_PADDING_X = spacing[2]; // ~8px
const LABEL_WIDTH = 60; // Width for row labels
const CELL_GAP = 2;
const AVAILABLE_WIDTH = screenWidth - (CARD_PADDING_X * 2) - spacing[4] - LABEL_WIDTH;
const CELL_SIZE = Math.floor((AVAILABLE_WIDTH - (CELL_GAP * 6)) / 7);

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ROW_LABELS = ['Exercise', 'Diet', 'Sleep', 'Mindful'];

// Color schemes matching existing charts
const EXERCISE_COLOR = colors.chart.emerald500;
const MINDFUL_COLOR = colors.chart.purple500;

// Score-based colors for diet and sleep (0-10 scale or hours)
const SCORE_COLORS = {
  poor: colors.chart.red500,    // diet: 0-3, sleep: < 6h
  fair: colors.chart.yellow500, // diet: 4-6, sleep: 6-7.5h
  good: colors.chart.green500,  // diet: 7-10, sleep: >= 7.5h
  none: colors.backgroundSubtle,
};

interface WeeklySummaryChartProps {
  data: WeeklySummaryData | null;
  loading?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  canNavigateForward?: boolean;
}

/**
 * Get color for exercise based on minutes (gradient)
 */
function getExerciseColor(minutes: number | null, maxMinutes: number): string {
  if (minutes === null || minutes === 0) return SCORE_COLORS.none;
  // Calculate opacity/intensity based on value
  const intensity = Math.min(1, minutes / maxMinutes);
  // Interpolate between background and exercise color
  return interpolateColor(colors.backgroundSubtle, EXERCISE_COLOR, intensity);
}

/**
 * Get color for mindfulness based on minutes (gradient)
 */
function getMindfulColor(minutes: number | null, maxMinutes: number): string {
  if (minutes === null || minutes === 0) return SCORE_COLORS.none;
  const intensity = Math.min(1, minutes / maxMinutes);
  return interpolateColor(colors.backgroundSubtle, MINDFUL_COLOR, intensity);
}

/**
 * Get color for diet score (red/yellow/green thresholds)
 */
function getDietColor(score: number | null): string {
  if (score === null) return SCORE_COLORS.none;
  if (score <= 3) return SCORE_COLORS.poor;
  if (score <= 6) return SCORE_COLORS.fair;
  return SCORE_COLORS.good;
}

/**
 * Get color for sleep hours (red/yellow/green thresholds)
 */
function getSleepColor(hours: number | null): string {
  if (hours === null) return SCORE_COLORS.none;
  if (hours < 6) return SCORE_COLORS.poor;
  if (hours < 7.5) return SCORE_COLORS.fair;
  return SCORE_COLORS.good;
}

/**
 * Simple color interpolation between two hex colors
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');
  
  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);
  
  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);
  
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function WeeklySummaryChart({
  data,
  loading,
  onNavigateBack,
  onNavigateForward,
  canNavigateForward = true,
}: WeeklySummaryChartProps) {
  if (loading || !data) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.navButton} disabled>
            <Text style={[styles.navButtonText, styles.navButtonTextDisabled]}>←</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Weekly Summary</Text>
            <Text style={styles.subtitle}>Loading...</Text>
          </View>
          <TouchableOpacity style={[styles.navButton, styles.navButtonDisabled]} disabled>
            <Text style={[styles.navButtonText, styles.navButtonTextDisabled]}>→</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingGrid}>
          {[...Array(4)].map((_, row) => (
            <View key={row} style={styles.row}>
              <View style={styles.labelCell}>
                <Text style={styles.labelText}>{ROW_LABELS[row]}</Text>
              </View>
              {[...Array(7)].map((_, col) => (
                <View key={col} style={[styles.cell, { backgroundColor: SCORE_COLORS.none }]} />
              ))}
            </View>
          ))}
        </View>
      </View>
    );
  }

  const { days, maxExercise, maxMindful } = data;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.navButton}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Weekly Summary</Text>
          <Text style={styles.subtitle}>
            {data.startDateStr} - {data.endDateStr}
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={onNavigateForward} 
          style={[styles.navButton, !canNavigateForward && styles.navButtonDisabled]}
          disabled={!canNavigateForward}
        >
          <Text style={[styles.navButtonText, !canNavigateForward && styles.navButtonTextDisabled]}>
            →
          </Text>
        </TouchableOpacity>
      </View>

      {/* Day labels header */}
      <View style={styles.dayLabelsRow}>
        <View style={styles.labelCell} />
        {DAY_LABELS.map((label, idx) => (
          <View key={idx} style={styles.dayLabelCell}>
            <Text style={styles.dayLabelText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Exercise row */}
      <View style={styles.row}>
        <View style={styles.labelCell}>
          <Text style={styles.labelText}>{ROW_LABELS[0]}</Text>
        </View>
        {days.map((day, idx) => (
          <View 
            key={idx} 
            style={[styles.cell, { backgroundColor: getExerciseColor(day.exercise, maxExercise) }]}
          />
        ))}
      </View>

      {/* Diet row */}
      <View style={styles.row}>
        <View style={styles.labelCell}>
          <Text style={styles.labelText}>{ROW_LABELS[1]}</Text>
        </View>
        {days.map((day, idx) => (
          <View 
            key={idx} 
            style={[styles.cell, { backgroundColor: getDietColor(day.dietScore) }]}
          />
        ))}
      </View>

      {/* Sleep row */}
      <View style={styles.row}>
        <View style={styles.labelCell}>
          <Text style={styles.labelText}>{ROW_LABELS[2]}</Text>
        </View>
        {days.map((day, idx) => (
          <View 
            key={idx} 
            style={[styles.cell, { backgroundColor: getSleepColor(day.sleepHours) }]}
          />
        ))}
      </View>

      {/* Mindfulness row */}
      <View style={styles.row}>
        <View style={styles.labelCell}>
          <Text style={styles.labelText}>{ROW_LABELS[3]}</Text>
        </View>
        {days.map((day, idx) => (
          <View 
            key={idx} 
            style={[styles.cell, { backgroundColor: getMindfulColor(day.mindfulMinutes, maxMindful) }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing[4],
    paddingHorizontal: CARD_PADDING_X,
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foreground,
  },
  subtitle: {
    fontSize: fontSizes.xs,
    color: colors.foregroundMuted,
    marginTop: spacing[1],
  },
  navButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: fontSizes.base,
    color: colors.foreground,
  },
  navButtonTextDisabled: {
    color: colors.foregroundSubtle,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  dayLabelCell: {
    width: CELL_SIZE,
    marginHorizontal: CELL_GAP / 2,
    alignItems: 'center',
  },
  dayLabelText: {
    fontSize: fontSizes.xs,
    color: colors.foregroundMuted,
    fontFamily: fonts.regular,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: CELL_GAP / 2,
  },
  labelCell: {
    width: LABEL_WIDTH,
    paddingRight: spacing[2],
  },
  labelText: {
    fontSize: fontSizes.xs,
    color: colors.foregroundMuted,
    fontFamily: fonts.regular,
    textAlign: 'right',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    marginHorizontal: CELL_GAP / 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingGrid: {
    opacity: 0.5,
  },
});
