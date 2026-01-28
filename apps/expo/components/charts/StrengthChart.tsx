/**
 * Strength training volume chart using ECharts
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EChart, echarts } from './EChart';
import { ChartCard } from './ChartCard';
import { colors, fontSizes } from '@/lib/theme';
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

    // Helper to wrap text at word boundaries
    const wrapText = (text: string, maxWidth: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
        if (currentLine.length + word.length + 1 <= maxWidth) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
    };

    return {
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        textStyle: {
          color: colors.foreground,
          fontSize: 9,
        },
        extraCssText: 'max-width: 220px; white-space: pre-wrap;',
        formatter: (params: any) => {
          const point = Array.isArray(params) ? params[0] : params;
          const idx = point.dataIndex;
          const week = data.categories[idx];
          const volume = data.series[idx];
          const workouts = data.workouts?.[idx] || [];
          
          let lines = [
            week,
            `${volume.toLocaleString()} lbs`,
          ];
          
          if (workouts.length > 0) {
            lines.push('', 'Workouts:');
            workouts.slice(0, 5).forEach(w => {
              wrapText(`${w.title}: ${w.volume.toLocaleString()} lbs`, 28).forEach(l => lines.push(l));
            });
            if (workouts.length > 5) {
              lines.push(`+${workouts.length - 5} more`);
            }
          }
          
          return lines.join('\n');
        },
      },
      grid: {
        left: 50,
        right: 10,
        top: 20,
        bottom: 50,
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
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: colors.border } },
        axisLabel: {
          formatter: (value: number) => `${(value / 1000).toFixed(0)}k`,
          fontSize: 10,
          color: colors.foregroundMuted,
        },
      },
      series: [
        {
          name: 'Volume',
          type: 'bar',
          data: data.series,
          itemStyle: {
            color: colors.chart.violet500,
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
    color: colors.foregroundMuted,
    fontSize: fontSizes.sm,
  },
});
