/* eslint-disable no-console */
import { createContext, type MiddlewareFunction } from 'react-router';
import odysseyConfig from '../../odyssey.config.json';

type MarkerType = 'start' | 'end';

interface MarkOptions {
    detail?: string;
}

interface MarkEntry {
    name: string;
    timestamp: number;
    detail?: string;
}

interface MetricEntry {
    name: string;
    duration: number;
    startTime: number;
    endTime: number;
    detail?: string;
}

export const PERFORMANCE_MARKS = {
    // Client-side marks
    clientTotal: 'client.total',
    clientMiddleware: 'client.middleware',

    // Server-side marks
    serverTotal: 'ssr.total',
    serverMiddleware: 'ssr.middleware',

    // Auth-related marks
    authRefreshAccessToken: 'auth.refreshAccessToken',
    authLoginGuestUser: 'auth.loginGuestUser',
    authLoginGuestUserPrivate: 'auth.loginGuestUserPrivate',
    authLoginRegisteredUser: 'auth.loginRegisteredUser',
    authRefreshToken: 'auth.refreshToken',
    authGuestLogin: 'auth.guestLogin',

    // API Call helpers - generate dynamic performance mark names
    apiCall: {
        /**
         * Generate a standardized performance mark name for API calls
         * @param className - The SDK client class name (e.g., 'ShopperProducts', 'ShopperBaskets')
         * @param methodName - The method name (e.g., 'getProduct', 'addItemToBasket')
         * @returns Standardized performance mark name
         */
        create: ({ className, methodName }: { className: string; methodName: string }): string =>
            `apiCall.${className}.${methodName}`,
    },
} as const;

/**
 * This is an internal class that is responsible for measuring server side performance.
 * This class is taken from PWA Kit and modified to fit our needs
 *
 * This class manages two types of performance marks: start and end.
 *
 * @private
 */
export class PerformanceTimer {
    private readonly MARKER_TYPES: { START: MarkerType; END: MarkerType } = {
        START: 'start',
        END: 'end',
    } as const;

    private enabled: boolean;
    private requestId: string;
    private requestUrl: string;

    public marks: { start: Map<string, MarkEntry>; end: Map<string, MarkEntry> };

    public metrics: MetricEntry[];

    public pendingOperations: Set<Promise<unknown>>;

    constructor(
        options: {
            enabled?: boolean;
            requestId?: string;
            requestUrl?: string;
        } = {}
    ) {
        this.enabled = options.enabled ?? false;
        this.requestId = options.requestId ?? `unknown-${Date.now()}`;
        this.requestUrl = options.requestUrl ?? 'unknown-url';
        this.marks = {
            start: new Map<string, MarkEntry>(),
            end: new Map<string, MarkEntry>(),
        };
        this.metrics = [] as MetricEntry[];
        this.pendingOperations = new Set<Promise<unknown>>();
    }

    /**
     * Track a pending operation (like an API call)
     * so we can wait for it to complete before logging the metrics
     */
    trackOperation(promise: Promise<unknown>): void {
        if (!this.enabled) return;

        this.pendingOperations.add(promise);

        // Remove from pending set when promise resolves/rejects
        void promise.finally(() => {
            this.pendingOperations.delete(promise);
        });
    }

    /**
     * Wait for all pending operations to complete
     */
    async waitForPendingOperations(): Promise<void> {
        if (!this.enabled || this.pendingOperations.size === 0) return;
        await Promise.allSettled(Array.from(this.pendingOperations));
    }

    /**
     * Set up async completion callback that fires when all pending operations complete
     * This is non-blocking and allows the middleware to return immediately
     */
    setupAsyncCompletion(callback: () => void): void {
        if (!this.enabled || this.pendingOperations.size === 0) {
            // No pending operations, call callback immediately
            callback();
            return;
        }

        // Use Promise.allSettled to wait for all operations without blocking
        Promise.allSettled(Array.from(this.pendingOperations))
            .then(() => {
                callback();
            })
            .catch((error) => {
                console.error('[perf] Error in async completion:', error);
                // Still call callback even if there's an error
                callback();
            });
    }

