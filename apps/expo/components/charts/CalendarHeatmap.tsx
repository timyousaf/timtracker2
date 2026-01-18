/**
 * Calendar heatmap using ECharts
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EChart, echarts } from './EChart';
import { ChartCard } from './ChartCard';
import type { CalendarHeatmapData } from '@timtracker/ui/types';

interface CalendarHeatmapProps {
  title: string;
  chartType: string;
  unit: string;
  colorScale?: [string, string];
  uniformColor?: string;
  data: CalendarHeatmapData | null;
  loading?: boolean;
  onNavigateBack?: () => void;
  onNavigateForward?: () => void;
  canNavigateForward?: boolean;
}

export function CalendarHeatmap({
  title,
  unit,
  colorScale,
  uniformColor,
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

    // Transform data for ECharts calendar
    const heatmapData = data.points.map(p => [p.date, p.value ?? 0]);
    const maxValue = Math.max(...data.points.map(p => p.value ?? 0), 1);
    const mainColor = uniformColor || (colorScale ? colorScale[1] : '#4CAF50');

    // Get actual ISO date range from points (sorted)
    const dates = data.points.map(p => p.date).sort();
    const startDate = dates[0]; // ISO format like "2024-12-15"
    const endDate = dates[dates.length - 1];

    return {
      tooltip: {
        formatter: (params: any) => {
          const [date, value] = params.data;
          const point = data.points.find(p => p.date === date);
          
          let lines = [`<b>${date}</b>`, `${value} ${unit}`];
          
          if (point?.workouts?.length) {
            lines.push('<br/><b>Workouts:</b>');
            point.workouts.forEach(w => {
              lines.push(`${w.type}: ${Math.round(w.durationMinutes)} min`);
            });
          }
          
          if (point?.interactions?.length) {
            lines.push('<br/><b>Interactions:</b>');
            point.interactions.slice(0, 3).forEach(i => {
              lines.push(`${i.personName} (${i.interactionType})`);
            });
          }
          
          if (point?.meals?.length) {
            lines.push('<br/><b>Meals:</b>');
            point.meals.slice(0, 3).forEach(m => {
              const desc = m.description.length > 30 
                ? m.description.substring(0, 30) + '...' 
                : m.description;
              lines.push(desc);
            });
          }
          
          return lines.join('<br/>');
        },
      },
      visualMap: {
        show: false,
        min: 0,
        max: maxValue,
        inRange: {
          color: ['#ffffff', mainColor],
        },
      },
      calendar: {
        orient: 'vertical', // Standard calendar: weeks as rows, weekdays as columns
        top: 60,
        left: 50,
        right: 50,
        bottom: 20,
        cellSize: [80, 45], // [width, height] for each cell
        range: [startDate, endDate],
        itemStyle: {
          borderWidth: 1,
          borderColor: '#e0e0e0',
        },
        dayLabel: {
          firstDay: 0, // Start week on Sunday
          margin: 10,
          nameMap: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          fontSize: 11,
          color: '#666',
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
            color: '#e0e0e0',
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
              return date.getDate().toString();
            },
            fontSize: 12,
            color: '#333',
          },
        },
      ],
    };
  }, [data, unit, colorScale, uniformColor]);

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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  titleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  noData: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#666',
    fontSize: 14,
  },
});
