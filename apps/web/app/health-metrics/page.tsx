'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface HealthMetric {
  id: number;
  date: string;
  type: string;
  value: number;
  unit: string | null;
  timezone: string | null;
}

export default function HealthMetricsPage() {
  const { userId, isLoaded } = useAuth();
  const router = useRouter();
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId) {
      router.push('/sign-in');
      return;
    }

    // Fetch health metrics
    async function fetchMetrics() {
      try {
        setLoading(true);
        const response = await fetch('/api/health-metrics');

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch health metrics');
        }

        const result = await response.json();
        setMetrics(result.data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [userId, isLoaded, router]);

  if (!isLoaded || !userId) {
    return (
      <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1>Apple Health Metrics</h1>
      <p>Hello World: Querying Neon database for health metrics data.</p>

      {loading ? (
        <p style={{ marginTop: 16 }}>Loading metrics...</p>
      ) : error ? (
        <div style={{ 
          padding: 16, 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: 4,
          marginTop: 16
        }}>
          <strong>Error:</strong> {error}
        </div>
      ) : (
        <>
          <p style={{ marginTop: 16 }}>
            Found <strong>{metrics.length}</strong> metrics:
          </p>
          
          {metrics.length === 0 ? (
            <p style={{ marginTop: 16, color: '#666' }}>
              No health metrics found in the database.
            </p>
          ) : (
            <table style={{ 
              marginTop: 16, 
              width: '100%', 
              borderCollapse: 'collapse',
              border: '1px solid #ddd'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>ID</th>
                  <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Date</th>
                  <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Type</th>
                  <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Value</th>
                  <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Unit</th>
                  <th style={{ padding: 12, textAlign: 'left', border: '1px solid #ddd' }}>Timezone</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr key={metric.id}>
                    <td style={{ padding: 12, border: '1px solid #ddd' }}>{metric.id}</td>
                    <td style={{ padding: 12, border: '1px solid #ddd' }}>
                      {new Date(metric.date).toLocaleString()}
                    </td>
                    <td style={{ padding: 12, border: '1px solid #ddd' }}>{metric.type}</td>
                    <td style={{ padding: 12, border: '1px solid #ddd' }}>{metric.value}</td>
                    <td style={{ padding: 12, border: '1px solid #ddd' }}>{metric.unit || '-'}</td>
                    <td style={{ padding: 12, border: '1px solid #ddd' }}>{metric.timezone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </main>
  );
}