    /**
     * This is a utility function to build the Server-Timing header.
     * The function receives an array of performance metrics and returns a string that represents the Server-Timing header.
     *
     * see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing
     *
     * @function
     * @private
     *
     * @return {String}
     */
    buildServerTimingHeader(): string {
        const header = this.metrics
            .map((metric) => {
                return `${metric.name};dur=${metric.duration.toFixed(2)}`;
            })
            .join(', ');

        return header;
    }

    /**
     * A utility function to format and log performance metrics grouped by request.
     * This provides better readability and request context with a visual timeline.
     * TODO: we should replace this with a logger if available
     *
     * @function
     * @private
     */
    log(): void {
        if (this.metrics.length === 0) {
            console.log(`[perf] No metrics to log for request ${this.requestId}`);
            return;
        }

        // Get the earliest start time and latest end time for timeline calculation
        const minStartTime = Math.min(...this.metrics.map((m) => m.startTime));
        const maxEndTime = Math.max(...this.metrics.map((m) => m.endTime));
        const totalDuration = maxEndTime - minStartTime;

        // Generate timeline visualization
        console.log('');
        console.log('═'.repeat(120));
        console.log(`🚀 Request ${this.requestId}`);
        console.log(`📍 ${this.requestUrl}`);
        console.log(`⏱️ ${totalDuration.toFixed(2)}ms`);
        console.log(
            '⚠️  SSR timing shows total processing time. With streaming enabled, UI renders progressively before completion.'
        );
        console.log('═'.repeat(120));
        console.log('');

        // Print column headers
        const nameColHeader = 'Name'.padEnd(42);
        const durationColHeader = 'Duration'.padStart(10);
        const timelineHeader = 'Timeline';
        console.log(`${nameColHeader}${durationColHeader}    ${timelineHeader}`);
        console.log('─'.repeat(120));

        // Print timeline header
        const timelineWidth = 80;
        const timeScale = totalDuration / timelineWidth;
        const timeMarkers = [];
        for (let i = 0; i <= 5; i++) {
            const timeAtMarker = (totalDuration * i) / 5;
            timeMarkers.push(`${timeAtMarker.toFixed(0)}ms`);
        }
        console.log(`${''.padEnd(52)} ${timeMarkers.join(''.padEnd(12))}`);
        console.log('');

        // Print each metric with its timeline
        const categoryIcons: Record<string, string> = {
            auth: '🔐',
            apiCall: '🌐',
            ssr: '🚀',
            client: '💻',
        };

        // Sort metrics by start time for better visualization
        const sortedMetrics = [...this.metrics].sort((a, b) => a.startTime - b.startTime);

        sortedMetrics.forEach((metric) => {
            const category = metric.name.split('.')[0];
            const icon = categoryIcons[category] || '📊';

            // Calculate timeline bar using relative times
            const relativeStart = metric.startTime - minStartTime;
            const startPos = Math.floor(relativeStart / timeScale);
            const barLength = Math.max(1, Math.floor(metric.duration / timeScale));

            const beforeBar = '░'.repeat(startPos);
            const bar = '▓'.repeat(barLength);
            const afterBar = '░'.repeat(Math.max(0, timelineWidth - startPos - barLength));

            const timeline = beforeBar + bar + afterBar;
            const detail = metric.detail ? ` (${metric.detail})` : '';
            const relativeEnd = relativeStart + metric.duration;
            const timeRange = `${relativeStart.toFixed(0)}→${relativeEnd.toFixed(0)}ms`;

            // Format with proper alignment: icon + name (40 chars) + duration (right-aligned in 10 chars)
            const nameCol = `${icon} ${metric.name}`.padEnd(42); // icon + space + name
            const durationCol = `${metric.duration.toFixed(2)}ms`.padStart(10);

            console.log(`${nameCol}${durationCol} ${timeline} ${timeRange}${detail}`);
        });

        console.log('─'.repeat(120));
        console.log('');

        // Calculate summary statistics
        const sumOfAllOperations = this.metrics.reduce((sum, m) => sum + m.duration, 0);
        const parallelization =
            totalDuration > 0 ? ((sumOfAllOperations - totalDuration) / sumOfAllOperations) * 100 : 0;

        // Group metrics by category
        const categoryStats: Record<string, { count: number; total: number; avg: number }> = {};
        sortedMetrics.forEach((metric) => {
            const category = metric.name.split('.')[0].toUpperCase();
            if (!categoryStats[category]) {
                categoryStats[category] = { count: 0, total: 0, avg: 0 };
            }
            categoryStats[category].count++;
            categoryStats[category].total += metric.duration;
        });

        // Calculate averages
        Object.keys(categoryStats).forEach((category) => {
            categoryStats[category].avg = categoryStats[category].total / categoryStats[category].count;
        });

        const categoryIconsUppercase: Record<string, string> = {
            AUTH: '🔐',
            APICALL: '🌐',
            SSR: '🚀',
            CLIENT: '💻',
        };

        // Print summary
        console.log('📊 Summary:');
        console.log(`   Total Operations: ${this.metrics.length}`);
        console.log(`   Total Duration: ${totalDuration.toFixed(2)}ms`);
        console.log(`   Sum of All Operations: ${sumOfAllOperations.toFixed(2)}ms`);
        console.log(`   Parallelization: ${parallelization.toFixed(1)}%`);
        console.log('');
        console.log('📈 Breakdown by Category:');
        Object.keys(categoryStats).forEach((category) => {
            const stats = categoryStats[category];
            const icon = categoryIconsUppercase[category] || '📊';
            console.log(
                `   ${icon} ${category}: ${stats.count} ops, ${stats.total.toFixed(2)}ms total, ${stats.avg.toFixed(2)}ms avg`
            );
        });
        console.log('');
        console.log('═'.repeat(120));
    }

