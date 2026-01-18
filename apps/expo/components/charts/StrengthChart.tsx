/**
 * Strength training volume chart using ECharts
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EChart, echarts } from './EChart';
import { ChartCard } from './ChartCard';
import type { StrengthVolumeData } from '@timtracker/ui/types';

interface StrengthChartProps {
  data: StrengthVolumeData | null;
  loading?: boolean;
}

export function StrengthChart({ data, loading }: StrengthChartProps) {
  const option = useMemo((): echarts.EChartsCoreOption => {
    if (!data || data.categories.length === 0) {
      return {};
    }

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const point = Array.isArray(params) ? params[0] : params;
          const idx = point.dataIndex;
          const week = data.categories[idx];
          const volume = data.series[idx];
          const workouts = data.workouts?.[idx] || [];
          
          let lines = [
            `<b>${week}</b>`,
            `<b>${volume.toLocaleString()} lbs</b>`,
          ];
          
          if (workouts.length > 0) {
            lines.push('<br/><b>Workouts:</b>');
            workouts.forEach(w => {
              lines.push(`${w.title}: ${w.volume.toLocaleString()} lbs`);
            });
          }
          
          return lines.join('<br/>');
        },
      },
      grid: {
        left: 60,
        right: 20,
        top: 20,
        bottom: 50,
      },
      xAxis: {
        type: 'category',
        data: data.categories,
        axisLabel: {
          rotate: 45,
          fontSize: 9,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => `${(value / 1000).toFixed(0)}k`,
          fontSize: 10,
        },
      },
      series: [
        {
          name: 'Volume',
          type: 'bar',
          data: data.series,
          itemStyle: {
            color: '#8884d8',
          },
        },
      ],
    };
  }, [data]);

  if (!data || data.categories.length === 0) {
    return (
      <ChartCard title="Weekly Strength Training Volume" loading={loading}>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No strength training data available</Text>
        </View>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Weekly Strength Training Volume" loading={loading}>
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
