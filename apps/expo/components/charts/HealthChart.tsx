/**
 * Health metric chart using ECharts
 * Shows bar/scatter data with moving average line
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EChart, echarts } from './EChart';
import { ChartCard } from './ChartCard';
import type { HealthChartDataPoint } from '@timtracker/ui/types';
import { format, parseISO } from 'date-fns';

interface HealthChartProps {
  data: HealthChartDataPoint[];
  title: string;
  color: string;
  unit: string;
  chartType?: 'bar' | 'scatter';
  loading?: boolean;
  scaleToData?: boolean;
}

export function HealthChart({
  data,
  title,
  color,
  unit,
  chartType = 'bar',
  loading,
  scaleToData,
}: HealthChartProps) {
  const option = useMemo((): echarts.EChartsCoreOption => {
    if (!data || data.length === 0) {
      return {};
    }

    const dates = data.map(d => d.date);
    const values = data.map(d => d.value);
    const movingAvg = data.map(d => d.movingAvg);

    // Calculate Y axis range if scaleToData
    let yMin: number | undefined;
    let yMax: number | undefined;
    if (scaleToData && values.length > 0) {
      const validValues = values.filter(v => v != null);
      const min = Math.min(...validValues);
      const max = Math.max(...validValues);
      const padding = (max - min) * 0.1 || 1;
      yMin = Math.floor(min - padding);
      yMax = Math.ceil(max + padding);
    }

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const point = Array.isArray(params) ? params[0] : params;
          const idx = point.dataIndex;
          const date = format(parseISO(dates[idx]), 'MMM d, yyyy');
          const value = values[idx]?.toFixed(1) ?? 'N/A';
          const avg = movingAvg[idx]?.toFixed(1) ?? 'N/A';
          return `${date}<br/>${title}: ${value} ${unit}<br/>7-day Avg: ${avg} ${unit}`;
        },
      },
      grid: {
        left: 50,
        right: 20,
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
      yAxis: {
        type: 'value',
        min: yMin,
        max: yMax,
        axisLabel: {
          formatter: (value: number) => `${value}`,
          fontSize: 10,
        },
      },
      series: [
        {
          name: title,
          type: chartType === 'scatter' ? 'scatter' : 'bar',
          data: values,
          itemStyle: {
            color: color,
            opacity: 0.7,
          },
          symbolSize: chartType === 'scatter' ? 8 : undefined,
        },
        {
          name: '7-day Avg',
          type: 'line',
          data: movingAvg,
          smooth: true,
          lineStyle: {
            color: color,
            width: 2,
          },
          itemStyle: {
            color: color,
          },
          symbol: 'none',
        },
      ],
    };
  }, [data, title, color, unit, chartType, scaleToData]);

  if (!data || data.length === 0) {
    return (
      <ChartCard title={title} loading={loading}>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      </ChartCard>
    );
  }

  return (
    <ChartCard title={title} loading={loading}>
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
