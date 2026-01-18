/**
 * Calendar heatmap using ECharts
 * Shadcn-inspired styling
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EChart, echarts } from './EChart';
import { ChartCard } from './ChartCard';
import { colors, fontSizes, fonts, spacing, borderRadius } from '@/lib/theme';
import type { CalendarHeatmapData } from '@timtracker/ui/types';

interface CalendarHeatmapProps {
  title: string;
  chartType: string;
  unit: string;
  colorScale?: [string, string];
  uniformColor?: string;
  useScoreColors?: boolean; // Use red/yellow/green based on point.score (0-10)
  data: CalendarHeatmapData | null;
  loading?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  canNavigateForward?: boolean;
}

// Score-based colors for diet (0-10 scale)
const SCORE_COLORS = {
  poor: colors.chart.red500,    // 0-3
  fair: colors.chart.yellow500, // 4-6
  good: colors.chart.green500,  // 7-10
  none: colors.background,      // no score
};

function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return SCORE_COLORS.none;
  if (score <= 3) return SCORE_COLORS.poor;
  if (score <= 6) return SCORE_COLORS.fair;
  return SCORE_COLORS.good;
}

export function CalendarHeatmap({
  title,
  unit,
  colorScale,
  uniformColor,
  useScoreColors,
  data,
  loading,
  onNavigateBack,
  onNavigateForward,
  canNavigateForward = true,
}: CalendarHeatmapProps) {
  const option = useMemo((): echarts.EChartsCoreOption => {
    if (!data || !data.points || data.points.length === 0) {
      return {};
    }

    // Debug: log data points with non-null values
    const nonNullPoints = data.points.filter(p => p.value !== null && p.value !== 0);

    // Transform data for ECharts calendar
    // For score-based coloring, we include the score as a third element
    const heatmapData = useScoreColors
      ? data.points.map(p => [p.date, p.value ?? 0, p.score ?? null])
      : data.points.map(p => [p.date, p.value ?? 0]);
    const maxValue = Math.max(...data.points.map(p => p.value ?? 0), 1);
    const mainColor = uniformColor || (colorScale ? colorScale[1] : colors.chart.green500);

    // Get actual ISO date range from points (sorted)
    const dates = data.points.map(p => p.date).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];

    // Build visualMap based on coloring mode
    const visualMapConfig = useScoreColors
      ? {
          show: false,
          type: 'piecewise',
          dimension: 2, // Use the third element (score) for coloring
          pieces: [
            { value: null, color: colors.background },
            { min: 0, max: 3, color: SCORE_COLORS.poor },
            { min: 4, max: 6, color: SCORE_COLORS.fair },
            { min: 7, max: 10, color: SCORE_COLORS.good },
          ],
        }
      : {
          show: false,
          min: 0,
          max: maxValue,
          inRange: {
            color: [colors.background, mainColor],
          },
        };

    // Helper to truncate text to a max length
    const truncate = (text: string, maxLen: number) => 
      text.length > maxLen ? text.substring(0, maxLen) + '...' : text;

    return {
      tooltip: {
        confine: true,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        textStyle: {
          color: colors.foreground,
          fontSize: 12,
        },
        extraCssText: 'max-width: 200px; white-space: pre-wrap; word-wrap: break-word;',
        position: function (point: number[], params: any, dom: any, rect: any, size: any) {
          // Position tooltip to the left of the point if near right edge
          const tooltipWidth = size.contentSize[0];
          const chartWidth = size.viewSize[0];
          const x = point[0];
          
          // If tooltip would overflow right, position to the left
          if (x + tooltipWidth > chartWidth - 10) {
            return [x - tooltipWidth - 10, point[1]];
          }
          return [x + 10, point[1]];
        },
        formatter: (params: any) => {
          const [date, value] = params.data;
          const point = data.points.find(p => p.date === date);
          
          let lines = [date, `${value} ${unit}`];
          
          // Add score info for diet calendar
          if (useScoreColors && point?.score !== undefined && point?.score !== null) {
            lines.push(`Score: ${point.score}/10`);
          }
          
          if (point?.workouts?.length) {
            lines.push('', 'Workouts:');
            point.workouts.slice(0, 3).forEach(w => {
              lines.push(truncate(`${w.type}: ${Math.round(w.durationMinutes)}m`, 25));
            });
          }
          
          if (point?.interactions?.length) {
            lines.push('', 'Interactions:');
            point.interactions.slice(0, 3).forEach(i => {
              lines.push(truncate(`${i.personName} (${i.interactionType})`, 25));
            });
          }
          
          if (point?.meals?.length) {
            lines.push('', 'Meals:');
            point.meals.slice(0, 3).forEach(m => {
              lines.push(truncate(m.description, 25));
            });
          }
          
          return lines.join('\n');
        },
      },
      visualMap: visualMapConfig,
      calendar: {
        orient: 'vertical',
        top: 50,
        left: 20,
        right: 20,
        bottom: 20,
        cellSize: [46, 46], // Larger cells to use more horizontal space
        range: [startDate, endDate],
        itemStyle: {
          borderWidth: 1,
          borderColor: colors.border,
        },
        dayLabel: {
          firstDay: 0,
          margin: 8,
          nameMap: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
          fontSize: 11,
          color: colors.foregroundMuted,
        },
        monthLabel: {
          show: false,
        },
        yearLabel: {
          show: false,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: colors.border,
            width: 1,
          },
        },
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: heatmapData,
          label: {
            show: true,
            formatter: (params: any) => {
              const date = new Date(params.data[0]);
              // Use getUTCDate to avoid timezone offset issues
              // ISO dates like '2026-01-18' are parsed as UTC midnight
              return date.getUTCDate().toString();
            },
            fontSize: 12,
            color: colors.foreground,
          },
        },
      ],
    };
  }, [data, unit, colorScale, uniformColor, useScoreColors]);

  if (!data || !data.points || data.points.length === 0) {
    return (
      <ChartCard title={title} loading={loading}>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      </ChartCard>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onNavigateBack} style={styles.navButton}>
          <Text style={styles.navButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
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
      
      <EChart option={option} height={350} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
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
  noData: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: colors.foregroundMuted,
    fontSize: fontSizes.sm,
  },
});
