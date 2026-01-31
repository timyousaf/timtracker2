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
import { Dumbbell, Utensils, BedDouble, Brain } from 'lucide-react-native';

const screenWidth = Dimensions.get('window').width;
const CARD_PADDING_X = spacing[2];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Left margin for icons
const ICON_COLUMN_WIDTH = 32;

// Color schemes
const EXERCISE_COLOR = colors.chart.emerald500;
const MINDFUL_COLOR = colors.chart.purple500;
const SCORE_COLORS = {
  poor: colors.chart.red500,
  fair: colors.chart.yellow500,
  good: colors.chart.green500,
  none: colors.background, // white for empty cells
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
        workouts: day.workouts,
      }]);

      // Diet (row 2)
      heatmapData.push([colIndex, 2, day.dietScore ?? 0, {
        type: 'diet',
        date: day.date,
        value: day.dietScore,
        meals: day.meals,
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
        // Removed enterable: true - allows tooltip to dismiss when tapping on it
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        textStyle: {
          color: colors.foreground,
          fontSize: 9,
        },
        extraCssText: 'max-width: 220px; white-space: pre-wrap; word-wrap: break-word;',
        position: function (point: number[], params: any, dom: any, rect: any, size: any) {
          // Position tooltip to avoid overflow
          const tooltipWidth = size.contentSize[0];
          const tooltipHeight = size.contentSize[1];
          const chartWidth = size.viewSize[0];
          const chartHeight = size.viewSize[1];
          let x = point[0];
          let y = point[1];
          
          // If tooltip would overflow right, position to the left
          if (x + tooltipWidth > chartWidth - 10) {
            x = x - tooltipWidth - 10;
          } else {
            x = x + 10;
          }
          
          // If tooltip would overflow bottom, position above
          if (y + tooltipHeight > chartHeight - 10) {
            y = Math.max(10, chartHeight - tooltipHeight - 10);
          }
          
          return [x, y];
        },
        formatter: (params: any) => {
          // Handle both array format and object format (when using custom itemStyle)
          const dataArray = Array.isArray(params.data) ? params.data : params.data?.value;
          if (!dataArray || !dataArray[3]) {
            return '';
          }
          const meta = dataArray[3];
          const dateStr = format(parseISO(meta.date), 'MMM d, yyyy');
          
          switch (meta.type) {
            case 'exercise': {
              if (meta.value === null || meta.value === 0) {
                return `${dateStr}\nNo exercise`;
              }
              const mins = Math.round(meta.value);
              let lines = [dateStr, `${mins} min`];
              
              // Add workout details if available
              if (meta.workouts?.length) {
                lines.push('', 'Workouts:');
                meta.workouts.forEach((w: any) => {
                  lines.push(`${w.type}: ${w.durationMinutes}m`);
                });
              }
              return lines.join('\n');
            }
            case 'diet': {
              if (meta.value === null) {
                return `${dateStr}\nNo diet data`;
              }
              let lines = [dateStr, `Score: ${meta.value}/10`];
              
              // Add meal descriptions if available
              if (meta.meals?.length) {
                lines.push('', 'Meals:');
                meta.meals.forEach((m: string) => {
                  lines.push(m);
                });
              }
              return lines.join('\n');
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
        left: ICON_COLUMN_WIDTH + 4, // Space for icons rendered via RN
        right: 4, // Reduced to prevent overflow
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
        data: ['', '', '', ''], // Empty labels - icons rendered via RN overlay
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false }, // Hide text labels
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
            borderRadius: 0, // square corners
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
          color: [colors.background, colors.chart.green500],
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
            cellColor = interpolateColor(colors.background, EXERCISE_COLOR, intensity);
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
            cellColor = interpolateColor(colors.background, MINDFUL_COLOR, intensity);
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
      // Keep visualMap but hide it - ECharts requires it for heatmap
      visualMap: {
        show: false,
        min: 0,
        max: 10,
      },
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

  // Chart dimensions for icon positioning
  const chartHeight = 180;
  const gridTop = 30;
  const gridBottom = 10;
  const gridHeight = chartHeight - gridTop - gridBottom;
  const cellHeight = gridHeight / 4; // 4 rows

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
      
      <View style={styles.chartWrapper}>
        {/* Icon column overlay - positioned absolutely over the chart area */}
        <View style={[styles.iconColumn, { top: gridTop, height: gridHeight }]}>
          {/* Icons from top to bottom: Exercise, Diet, Sleep, Mindful (reversed from ROW_ICONS) */}
          {[Dumbbell, Utensils, BedDouble, Brain].map((Icon, index) => (
            <View key={index} style={[styles.iconCell, { height: cellHeight }]}>
              <Icon size={16} color={colors.foregroundMuted} strokeWidth={1.5} />
            </View>
          ))}
        </View>
        <EChart option={optionWithColors} height={chartHeight} />
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
  chartWrapper: {
    position: 'relative',
  },
  iconColumn: {
    position: 'absolute',
    left: 0,
    width: ICON_COLUMN_WIDTH,
    // No zIndex - icons should be behind tooltips which render on top
    flexDirection: 'column',
  },
  iconCell: {
    justifyContent: 'center',
    alignItems: 'center',
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
