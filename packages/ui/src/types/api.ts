/**
 * API response types for TimTracker endpoints
 */

import type {
  HealthChartDataPoint,
  SleepDataPoint,
  CalendarHeatmapData,
  WeeklyWorkoutsData,
  StrengthVolumeData,
  ExerciseProgressDataPoint,
  DailyMealScoreDataPoint,
} from './charts';

// ============================================
// Generic API Response
// ============================================

export interface ApiError {
  error: string;
  details?: string;
}

// ============================================
// Metrics API
// ============================================

export interface MetricsApiParams {
  type: string;
  start?: string;
  end?: string;
  period?: 'day' | 'week';
}

export interface MetricsApiResponse {
  data: HealthChartDataPoint[];
}

// ============================================
// Sleep API
// ============================================

export interface SleepApiParams {
  start?: string;
  end?: string;
}

export interface SleepApiResponse {
  data: SleepDataPoint[];
}

// ============================================
// Calendar Heatmap API
// ============================================

export interface CalendarHeatmapApiParams {
  type: 'exercise' | 'mindful' | 'interaction' | 'meal';
  offset?: number;
}

export interface CalendarHeatmapApiResponse extends CalendarHeatmapData {}

// ============================================
// Weekly Workouts API
// ============================================

export interface WeeklyWorkoutsApiParams {
  start?: string;
  end?: string;
}

export interface WeeklyWorkoutsApiResponse extends WeeklyWorkoutsData {}

// ============================================
// Strength Volume API
// ============================================

export interface StrengthVolumeApiParams {
  start?: string;
  end?: string;
}

export interface StrengthVolumeApiResponse extends StrengthVolumeData {}

// ============================================
// Exercise Progress API
// ============================================

export interface ExerciseProgressApiParams {
  exercise: string;
  start?: string;
  end?: string;
}

export interface ExerciseProgressApiResponse {
  data: ExerciseProgressDataPoint[];
}

// ============================================
// Meal Scores API
// ============================================

export interface MealScoresApiParams {
  start?: string;
  end?: string;
}

export interface MealScoresApiResponse {
  data: DailyMealScoreDataPoint[];
}
