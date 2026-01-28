/**
 * Weekly Summary Chart using ECharts
 * A 4x7 heatmap grid showing exercise, diet, sleep, and mindfulness for the current week
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { EChart, echarts } from './EChart';
import { colors, fontSizes, fonts, spacing, borderRadius } from '@/lib/theme';
import type { WeeklySummaryData } from '@timtracker/ui/types';
import { format, parseISO } from 'date-fns';

const screenWidth = Dimensions.get('window').width;
const CARD_PADDING_X = spacing[2];

// Row labels (bottom to top in ECharts grid)
const ROW_LABELS = ['Mindful', 'Sleep', 'Diet', 'Exercise'];
const ROW_TYPES = ['mindful', 'sleep', 'diet', 'exercise'] as const;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Color schemes
const EXERCISE_COLOR = colors.chart.emerald500;
const MINDFUL_COLOR = colors.chart.purple500;
const SCORE_COLORS = {
  poor: colors.chart.red500,
  fair: colors.chart.yellow500,
  good: colors.chart.green500,
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
  const option = useMemo((): echarts.EChartsCoreOption => {
    if (!data || !data.days || data.days.length === 0) {
      return {};
    }

    const { days, maxExercise, maxMindful } = data;

    // Build heatmap data: [colIndex, rowIndex, value, metadata]
    // Rows: 0=Mindful, 1=Sleep, 2=Diet, 3=Exercise (bottom to top)
    // Cols: 0=Sun through 6=Sat
    const heatmapData: Array<[number, number, number, object]> = [];

    days.forEach((day, colIndex) => {
      // Exercise (row 3)
      heatmapData.push([colIndex, 3, day.exercise ?? 0, {
        type: 'exercise',
        date: day.date,
        value: day.exercise,
        maxValue: maxExercise,
      }]);

      // Diet (row 2)
      heatmapData.push([colIndex, 2, day.dietScore ?? 0, {
        type: 'diet',
        date: day.date,
        value: day.dietScore,
      }]);

      // Sleep (row 1)
      heatmapData.push([colIndex, 1, day.sleepHours ?? 0, {
        type: 'sleep',
        date: day.date,
        value: day.sleepHours,
      }]);

      // Mindful (row 0)
      heatmapData.push([colIndex, 0, day.mindfulMinutes ?? 0, {
        type: 'mindful',
        date: day.date,
        value: day.mindfulMinutes,
        maxValue: maxMindful,
      }]);
    });

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
        formatter: (params: any) => {
          const meta = params.data[3];
          const dateStr = format(parseISO(meta.date), 'MMM d, yyyy');
          
          switch (meta.type) {
            case 'exercise': {
              if (meta.value === null || meta.value === 0) {
                return `${dateStr}\nNo exercise`;
              }
              const mins = Math.round(meta.value);
              return `${dateStr}\n${mins} min`;
            }
            case 'diet': {
              if (meta.value === null) {
                return `${dateStr}\nNo diet data`;
              }
              return `${dateStr}\nScore: ${meta.value}/10`;
            }
            case 'sleep': {
              if (meta.value === null) {
                return `${dateStr}\nNo sleep data`;
              }
              const totalMinutes = Math.round(meta.value * 60);
              const hrs = Math.floor(totalMinutes / 60);
              const mins = totalMinutes % 60;
              return `${dateStr}\nSleep: ${hrs}h ${mins}m`;
            }
            case 'mindful': {
              if (meta.value === null || meta.value === 0) {
                return `${dateStr}\nNo mindfulness`;
              }
              const mins = Math.round(meta.value);
              return `${dateStr}\n${mins} min`;
            }
            default:
              return dateStr;
          }
        },
      },
      grid: {
        left: 60,
        right: 10,
        top: 30,
        bottom: 10,
        containLabel: false,
      },
      xAxis: {
        type: 'category',
        data: DAY_LABELS,
        position: 'top',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 11,
          color: colors.foregroundMuted,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: ROW_LABELS,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          fontSize: 11,
          color: colors.foregroundMuted,
        },
        splitLine: { show: false },
      },
      series: [
        {
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: false,
          },
          itemStyle: {
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 4,
          },
          emphasis: {
            itemStyle: {
              borderColor: colors.foreground,
              borderWidth: 2,
            },
          },
        },
      ],
      visualMap: {
        show: false,
        // We'll handle colors in itemStyle directly
        min: 0,
        max: 10,
        inRange: {
          color: [colors.backgroundSubtle, colors.chart.green500],
        },
      },
    };
  }, [data]);

  // Custom color function for each cell
  const optionWithColors = useMemo((): echarts.EChartsCoreOption => {
    if (!option.series || !data) return option;

    const { maxExercise, maxMindful } = data;

    // Override series with custom colors per item
    const seriesData = (option.series as any)[0]?.data;
    if (!seriesData) return option;

    const coloredData = seriesData.map((item: any) => {
      const meta = item[3];
      let cellColor = SCORE_COLORS.none;

      switch (meta.type) {
        case 'exercise': {
          if (meta.value !== null && meta.value > 0) {
            const intensity = Math.min(1, meta.value / maxExercise);
            cellColor = interpolateColor(colors.backgroundSubtle, EXERCISE_COLOR, intensity);
          }
          break;
        }
        case 'diet': {
          if (meta.value !== null) {
            if (meta.value <= 3) cellColor = SCORE_COLORS.poor;
            else if (meta.value <= 6) cellColor = SCORE_COLORS.fair;
            else cellColor = SCORE_COLORS.good;
          }
          break;
        }
        case 'sleep': {
          if (meta.value !== null) {
            if (meta.value < 6) cellColor = SCORE_COLORS.poor;
            else if (meta.value < 7.5) cellColor = SCORE_COLORS.fair;
            else cellColor = SCORE_COLORS.good;
          }
          break;
        }
        case 'mindful': {
          if (meta.value !== null && meta.value > 0) {
            const intensity = Math.min(1, meta.value / maxMindful);
            cellColor = interpolateColor(colors.backgroundSubtle, MINDFUL_COLOR, intensity);
          }
          break;
        }
      }

      return {
        value: [item[0], item[1], item[2], item[3]],
        itemStyle: {
          color: cellColor,
        },
      };
    });

    return {
      ...option,
      series: [
        {
          ...(option.series as any)[0],
          data: coloredData,
        },
      ],
      // Remove default visualMap since we're using custom colors
      visualMap: undefined,
    };
  }, [option, data]);

  if (!data || !data.days || data.days.length === 0) {
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
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      </View>
    );
  }

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
      
      <EChart option={optionWithColors} height={180} />
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
