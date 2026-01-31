import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState, useCallback, useRef } from 'react';
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
  AppState,
  AppStateStatus,
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
import { getCachedData, setCachedData, makeCacheKey } from '@/lib/dataCache';
import { runFullSync, isSyncNeeded } from '@/lib/syncService';

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
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const openTimTrackerGpt = useCallback(async () => {
    // Important: `expo-web-browser` uses an in-app Safari view on iOS, which
    // does NOT hand off Universal Links to other apps. Use `Linking.openURL`
    // first so the ChatGPT iOS app can open the custom GPT (if installed).
    try {
      await Linking.openURL(TIMTRACKER_GPT_URL);
      return;
    } catch {
      // Fall through to in-app browser.
    }

    try {
      await WebBrowser.openBrowserAsync(TIMTRACKER_GPT_URL);
    } catch {
      // If even the in-app browser fails, there's nothing else to do.
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

  // Loading states - only for initial load, not for background refresh
  const [loadingCore, setLoadingCore] = useState(true);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingExercise, setLoadingExercise] = useState(true);
  const [loadingStrength, setLoadingStrength] = useState(true);

  // Track if initial load is complete to avoid duplicate fetches
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Track if we have any cached data to show
  const [hasCachedData, setHasCachedData] = useState(false);

  // Picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  
  // AppState for foreground sync
  const appState = useRef(AppState.currentState);
  const lastForegroundSync = useRef<number>(0);

  /**
   * Load cached data from AsyncStorage for immediate display
   */
  const loadCachedData = useCallback(async (range: DateRange) => {
    const dateRange = formatDateRangeForApi(range);
    const cacheKeyBase = `charts_${range}`;
    
    try {
      const cached = await getCachedData<{
        weeklySummary: WeeklySummaryData | null;
        sleepData: SleepDataPoint[];
        mindfulHeatmap: CalendarHeatmapData | null;
        exerciseHeatmap: CalendarHeatmapData | null;
        strengthVolume: StrengthVolumeData | null;
        mealHeatmap: CalendarHeatmapData | null;
        waistData: HealthChartDataPoint[];
        weightData: HealthChartDataPoint[];
        restingHRData: HealthChartDataPoint[];
        hrvData: HealthChartDataPoint[];
        weeklyWorkouts: WeeklyWorkoutsData | null;
        distanceData: HealthChartDataPoint[];
        exerciseProgressData: Record<string, ExerciseProgressDataPoint[]>;
      }>(cacheKeyBase);
      
      if (cached) {
        setWeeklySummary(cached.weeklySummary);
        setSleepData(cached.sleepData);
        setMindfulHeatmap(cached.mindfulHeatmap);
        setExerciseHeatmap(cached.exerciseHeatmap);
        setStrengthVolume(cached.strengthVolume);
        setMealHeatmap(cached.mealHeatmap);
        setWaistData(cached.waistData);
        setWeightData(cached.weightData);
        setRestingHRData(cached.restingHRData);
        setHrvData(cached.hrvData);
        setWeeklyWorkouts(cached.weeklyWorkouts);
        setDistanceData(cached.distanceData);
        setExerciseProgressData(cached.exerciseProgressData);
        setHasCachedData(true);
        
        // Hide loading spinners since we have cached data
        setLoadingCore(false);
        setLoadingHealth(false);
        setLoadingExercise(false);
        setLoadingStrength(false);
        
        return true;
      }
    } catch (e) {
      console.warn('Error loading cached data:', e);
    }
    return false;
  }, []);

  /**
   * Fetch fresh data from API and cache it
   * Now properly awaits all promises
   */
  const loadAllData = useCallback(async (range: DateRange, showLoading = true) => {
    setError(null);
    const tokenGetter = getToken;
    const dateRange = formatDateRangeForApi(range);
    const cacheKeyBase = `charts_${range}`;

    // Only show loading spinners on initial load when we have NO data at all
    // Once we have data displayed (initialLoadComplete), never show chart loading spinners
    // This ensures the user always sees data, with background refresh happening silently
    if (showLoading && !initialLoadComplete && !hasCachedData) {
      setLoadingCore(true);
      setLoadingHealth(true);
      setLoadingExercise(true);
      setLoadingStrength(true);
    }

    try {
      // Fetch all data in parallel, properly awaited
      const [
        // Core metrics
        summary,
        sleep,
        mindful,
        exercise,
        strength,
        meal,
        waist,
        weight,
        // Health details
        restingHR,
        hrv,
        // Exercise details
        workouts,
        distance,
        // Strength progress
        ...exerciseResults
      ] = await Promise.all([
        // Core
        fetchWeeklySummary(tokenGetter, { offset: summaryOffset }).catch(() => null),
        fetchSleep(tokenGetter, dateRange).catch(() => ({ data: [] })),
        fetchCalendarHeatmap(tokenGetter, { type: 'mindful', offset: mindfulOffset }).catch(() => null),
        fetchCalendarHeatmap(tokenGetter, { type: 'exercise', offset: exerciseOffset }).catch(() => null),
        fetchStrengthVolume(tokenGetter, dateRange).catch(() => null),
        fetchCalendarHeatmap(tokenGetter, { type: 'meal', offset: mealOffset }).catch(() => null),
        fetchMetrics(tokenGetter, { type: 'Waist Circumference (in)', ...dateRange }).catch(() => ({ data: [] })),
        fetchMetrics(tokenGetter, { type: 'Weight/Body Mass (lb)', ...dateRange }).catch(() => ({ data: [] })),
        // Health
        fetchMetrics(tokenGetter, { type: 'Resting Heart Rate (bpm)', ...dateRange }).catch(() => ({ data: [] })),
        fetchMetrics(tokenGetter, { type: 'Heart Rate Variability (ms)', ...dateRange }).catch(() => ({ data: [] })),
        // Exercise
        fetchWeeklyWorkouts(tokenGetter, dateRange).catch(() => null),
        fetchMetrics(tokenGetter, { type: 'Walking + Running Distance (mi)', ...dateRange }).catch(() => ({ data: [] })),
        // Strength (spread into results)
        ...EXERCISES.map(ex => 
          fetchExerciseProgress(tokenGetter, { exercise: ex.name, ...dateRange })
            .then(res => ({ name: ex.name, data: res.data }))
            .catch(() => ({ name: ex.name, data: [] as ExerciseProgressDataPoint[] }))
        ),
      ]);

      // Build exercise progress map
      const progressMap: Record<string, ExerciseProgressDataPoint[]> = {};
      exerciseResults.forEach((r: { name: string; data: ExerciseProgressDataPoint[] }) => {
        progressMap[r.name] = r.data;
      });

      // Update all state
      setWeeklySummary(summary);
      setSleepData(sleep.data);
      setMindfulHeatmap(mindful);
      setExerciseHeatmap(exercise);
      setStrengthVolume(strength);
      setMealHeatmap(meal);
      setWaistData(waist.data);
      setWeightData(weight.data);
      setRestingHRData(restingHR.data);
      setHrvData(hrv.data);
      setWeeklyWorkouts(workouts);
      setDistanceData(distance.data);
      setExerciseProgressData(progressMap);
      
      setHasCachedData(true);

      // Cache the data for next time
      await setCachedData(cacheKeyBase, {
        weeklySummary: summary,
        sleepData: sleep.data,
        mindfulHeatmap: mindful,
        exerciseHeatmap: exercise,
        strengthVolume: strength,
        mealHeatmap: meal,
        waistData: waist.data,
        weightData: weight.data,
        restingHRData: restingHR.data,
        hrvData: hrv.data,
        weeklyWorkouts: workouts,
        distanceData: distance.data,
        exerciseProgressData: progressMap,
      });

    } catch (err) {
      console.error('Error loading chart data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load charts');
    } finally {
      setLoadingCore(false);
      setLoadingHealth(false);
      setLoadingExercise(false);
      setLoadingStrength(false);
    }
  }, [getToken, summaryOffset, mindfulOffset, exerciseOffset, mealOffset, hasCachedData, initialLoadComplete]);

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

  /**
   * Full refresh: run health sync, then load fresh API data
   * With timeout protection and status updates
   */
  const doFullRefresh = useCallback(async (showLoadingSpinners = false, showStatus = false) => {
    const SYNC_TIMEOUT_MS = 60000; // 60 second timeout
    
    try {
      // Step 1: Run health sync (pushes data to server) with timeout
      if (showStatus) setSyncStatus('Syncing health data...');
      
      const syncPromise = runFullSync(getToken, { 
        force: true,
        onProgress: showStatus ? setSyncStatus : undefined,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Sync timeout')), SYNC_TIMEOUT_MS);
      });
      
      try {
        await Promise.race([syncPromise, timeoutPromise]);
      } catch (err) {
        console.warn('Sync error or timeout:', err);
        // Continue to load data even if sync failed/timed out
      }
      
      // Step 2: Load fresh data from API (always fetch fresh, never show big spinners during refresh)
      // Note: We removed the clearCache option - data is always persisted locally
      // and we always fetch fresh data from the API after sync
      if (showStatus) setSyncStatus('Loading charts...');
      await loadAllData(selectedRange, showLoadingSpinners);
      
      lastForegroundSync.current = Date.now();
    } catch (err) {
      console.error('Full refresh error:', err);
    } finally {
      setSyncStatus(null);
    }
  }, [getToken, loadAllData, selectedRange]);

  // Initial load: show cached data immediately, then refresh in background
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      
      // First, try to load cached data for immediate display
      const hadCache = await loadCachedData(selectedRange);
      
      if (hadCache) {
        // We have cached data, hide loading and refresh in background
        setLoading(false);
        setInitialLoadComplete(true);
        
        // Background refresh (no loading spinners)
        doFullRefresh(false);
      } else {
        // No cache, need to wait for fresh data
        await doFullRefresh(true);
        setLoading(false);
        setInitialLoadComplete(true);
      }
    };

    initializeData();
  }, [selectedRange]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle app returning to foreground - sync if needed
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground
        const timeSinceLastSync = Date.now() - lastForegroundSync.current;
        const fiveMinutes = 5 * 60 * 1000;
        
        // Only sync if it's been more than 5 minutes since last sync
        if (timeSinceLastSync > fiveMinutes) {
          console.log('[HomeScreen] App foregrounded, running background sync');
          doFullRefresh(false); // No loading spinners
        }
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [doFullRefresh]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await doFullRefresh(false, true); // Show status banner, no loading spinners
    setRefreshing(false);
  }, [doFullRefresh]);

  // Only show full-screen loading if we have no cached data yet
  if (loading && !hasCachedData) {
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

      {/* Sync Status Banner */}
      {syncStatus && (
        <View style={styles.syncBanner}>
          <ActivityIndicator size="small" color={colors.primary} style={styles.syncSpinner} />
          <Text style={styles.syncText}>{syncStatus}</Text>
        </View>
      )}

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
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  syncSpinner: {
    marginRight: spacing[2],
  },
  syncText: {
    fontSize: fontSizes.sm,
    color: colors.foregroundMuted,
    fontFamily: fonts.regular,
  },
});
