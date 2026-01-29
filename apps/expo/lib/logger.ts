/**
 * Simple in-memory logger for debugging.
 * Stores logs that can be viewed in the app's Logs screen.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  category: string;
  message: string;
  details?: string;
}

// Store logs in memory
const logs: LogEntry[] = [];
const MAX_LOGS = 500;

// Listeners for real-time updates
type LogListener = (logs: LogEntry[]) => void;
const listeners: Set<LogListener> = new Set();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function notifyListeners() {
  listeners.forEach((listener) => listener([...logs]));
}

/**
 * Add a log entry
 */
export function log(
  level: LogLevel,
  category: string,
  message: string,
  details?: unknown
): void {
  const entry: LogEntry = {
    id: generateId(),
    timestamp: new Date(),
    level,
    category,
    message,
    details: details
      ? typeof details === 'string'
        ? details
        : JSON.stringify(details, null, 2)
      : undefined,
  };

  logs.unshift(entry); // Add to beginning (newest first)

  // Trim if over max
  while (logs.length > MAX_LOGS) {
    logs.pop();
  }

  // Also log to console for development
  const consoleMethod =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleMethod(`[${category}] ${message}`, details || '');

  notifyListeners();
}

/**
 * Convenience methods
 */
export const logger = {
  info: (category: string, message: string, details?: unknown) =>
    log('info', category, message, details),
  warn: (category: string, message: string, details?: unknown) =>
    log('warn', category, message, details),
  error: (category: string, message: string, details?: unknown) =>
    log('error', category, message, details),
};

/**
 * Get all logs
 */
export function getLogs(): LogEntry[] {
  return [...logs];
}

/**
 * Get logs filtered by level (warn and error only by default)
 */
export function getFilteredLogs(levels: LogLevel[] = ['warn', 'error']): LogEntry[] {
  return logs.filter((entry) => levels.includes(entry.level));
}

/**
 * Clear all logs
 */
export function clearLogs(): void {
  logs.length = 0;
  notifyListeners();
}

/**
 * Subscribe to log updates
 */
export function subscribeToLogs(listener: LogListener): () => void {
  listeners.add(listener);
  // Immediately call with current logs
  listener([...logs]);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Format logs for copying to clipboard
 */
export function formatLogsForClipboard(entries: LogEntry[]): string {
  return entries
    .map((entry) => {
      const time = entry.timestamp.toISOString();
      const level = entry.level.toUpperCase().padEnd(5);
      const details = entry.details ? `\n  ${entry.details.replace(/\n/g, '\n  ')}` : '';
      return `[${time}] ${level} [${entry.category}] ${entry.message}${details}`;
    })
    .join('\n\n');
}
