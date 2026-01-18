import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { SleepChartProps } from '../types/charts';

/**
 * Sleep chart with colored bars based on duration and 7-day moving average
 * Replicates legacy SleepChart.tsx functionality
 */
export function SleepChart({ data, loading }: SleepChartProps) {
  if (loading) {
    return (
      <ChartCard>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#238551" />
          <Text style={styles.loadingText}>Loading sleep data...</Text>
        </View>
      </ChartCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <ChartCard>
        <Text style={styles.title}>Daily Sleep</Text>
        <Text style={styles.noData}>No sleep data available.</Text>
      </ChartCard>
    );
  }

  // Transform and color-code data based on sleep duration
  const chartData = data.map((d) => {
    let color = '#238551'; // Green for good sleep (8+ hours)
    if (d.hours < 6) {
      color = '#FF0000'; // Red for poor sleep
    } else if (d.hours < 7.5) {
      color = '#FFD700'; // Yellow for okay sleep
    }
    
    const date = new Date(d.date);
    return {
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      hours: d.hours,
      readable: d.readable,
      movingAvg: d.movingAvg,
      color,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const info = payload[0].payload;
      const avg = info.movingAvg !== null && info.movingAvg !== undefined 
        ? info.movingAvg.toFixed(1) 
        : 'N/A';
      
      return (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipDate}>{label}</Text>
          <Text style={styles.tooltipValue}>Time slept: {info.readable}</Text>
          <Text style={styles.tooltipAvg}>7-Day Avg: {avg}</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <ChartCard>
      <Text style={styles.title}>Daily Sleep</Text>
      <View style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 30, left: 0 }}
          >
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis
              domain={[0, 12]}
              width={0}
              axisLine={false}
              tickLine={false}
              tick={false}
            />
            <ReferenceLine y={8} stroke="#FFD700" strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="hours" name="Hours">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="movingAvg"
              name="7-Day Avg"
              stroke="#0F6894"
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
  tooltipValue: {
    color: '#333',
  },
  tooltipAvg: {
    color: '#666',
  },
});
