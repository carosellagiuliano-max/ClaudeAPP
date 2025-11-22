/**
 * Error Tracking Adapter
 * Abstraction layer for error tracking services (e.g., Sentry)
 * Allows switching providers without changing application code
 */

import { logger } from './logging'

export interface ErrorTrackingContext {
  userId?: string
  salonId?: string
  correlationId?: string
  route?: string
  [key: string]: any
}

export interface ErrorTracker {
  /**
   * Capture an exception
   */
  captureException(error: Error, context?: ErrorTrackingContext): void

  /**
   * Capture a message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error', context?: ErrorTrackingContext): void

  /**
   * Set user context
   */
  setUser(user: { id: string; email?: string; username?: string }): void

  /**
   * Clear user context
   */
  clearUser(): void

  /**
   * Add breadcrumb (event trail leading to error)
   */
  addBreadcrumb(breadcrumb: {
    message: string
    category?: string
    level?: 'debug' | 'info' | 'warning' | 'error'
    data?: Record<string, any>
  }): void
}

/**
 * Sentry Error Tracker Implementation
 * Enable by installing @sentry/nextjs and setting NEXT_PUBLIC_SENTRY_DSN
 */
class SentryErrorTracker implements ErrorTracker {
  private sentry: any

  constructor() {
    try {
      // Dynamically import Sentry if available
      this.sentry = require('@sentry/nextjs')
    } catch (error) {
      logger.warn('Sentry SDK not installed - error tracking disabled')
    }
  }

  captureException(error: Error, context?: ErrorTrackingContext): void {
    if (!this.sentry) return

    this.sentry.captureException(error, {
      contexts: {
        custom: context,
      },
      tags: {
        salon_id: context?.salonId,
        correlation_id: context?.correlationId,
      },
    })
  }

  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error',
    context?: ErrorTrackingContext
  ): void {
    if (!this.sentry) return

    this.sentry.captureMessage(message, {
      level,
      contexts: {
        custom: context,
      },
      tags: {
        salon_id: context?.salonId,
        correlation_id: context?.correlationId,
      },
    })
  }

  setUser(user: { id: string; email?: string; username?: string }): void {
    if (!this.sentry) return
    this.sentry.setUser(user)
  }

  clearUser(): void {
    if (!this.sentry) return
    this.sentry.setUser(null)
  }

  addBreadcrumb(breadcrumb: {
    message: string
    category?: string
    level?: 'debug' | 'info' | 'warning' | 'error'
    data?: Record<string, any>
  }): void {
    if (!this.sentry) return
    this.sentry.addBreadcrumb(breadcrumb)
  }
}

/**
 * Console Error Tracker (Fallback)
 * Used when no error tracking service is configured
 */
class ConsoleErrorTracker implements ErrorTracker {
  captureException(error: Error, context?: ErrorTrackingContext): void {
    logger.error('Uncaught exception', error, context)
  }

  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error',
    context?: ErrorTrackingContext
  ): void {
    const logMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info'
    logger[logMethod](message, context)
  }

  setUser(user: { id: string; email?: string; username?: string }): void {
    logger.info('User context set', { user })
  }

  clearUser(): void {
    logger.info('User context cleared')
  }

  addBreadcrumb(breadcrumb: {
    message: string
    category?: string
    level?: 'debug' | 'info' | 'warning' | 'error'
    data?: Record<string, any>
  }): void {
    logger.debug('Breadcrumb', breadcrumb)
  }
}

/**
 * Create error tracker instance based on environment
 */
function createErrorTracker(): ErrorTracker {
  // Use Sentry if DSN is configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    return new SentryErrorTracker()
  }

  // Fallback to console logging
  return new ConsoleErrorTracker()
}

/**
 * Global error tracker instance
 */
export const errorTracker = createErrorTracker()

/**
 * Utility to wrap async functions with error tracking
 */
export async function withErrorTracking<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: ErrorTrackingContext
): Promise<T> {
  errorTracker.addBreadcrumb({
    message: `Starting: ${operation}`,
    category: 'operation',
    level: 'info',
  })

  try {
    const result = await fn()
    errorTracker.addBreadcrumb({
      message: `Completed: ${operation}`,
      category: 'operation',
      level: 'info',
    })
    return result
  } catch (error) {
    errorTracker.captureException(error as Error, {
      ...context,
      operation,
    })
    throw error
  }
}

/**
 * Error boundary helper for React Server Components
 */
export function captureServerError(error: Error, context?: ErrorTrackingContext): void {
  errorTracker.captureException(error, context)
  logger.error('Server error', error, context)
}
