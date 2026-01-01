/**
 * Logger Service
 *
 * Provides a centralized logging utility that:
 * - Suppresses debug/info logs in production
 * - Keeps error/warn logs for production debugging
 * - Provides consistent formatting
 * - Future: Can be extended for error tracking services
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Debug-level logging (development only)
   * Use for detailed debugging information
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Info-level logging (development only)
   * Use for general information messages
   */
  info: (message: string, ...args: unknown[]): void => {
    if (isDev) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Warning-level logging (always active)
   * Use for potential issues that don't break functionality
   */
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Error-level logging (always active)
   * Use for errors and exceptions
   *
   * @param message - Error description
   * @param error - Optional error object for stack trace
   */
  error: (message: string, error?: unknown): void => {
    console.error(`[ERROR] ${message}`, error);
    // Future: Send to error tracking service (e.g., Sentry)
  },

  /**
   * Group related logs together (development only)
   * Use for organizing related debug information
   */
  group: (label: string): void => {
    if (isDev) {
      console.group(label);
    }
  },

  /**
   * End a log group
   */
  groupEnd: (): void => {
    if (isDev) {
      console.groupEnd();
    }
  },

  /**
   * Log with timing information (development only)
   * Use for performance debugging
   */
  time: (label: string): void => {
    if (isDev) {
      console.time(label);
    }
  },

  /**
   * End a timed log
   */
  timeEnd: (label: string): void => {
    if (isDev) {
      console.timeEnd(label);
    }
  },
};

export default logger;
