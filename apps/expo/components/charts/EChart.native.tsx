/**
 * Native-specific ECharts implementation (iOS/Android)
 * Uses @wuba/react-native-echarts SvgChart with SVGRenderer
 */
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import * as echarts from 'echarts/core';
import { colors } from '@/lib/theme';
import { LineChart, BarChart, ScatterChart, HeatmapChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CalendarComponent,
  VisualMapComponent,
  DataZoomComponent,
} from 'echarts/components';
// Import from svgChart subpath to avoid pulling in @shopify/react-native-skia dependency
import SvgChart, { SVGRenderer } from '@wuba/react-native-echarts/svgChart';

// Register ECharts components for native
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
  const chartRef = useRef<any>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = width ?? screenWidth - 32;

  useEffect(() => {
    if (!chartRef.current || !isValidOption(option)) return;
    
    // Dispose existing instance
    if (chartInstance.current) {
      chartInstance.current.dispose();
      chartInstance.current = null;
    }
    
    const chart = echarts.init(chartRef.current, 'light', {
      renderer: 'svg',
      width: chartWidth,
      height,
    });
    chartInstance.current = chart;
    chart.setOption(option);

    return () => {
      chart?.dispose();
    };
  }, [option, chartWidth, height]);

  // Update on option change
  useEffect(() => {
    if (chartInstance.current && isValidOption(option)) {
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
    backgroundColor: colors.card,
  },
});

export { echarts };
