/**
 * Exercise progress chart using ECharts
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EChart, echarts } from './EChart';
import { ChartCard } from './ChartCard';
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
    const volume = data.map(d => useReps ? d.totalReps : d.totalVolume);
    const maxWeight = data.map(d => d.maxWeight);

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const items = Array.isArray(params) ? params : [params];
          const idx = items[0].dataIndex;
          const date = format(parseISO(dates[idx]), 'MMM d, yyyy');
          const vol = volume[idx];
          const max = maxWeight[idx];
          const sets = data[idx]?.sets || [];
          
          let lines = [
            `<b>${date}</b>`,
            `${useReps ? 'Total Reps' : 'Total Volume'}: ${vol.toLocaleString()}${useReps ? '' : ' lbs'}`,
            `Max Weight: ${max} lbs`,
          ];
          
          if (sets.length > 0) {
            lines.push('<br/><b>Sets:</b>');
            sets.forEach((s, i) => {
              lines.push(`Set ${i + 1}: ${s.reps} reps @ ${s.weight} lbs`);
            });
          }
          
          return lines.join('<br/>');
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
        axisLabel: {
          formatter: (value: string) => format(parseISO(value), 'M/d'),
          rotate: 45,
          fontSize: 10,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: useReps ? 'Reps' : 'Volume',
          axisLabel: { fontSize: 10 },
        },
        {
          type: 'value',
          name: 'Weight',
          axisLabel: { fontSize: 10 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: useReps ? 'Reps' : 'Volume',
          type: 'bar',
          data: volume,
          itemStyle: {
            color: '#8884d8',
          },
        },
        {
          name: 'Max Weight',
          type: 'scatter',
          yAxisIndex: 1,
          data: maxWeight,
          itemStyle: {
            color: '#AA4643',
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
            color: '#AA4643',
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
    color: '#666',
    fontSize: 14,
  },
});
