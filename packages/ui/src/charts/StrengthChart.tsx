import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { StrengthChartProps, StrengthWorkoutSummary } from '../types/charts';

/**
 * Weekly strength training volume chart with workout details in tooltip
 * Replicates legacy StrengthTrainingChart.tsx functionality
 */
export function StrengthChart({ data, loading }: StrengthChartProps) {
  if (loading) {
    return (
      <ChartCard>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8884d8" />
          <Text style={styles.loadingText}>Loading strength training data...</Text>
        </View>
      </ChartCard>
    );
  }

  if (!data || data.categories.length === 0) {
    return (
      <ChartCard>
        <Text style={styles.title}>Weekly Strength Training Volume</Text>
        <Text style={styles.noData}>No strength training data available.</Text>
      </ChartCard>
    );
  }

  // Transform data for Recharts
  const chartData = data.categories.map((cat, idx) => ({
    category: cat,
    value: data.series[idx],
    workouts: data.workouts[idx],
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const info = payload[0].payload;
      
      return (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipDate}>{label}</Text>
          <Text style={styles.tooltipTotal}>
            {info.value.toLocaleString()} lbs
          </Text>
          {info.workouts && info.workouts.length > 0 && (
            <>
              {info.workouts.map((w: StrengthWorkoutSummary, idx: number) => {
                const date = new Date(w.date);
                const dateStr = date.toLocaleDateString('en-US', {
                  month: 'numeric',
                  day: 'numeric',
                  weekday: 'short',
                });
                return (
                  <Text key={idx} style={styles.tooltipWorkout}>
                    {dateStr} {w.title} {w.duration} min {w.sets} sets {w.reps} reps {w.volume.toLocaleString()} lbs
                  </Text>
                );
              })}
            </>
          )}
        </View>
      );
    }
    return null;
  };

  return (
    <ChartCard>
      <Text style={styles.title}>Weekly Strength Training Volume</Text>
      <View style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 60, left: 0 }}
          >
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis 
              dataKey="category" 
              angle={-45} 
              textAnchor="end" 
              height={60}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              width={0} 
              axisLine={false} 
              tickLine={false} 
              tick={false} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
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
    maxWidth: 300,
  },
  tooltipDate: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tooltipTotal: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tooltipWorkout: {
    color: '#333',
    fontSize: 12,
    marginBottom: 2,
  },
});
