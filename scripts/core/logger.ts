/**
 * Structured JSON logging and telemetry primitives for Jules Companion.
 * @module core/logger
 */

import * as crypto from 'crypto';

/**
 * Supported severity levels for structured logging.
 */
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Standardized structure for JSON log payloads emitted by the logger.
 */
export interface LogEntry {
  /** ISO 8601 timestamp of when the log was emitted */
  timestamp: string;
  /** Severity level of the log */
  level: LogLevel;
  /** Optional correlation ID to trace requests across modules */
  correlationId?: string;
  /** The primary log message */
  message: string;
  /** Optional key-value dictionary of contextual metadata */
  context?: Record<string, any>;
  /** Error message string, if applicable */
  error?: string;
  /** Error stack trace string, if applicable */
  stack?: string;
}

/**
 * Structured logging client for emitting machine-readable JSON payloads.
 * Features correlation ID tracing and automatic data redaction for sensitive fields.
 */
export class Logger {
  private correlationId?: string;
  private defaultContext: Record<string, any> = {};

  /**
   * Initializes a new Logger instance.
   *
   * @param correlationId - Optional pre-existing trace correlation ID.
   * @param defaultContext - Optional default metadata to attach to all emitted logs.
   */
  constructor(correlationId?: string, defaultContext?: Record<string, any>) {
    this.correlationId = correlationId;
    if (defaultContext) {
      this.defaultContext = defaultContext;
    }
  }

  /**
   * Sets the global trace correlation ID for this logger instance.
   *
   * @param id - The correlation ID.
   */
  public setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Gets the active trace correlation ID for this logger instance.
   *
   * @returns The active correlation ID, or undefined.
   */
  public getCorrelationId(): string | undefined {
    return this.correlationId;
  }
  
  /**
   * Sets default context metadata that will be attached to all subsequent logs.
   *
   * @param context - Dictionary of metadata to merge with current default context.
   */
  public setDefaultContext(context: Record<string, any>): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  /**
   * Generates a new cryptographically secure UUID for trace correlation.
   *
   * @returns A standard V4 UUID string.
   */
  public generateCorrelationId(): string {
    return crypto.randomUUID();
  }

  /**
   * Recursively sanitizes and redacts sensitive data properties from a JSON object.
   *
   * @param obj - The raw payload object.
   * @returns A deeply cloned and sanitized payload.
   */
  private redactSensitiveData(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.redactSensitiveData(item));
    }

    const redactedObj: Record<string, any> = {};
    const sensitiveKeys = ['JULES_API_KEY', 'password', 'token', 'apikey', 'api_key', 'secret', 'card', 'authorization'];

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey));

      if (isSensitive) {
        redactedObj[key] = '[REDACTED]';
      } else if (typeof value === 'object') {
        redactedObj[key] = this.redactSensitiveData(value);
      } else {
        redactedObj[key] = value;
      }
    }

    return redactedObj;
  }

  /**
   * Core dispatcher that formats and emits the structured JSON log to stdout/stderr.
   *
   * @param level - Log severity level.
   * @param message - Primary log message.
   * @param context - Optional metadata dictionary.
   * @param error - Optional Error instance for stack trace extraction.
   */
  private emit(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (this.correlationId) {
      entry.correlationId = this.correlationId;
    }

    const mergedContext = { ...this.defaultContext, ...context };
    if (Object.keys(mergedContext).length > 0) {
      entry.context = this.redactSensitiveData(mergedContext);
    }

    if (error) {
      entry.error = error.message;
      if (error.stack) {
        entry.stack = error.stack;
      }
    }

    const jsonString = JSON.stringify(entry);

    if (level === 'ERROR' || level === 'WARN') {
      console.error(jsonString);
    } else {
      console.log(jsonString);
    }
  }

  /**
   * Emits a verbose DEBUG level JSON log.
   *
   * @param message - The primary message.
   * @param context - Additional context dictionary.
   */
  public debug(message: string, context?: Record<string, any>): void {
    this.emit('DEBUG', message, context);
  }

  /**
   * Emits a standard INFO level JSON log.
   *
   * @param message - The primary message.
   * @param context - Additional context dictionary.
   */
  public info(message: string, context?: Record<string, any>): void {
    this.emit('INFO', message, context);
  }

  /**
   * Emits a WARN level JSON log.
   *
   * @param message - The primary message.
   * @param context - Additional context dictionary.
   * @param error - Optional Error instance.
   */
  public warn(message: string, context?: Record<string, any>, error?: Error): void {
    this.emit('WARN', message, context, error);
  }

  /**
   * Emits an ERROR level JSON log with extracted stack traces.
   *
   * @param message - The primary message.
   * @param error - The Error instance.
   * @param context - Additional context dictionary.
   */
  public error(message: string, error?: Error, context?: Record<string, any>): void {
    this.emit('ERROR', message, context, error);
  }
}

/**
 * Singleton instance of Logger for standard global usage.
 */
export const defaultLogger = new Logger();
