/**
 * Sleep chart using ECharts
 * Shows sleep hours with color coding and moving average
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EChart, echarts } from './EChart';
import { ChartCard } from './ChartCard';
import { colors, fontSizes } from '@/lib/theme';
import type { SleepDataPoint } from '@timtracker/ui/types';
import { format, parseISO } from 'date-fns';

interface SleepChartProps {
  data: SleepDataPoint[];
  loading?: boolean;
}

// Sleep quality colors using theme (Tailwind)
const SLEEP_COLORS = {
  poor: colors.chart.red500,
  fair: colors.chart.yellow500,
  good: colors.chart.green500,
  line: colors.chart.slate600, // Softer trend line
};

export function SleepChart({ data, loading }: SleepChartProps) {
  const option = useMemo((): echarts.EChartsCoreOption => {
    if (!data || data.length === 0) {
      return {};
    }

    const dates = data.map(d => d.date);
    const hours = data.map(d => d.hours);
    const movingAvg = data.map(d => d.movingAvg);

    // Color based on hours
    const getColor = (h: number) => {
      if (h < 6) return SLEEP_COLORS.poor;
      if (h < 7.5) return SLEEP_COLORS.fair;
      return SLEEP_COLORS.good;
    };

    const barColors = hours.map(h => getColor(h));

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
          const point = Array.isArray(params) ? params[0] : params;
          const idx = point.dataIndex;
          const date = format(parseISO(dates[idx]), 'MMM d, yyyy');
          const h = hours[idx];
          const totalMinutes = Math.round(h * 60);
          const hrs = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          const avg = movingAvg[idx]?.toFixed(1) ?? 'N/A';
          return `${date}\nSleep: ${hrs}h ${mins}m\n7-day Avg: ${avg}h`;
        },
      },
      grid: {
        left: 40,
        right: 10,
        top: 30,
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
      yAxis: {
        type: 'value',
        min: 0,
        max: 12,
        splitLine: { lineStyle: { color: colors.border } },
        axisLabel: {
          formatter: (value: number) => `${value}h`,
          fontSize: 10,
          color: colors.foregroundMuted,
        },
      },
      series: [
        {
          name: 'Sleep',
          type: 'bar',
          data: hours.map((h, i) => ({
            value: h,
            itemStyle: { color: barColors[i] },
          })),
        },
        {
          name: '7-day Avg',
          type: 'line',
          data: movingAvg,
          smooth: true,
          lineStyle: {
            color: SLEEP_COLORS.line,
            width: 2,
          },
          symbol: 'none',
        },
      ],
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <ChartCard title="Daily Sleep" loading={loading}>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No sleep data available</Text>
        </View>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Daily Sleep" loading={loading}>
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
