import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import {
  ComposedChart,
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
import type { MealScoreChartProps } from '../types/charts';

/**
 * Diet/meal score chart with daily scores and 7-day rolling average
 * Replicates legacy MealLogScatterChart.tsx functionality
 */
export function MealScoreChart({ data, loading }: MealScoreChartProps) {
  if (loading) {
    return (
      <ChartCard>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading meal data...</Text>
        </View>
      </ChartCard>
    );
  }

  if (!data || data.length === 0) {
    return (
      <ChartCard>
        <Text style={styles.title}>Diet</Text>
        <Text style={styles.noData}>No meal data available.</Text>
      </ChartCard>
    );
  }

  // Transform data for Recharts
  const chartData = data.map((d) => ({
    x: new Date(d.date).getTime(),
    score: d.score,
    comment: d.comment,
    meals: d.meals,
  }));

  // Calculate 7-day rolling average
  const rollingData = data.map((_, idx) => {
    const window = data.slice(Math.max(0, idx - 6), idx + 1);
    const avg = window.reduce((sum, p) => sum + p.score, 0) / window.length;
    return { 
      x: new Date(data[idx].date).getTime(), 
      avg 
    };
  });

  const tickFormatter = (value: number) =>
    new Date(value).toLocaleDateString();

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      const date = new Date(p.payload.x).toISOString().split('T')[0];
      
      if (p.name === 'Daily Score') {
        const info = p.payload;
        return (
          <View style={styles.tooltip}>
            <Text style={styles.tooltipDate}>{date}</Text>
            <Text style={styles.tooltipValue}>Daily Score: {info.score}</Text>
            {info.comment && (
              <Text style={styles.tooltipComment}>{info.comment}</Text>
            )}
            {info.meals && info.meals.length > 0 && (
              <>
                <Text style={styles.tooltipMealsHeader}>Meals</Text>
                {info.meals.map((m: string, i: number) => (
                  <Text key={i} style={styles.tooltipMeal}>{m}</Text>
                ))}
              </>
            )}
          </View>
        );
      }
      
      return (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipDate}>{date}</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <ChartCard>
      <Text style={styles.title}>Diet</Text>
      <View style={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 20, bottom: 30, left: 0 }}
          >
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis
              type="number"
              dataKey="x"
              domain={['dataMin', 'dataMax']}
              tickFormatter={tickFormatter}
              tick={{ fontSize: 10 }}
            />
            <YAxis 
              domain={[0, 10]} 
              width={0} 
              axisLine={false} 
              tickLine={false} 
              tick={false} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Scatter
              name="Daily Score"
              data={chartData}
              dataKey="score"
              fill="#2196F3"
            />
            <Line
              name="7-Day Avg"
              data={rollingData}
              dataKey="avg"
              stroke="#4CAF50"
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
    maxWidth: 250,
  },
  tooltipDate: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tooltipValue: {
    color: '#333',
  },
  tooltipComment: {
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  tooltipMealsHeader: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  tooltipMeal: {
    color: '#333',
    fontSize: 12,
  },
});