    /**
     * This is a utility function to create performance marks.
     * The data will be used in console logs and the http response header `server-timing`.
     *
     * @function
     * @private
     */
    mark(name: string, type: MarkerType, options: MarkOptions = {}): void {
        if (!this.enabled) {
            return;
        }

        if (!name) {
            console.warn('Performance mark cannot be created because the name is undefined.', {
                namespace: 'performance',
            });
            return;
        }

        if (type !== this.MARKER_TYPES.START && type !== this.MARKER_TYPES.END) {
            console.warn('Performance mark cannot be created because the type must be either "start" or "end".', {
                namespace: 'performance',
            });
            return;
        }

        const timestamp = performance.now();
        const isEnd = type === this.MARKER_TYPES.END;
        const storage = isEnd ? this.marks.end : this.marks.start;
        storage.set(name, {
            name,
            timestamp,
            detail: options.detail,
        });

        if (isEnd) {
            const startMark = this.marks.start.get(name);
            if (startMark) {
                const measurement: MetricEntry = {
                    name,
                    duration: timestamp - startMark.timestamp,
                    startTime: startMark.timestamp,
                    endTime: timestamp,
                    detail: options.detail,
                };
                this.metrics.push(measurement);
            }
        }
    }
}

export const performanceTimerContext = createContext<PerformanceTimer | undefined>();

/**
 * This is a middleware that measures server side performance.
 *
 * It can be enabled by setting the `odysseyConfig.performance.metrics.serverPerformanceMetricsEnabled` flag to `true`.
 *
 * It currently measures the time it takes to do the following:
 * - Server side rendering process
 * - Server side API calls
 * - Server side authentication operations
 * - Server side middleware operations
 */
