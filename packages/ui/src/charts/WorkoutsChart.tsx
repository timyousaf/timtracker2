import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { WeeklyWorkoutsChartProps } from '../types/charts';

const COLORS = [
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#a4de6c',
  '#d0ed57',
  '#8dd1e1',
  '#83a6ed',
];

/**
 * Weekly workouts stacked bar chart with max heart rate line
 * Replicates legacy WorkoutsChart.tsx functionality
 */
export function WorkoutsChart({ data, loading }: WeeklyWorkoutsChartProps) {
  if (loading) {
    return (
      <ChartCard>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8884d8" />
          <Text style={styles.loadingText}>Loading workout data...</Text>
        </View>
      </ChartCard>
    );
  }

  if (!data || data.categories.length === 0) {
    return (
      <ChartCard>
        <Text style={styles.title}>Weekly Exercise</Text>
        <Text style={styles.noData}>No workout data available.</Text>
      </ChartCard>
    );
  }

  // Transform data for Recharts
  const chartData = data.categories.map((cat, idx) => {
    const obj: Record<string, any> = { 
      category: cat, 
      maxHeartRate: data.maxHeartRate[idx] 
    };
    data.series.forEach((s) => {
      obj[s.name] = s.data[idx];
    });
    return obj;
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, p: any) => {
        if (p.dataKey === 'maxHeartRate') return sum;
        return sum + (p.value || 0);
      }, 0);
      
      const details = payload
        .filter((p: any) => p.dataKey !== 'maxHeartRate' && p.value > 0)
        .map((p: any) => ({ name: p.name, value: p.value }));
      
      const maxHR = payload.find((p: any) => p.dataKey === 'maxHeartRate' && p.value);
      
      return (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipDate}>{label}</Text>
          <Text style={styles.tooltipTotal}>Total Minutes: {total}</Text>
          {details.map((d: any, i: number) => (
            <Text key={i} style={styles.tooltipDetail}>
              {d.name}: {d.value} minutes
            </Text>
          ))}
          {maxHR && (
            <Text style={styles.tooltipHR}>
              Max Heart Rate: {maxHR.value} bpm
            </Text>
          )}
        </View>
      );
    }
    return null;
  };

  return (
    <ChartCard>
      <Text style={styles.title}>Weekly Exercise</Text>
      <View style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 30, left: 0 }}
          >
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis dataKey="category" tick={{ fontSize: 10 }} />
            <YAxis 
              yAxisId="left"
              width={0} 
              axisLine={false} 
              tickLine={false} 
              tick={false} 
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              width={0}
              domain={[0, 200]}
              axisLine={false}
              tickLine={false}
              tick={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {data.series.map((s, idx) => (
              <Bar
                key={s.name}
                yAxisId="left"
                dataKey={s.name}
                stackId={s.stack || s.name}
                fill={COLORS[idx % COLORS.length]}
              />
            ))}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="maxHeartRate"
              name="Max Heart Rate"
              stroke="#FF0000"
              strokeDasharray="3 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    color: '#222',
  },
  chartContainer: {
    height: 300,
  },
  loadingContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  tooltip: {
    backgroundColor: 'white',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  tooltipDate: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tooltipTotal: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tooltipDetail: {
    color: '#333',
  },
  tooltipHR: {
    color: '#FF0000',
    marginTop: 4,
  },
});
