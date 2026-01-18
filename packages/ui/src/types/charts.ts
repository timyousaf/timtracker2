/**
 * Chart data types for TimTracker health dashboard
 */

// ============================================
// Health Metrics
// ============================================

export interface HealthChartDataPoint {
  date: string;
  value: number;
  movingAvg: number | null;
}

export interface HealthChartProps {
  data: HealthChartDataPoint[];
  title: string;
  color: string;
  unit: string;
  chartType?: 'bar' | 'scatter';
  loading?: boolean;
  scaleToData?: boolean;
}

// ============================================
// Sleep
// ============================================

export interface SleepDataPoint {
  date: string;
  hours: number;
  readable: string;
  movingAvg: number | null;
}

export interface SleepChartProps {
  data: SleepDataPoint[];
  loading?: boolean;
}

// ============================================
// Calendar Heatmap
// ============================================

export interface WorkoutDetail {
  type: string;
  durationMinutes: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
}

export interface InteractionDetail {
  personName: string;
  interactionType: string;
  note?: string;
}

export interface MealDetail {
  description: string;
}

export interface CalendarHeatmapPoint {
  x: number; // day of week (0-6, Sunday = 0)
  y: number; // week number (0-4)
  value: number | null;
  date: string;
  score?: number | null; // 0-10 diet score for meal type
  workouts?: WorkoutDetail[];
  interactions?: InteractionDetail[];
  meals?: MealDetail[];
}

export interface CalendarHeatmapData {
  startDateStr: string;
  endDateStr: string;
  points: CalendarHeatmapPoint[];
}

export type CalendarHeatmapType = 'exercise' | 'mindful' | 'interaction' | 'meal';

export interface CalendarHeatmapProps {
  title: string;
  chartType: CalendarHeatmapType;
  colorScale?: string[];
  uniformColor?: string;
  unit: string;
}

// ============================================
// Weekly Workouts
// ============================================

export interface WorkoutSeries {
  name: string;
  data: number[];
  stack: string;
}

export interface WeeklyWorkoutsData {
  categories: string[]; // Week labels like "1/1 - 1/7/2024"
  series: WorkoutSeries[];
  maxHeartRate: (number | null)[];
}

export interface WeeklyWorkoutsChartProps {
  data: WeeklyWorkoutsData | null;
  loading?: boolean;
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

export interface StrengthVolumeData {
  categories: string[]; // Week labels
  series: number[]; // Volume per week
  workouts: StrengthWorkoutSummary[][]; // Workouts per week
}

export interface StrengthChartProps {
  data: StrengthVolumeData | null;
  loading?: boolean;
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
  totalVolume: number;
  reps: number;
  maxWeight: number;
  sets: ExerciseSet[];
}

export interface ExerciseProgressChartProps {
  data: ExerciseProgressDataPoint[];
  exerciseName: string;
  displayName: string;
  useReps?: boolean;
  loading?: boolean;
}

// ============================================
// Meal/Diet Scores
// ============================================

export interface MealLogDetail {
  description: string;
}

export interface DailyMealScoreDataPoint {
  date: string;
  score: number;
  movingAvg?: number | null;
  comment?: string;
  meals: (string | MealLogDetail)[];
}

export interface MealScoreChartProps {
  data: DailyMealScoreDataPoint[];
  loading?: boolean;
}

