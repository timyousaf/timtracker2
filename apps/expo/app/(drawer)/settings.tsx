import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, fontSizes, fonts, spacing, borderRadius } from '@/lib/theme';
import { logger } from '@/lib/logger';

// Only import HealthKit on iOS
let healthKit: typeof import('@/lib/healthkit') | null = null;
if (Platform.OS === 'ios') {
  healthKit = require('@/lib/healthkit');
}

export default function SettingsScreen() {
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const navigation = useNavigation();

  // Health sync state
  const [isHealthKitAvailable, setIsHealthKitAvailable] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Check HealthKit availability on mount
  useEffect(() => {
    if (Platform.OS === 'ios' && healthKit) {
      healthKit.checkHealthKitAvailable().then(setIsHealthKitAvailable);
      healthKit.getLastSyncTime().then(setLastSyncTime);
    } else {
      setIsHealthKitAvailable(false);
    }
  }, []);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/sign-in');
  };

  const handleSync = useCallback(async () => {
    if (!healthKit || isSyncing) return;

    logger.info('Settings', 'User initiated Health Sync');
    setIsSyncing(true);
    setSyncResult(null);
    setSyncProgress('Starting sync...');

    try {
      const result = await healthKit.syncAllHealthData(
        getToken,
        (progress) => {
          setSyncProgress(progress.message);
        }
      );

      if (result.success) {
        const totalInserted =
          result.metrics.inserted +
          result.sleep.inserted +
          result.workouts.inserted;
        const totalDuplicates =
          result.metrics.duplicates +
          result.sleep.duplicates +
          result.workouts.duplicates;

        logger.info('Settings', 'Health Sync completed successfully', {
          inserted: totalInserted,
          duplicates: totalDuplicates,
        });

        setSyncResult({
          success: true,
          message: `Synced ${totalInserted} new records (${totalDuplicates} already synced)`,
        });

        // Refresh last sync time
        const newLastSync = await healthKit.getLastSyncTime();
        setLastSyncTime(newLastSync);
      } else {
        logger.error('Settings', 'Health Sync failed', {
          error: result.error,
        });
        setSyncResult({
          success: false,
          message: result.error || 'Sync failed',
        });
      }
    } catch (error) {
      logger.error('Settings', 'Health Sync threw exception', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      setIsSyncing(false);
      setSyncProgress('');
    }
  }, [getToken, isSyncing]);

  const formatLastSyncTime = (isoString: string | null): string => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString();
  };

  const displayName =
    user?.firstName || user?.emailAddresses[0]?.emailAddress || 'User';

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Nav Bar with Hamburger Menu */}
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
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* User Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Signed in as</Text>
            <Text style={styles.username}>{displayName}</Text>
            {user?.emailAddresses[0]?.emailAddress && user?.firstName && (
              <Text style={styles.email}>
                {user.emailAddresses[0].emailAddress}
              </Text>
            )}
          </View>
        </View>

        {/* Health Sync Section - iOS only */}
        {Platform.OS === 'ios' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Sync</Text>
            <View style={styles.card}>
              {isHealthKitAvailable === null ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : isHealthKitAvailable ? (
                <>
                  <Text style={styles.label}>Apple Health</Text>
                  <Text style={styles.healthStatus}>
                    Sync your health data from Apple Health to see personalized
                    charts and trends.
                  </Text>

                  <View style={styles.lastSyncRow}>
                    <Text style={styles.lastSyncLabel}>Last synced:</Text>
                    <Text style={styles.lastSyncValue}>
                      {formatLastSyncTime(lastSyncTime)}
                    </Text>
                  </View>

                  {isSyncing && (
                    <View style={styles.progressContainer}>
                      <ActivityIndicator
                        size="small"
                        color={colors.primary}
                        style={styles.progressSpinner}
                      />
                      <Text style={styles.progressText}>{syncProgress}</Text>
                    </View>
                  )}

                  {syncResult && (
                    <View
                      style={[
                        styles.resultContainer,
                        syncResult.success
                          ? styles.resultSuccess
                          : styles.resultError,
                      ]}
                    >
                      <Text
                        style={[
                          styles.resultText,
                          syncResult.success
                            ? styles.resultTextSuccess
                            : styles.resultTextError,
                        ]}
                      >
                        {syncResult.message}
                      </Text>
                    </View>
                  )}

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[
                        styles.syncButton,
                        isSyncing && styles.syncButtonDisabled,
                      ]}
                      onPress={handleSync}
                      disabled={isSyncing}
                    >
                      <Text style={styles.syncButtonText}>
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.resetButton,
                        isSyncing && styles.syncButtonDisabled,
                      ]}
                      onPress={async () => {
                        if (!healthKit || isSyncing) return;
                        logger.info('Settings', 'User initiated Reset & Full Sync');
                        await healthKit.clearAllAnchors();
                        handleSync();
                      }}
                      disabled={isSyncing}
                    >
                      <Text style={styles.resetButtonText}>
                        Reset & Full Sync
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <Text style={styles.healthUnavailable}>
                  Apple Health is not available on this device.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
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
  headerTitle: {
    fontSize: fontSizes.base,
    fontFamily: fonts.regular,
    color: colors.foreground,
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  section: {
    marginBottom: spacing[6],
  },
  sectionTitle: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foregroundMuted,
    marginBottom: spacing[2],
    paddingHorizontal: spacing[1],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[5],
  },
  label: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foregroundMuted,
    marginBottom: spacing[1],
  },
  username: {
    fontSize: fontSizes.lg,
    fontFamily: fonts.regular,
    color: colors.foreground,
  },
  email: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foregroundMuted,
    marginTop: spacing[1],
  },
  healthStatus: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foregroundMuted,
    marginTop: spacing[1],
    marginBottom: spacing[4],
    lineHeight: 20,
  },
  healthUnavailable: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foregroundMuted,
  },
  lastSyncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  lastSyncLabel: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foregroundMuted,
  },
  lastSyncValue: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foreground,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
    backgroundColor: colors.background,
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  progressSpinner: {
    marginRight: spacing[2],
  },
  progressText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    color: colors.foregroundMuted,
    flex: 1,
  },
  resultContainer: {
    padding: spacing[3],
    borderRadius: borderRadius.md,
    marginBottom: spacing[4],
  },
  resultSuccess: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  resultError: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  resultText: {
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
  },
  resultTextSuccess: {
    color: '#22c55e',
  },
  resultTextError: {
    color: colors.destructive,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  syncButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: fontSizes.base,
    fontFamily: fonts.regular,
    fontWeight: '600',
  },
  resetButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButtonText: {
    color: colors.foreground,
    fontSize: fontSizes.sm,
    fontFamily: fonts.regular,
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.destructive,
  },
  signOutText: {
    color: colors.destructive,
    fontSize: fontSizes.base,
    fontFamily: fonts.regular,
  },
});
