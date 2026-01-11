import { useAuth } from '@clerk/clerk-expo';
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import type { HealthMetric } from '@timtracker/shared';
import { fetchHealthMetrics } from '@/lib/api';

export default function HealthMetricsScreen() {
  const { getToken } = useAuth();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    try {
      setError(null);
      const response = await fetchHealthMetrics(getToken);
      setMetrics(response.data);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    }
  }, [getToken]);

  useEffect(() => {
    setLoading(true);
    loadMetrics().finally(() => setLoading(false));
  }, [loadMetrics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMetrics();
    setRefreshing(false);
  }, [loadMetrics]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const renderMetric = ({ item }: { item: HealthMetric }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricType}>{item.type}</Text>
        <Text style={styles.metricId}>#{item.id}</Text>
      </View>
      <View style={styles.metricBody}>
        <Text style={styles.metricValue}>
          {item.value} {item.unit || ''}
        </Text>
        <Text style={styles.metricDate}>{formatDate(item.date)}</Text>
      </View>
      {item.timezone && (
        <Text style={styles.metricTimezone}>{item.timezone}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading metrics...</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={metrics}
        renderItem={renderMetric}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <Text style={styles.countText}>
            Found <Text style={styles.countBold}>{metrics.length}</Text> metrics
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No health metrics found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  listContent: {
    padding: 16,
  },
  countText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  countBold: {
    fontWeight: 'bold',
    color: '#333',
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  metricId: {
    fontSize: 12,
    color: '#999',
  },
  metricBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0066cc',
  },
  metricDate: {
    fontSize: 12,
    color: '#666',
  },
  metricTimezone: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
});
