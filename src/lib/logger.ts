/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { createContext as createRouterContext, type RouterContextProvider } from 'react-router';
import { correlationContext } from '@/lib/correlation';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
};

const LEVEL_LABELS: Record<LogLevel, string> = {
    error: 'ERROR',
    warn: 'WARN',
    info: 'INFO',
    debug: 'DEBUG',
};

let overrideLevel: LogLevel | undefined;

function resolveLevel(): LogLevel {
    if (overrideLevel) return overrideLevel;

    if (typeof process !== 'undefined' && process.env) {
        const envLevel = process.env.SFNEXT_LOG_LEVEL;
        if (envLevel && envLevel in LEVEL_PRIORITY) return envLevel as LogLevel;
        if (process.env.NODE_ENV === 'production') return 'warn';
    }

    return 'info';
}

function shouldLog(level: LogLevel): boolean {
    return LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[resolveLevel()];
}

/**
 * Serialize an Error into a plain object so JSON.stringify doesn't produce "{}".
 */
function serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            ...(error.stack && { stack: error.stack }),
        };
    }
    return { value: String(error) };
}

/**
 * Process metadata: serialize Error instances found in values.
 */
function processMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const processed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
        processed[key] = value instanceof Error ? serializeError(value) : value;
    }
    return processed;
}

function mergeMetadata(
    base: Record<string, unknown> | undefined,
    extra: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
    if (!base && !extra) return undefined;
    if (!base) return extra;
    if (!extra) return base;
    return { ...base, ...extra };
}

export interface Logger {
    error(message: string, metadata?: Record<string, unknown>): void;
    warn(message: string, metadata?: Record<string, unknown>): void;
    info(message: string, metadata?: Record<string, unknown>): void;
    debug(message: string, metadata?: Record<string, unknown>): void;
}

/**
 * Router context for SDK logger injection.
 *
 * TODO: When the SDK structured logger (pino) is ready, an SDK middleware will
 * set the logger here via `context.set(loggerContext, sdkLogger)`. At that point,
 * `getLogger` should check this context first and delegate to the SDK logger when
 * available. The SDK logger will automatically include request-scoped context
 * (correlation ID, route pattern, etc.) so callers don't need to pass anything.
 */
export const loggerContext = createRouterContext<Logger | undefined>(undefined);

/**
 * Create a level-gated logger for the template application.
 *
 * Output format: `LEVEL message {JSON metadata?}`
 *
 * Log level is controlled by `SFNEXT_LOG_LEVEL` env var (`error` | `warn` | `info` | `debug`).
 * Defaults to `warn` in production, `info` otherwise.
 *
 * Use this for client-side code or when router context is not available.
 * For server-side code with router context, prefer {@link getLogger} which
 * automatically includes the correlation ID.
 *
 * @param baseMetadata - Optional metadata included in every log entry (e.g. correlationId)
 *
 * @example
 * ```ts
 * const logger = createLogger();
 * logger.info('Variant selected', { sku });
 * ```
 */
export function createLogger(baseMetadata?: Record<string, unknown>): Logger {
    return Object.freeze({
        error(message: string, metadata?: Record<string, unknown>): void {
            if (!shouldLog('error')) return;
            const prefix = `${LEVEL_LABELS.error} ${message}`;
            const merged = mergeMetadata(baseMetadata, metadata ? processMetadata(metadata) : undefined);
            if (merged) {
                console.error(prefix, JSON.stringify(merged));
            } else {
                console.error(prefix);
            }
        },
        warn(message: string, metadata?: Record<string, unknown>): void {
            if (!shouldLog('warn')) return;
            const prefix = `${LEVEL_LABELS.warn} ${message}`;
            const merged = mergeMetadata(baseMetadata, metadata ? processMetadata(metadata) : undefined);
            if (merged) {
                console.warn(prefix, JSON.stringify(merged));
            } else {
                console.warn(prefix);
            }
        },
        info(message: string, metadata?: Record<string, unknown>): void {
            if (!shouldLog('info')) return;
            const prefix = `${LEVEL_LABELS.info} ${message}`;
            const merged = mergeMetadata(baseMetadata, metadata ? processMetadata(metadata) : undefined);
            if (merged) {
                console.log(prefix, JSON.stringify(merged));
            } else {
                console.log(prefix);
            }
        },
        debug(message: string, metadata?: Record<string, unknown>): void {
            if (!shouldLog('debug')) return;
            const prefix = `${LEVEL_LABELS.debug} ${message}`;
            const merged = mergeMetadata(baseMetadata, metadata ? processMetadata(metadata) : undefined);
            if (merged) {
                console.log(prefix, JSON.stringify(merged));
            } else {
                console.log(prefix);
            }
        },
    });
}

/**
 * Get a request-scoped logger from router context.
 *
 * Automatically includes the correlation ID from the request context in every log entry.
 * Use this in middlewares, loaders, actions, and API helpers that have access to
 * the React Router context.
 *
 * @param context - React Router context provider (from middleware/loader/action args)
 *
 * @example
 * ```ts
 * export async function loader({ context }: LoaderFunctionArgs) {
 *     const logger = getLogger(context);
 *     logger.info('Product loaded', { productId });
 * }
 * ```
 */
export function getLogger(context: Readonly<RouterContextProvider>): Logger {
    const correlationId = context.get(correlationContext);
    const baseMetadata = correlationId ? { correlationId } : undefined;
    return createLogger(baseMetadata);
}

/**
 * Override the log level programmatically (useful for tests).
 * Pass `undefined` to reset to env-based resolution.
 */
export function setLogLevel(level: LogLevel | undefined): void {
    overrideLevel = level;
}

/**
 * Get the currently resolved log level.
 */
export function getLogLevel(): LogLevel {
    return resolveLevel();
}
