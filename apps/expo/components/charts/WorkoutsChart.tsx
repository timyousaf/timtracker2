/**
 * Weekly workouts stacked bar chart using ECharts
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EChart, echarts } from './EChart';
import { ChartCard } from './ChartCard';
import { colors, fontSizes } from '@/lib/theme';
import type { WeeklyWorkoutsData } from '@timtracker/ui/types';

interface WorkoutsChartProps {
  data: WeeklyWorkoutsData | null;
  loading?: boolean;
}

// Shadcn/Tailwind chart color palette from theme
const CHART_COLORS = [
  colors.chart.zinc900,
  colors.chart.blue500,
  colors.chart.green500,
  colors.chart.amber500,
  colors.chart.violet500,
  colors.chart.pink500,
  colors.chart.cyan500,
  colors.chart.lime500,
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
        color: CHART_COLORS[idx % CHART_COLORS.length],
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
          color: colors.chart.red500,
          type: 'dashed' as any,
        } as any,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: {
          color: colors.chart.red500,
        },
      } as any);
    }

    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        textStyle: {
          color: colors.foreground,
          fontSize: 12,
        },
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
            lines.splice(1, 0, `Total: ${total} min`);
          }
          
          return lines.join('\n');
        },
      },
      legend: {
        bottom: 0,
        type: 'scroll',
        textStyle: { 
          fontSize: 10,
          color: colors.foregroundMuted,
        },
      },
      grid: {
        left: 40,
        right: 40,
        top: 20,
        bottom: 60,
      },
      xAxis: {
        type: 'category',
        data: data.categories,
        axisLine: { lineStyle: { color: colors.border } },
        axisLabel: {
          rotate: 45,
          fontSize: 9,
          color: colors.foregroundMuted,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Minutes',
          nameTextStyle: { color: colors.foregroundMuted },
          splitLine: { lineStyle: { color: colors.border } },
          axisLabel: { fontSize: 10, color: colors.foregroundMuted },
        },
        {
          type: 'value',
          name: 'HR',
          min: 0,
          max: 200,
          nameTextStyle: { color: colors.foregroundMuted },
          axisLabel: { fontSize: 10, color: colors.foregroundMuted },
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
    color: colors.foregroundMuted,
    fontSize: fontSizes.sm,
  },
});
