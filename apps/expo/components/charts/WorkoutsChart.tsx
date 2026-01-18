/**
 * Weekly workouts stacked bar chart using ECharts
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EChart, echarts } from './EChart';
import { ChartCard } from './ChartCard';
import type { WeeklyWorkoutsData } from '@timtracker/ui/types';

interface WorkoutsChartProps {
  data: WeeklyWorkoutsData | null;
  loading?: boolean;
}

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', 
  '#a4de6c', '#d0ed57', '#8dd1e1', '#83a6ed',
];

export function WorkoutsChart({ data, loading }: WorkoutsChartProps) {
  const option = useMemo((): echarts.EChartsCoreOption => {
    if (!data || data.categories.length === 0) {
      return {};
    }

    const series = data.series.map((s, idx) => ({
      name: s.name,
      type: 'bar' as const,
      stack: s.stack || 'total',
      data: s.data,
      itemStyle: {
        color: COLORS[idx % COLORS.length],
      },
    }));

    // Add max heart rate line if available
    if (data.maxHeartRate && data.maxHeartRate.some(v => v != null)) {
      series.push({
        name: 'Max HR',
        type: 'line' as any,
        yAxisIndex: 1 as any,
        data: data.maxHeartRate as any,
        lineStyle: {
          color: '#FF0000',
          type: 'dashed' as any,
        } as any,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: '#FF0000',
        },
      } as any);
    }

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const week = items[0]?.axisValue || '';
          let total = 0;
          let lines = [`<b>${week}</b>`];
          
          items.forEach((item: any) => {
            if (item.seriesName === 'Max HR') {
              if (item.value != null) {
                lines.push(`<span style="color:${item.color}">Max HR: ${item.value} bpm</span>`);
              }
            } else if (item.value > 0) {
              total += item.value;
              lines.push(`${item.seriesName}: ${item.value} min`);
            }
          });
          
          if (total > 0) {
            lines.splice(1, 0, `<b>Total: ${total} min</b>`);
          }
          
          return lines.join('<br/>');
        },
      },
      legend: {
        bottom: 0,
        type: 'scroll',
        textStyle: { fontSize: 10 },
      },
      grid: {
        left: 50,
        right: 50,
        top: 20,
        bottom: 60,
      },
      xAxis: {
        type: 'category',
        data: data.categories,
        axisLabel: {
          rotate: 45,
          fontSize: 9,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Minutes',
          axisLabel: { fontSize: 10 },
        },
        {
          type: 'value',
          name: 'HR',
          min: 0,
          max: 200,
          axisLabel: { fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series,
    };
  }, [data]);

  if (!data || data.categories.length === 0) {
    return (
      <ChartCard title="Weekly Exercise" loading={loading}>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No workout data available</Text>
        </View>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Weekly Exercise" loading={loading}>
      <EChart option={option} height={300} />
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  noData: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#666',
    fontSize: 14,
  },
});
