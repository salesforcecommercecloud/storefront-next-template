/**
 * Configuration access for loaders, actions, utilities, and React components.
 *
 * Two functions:
 * - `getConfig()` - For loaders, actions, and utilities
 * - `useConfig()` - For React components (hook required for React Context)
 */

import { useContext } from 'react';
import type { RouterContextProvider } from 'react-router';
import { ConfigContext, appConfigContext, type AppConfig } from './context';

/**
 * Get configuration in loaders, actions, and utilities.
 *
 * Pass context parameter in server loaders/actions.
 * Omit context parameter in client loaders (uses window.__APP_CONFIG__).
 *
 * @param context - Router context for server loaders/actions
 * @returns App configuration
 */
export function getConfig(context?: Readonly<RouterContextProvider>): AppConfig {
    // 1. If context is explicitly provided (server loaders/actions)
    if (context) {
        const config = context.get(appConfigContext);
        if (!config) {
            throw new Error(
                'Configuration not available in router context. ' +
                    'Ensure appConfigMiddlewareServer runs before other middleware.'
            );
        }
        return config;
    }

    // 2. Try window.__APP_CONFIG__ (client-side after hydration)
    if (typeof window !== 'undefined' && window.__APP_CONFIG__) {
        return window.__APP_CONFIG__;
    }

    // If we get here, config is not available
    throw new Error(
        'Configuration not available. This can happen if:\n' +
            '1. Server: Pass context parameter: getConfig(context)\n' +
            '2. Client: Ensure window.__APP_CONFIG__ was injected during SSR\n' +
            '3. React component: Use useConfig() hook instead of getConfig()'
    );
}

/**
 * Get configuration in React components.
 *
 * Must use this hook (not getConfig) because React Context requires useContext().
 *
 * @returns App configuration
 */
export function useConfig(): AppConfig {
    const config = useContext(ConfigContext);
    if (!config) {
        throw new Error(
            'useConfig must be used within ConfigProvider. ' +
                'Ensure ConfigProvider wraps your component tree in root.tsx'
        );
    }
    return config;
}
