/**
 * Cross-platform ECharts wrapper using @wuba/react-native-echarts
 * Works on iOS, Android, and Web
 */
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
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
import { SVGRenderer, SvgChart } from '@wuba/react-native-echarts';

// Register ECharts components
echarts.use([
  SVGRenderer,
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

export function EChart({ option, width, height = 300, style }: EChartProps) {
  const chartRef = useRef<any>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = width ?? screenWidth - 32; // 16px padding on each side

  useEffect(() => {
    let chart: echarts.ECharts | null = null;
    
    if (chartRef.current) {
      chart = echarts.init(chartRef.current, 'light', {
        renderer: 'svg',
        width: chartWidth,
        height,
      });
      chartInstance.current = chart;
      chart.setOption(option);
    }

    return () => {
      chart?.dispose();
    };
  }, [option, chartWidth, height]);

  // Update chart when option changes
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.setOption(option, true);
    }
  }, [option]);

  return (
    <View style={[styles.container, { width: chartWidth, height }, style]}>
      <SvgChart ref={chartRef} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
});

export { echarts };
