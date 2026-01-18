/**
 * Date range utilities - ported from legacy TimTracker
 */

export type DateRange =
  | 'all'
  | 'ytd'
  | 'lastYear'
  | 'pastYear'
  | 'past5Years'
  | 'past30Days'
  | 'past60Days'
  | 'past90Days';

export const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'YTD', value: 'ytd' },
  { label: 'Past 30 Days', value: 'past30Days' },
  { label: 'Past 60 Days', value: 'past60Days' },
  { label: 'Past 90 Days', value: 'past90Days' },
  { label: 'Past Year', value: 'pastYear' },
  { label: 'Past 5 Years', value: 'past5Years' },
  { label: 'Last Year', value: 'lastYear' },
];

export const DEFAULT_DATE_RANGE: DateRange = 'past90Days';

/**
 * Returns a date range [start, end] based on the specified range type
 */
export function getDateRange(range: DateRange): { start: Date; end: Date } {
  const now = new Date();
  // Set end date to the end of the current day (23:59:59.999) to include all data from today
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (range) {
    case 'all':
      return { start: new Date(2015, 0, 1), end };
    case 'ytd':
      return { start: new Date(now.getFullYear(), 0, 1), end };
    case 'past30Days': {
      const start = new Date(end);
      start.setDate(start.getDate() - 30);
      return { start, end };
    }
    case 'past60Days': {
      const start = new Date(end);
      start.setDate(start.getDate() - 60);
      return { start, end };
    }
    case 'past90Days': {
      const start = new Date(end);
      start.setDate(start.getDate() - 90);
      return { start, end };
    }
    case 'pastYear': {
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      return { start, end };
    }
    case 'lastYear': {
      const lastYear = end.getFullYear() - 1;
      return { start: new Date(lastYear, 0, 1), end: new Date(lastYear, 11, 31) };
    }
    case 'past5Years': {
      const start = new Date(end);
      start.setFullYear(start.getFullYear() - 5);
      return { start, end };
    }
    default:
      return { start: new Date(2015, 0, 1), end };
  }
}

/**
 * Format date range for API requests (YYYY-MM-DD strings)
 */
export function formatDateRangeForApi(range: DateRange): { start: string; end: string } {
  const { start, end } = getDateRange(range);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
