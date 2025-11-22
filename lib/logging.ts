/**
 * Structured Logging System
 * Provides correlation IDs and context capture for multi-step flows
 */

import { randomUUID } from 'crypto'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  correlationId?: string
  userId?: string
  salonId?: string
  requestId?: string
  sessionId?: string
  [key: string]: any
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    message: string
    stack?: string
    code?: string
  }
  metadata?: Record<string, any>
}

/**
 * Logger class with structured logging support
 */
class Logger {
  private context: LogContext

  constructor(context: LogContext = {}) {
    this.context = context
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({
      ...this.context,
      ...additionalContext,
    })
  }

  /**
   * Log at debug level
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, metadata)
  }

  /**
   * Log at info level
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, metadata)
  }

  /**
   * Log at warn level
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, metadata)
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, metadata?: Record<string, any>): void {
    const errorData = this.serializeError(error)
    this.log('error', message, { ...metadata, error: errorData })
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      metadata,
    }

    // In development, use console with colors
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(entry)
    } else {
      // In production, output structured JSON
      console.log(JSON.stringify(entry))
    }

    // TODO: Send to external logging service (e.g., Datadog, CloudWatch)
    // if (process.env.LOGGING_ENDPOINT) {
    //   this.sendToExternalService(entry)
    // }
  }

  /**
   * Pretty console output for development
   */
  private consoleLog(entry: LogEntry): void {
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
    }
    const reset = '\x1b[0m'
    const color = colors[entry.level]

    const prefix = `${color}[${entry.level.toUpperCase()}]${reset}`
    const timestamp = entry.timestamp
    const correlationId = entry.context?.correlationId
      ? ` [correlation: ${entry.context.correlationId}]`
      : ''

    console.log(
      `${prefix} ${timestamp}${correlationId} ${entry.message}`,
      entry.metadata || entry.context ? { ...entry.context, ...entry.metadata } : ''
    )
  }

  /**
   * Serialize error for logging
   */
  private serializeError(error?: Error | unknown): any {
    if (!error) return undefined

    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
        // Include additional properties if present
        ...(error as any),
      }
    }

    return String(error)
  }

  /**
   * Generate a correlation ID for tracking multi-step flows
   */
  static generateCorrelationId(): string {
    return randomUUID()
  }
}

/**
 * Create a logger instance
 */
export function createLogger(context?: LogContext): Logger {
  return new Logger(context)
}

/**
 * Default logger instance
 */
export const logger = createLogger()

/**
 * Logger for specific domains
 */
export const bookingLogger = createLogger({ domain: 'booking' })
export const paymentLogger = createLogger({ domain: 'payment' })
export const authLogger = createLogger({ domain: 'auth' })
export const adminLogger = createLogger({ domain: 'admin' })

/**
 * Utility function to wrap async operations with logging
 */
export async function withLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  logger: Logger = logger
): Promise<T> {
  const correlationId = Logger.generateCorrelationId()
  const childLogger = logger.child({ correlationId })

  childLogger.info(`Starting operation: ${operation}`)
  const startTime = Date.now()

  try {
    const result = await fn()
    const duration = Date.now() - startTime
    childLogger.info(`Completed operation: ${operation}`, { duration })
    return result
  } catch (error) {
    const duration = Date.now() - startTime
    childLogger.error(`Failed operation: ${operation}`, error, { duration })
    throw error
  }
}
