/**
 * API types for TimTracker endpoints
 * These are standalone types for the API - no external dependencies
 */

// ============================================
// Generic API Response
// ============================================

export interface ApiError {
  error: string;
  details?: string;
}

// ============================================
// Health Metrics (legacy endpoint)
// ============================================

export interface HealthMetric {
  id: number;
  type: string;
  value: number;
  unit?: string;
  date: string;
  timezone?: string;
}

export interface HealthMetricsResponse {
  data: HealthMetric[];
  count?: number;
}

// ============================================
// Health Chart Data
// ============================================

export interface HealthChartDataPoint {
  date: string;
  value: number | null;
  movingAvg: number | null;
}

export interface MetricsApiResponse {
  data: HealthChartDataPoint[];
}

// ============================================
// Sleep
// ============================================

export interface SleepDataPoint {
  date: string;
  hours: number | null;
  readable: string | null;
  movingAvg: number | null;
}

export interface SleepApiResponse {
  data: SleepDataPoint[];
}

// ============================================
// Calendar Heatmap
// ============================================

export interface WorkoutDetail {
  date?: string;
  type: string;
  durationMinutes: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  metrics?: Record<string, any>;
  timezone?: string;
}

export interface InteractionDetail {
  personName: string;
  interactionType: string;
  note?: string;
}

export interface MealDetail {
  id?: number;
  description: string;
}

export interface CalendarHeatmapPoint {
  x: number;
  y: number;
  value: number | null;
  date: string;
  score?: number | null; // 0-10 diet score for meal type
  workouts?: WorkoutDetail[];
  interactions?: InteractionDetail[];
  meals?: MealDetail[];
}

export interface CalendarHeatmapResponse {
  startDateStr: string;
  endDateStr: string;
  points: CalendarHeatmapPoint[];
}

// ============================================
// Weekly Workouts
// ============================================

export interface WorkoutSeries {
  name: string;
  data: number[];
  stack: string;
}

export interface WeeklyWorkoutsResponse {
  categories: string[];
  series: WorkoutSeries[];
  maxHeartRate: (number | null)[];
}

// ============================================
// Strength Training
// ============================================

export interface StrengthWorkoutSummary {
  date: string;
  title: string;
  duration: number;
  sets: number;
  reps: number;
  volume: number;
}

export interface StrengthVolumeResponse {
  categories: string[];
  series: number[];
  workouts: StrengthWorkoutSummary[][];
}

// ============================================
// Exercise Progress
// ============================================

export interface ExerciseSet {
  reps: number;
  weight: number;
}

export interface ExerciseProgressDataPoint {
  date: string;
  totalVolume: number | null;
  totalReps?: number | null;
  reps?: number | null;
  maxWeight: number | null;
  sets: ExerciseSet[];
}

export interface ExerciseProgressResponse {
  data: ExerciseProgressDataPoint[];
}

// ============================================
// Meal Scores
// ============================================

export interface MealLogDetail {
  description: string;
}

export interface DailyMealScoreDataPoint {
  date: string;
  score: number;
  movingAvg?: number | null;
  comment?: string;
  meals: (MealLogDetail | string)[];
}

export interface MealScoresResponse {
  data: DailyMealScoreDataPoint[];
}

// ============================================
// Type Aliases for backward compatibility
// ============================================

export type CalendarHeatmapApiResponse = CalendarHeatmapResponse;
export type WeeklyWorkoutsApiResponse = WeeklyWorkoutsResponse;
export type StrengthVolumeApiResponse = StrengthVolumeResponse;
export type ExerciseProgressApiResponse = ExerciseProgressResponse;
export type MealScoresApiResponse = MealScoresResponse;
