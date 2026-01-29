import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import {
  LogEntry,
  LogLevel,
  subscribeToLogs,
  clearLogs,
  formatLogsForClipboard,
} from '@/lib/logger';

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: '#3b82f6',
  warn: '#f59e0b',
  error: '#ef4444',
};

const LEVEL_BG_COLORS: Record<LogLevel, string> = {
  info: '#eff6ff',
  warn: '#fffbeb',
  error: '#fef2f2',
};

function LogEntryItem({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <TouchableOpacity
      style={[styles.logEntry, { backgroundColor: LEVEL_BG_COLORS[entry.level] }]}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.logHeader}>
        <View
          style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[entry.level] }]}
        >
          <Text style={styles.levelText}>{entry.level.toUpperCase()}</Text>
        </View>
        <Text style={styles.categoryText}>[{entry.category}]</Text>
        <Text style={styles.timeText}>{formatTime(entry.timestamp)}</Text>
      </View>
      <Text style={styles.messageText} numberOfLines={expanded ? undefined : 2}>
        {entry.message}
      </Text>
      {entry.details && expanded && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsText}>{entry.details}</Text>
        </View>
      )}
      {(entry.details || entry.message.length > 100) && (
        <Text style={styles.expandHint}>
          {expanded ? 'Tap to collapse' : 'Tap to expand'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function LogsScreen() {
  const navigation = useNavigation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'warnings'>('warnings');

  useEffect(() => {
    const unsubscribe = subscribeToLogs(setLogs);
    return unsubscribe;
  }, []);

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const filteredLogs =
    filter === 'warnings'
      ? logs.filter((l) => l.level === 'warn' || l.level === 'error')
      : logs;

  const handleCopyLogs = useCallback(async () => {
    const text = formatLogsForClipboard(filteredLogs);
    if (text) {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', `${filteredLogs.length} log entries copied to clipboard`);
    } else {
      Alert.alert('No Logs', 'No logs to copy');
    }
  }, [filteredLogs]);

  const handleClearLogs = useCallback(() => {
    Alert.alert('Clear Logs', 'Are you sure you want to clear all logs?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => clearLogs(),
      },
    ]);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Nav Bar with Hamburger Menu */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          style={styles.hamburgerButton}
          onPress={openDrawer}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
          <View style={styles.hamburgerLine} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Logs</Text>
      </View>
      {/* Header Actions */}
      <View style={styles.header}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'warnings' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('warnings')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'warnings' && styles.filterButtonTextActive,
              ]}
            >
              Warnings & Errors
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All Logs
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCopyLogs}>
            <Text style={styles.actionButtonText}>📋 Copy All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.clearButton]}
            onPress={handleClearLogs}
          >
            <Text style={[styles.actionButtonText, styles.clearButtonText]}>
              🗑️ Clear
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Log Count */}
      <Text style={styles.countText}>
        Showing {filteredLogs.length} of {logs.length} logs
      </Text>

      {/* Log List */}
      <ScrollView style={styles.logList} contentContainerStyle={styles.logListContent}>
        {filteredLogs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No logs yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Logs will appear here as you use the app
            </Text>
          </View>
        ) : (
          filteredLogs.map((entry) => <LogEntryItem key={entry.id} entry={entry} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  hamburgerButton: {
    width: 24,
    height: 18,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 24,
    height: 2,
    backgroundColor: '#1f2937',
    borderRadius: 1,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1f2937',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#1f2937',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  actionRow: {
    flexDirection: 'row',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  clearButton: {
    backgroundColor: '#fee2e2',
  },
  clearButtonText: {
    color: '#dc2626',
  },
  countText: {
    fontSize: 12,
    color: '#9ca3af',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logList: {
    flex: 1,
  },
  logListContent: {
    padding: 16,
    paddingTop: 0,
  },
  logEntry: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  timeText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  messageText: {
    fontSize: 13,
    color: '#1f2937',
    lineHeight: 18,
  },
  detailsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4,
  },
  detailsText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#4b5563',
  },
  expandHint: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
