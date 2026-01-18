import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  ComposedChart,
  Bar,
  Scatter,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { ChartCard } from './ChartCard';
import type { ExerciseProgressChartProps, ExerciseSet } from '../types/charts';

/**
 * Exercise progress chart showing volume/reps and max weight over time
 * Replicates legacy ExerciseProgressChart.tsx functionality
 */
export function ExerciseProgressChart({
  data,
  displayName,
  useReps = false,
  loading,
}: ExerciseProgressChartProps) {
  if (loading) {
    return (
      <ChartCard>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8884d8" />
          <Text style={styles.loadingText}>Loading {displayName}...</Text>
        </View>
      </ChartCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <ChartCard>
        <Text style={styles.title}>{displayName} Progress</Text>
        <Text style={styles.noData}>No data available for {displayName}</Text>
      </ChartCard>
    );
  }

  // Transform data for Recharts
  const chartData = data.map((d) => ({
    x: new Date(d.date).getTime(),
    volume: useReps ? d.reps : d.totalVolume,
    maxWeight: d.maxWeight,
    sets: d.sets,
  }));

  const tickFormatter = (value: number) =>
    new Date(value).toLocaleDateString();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const info = payload[0].payload;
      const date = new Date(info.x).toISOString().split('T')[0];
      
      // Find sets at max weight
      const maxWeightSets = info.sets
        ? info.sets.filter((s: ExerciseSet) => s.weight === info.maxWeight)
        : [];
      const maxReps = maxWeightSets.reduce(
        (m: number, s: ExerciseSet) => Math.max(m, s.reps),
        0
      );
      const totalReps = maxWeightSets.reduce(
        (sum: number, s: ExerciseSet) => sum + s.reps,
        0
      );
      
      return (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipDate}>{date}</Text>
          <Text style={[styles.tooltipValue, { color: '#4572A7' }]}>
            {useReps ? 'Total Reps' : 'Total Volume'}: {info.volume.toLocaleString()}
          </Text>
          <Text style={[styles.tooltipValue, { color: '#AA4643' }]}>
            Max Weight: {info.maxWeight} lbs
            {maxWeightSets.length > 0 && ` (reps: ${maxReps} max, ${totalReps} total)`}
          </Text>
          {info.sets && info.sets.map((s: ExerciseSet, idx: number) => (
            <Text key={idx} style={styles.tooltipSet}>
              Set {idx + 1}: {s.reps} reps
              {s.weight && s.weight > 0 && ` x ${s.weight} lbs`}
            </Text>
          ))}
        </View>
      );
    }
    return null;
  };

  return (
    <ChartCard>
      <Text style={styles.title}>{displayName} Progress</Text>
      <View style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 30, left: 0 }}
          >
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis
              dataKey="x"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={tickFormatter}
              tick={{ fontSize: 10 }}
            />
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
              axisLine={false}
              tickLine={false}
              tick={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="volume"
              name={useReps ? 'Total Reps' : 'Total Volume'}
              fill="#8884d8"
            />
            <Scatter
              yAxisId="right"
              dataKey="maxWeight"
              name="Max Weight"
              fill="#AA4643"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="maxWeight"
              name="Max Weight Trend"
              stroke="#AA4643"
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
    maxWidth: 280,
  },
  tooltipDate: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tooltipValue: {
    marginBottom: 2,
  },
  tooltipSet: {
    color: '#666',
    fontSize: 12,
  },
});
