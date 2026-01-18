/**
 * Exercise progress chart using ECharts
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EChart, echarts } from './EChart';
import { ChartCard } from './ChartCard';
import { colors, fontSizes } from '@/lib/theme';
import type { ExerciseProgressDataPoint } from '@timtracker/ui/types';
import { format, parseISO } from 'date-fns';

interface ExerciseProgressChartProps {
  data: ExerciseProgressDataPoint[];
  exerciseName: string;
  displayName: string;
  useReps?: boolean;
  loading?: boolean;
}

export function ExerciseProgressChart({
  data,
  displayName,
  useReps = false,
  loading,
}: ExerciseProgressChartProps) {
  const option = useMemo((): echarts.EChartsCoreOption => {
    if (!data || data.length === 0) {
      return {};
    }

    const dates = data.map(d => d.date);
    const volume = data.map(d => useReps ? d.reps : d.totalVolume);
    const maxWeight = data.map(d => d.maxWeight);

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
          const idx = items[0].dataIndex;
          const date = format(parseISO(dates[idx]), 'MMM d, yyyy');
          const vol = volume[idx];
          const max = maxWeight[idx];
          const sets = data[idx]?.sets || [];
          
          let lines = [
            date,
            `${useReps ? 'Total Reps' : 'Total Volume'}: ${vol.toLocaleString()}${useReps ? '' : ' lbs'}`,
            `Max Weight: ${max} lbs`,
          ];
          
          if (sets.length > 0) {
            lines.push('', 'Sets:');
            sets.forEach((s, i) => {
              lines.push(`Set ${i + 1}: ${s.reps} reps @ ${s.weight} lbs`);
            });
          }
          
          return lines.join('\n');
        },
      },
      grid: {
        left: 50,
        right: 50,
        top: 20,
        bottom: 40,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: colors.border } },
        axisLabel: {
          formatter: (value: string) => format(parseISO(value), 'M/d'),
          rotate: 45,
          fontSize: 10,
          color: colors.foregroundMuted,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: useReps ? 'Reps' : 'Volume',
          nameTextStyle: { color: colors.foregroundMuted },
          splitLine: { lineStyle: { color: colors.border } },
          axisLabel: { fontSize: 10, color: colors.foregroundMuted },
        },
        {
          type: 'value',
          name: 'Weight',
          nameTextStyle: { color: colors.foregroundMuted },
          axisLabel: { fontSize: 10, color: colors.foregroundMuted },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: useReps ? 'Reps' : 'Volume',
          type: 'bar',
          data: volume,
          itemStyle: {
            color: colors.chart.violet500,
          },
        },
        {
          name: 'Max Weight',
          type: 'scatter',
          yAxisIndex: 1,
          data: maxWeight,
          itemStyle: {
            color: colors.chart.red500,
          },
          symbolSize: 8,
        },
        {
          name: 'Max Weight Trend',
          type: 'line',
          yAxisIndex: 1,
          data: maxWeight,
          smooth: true,
          lineStyle: {
            color: colors.chart.red500,
            width: 1,
          },
          symbol: 'none',
        },
      ],
    };
  }, [data, useReps]);

  if (!data || data.length === 0) {
    return (
      <ChartCard title={`${displayName} Progress`} loading={loading}>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No data for {displayName}</Text>
        </View>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={`${displayName} Progress`} loading={loading}>
      <EChart option={option} height={250} />
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
