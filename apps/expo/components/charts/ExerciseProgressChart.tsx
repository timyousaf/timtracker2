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
        confine: true,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        textStyle: {
          color: colors.foreground,
          fontSize: 12,
        },
        extraCssText: 'max-width: 220px; white-space: pre-wrap;',
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const idx = items[0].dataIndex;
          const date = format(parseISO(dates[idx]), 'MMM d, yyyy');
          const vol = volume[idx];
          const max = maxWeight[idx];
          const sets = data[idx]?.sets || [];
          
          // Handle null values (no data for this date)
          if (vol == null || max == null) {
            return `${date}\nNo data`;
          }
          
          let lines = [
            date,
            `${useReps ? 'Total Reps' : 'Volume'}: ${vol.toLocaleString()}${useReps ? '' : ' lbs'}`,
            `Max Weight: ${max} lbs`,
          ];
          
          if (sets.length > 0) {
            lines.push('', 'Sets:');
            sets.slice(0, 5).forEach((s, i) => {
              lines.push(`${s.reps}x${s.weight} lbs`);
            });
            if (sets.length > 5) {
              lines.push(`+${sets.length - 5} more`);
            }
          }
          
          return lines.join('\n');
        },
      },
      grid: {
        left: 50,
        right: 50,
        top: 40, // More space for dots at top
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
          type: 'line',
          yAxisIndex: 1,
          data: maxWeight,
          connectNulls: true, // Connect dots across null gaps
          lineStyle: {
            color: colors.chart.red500,
            width: 2,
          },
          itemStyle: {
            color: colors.chart.red500,
          },
          symbol: 'circle',
          symbolSize: 8,
          showAllSymbol: true, // Always show symbols even when sparse
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
