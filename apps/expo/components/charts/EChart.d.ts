/**
 * Type declarations for platform-specific EChart components
 * Metro automatically selects EChart.web.tsx or EChart.native.tsx at runtime
 */
import * as echarts from 'echarts/core';

export { echarts };

export interface EChartProps {
  option: echarts.EChartsCoreOption;
  width?: number;
  height?: number;
  style?: any;
}

export function EChart(props: EChartProps): JSX.Element;
