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
import type { HealthChartProps } from '../types/charts';

/**
 * Generic health metric chart with bar/scatter and moving average line
 * Replicates legacy HealthChart.tsx functionality
 */
export function HealthChart({
  data,
  title,
  color,
  unit,
  chartType = 'bar',
  loading,
  scaleToData,
}: HealthChartProps) {
  if (loading) {
    return (
      <ChartCard>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={color} />
          <Text style={styles.loadingText}>Loading {title}...</Text>
        </View>
      </ChartCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <ChartCard>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.noData}>No data available.</Text>
      </ChartCard>
    );
  }

  // Transform data for Recharts
  const chartData = data.map((d) => ({
    x: new Date(d.date).getTime(),
    y: d.value,
    smoothed: d.movingAvg,
  }));

  // Calculate Y-axis domain if scaleToData is true
  const yValues = chartData.map((d) => d.y);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yRange = yMax - yMin;
  const yPadding = yRange === 0 ? Math.max(1, yMax * 0.1) : yRange * 0.1;
  const yDomain = scaleToData
    ? [yMin - yPadding, yMax + yPadding]
    : undefined;

  const tickFormatter = (value: number) =>
    new Date(value).toLocaleDateString();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      const date = new Date(point.x).toISOString().split('T')[0];
      const value = point.y?.toFixed(1) ?? 'N/A';
      const avg = point.smoothed?.toFixed(1) ?? 'N/A';
      
      return (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipDate}>{date}</Text>
          <Text style={styles.tooltipValue}>
            {title}: {value} {unit}
          </Text>
          <Text style={styles.tooltipAvg}>
            7-day Moving Average: {avg} {unit}
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <ChartCard>
      <Text style={styles.title}>{title}</Text>
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
              domain={yDomain}
              width={0}
              axisLine={false}
              tickLine={false}
              tick={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {chartType === 'scatter' ? (
              <Scatter
                name={title}
                dataKey="y"
                fill={color}
                opacity={0.5}
              />
            ) : (
              <Bar
                name={title}
                dataKey="y"
                fill={color}
                opacity={0.7}
              />
            )}
            <Line
              type="monotone"
              name="7-day Moving Average"
              dataKey="smoothed"
              stroke={color}
              strokeOpacity={0.8}
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
