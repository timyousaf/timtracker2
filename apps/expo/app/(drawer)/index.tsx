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
import { useNavigation, DrawerActions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import {
  DateRange,
  DATE_RANGE_OPTIONS,
  DEFAULT_DATE_RANGE,
  formatDateRangeForApi,
} from '@timtracker/ui/utils';
import { colors, fontSizes, fonts, spacing, borderRadius, shadows } from '@/lib/theme';
import { Sparkles } from 'lucide-react-native';
import type {
  HealthChartDataPoint,
  SleepDataPoint,
  CalendarHeatmapData,
  WeeklyWorkoutsData,
  StrengthVolumeData,
  ExerciseProgressDataPoint,
  WeeklySummaryData,
} from '@timtracker/ui/types';
import {
  fetchMetrics,
  fetchSleep,
  fetchCalendarHeatmap,
  fetchWeeklyWorkouts,
  fetchStrengthVolume,
  fetchExerciseProgress,
  fetchWeeklySummary,
} from '@/lib/api';

// Import local ECharts-based components (cross-platform)
import {
  HealthChart,
  SleepChart,
  WorkoutsChart,
  StrengthChart,
  ExerciseProgressChart,
  CalendarHeatmap,
  WeeklySummaryChart,
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

const TIMTRACKER_GPT_URL =
  'https://chatgpt.com/g/g-68705007a1648191bf77dfc290a5664e-timtracker';

export default function HomeScreen() {
  const { getToken } = useAuth();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const openTimTrackerGpt = useCallback(async () => {
    try {
      await WebBrowser.openBrowserAsync(TIMTRACKER_GPT_URL);
    } catch {
      Linking.openURL(TIMTRACKER_GPT_URL);
    }
  }, []);

  // Date range selector
  const [selectedRange, setSelectedRange] = useState<DateRange>(DEFAULT_DATE_RANGE);

  // ===== CORE METRICS DATA =====
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummaryData | null>(null);
  const [sleepData, setSleepData] = useState<SleepDataPoint[]>([]);
  const [mindfulHeatmap, setMindfulHeatmap] = useState<CalendarHeatmapData | null>(null);
  const [exerciseHeatmap, setExerciseHeatmap] = useState<CalendarHeatmapData | null>(null);
  const [strengthVolume, setStrengthVolume] = useState<StrengthVolumeData | null>(null);
  const [mealHeatmap, setMealHeatmap] = useState<CalendarHeatmapData | null>(null);
  const [waistData, setWaistData] = useState<HealthChartDataPoint[]>([]);
  const [weightData, setWeightData] = useState<HealthChartDataPoint[]>([]);
  
  // ===== HEALTH DETAILS DATA =====
  const [restingHRData, setRestingHRData] = useState<HealthChartDataPoint[]>([]);
  const [hrvData, setHrvData] = useState<HealthChartDataPoint[]>([]);
  
  // ===== EXERCISE DETAILS DATA =====
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<WeeklyWorkoutsData | null>(null);
  const [distanceData, setDistanceData] = useState<HealthChartDataPoint[]>([]);
  
  // ===== STRENGTH DATA =====
  const [exerciseProgressData, setExerciseProgressData] = useState<Record<string, ExerciseProgressDataPoint[]>>({});
  
  // Heatmap offsets for navigation
  const [summaryOffset, setSummaryOffset] = useState(0);
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
        fetchWeeklySummary(tokenGetter, { offset: summaryOffset }).catch(() => null),
        fetchSleep(tokenGetter, dateRange).catch(() => ({ data: [] })),
        fetchCalendarHeatmap(tokenGetter, { type: 'mindful', offset: mindfulOffset }).catch(() => null),
        fetchCalendarHeatmap(tokenGetter, { type: 'exercise', offset: exerciseOffset }).catch(() => null),
        fetchStrengthVolume(tokenGetter, dateRange).catch(() => null),
        fetchCalendarHeatmap(tokenGetter, { type: 'meal', offset: mealOffset }).catch(() => null),
        fetchMetrics(tokenGetter, { type: 'Waist Circumference (in)', ...dateRange }).catch(() => ({ data: [] })),
        fetchMetrics(tokenGetter, { type: 'Weight/Body Mass (lb)', ...dateRange }).catch(() => ({ data: [] })),
      ]).then(([summary, sleep, mindful, exercise, strength, meal, waist, weight]) => {
        setWeeklySummary(summary);
        setSleepData(sleep.data);
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
      ]).then(([restingHR, hrv]) => {
        setRestingHRData(restingHR.data);
        setHrvData(hrv.data);
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
    fetchWeeklySummary(getToken, { offset: summaryOffset })
      .then(setWeeklySummary)
      .catch(console.error);
  }, [summaryOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!initialLoadComplete) return;
    fetchCalendarHeatmap(getToken, { type: 'mindful', offset: mindfulOffset })
      .then(setMindfulHeatmap)
      .catch(console.error);
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
        <ActivityIndicator size="large" color={colors.foregroundMuted} />
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
      {/* Top Nav Bar with Hamburger Menu and Date Range */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={openDrawer}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setPickerVisible(true)}
        >
          <Text style={styles.pickerButtonText}>{selectedLabel}</Text>
          <Text style={styles.pickerChevron}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.aiButton}
          onPress={openTimTrackerGpt}
          accessibilityRole="link"
          accessibilityLabel="Open TimTracker GPT"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Sparkles size={18} color={colors.foreground} strokeWidth={1.8} />
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
        {/* 0. Weekly Summary */}
        <WeeklySummaryChart
          data={weeklySummary}
          loading={loadingCore}
          onNavigateBack={() => setSummaryOffset(prev => prev + 1)}
          onNavigateForward={() => setSummaryOffset(prev => Math.max(0, prev - 1))}
          canNavigateForward={summaryOffset > 0}
        />

        {/* 1. Exercise Calendar */}
        <CalendarHeatmap
          title="Exercise Calendar"
          chartType="exercise"
          unit="min"
          colorScale={[colors.background, colors.chart.emerald500]}
          data={exerciseHeatmap}
          loading={loadingCore}
          onNavigateBack={() => setExerciseOffset(prev => prev + 1)}
          onNavigateForward={() => setExerciseOffset(prev => Math.max(0, prev - 1))}
          canNavigateForward={exerciseOffset > 0}
        />

        {/* 2. Daily Diet Calendar */}
        <CalendarHeatmap
          title="Daily Diet"
          chartType="meal"
          unit="meals"
          useScoreColors
          data={mealHeatmap}
          loading={loadingCore}
          onNavigateBack={() => setMealOffset(prev => prev + 1)}
          onNavigateForward={() => setMealOffset(prev => Math.max(0, prev - 1))}
          canNavigateForward={mealOffset > 0}
        />

        {/* 3. Sleep */}
        <SleepChart
          data={sleepData}
          loading={loadingCore}
        />

        {/* 4. Mindful Minutes Calendar */}
        <CalendarHeatmap
          title="Mindful Minutes Calendar"
          chartType="mindful"
          unit="min"
          colorScale={[colors.background, colors.chart.purple500]}
          data={mindfulHeatmap}
          loading={loadingCore}
          onNavigateBack={() => setMindfulOffset(prev => prev + 1)}
          onNavigateForward={() => setMindfulOffset(prev => Math.max(0, prev - 1))}
          canNavigateForward={mindfulOffset > 0}
        />

        {/* 5. Strength Training Volume */}
        <StrengthChart
          data={strengthVolume}
          loading={loadingCore}
        />

        {/* 7. Waist Circumference */}
        <HealthChart
          data={waistData}
          title="Waist Circumference"
          color={colors.chart.slate500}
          unit="in"
          chartType="scatter"
          loading={loadingCore}
          scaleToData
        />

        {/* 8. Body Weight */}
        <HealthChart
          data={weightData}
          title="Body Weight"
          color={colors.chart.slate500}
          unit="lbs"
          chartType="scatter"
          loading={loadingCore}
          scaleToData
        />

        {/* ===== SECTION 2: HEALTH DETAILS ===== */}
        {/* 9. Resting Heart Rate */}
        <HealthChart
          data={restingHRData}
          title="Resting Heart Rate"
          color={colors.chart.pink500}
          unit="bpm"
          chartType="scatter"
          loading={loadingHealth}
        />

        {/* 10. Heart Rate Variability */}
        <HealthChart
          data={hrvData}
          title="Heart Rate Variability"
          color={colors.chart.indigo500}
          unit="ms"
          chartType="scatter"
          loading={loadingHealth}
        />


        {/* 12. Weekly Workouts */}
        <WorkoutsChart
          data={weeklyWorkouts}
          loading={loadingExercise}
        />

        {/* 13. Walking + Running Distance */}
        <HealthChart
          data={distanceData}
          title="Walking + Running Distance"
          color={colors.chart.sky500}
          unit="mi"
          chartType="bar"
          loading={loadingExercise}
        />

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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[4],
  },
  hamburgerButton: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 24,
    height: 2,
    backgroundColor: colors.foreground,
    borderRadius: 1,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderWidth: 1,
    borderColor: colors.borderInput,
  },
  pickerButtonText: {
    fontSize: fontSizes.sm,
    color: colors.foreground,
    fontFamily: fonts.regular,
  },
  pickerChevron: {
    fontSize: fontSizes.xs,
    color: colors.foregroundMuted,
  },
  aiButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing[5],
    width: '85%',
    maxWidth: 320,
    ...shadows.md,
  },
  modalTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fonts.regular,
    marginBottom: spacing[4],
    textAlign: 'center',
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  modalOption: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[1],
  },
  modalOptionSelected: {
    backgroundColor: colors.primary,
  },
  modalOptionText: {
    fontSize: fontSizes.sm,
    color: colors.foreground,
  },
  modalOptionTextSelected: {
    color: colors.primaryForeground,
    fontFamily: fonts.regular,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: colors.backgroundMuted,
  },
  loadingText: {
    marginTop: spacing[3],
    color: colors.foregroundMuted,
    fontSize: fontSizes.sm,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    maxWidth: 300,
  },
  errorTitle: {
    fontFamily: fonts.regular,
    color: colors.destructive,
    marginBottom: spacing[1],
    fontSize: fontSizes.sm,
  },
  errorText: {
    color: colors.destructive,
    fontSize: fontSizes.sm,
  },
  scrollContent: {
    paddingHorizontal: spacing[2], // Minimal horizontal padding (8px)
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
  },
});
