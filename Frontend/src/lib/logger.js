/**
 * Logger utility
 * - Logs to console only in development
 * - Sends errors to Sentry in production
 * - Provides structured logging with categories
 */

const isDev = import.meta.env.MODE === 'development';
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
let sentryPromise = null;

function loadSentry() {
  if (!sentryDsn) return null;
  if (!sentryPromise) {
    sentryPromise = import('@sentry/react').catch(() => null);
  }
  return sentryPromise;
}

/**
 * Log levels
 */
const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

/**
 * Format log message with category
 */
function formatMessage(category, message) {
  return category ? `[${category}] ${message}` : message;
}

/**
 * Logger class
 */
class Logger {
  constructor(category = '') {
    this.category = category;
  }

  /**
   * Debug log - only in development
   */
  debug(message, ...args) {
    if (isDev) {
      console.debug(formatMessage(this.category, message), ...args);
    }
  }

  /**
   * Info log - only in development
   */
  info(message, ...args) {
    if (isDev) {
      console.info(formatMessage(this.category, message), ...args);
    }
  }

  /**
   * Warning log - always logged, sent to Sentry as breadcrumb
   */
  warn(message, ...args) {
    const formatted = formatMessage(this.category, message);
    
    if (isDev) {
      console.warn(formatted, ...args);
    }
    
    const sentryLoader = loadSentry();
    if (sentryLoader) {
      sentryLoader.then((Sentry) => {
        Sentry?.addBreadcrumb?.({
          category: this.category || 'general',
          message: formatted,
          level: 'warning',
          data: args.length > 0 ? { context: args } : undefined,
        });
      });
    }
  }

  /**
   * Error log - always logged, sent to Sentry
   */
  error(message, error, ...args) {
    const formatted = formatMessage(this.category, message);
    
    if (isDev) {
      console.error(formatted, error, ...args);
    }
    
    const sentryLoader = loadSentry();
    if (sentryLoader) {
      sentryLoader.then((Sentry) => {
        if (!Sentry) return;
        if (error instanceof Error) {
          Sentry.captureException(error, {
            tags: { category: this.category || 'general' },
            contexts: {
              details: {
                message: formatted,
                additionalData: args.length > 0 ? args : undefined,
              },
            },
          });
        } else {
          // If error is not an Error object, capture as message.
          Sentry.captureMessage(formatted, {
            level: 'error',
            tags: { category: this.category || 'general' },
            contexts: {
              details: {
                error,
                additionalData: args.length > 0 ? args : undefined,
              },
            },
          });
        }
      });
    }
  }

  /**
   * Create a child logger with a subcategory
   */
  child(subcategory) {
    const newCategory = this.category 
      ? `${this.category}:${subcategory}` 
      : subcategory;
    return new Logger(newCategory);
  }
}

// Export default logger instance
export const logger = new Logger();

// Export factory function for categorized loggers
export function createLogger(category) {
  return new Logger(category);
}

// Export log levels for reference
export { LogLevel };
