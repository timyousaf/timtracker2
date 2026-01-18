/**
 * Sleep chart using ECharts
 * Shows sleep hours with color coding and moving average
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EChart, echarts } from './EChart';
import { ChartCard } from './ChartCard';
import type { SleepDataPoint } from '@timtracker/ui/types';
import { format, parseISO } from 'date-fns';

interface SleepChartProps {
  data: SleepDataPoint[];
  loading?: boolean;
}

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
      if (h < 6) return '#FF0000'; // Red
      if (h < 7.5) return '#FFD700'; // Yellow
      return '#238551'; // Green
    };

    const barColors = hours.map(h => getColor(h));

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const point = Array.isArray(params) ? params[0] : params;
          const idx = point.dataIndex;
          const date = format(parseISO(dates[idx]), 'MMM d, yyyy');
          const h = hours[idx];
          const totalMinutes = Math.round(h * 60);
          const hrs = Math.floor(totalMinutes / 60);
          const mins = totalMinutes % 60;
          const avg = movingAvg[idx]?.toFixed(1) ?? 'N/A';
          return `${date}<br/>Sleep: ${hrs}h ${mins}m<br/>7-day Avg: ${avg}h`;
        },
      },
      grid: {
        left: 50,
        right: 20,
        top: 30,
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
      yAxis: {
        type: 'value',
        min: 0,
        max: 12,
        axisLabel: {
          formatter: (value: number) => `${value}h`,
          fontSize: 10,
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
            color: '#0F6894',
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
    color: '#666',
    fontSize: 14,
  },
});