export const performanceMetricsMiddlewareServer: MiddlewareFunction<Response> = async ({ request, context }, next) => {
    const enabled = odysseyConfig.performance?.metrics?.serverPerformanceMetricsEnabled ?? false;
    const serverTimingHeaderEnabled = odysseyConfig.performance?.metrics?.serverTimingHeaderEnabled ?? false;

    if (!enabled) {
        return next();
    }

    // Start timing the total SSR process
    const performanceTimer = new PerformanceTimer({
        enabled,
        requestId: `server-${Date.now()}`,
        requestUrl: request.url,
    });
    context.set(performanceTimerContext, performanceTimer);
    performanceTimer.mark(PERFORMANCE_MARKS.serverTotal, 'start');
    performanceTimer.mark(PERFORMANCE_MARKS.serverMiddleware, 'start');

    try {
        // Execute the next middleware/handler (this includes loaders, actions, and rendering)
        const response = await next();
        performanceTimer.mark(PERFORMANCE_MARKS.serverMiddleware, 'end');

        if (serverTimingHeaderEnabled) {
            // NOTE: this blocks the thread, should only be used for development
            await performanceTimer.waitForPendingOperations();
            performanceTimer.mark(PERFORMANCE_MARKS.serverTotal, 'end');
            performanceTimer.log();
            response.headers.set('Server-Timing', performanceTimer.buildServerTimingHeader());
        } else {
            // Set up async completion callback - don't block the thread!
            performanceTimer.setupAsyncCompletion(() => {
                performanceTimer.mark(PERFORMANCE_MARKS.serverTotal, 'end');
                performanceTimer.log();
            });
        }

        return response;
    } catch (error) {
        // End timing even on error
        performanceTimer.mark(PERFORMANCE_MARKS.serverMiddleware, 'end');
        performanceTimer.mark(PERFORMANCE_MARKS.serverTotal, 'end', {
            detail: `[perf] SSR failed: ${(error as Error)?.message || 'Unknown error'}`,
        });
        performanceTimer.log();
        throw error;
    }
};

/**
 * This is a middleware that measures client side performance.
 *
 * It can be enabled by setting the `odysseyConfig.performance.metrics.clientPerformanceMetricsEnabled` flag to `true`.
 *
 * It currently measures the time it takes to do the following:
 * - Client side total time to fulfill the requests
 * - Client side API calls
 * - Client side authentication operations
 * - Client side middleware operations
 */
export const performanceMetricsMiddlewareClient: MiddlewareFunction<void> = async ({ context }, next) => {
    const enabled = odysseyConfig.performance?.metrics?.clientPerformanceMetricsEnabled ?? false;

    if (!enabled) {
        return next();
    }

    // Create performance timer for client-side operations
    const performanceTimer = new PerformanceTimer({
        enabled,
        requestId: `client-${Date.now()}`,
        requestUrl: typeof window !== 'undefined' ? window.location.href : 'client-side',
    });
    performanceTimer.mark(PERFORMANCE_MARKS.clientTotal, 'start');
    performanceTimer.mark(PERFORMANCE_MARKS.clientMiddleware, 'start');

    // Store in context for client-side SCAPI calls
    context.set(performanceTimerContext, performanceTimer);

    try {
        await next();
        performanceTimer.mark(PERFORMANCE_MARKS.clientMiddleware, 'end');

        // Set up async completion callback - don't block the thread!
        performanceTimer.setupAsyncCompletion(() => {
            performanceTimer.mark(PERFORMANCE_MARKS.clientTotal, 'end');
            performanceTimer.log();
        });
    } catch (error) {
        performanceTimer.mark(PERFORMANCE_MARKS.clientMiddleware, 'end');
        performanceTimer.mark(PERFORMANCE_MARKS.clientTotal, 'end', {
            detail: `[perf] Client-side failed: ${(error as Error)?.message || 'Unknown error'}`,
        });
        performanceTimer.log();
        throw error;
    }
};
