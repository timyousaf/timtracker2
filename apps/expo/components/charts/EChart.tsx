/**
 * Cross-platform ECharts wrapper using @wuba/react-native-echarts
 * Works on both web (via react-native-web) and iOS/Android
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
import { SvgChart, SVGRenderer } from '@wuba/react-native-echarts';

// Register ECharts components - same for all platforms
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

// Helper to check if option is valid (has at least a series or xAxis)
function isValidOption(option: echarts.EChartsCoreOption): boolean {
  if (!option || typeof option !== 'object') return false;
  // Check if option has meaningful content
  return !!(
    (option as any).series ||
    (option as any).xAxis ||
    (option as any).calendar ||
    (option as any).visualMap
  );
}

/**
 * Unified EChart component using @wuba/react-native-echarts SvgChart
 * Works on web (via react-native-web) and iOS/Android
 */
export function EChart({ option, width, height = 300, style }: EChartProps) {
  const chartRef = useRef<any>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = width ?? (Platform.OS === 'web' ? undefined : screenWidth - 32);

  useEffect(() => {
    // Don't initialize with empty/invalid options
    if (!chartRef.current || !isValidOption(option)) return;
    
    // Dispose existing instance
    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }
    
    // Initialize chart with appropriate dimensions
    const initOptions: any = {
      renderer: 'svg',
      height,
    };
    
    // Only set width if known (native) - web handles auto-sizing
    if (chartWidth !== undefined) {
      initOptions.width = chartWidth;
    }
    
    const chart = echarts.init(chartRef.current, 'light', initOptions);
    chartInstance.current = chart;
    chart.setOption(option);

    // Handle resize (web only)
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
      chart?.dispose();
    };
  }, [option, chartWidth, height]);

  // Update on option change (only if valid)
  useEffect(() => {
    if (chartInstance.current && isValidOption(option)) {
      chartInstance.current.setOption(option, true);
    }
  }, [option]);

  const containerStyle = Platform.OS === 'web'
    ? { width: chartWidth || '100%', height }
    : { width: chartWidth, height };

  return (
    <View style={[styles.container, containerStyle, style]}>
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
