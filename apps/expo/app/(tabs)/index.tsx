import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  DateRange,
  DATE_RANGE_OPTIONS,
  DEFAULT_DATE_RANGE,
  formatDateRangeForApi,
} from '@timtracker/ui/utils';
import type {
  HealthChartDataPoint,
  SleepDataPoint,
  CalendarHeatmapData,
  WeeklyWorkoutsData,
  StrengthVolumeData,
  DailyMealScoreDataPoint,
  ExerciseProgressDataPoint,
} from '@timtracker/ui/types';
import {
  fetchMetrics,
  fetchSleep,
  fetchCalendarHeatmap,
  fetchWeeklyWorkouts,
  fetchStrengthVolume,
  fetchMealScores,
  fetchExerciseProgress,
} from '@/lib/api';

// Import local ECharts-based components (cross-platform)
import {
  HealthChart,
  SleepChart,
  WorkoutsChart,
  StrengthChart,
  MealScoreChart,
  ExerciseProgressChart,
  CalendarHeatmap,
} from '@/components/charts';

// Exercise configurations - matching legacy TimTracker exactly
const EXERCISES = [
  { name: 'Romanian Deadlift (Barbell)', displayName: 'Romanian Deadlift (Barbell)' },
  { name: 'Bench Press (Barbell)', displayName: 'Bench Press (Barbell)' },
  { name: 'Incline Bench Press (Barbell)', displayName: 'Incline Bench Press (Barbell)' },
  { name: 'Incline Bench Press (Dumbbell)', displayName: 'Incline Bench Press (Dumbbell)' },
  { name: 'Bent Over Row (Barbell)', displayName: 'Bent Over Row (Barbell)' },
  { name: 'Bulgarian Split Squat', displayName: 'Bulgarian Split Squat' },
  { name: 'Lateral Raise (Dumbbell)', displayName: 'Lateral Raise (Dumbbell)' },
  { name: 'Rear Delt Reverse Fly (Dumbbell)', displayName: 'Rear Delt Reverse Fly (Dumbbell)' },
];

