/**
 * Meal score chart using ECharts
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EChart, echarts } from './EChart';
import { ChartCard } from './ChartCard';
import type { DailyMealScoreDataPoint } from '@timtracker/ui/types';
import { format, parseISO } from 'date-fns';

interface MealScoreChartProps {
  data: DailyMealScoreDataPoint[];
  loading?: boolean;
}

export function MealScoreChart({ data, loading }: MealScoreChartProps) {
  const option = useMemo((): echarts.EChartsCoreOption => {
    if (!data || data.length === 0) {
      return {};
    }

    const dates = data.map(d => d.date);
    const scores = data.map(d => d.score);
    const movingAvg = data.map(d => d.movingAvg);

    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const point = Array.isArray(params) ? params[0] : params;
          const idx = point.dataIndex;
          const date = format(parseISO(dates[idx]), 'MMM d, yyyy');
          const score = scores[idx]?.toFixed(1) ?? 'N/A';
          const avg = movingAvg[idx]?.toFixed(1) ?? 'N/A';
          const meals = data[idx]?.meals || [];
          
          let lines = [
            `<b>${date}</b>`,
            `Score: ${score}`,
            `7-day Avg: ${avg}`,
          ];
          
          if (meals.length > 0) {
            lines.push('<br/><b>Meals:</b>');
            meals.slice(0, 5).forEach(m => {
              const desc = m.description.length > 40 
                ? m.description.substring(0, 40) + '...' 
                : m.description;
              lines.push(desc);
            });
          }
          
          return lines.join('<br/>');
        },
      },
      grid: {
        left: 40,
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
        min: 0,
        max: 10,
        axisLabel: { fontSize: 10 },
      },
      series: [
        {
          name: 'Score',
          type: 'scatter',
          data: scores,
          itemStyle: {
            color: '#2196F3',
          },
          symbolSize: 8,
        },
        {
          name: '7-day Avg',
          type: 'line',
          data: movingAvg,
          smooth: true,
          lineStyle: {
            color: '#4CAF50',
            width: 2,
          },
          symbol: 'none',
        },
      ],
    };
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <ChartCard title="Diet" loading={loading}>
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No meal data available</Text>
        </View>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Diet" loading={loading}>
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
