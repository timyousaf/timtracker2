import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, Platform } from 'react-native';
import * as echarts from 'echarts/core';
import { HeatmapChart } from 'echarts/charts';
import { CalendarComponent, TooltipComponent, VisualMapComponent } from 'echarts/components';
import { CanvasRenderer, SVGRenderer } from 'echarts/renderers';
import { ChartCard } from './ChartCard';
import type { 
  CalendarHeatmapProps, 
  CalendarHeatmapData,
  CalendarHeatmapPoint,
  WorkoutDetail,
  InteractionDetail,
  MealDetail,
} from '../types/charts';

// Register ECharts components
echarts.use([
  HeatmapChart,
  CalendarComponent,
  TooltipComponent,
  VisualMapComponent,
  Platform.OS === 'web' ? CanvasRenderer : SVGRenderer,
]);

interface CalendarHeatmapComponentProps extends CalendarHeatmapProps {
  data: CalendarHeatmapData | null;
  loading?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  canNavigateForward?: boolean;
}

/**
 * Calendar heatmap using ECharts
 * Works on both web and React Native
 */
export function CalendarHeatmap({
  title,
  chartType,
  colorScale,
  uniformColor,
  unit,
  data,
  loading,
  onNavigateBack,
  onNavigateForward,
  canNavigateForward = true,
}: CalendarHeatmapComponentProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const formatTooltip = useCallback((point: CalendarHeatmapPoint): string => {
    const date = new Date(point.date);
    const dateStr = date.toLocaleDateString();
    const value = point.value || 0;
    
    let content = `<div style="background-color: white; border: 1px solid #ccc; border-radius: 5px; padding: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.2); min-width: 150px; font-size: 12px;">`;
    content += `<div style="font-weight: bold; margin-bottom: 5px;">${dateStr}</div>`;
    content += `<div>${value} ${unit}</div>`;
    
    if (point.workouts && point.workouts.length > 0) {
      content += '<div style="margin-top: 8px; margin-bottom: 5px;"><b>Workouts:</b></div>';
      const sortedWorkouts = [...point.workouts].sort((a, b) => b.durationMinutes - a.durationMinutes);
      sortedWorkouts.forEach((workout: WorkoutDetail) => {
        content += `<div style="margin-top: 3px;">`;
        content += `${workout.type}: ${Math.round(workout.durationMinutes)} min`;
        if (workout.avgHeartRate && workout.maxHeartRate) {
          content += `, avg ${Math.round(workout.avgHeartRate)} bpm, max ${Math.round(workout.maxHeartRate)} bpm`;
        } else if (workout.avgHeartRate) {
          content += `, avg ${Math.round(workout.avgHeartRate)} bpm`;
        } else if (workout.maxHeartRate) {
          content += `, max ${Math.round(workout.maxHeartRate)} bpm`;
        }
        content += `</div>`;
      });
    }
    
    if (point.interactions && point.interactions.length > 0) {
      content += '<div style="margin-top: 8px; margin-bottom: 5px;"><b>Interactions:</b></div>';
      point.interactions.forEach((interaction: InteractionDetail) => {
        content += `<div style="margin-top: 3px;">${interaction.personName}, ${interaction.interactionType}`;
        if (interaction.note) {
          content += `, ${interaction.note}`;
        }
        content += `</div>`;
      });
    }
    
    if (point.meals && point.meals.length > 0) {
      content += '<div style="margin-top: 8px; margin-bottom: 5px;"><b>Meals:</b></div>';
      point.meals.forEach((meal: MealDetail) => {
        content += `<div style="margin-top: 3px;">${meal.description}</div>`;
      });
    }
    
    content += '</div>';
    return content;
  }, [unit]);

  const renderChart = useCallback(() => {
    if (!data || !chartRef.current) return;

    // Dispose existing chart
    if (chartInstance.current) {
      chartInstance.current.dispose();
    }

    // Create new chart
    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;

    // Transform data for ECharts
    // ECharts calendar expects [date, value] format
    const startDate = new Date(data.points[0]?.date || new Date());
    const endDate = new Date(data.points[data.points.length - 1]?.date || new Date());
    
    const heatmapData = data.points.map(point => [
      point.date,
      point.value ?? 0,
    ]);

    // Store point data for tooltips
    const pointsByDate = new Map<string, CalendarHeatmapPoint>();
    data.points.forEach(point => {
      pointsByDate.set(point.date, point);
    });

    // Determine color based on chart type
    const mainColor = uniformColor || (colorScale ? colorScale[1] : '#4CAF50');

    const option: echarts.EChartsCoreOption = {
      tooltip: {
        formatter: (params: any) => {
          const date = params.data[0];
          const point = pointsByDate.get(date);
          if (point) {
            return formatTooltip(point);
          }
          return '';
        },
      },
      visualMap: {
        min: 0,
        max: Math.max(...heatmapData.map(d => d[1] as number), 1),
        show: false,
        inRange: {
          color: ['#ffffff', mainColor],
        },
      },
      calendar: {
        top: 60,
        left: 30,
        right: 30,
        cellSize: ['auto', 40],
        range: [
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0],
        ],
        itemStyle: {
          borderWidth: 1,
          borderColor: '#fff',
        },
        dayLabel: {
          firstDay: 0, // Sunday
          nameMap: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        },
        monthLabel: {
          show: false,
        },
        yearLabel: {
          show: false,
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
              return date.getDate().toString();
            },
          },
        },
      ],
    };

    chart.setOption(option);

    // Handle resize
    const handleResize = () => {
      chart.resize();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [data, uniformColor, colorScale, formatTooltip]);

  useEffect(() => {
    const cleanup = renderChart();
    return () => {
      cleanup?.();
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, [renderChart]);

  if (loading && !data) {
    return (
      <ChartCard>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading {title}...</Text>
        </View>
      </ChartCard>
    );
  }

  return (
    <ChartCard style={styles.cardContainer}>
      <View style={styles.header}>
        <Pressable onPress={onNavigateBack} style={styles.navButton}>
          <Text style={styles.navButtonText}>←</Text>
        </Pressable>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {data && (
            <Text style={styles.subtitle}>
              {data.startDateStr} - {data.endDateStr}
            </Text>
          )}
        </View>
        
        <Pressable 
          onPress={onNavigateForward} 
          style={[styles.navButton, !canNavigateForward && styles.navButtonDisabled]}
          disabled={!canNavigateForward}
        >
          <Text style={[styles.navButtonText, !canNavigateForward && styles.navButtonTextDisabled]}>
            →
          </Text>
        </Pressable>
      </View>
      
      {Platform.OS === 'web' ? (
        <div 
          ref={chartRef} 
          style={{ width: '100%', height: 300 }}
        />
      ) : (
        <View style={styles.nativeChartContainer}>
          <Text style={styles.nativeChartText}>
            Calendar heatmap requires web view on mobile.
            {/* For full native support, integrate react-native-echarts */}
          </Text>
        </View>
      )}
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#222',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  navButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 16,
    color: '#333',
  },
  navButtonTextDisabled: {
    color: '#999',
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  nativeChartContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  nativeChartText: {
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
});