export default function HomeScreen() {
  const { getToken } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range selector
  const [selectedRange, setSelectedRange] = useState<DateRange>(DEFAULT_DATE_RANGE);

  // ===== CORE METRICS DATA =====
  const [sleepData, setSleepData] = useState<SleepDataPoint[]>([]);
  const [mealScores, setMealScores] = useState<DailyMealScoreDataPoint[]>([]);
  const [mindfulHeatmap, setMindfulHeatmap] = useState<CalendarHeatmapData | null>(null);
  const [exerciseHeatmap, setExerciseHeatmap] = useState<CalendarHeatmapData | null>(null);
  const [strengthVolume, setStrengthVolume] = useState<StrengthVolumeData | null>(null);
  const [mealHeatmap, setMealHeatmap] = useState<CalendarHeatmapData | null>(null);
  const [waistData, setWaistData] = useState<HealthChartDataPoint[]>([]);
  const [weightData, setWeightData] = useState<HealthChartDataPoint[]>([]);
  
  // ===== HEALTH DETAILS DATA =====
  const [restingHRData, setRestingHRData] = useState<HealthChartDataPoint[]>([]);
  const [hrvData, setHrvData] = useState<HealthChartDataPoint[]>([]);
  const [mindfulData, setMindfulData] = useState<HealthChartDataPoint[]>([]);
  
  // ===== EXERCISE DETAILS DATA =====
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<WeeklyWorkoutsData | null>(null);
  const [distanceData, setDistanceData] = useState<HealthChartDataPoint[]>([]);
  
  // ===== STRENGTH DATA =====
  const [exerciseProgressData, setExerciseProgressData] = useState<Record<string, ExerciseProgressDataPoint[]>>({});
  
  // Heatmap offsets for navigation
  const [mindfulOffset, setMindfulOffset] = useState(0);
  const [exerciseOffset, setExerciseOffset] = useState(0);
  const [mealOffset, setMealOffset] = useState(0);

  // Loading states
  const [loadingCore, setLoadingCore] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingExercise, setLoadingExercise] = useState(true);
  const [loadingStrength, setLoadingStrength] = useState(true);

  // Track if initial load is complete to avoid duplicate fetches
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);

  const loadAllData = useCallback(async (range: DateRange) => {
    setError(null);
    const tokenGetter = getToken;
    const dateRange = formatDateRangeForApi(range);

    try {
      // ===== SECTION 1: CORE METRICS =====
      setLoadingCore(true);
      Promise.all([
        fetchSleep(tokenGetter, dateRange).catch(() => ({ data: [] })),
        fetchMealScores(tokenGetter, dateRange).catch(() => ({ data: [] })),
        fetchCalendarHeatmap(tokenGetter, { type: 'mindful', offset: mindfulOffset }).catch(() => null),
        fetchCalendarHeatmap(tokenGetter, { type: 'exercise', offset: exerciseOffset }).catch(() => null),
        fetchStrengthVolume(tokenGetter, dateRange).catch(() => null),
        fetchCalendarHeatmap(tokenGetter, { type: 'meal', offset: mealOffset }).catch(() => null),
        fetchMetrics(tokenGetter, { type: 'Waist Circumference (in)', ...dateRange }).catch(() => ({ data: [] })),
        fetchMetrics(tokenGetter, { type: 'Weight/Body Mass (lb)', ...dateRange }).catch(() => ({ data: [] })),
      ]).then(([sleep, meals, mindful, exercise, strength, meal, waist, weight]) => {
        setSleepData(sleep.data);
        setMealScores(meals.data);
        setMindfulHeatmap(mindful);
        setExerciseHeatmap(exercise);
        setStrengthVolume(strength);
        setMealHeatmap(meal);
        setWaistData(waist.data);
        setWeightData(weight.data);
      }).finally(() => setLoadingCore(false));

      // ===== SECTION 2: HEALTH DETAILS =====
      setLoadingHealth(true);
      Promise.all([
        fetchMetrics(tokenGetter, { type: 'Resting Heart Rate (bpm)', ...dateRange }).catch(() => ({ data: [] })),
        fetchMetrics(tokenGetter, { type: 'Heart Rate Variability (ms)', ...dateRange }).catch(() => ({ data: [] })),
        fetchMetrics(tokenGetter, { type: 'Mindful Minutes (min)', ...dateRange }).catch(() => ({ data: [] })),
      ]).then(([restingHR, hrv, mindful]) => {
        setRestingHRData(restingHR.data);
        setHrvData(hrv.data);
        setMindfulData(mindful.data);
      }).finally(() => setLoadingHealth(false));

      // ===== SECTION 3: EXERCISE DETAILS =====
      setLoadingExercise(true);
      Promise.all([
        fetchWeeklyWorkouts(tokenGetter, dateRange).catch(() => null),
        fetchMetrics(tokenGetter, { type: 'Walking + Running Distance (mi)', ...dateRange }).catch(() => ({ data: [] })),
      ]).then(([workouts, distance]) => {
        setWeeklyWorkouts(workouts);
        setDistanceData(distance.data);
      }).finally(() => setLoadingExercise(false));

      // ===== SECTION 4: STRENGTH =====
      setLoadingStrength(true);
      Promise.all(
        EXERCISES.map(ex => 
          fetchExerciseProgress(tokenGetter, { exercise: ex.name, ...dateRange })
            .then(res => ({ name: ex.name, data: res.data }))
            .catch(() => ({ name: ex.name, data: [] }))
        )
      ).then(results => {
        const progressMap: Record<string, ExerciseProgressDataPoint[]> = {};
        results.forEach(r => { progressMap[r.name] = r.data; });
        setExerciseProgressData(progressMap);
      }).finally(() => setLoadingStrength(false));

    } catch (err) {
      console.error('Error loading chart data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load charts');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload heatmaps when offsets change (but not on initial load)
  useEffect(() => {
    if (!initialLoadComplete) return;
    fetchCalendarHeatmap(getToken, { type: 'mindful', offset: mindfulOffset })
      .then(setMindfulHeatmap).catch(console.error);
  }, [mindfulOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialLoadComplete) return;
    fetchCalendarHeatmap(getToken, { type: 'exercise', offset: exerciseOffset })
      .then(setExerciseHeatmap).catch(console.error);
  }, [exerciseOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialLoadComplete) return;
    fetchCalendarHeatmap(getToken, { type: 'meal', offset: mealOffset })
      .then(setMealHeatmap).catch(console.error);
  }, [mealOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load data when date range changes
  useEffect(() => {
    setLoading(true);
    loadAllData(selectedRange).finally(() => {
      setLoading(false);
      setInitialLoadComplete(true);
    });
  }, [selectedRange]); // eslint-disable-line react-hooks/exhaustive-deps

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData(selectedRange);
    setRefreshing(false);
  }, [loadAllData, selectedRange]);

  if (loading && !weightData.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading charts...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  // Get the label for the current selection
  const selectedLabel = DATE_RANGE_OPTIONS.find(o => o.value === selectedRange)?.label || 'Select Range';

  return (
    <SafeAreaView style={styles.container}>
      {/* Date Range Selector - Fixed Header */}
      <View style={styles.header}>
          <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setPickerVisible(true)}
          >
          <Text style={styles.pickerButtonText}>{selectedLabel}</Text>
          <Text style={styles.pickerChevron}>▼</Text>
          </TouchableOpacity>
        </View>

      {/* Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date Range</Text>
            {DATE_RANGE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  selectedRange === option.value && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSelectedRange(option.value);
                  setPickerVisible(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  selectedRange === option.value && styles.modalOptionTextSelected,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* ===== SECTION 1: CORE METRICS ===== */}
        <Text style={styles.sectionHeader}>Core Metrics</Text>
        
        {/* 1. Sleep */}
        <SleepChart
          data={sleepData}
          loading={loadingCore}
        />

        {/* 2. Diet (Meal Scores) */}
        <MealScoreChart
          data={mealScores}
          loading={loadingCore}
        />

        {/* 3. Mindful Minutes Calendar */}
        <CalendarHeatmap
          title="Mindful Minutes Calendar"
          chartType="mindful"
          unit="min"
          colorScale={['#FFFFFF', '#9C27B0']}
          data={mindfulHeatmap}
          loading={loadingCore}
          onNavigateBack={() => setMindfulOffset(prev => prev + 1)}
          onNavigateForward={() => setMindfulOffset(prev => Math.max(0, prev - 1))}
          canNavigateForward={mindfulOffset > 0}
        />

        {/* 4. Exercise Calendar */}
        <CalendarHeatmap
          title="Exercise Calendar"
          chartType="exercise"
          unit="min"
          colorScale={['#FFFFFF', '#4CAF50']}
          data={exerciseHeatmap}
          loading={loadingCore}
          onNavigateBack={() => setExerciseOffset(prev => prev + 1)}
          onNavigateForward={() => setExerciseOffset(prev => Math.max(0, prev - 1))}
          canNavigateForward={exerciseOffset > 0}
        />

        {/* 5. Strength Training Volume */}
        <StrengthChart
          data={strengthVolume}
          loading={loadingCore}
        />

        {/* 6. Meal Logging Calendar */}
        <CalendarHeatmap
          title="Meal Logging"
          chartType="meal"
          unit="meals"
          uniformColor="#FF9800"
          data={mealHeatmap}
          loading={loadingCore}
          onNavigateBack={() => setMealOffset(prev => prev + 1)}
          onNavigateForward={() => setMealOffset(prev => Math.max(0, prev - 1))}
          canNavigateForward={mealOffset > 0}
        />

        {/* 7. Waist Circumference */}
        <HealthChart
          data={waistData}
          title="Waist Circumference"
          color="#C77B7F"
          unit="in"
          chartType="scatter"
          loading={loadingCore}
          scaleToData
        />

        {/* 8. Body Weight */}
        <HealthChart
          data={weightData}
          title="Body Weight"
          color="#C77B7F"
          unit="lbs"
          chartType="scatter"
          loading={loadingCore}
          scaleToData
        />

        {/* ===== SECTION 2: HEALTH DETAILS ===== */}
        <Text style={styles.sectionHeader}>Health Details</Text>

        {/* 9. Resting Heart Rate */}
        <HealthChart
          data={restingHRData}
          title="Resting Heart Rate"
          color="#E91E63"
          unit="bpm"
          chartType="scatter"
          loading={loadingHealth}
        />

        {/* 10. Heart Rate Variability */}
        <HealthChart
          data={hrvData}
          title="Heart Rate Variability"
          color="#9C27B0"
          unit="ms"
          chartType="scatter"
          loading={loadingHealth}
        />

        {/* 11. Mindful Minutes (bar) */}
        <HealthChart
          data={mindfulData}
          title="Mindful Minutes"
          color="#9C27B0"
          unit="min"
          chartType="bar"
          loading={loadingHealth}
        />

        {/* ===== SECTION 3: EXERCISE DETAILS ===== */}
        <Text style={styles.sectionHeader}>Exercise Details</Text>

        {/* 12. Weekly Workouts */}
        <WorkoutsChart
          data={weeklyWorkouts}
          loading={loadingExercise}
        />

        {/* 13. Walking + Running Distance */}
        <HealthChart
          data={distanceData}
          title="Walking + Running Distance"
          color="#FF9F40"
          unit="mi"
          chartType="bar"
          loading={loadingExercise}
        />

        {/* ===== SECTION 4: STRENGTH ===== */}
        <Text style={styles.sectionHeader}>Strength</Text>

        {EXERCISES.map(ex => (
          <ExerciseProgressChart
            key={ex.name}
            data={exerciseProgressData[ex.name] || []}
            exerciseName={ex.name}
            displayName={ex.displayName}
            loading={loadingStrength}
          />
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  pickerChevron: {
    fontSize: 12,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#222',
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalOptionSelected: {
    backgroundColor: '#0066cc',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#fee',
    borderWidth: 1,
    borderColor: '#fcc',
    borderRadius: 8,
    padding: 16,
    maxWidth: 300,
  },
  errorTitle: {
    fontWeight: 'bold',
    color: '#c00',
    marginBottom: 4,
  },
  errorText: {
    color: '#c00',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222',
    marginTop: 24,
    marginBottom: 12,
    fontFamily: 'Georgia',
  },
});
