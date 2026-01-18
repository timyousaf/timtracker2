/**
 * Web-specific ECharts implementation
 * Uses standard ECharts with CanvasRenderer for DOM rendering
 */
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, ScatterChart, HeatmapChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CalendarComponent,
  VisualMapComponent,
  DataZoomComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register ECharts components for web
echarts.use([
  CanvasRenderer,
  LineChart,
  BarChart,
  ScatterChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CalendarComponent,
  VisualMapComponent,
  DataZoomComponent,
]);

export interface EChartProps {
  option: echarts.EChartsCoreOption;
  width?: number;
  height?: number;
  style?: any;
}

// Helper to check if option is valid
function isValidOption(option: echarts.EChartsCoreOption): boolean {
  if (!option || typeof option !== 'object') return false;
  return !!(
    (option as any).series ||
    (option as any).xAxis ||
    (option as any).calendar ||
    (option as any).visualMap
  );
}

export function EChart({ option, width, height = 300, style }: EChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !isValidOption(option)) return;

    // Dispose existing instance
    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }

    // Create new instance
    const chart = echarts.init(chartRef.current);
    chartInstance.current = chart;
    chart.setOption(option);

    // Handle resize
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [option]);

  // Update on option change
  useEffect(() => {
    if (chartInstance.current && isValidOption(option)) {
      chartInstance.current.setOption(option, true);
    }
  }, [option]);

  return (
    <View style={[styles.container, style]}>
      <div
        ref={chartRef}
        style={{
          width: width || '100%',
          height,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
});

export { echarts };
