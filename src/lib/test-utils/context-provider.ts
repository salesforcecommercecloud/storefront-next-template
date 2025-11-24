import { RouterContextProvider } from 'react-router';
import { authContext } from '@/middlewares/auth.utils';
import { type PerformanceTimer, performanceTimerContext } from '@/middlewares/performance-metrics';
import type { SessionData } from '@/lib/api/types';
import { appConfigContext } from '@/config';
import type { Config } from '@/config/schema';
import config from '@/config/server';

/**
 * Configuration options for creating a test context provider
 */
export interface TestContextConfig {
    /** Override the auth session data */
    authSession?: Partial<SessionData> | null;
    /** Override the performance timer context */
    performanceTimer?: unknown;
    /** Override the client class cache context */
    clientClassCache?: unknown;
    /** Override the app config context */
    appConfig?: Partial<Config['app']>;
    /** Whether to reject the auth promise (for testing auth failures) */
    rejectAuth?: boolean;
    /** Error to reject auth promise with */
    authError?: Error;
}

const ACCESS_TOKEN_VALIDITY_MS = 1800000; // 30 minutes

/**
 * Default session data for tests
 */
const DEFAULT_SESSION_DATA: SessionData = {
    access_token: 'test-access-token',
    access_token_expiry: Date.now() + ACCESS_TOKEN_VALIDITY_MS,
    customer_id: 'test-customer-id',
    userType: 'registered',
} as const;

/**
 * Creates a RouterContextProvider with all necessary contexts set up for testing.
 *
 * This helper eliminates the need to manually set up contexts in every test file.
 * All contexts are set with sensible defaults, and you can override specific values as needed.
 *
 * @param config - Optional configuration to override default values
 * @returns A configured RouterContextProvider ready for testing
 *
 * @example
 * ```typescript
 * // Basic usage with defaults
 * const context = createTestContext();
 *
 * // Override auth session
 * const context = createTestContext({
 *   authSession: { userType: 'guest' }
 * });
 *
 * // Test auth failure
 * const context = createTestContext({
 *   rejectAuth: true,
 *   authError: new Error('Auth failed')
 * });
 *
 * // Disable auth (null session)
 * const context = createTestContext({
 *   authSession: null
 * });
 * ```
 */
export function createTestContext(testConfig: TestContextConfig = {}): RouterContextProvider {
    const {
        authSession = DEFAULT_SESSION_DATA,
        performanceTimer = undefined,
        appConfig,
        rejectAuth = false,
        authError = new Error('Auth failed'),
    } = testConfig;

    const contextProvider = new RouterContextProvider();

    // Set up auth context
    if (rejectAuth) {
        contextProvider.set(authContext, {
            ref: Promise.reject(authError),
        });
    } else if (authSession === null) {
        contextProvider.set(authContext, {
            ref: Promise.resolve(undefined),
        });
    } else {
        const sessionData = { ...DEFAULT_SESSION_DATA, ...authSession };
        contextProvider.set(authContext, {
            ref: Promise.resolve(sessionData),
        });
    }

    // Set up performance timer context
    contextProvider.set(performanceTimerContext, performanceTimer as PerformanceTimer | undefined);

    // Set up app config context - merge with default config if overrides provided
    const mergedAppConfig = appConfig ? { ...config.app, ...appConfig } : config.app;
    contextProvider.set(appConfigContext, mergedAppConfig);

    return contextProvider;
}
