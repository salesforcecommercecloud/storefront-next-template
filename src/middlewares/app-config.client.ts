import type { MiddlewareFunction } from 'react-router';
import { appConfigContext, type AppConfig } from '@/config';

declare global {
    interface Window {
        __APP_CONFIG__?: AppConfig;
    }
}

/**
 * Client middleware to ensure app config is in context before other middleware runs
 *
 * Reads config from window.__APP_CONFIG__ (injected by server from process.env during SSR).
 * This ensures 12-factor compliance: config comes from environment, not baked into bundle.
 *
 * Note: root.tsx also provides config via <ConfigProvider> for the initial render cycle.
 * This middleware ensures it's available in router context for loaders/actions on client navigations.
 *
 * ⚠️ Client middleware runs AFTER initial render. To access config before this middleware:
 * 1. Use window.__APP_CONFIG__ directly
 * 2. Use useConfig() hook (React Context)
 * 3. Set router context earlier in root.tsx
 */
export const appConfigMiddlewareClient: MiddlewareFunction<void> = ({ context }) => {
    const appConfig = typeof window !== 'undefined' ? window.__APP_CONFIG__ : undefined;

    if (!appConfig) {
        throw new Error(
            'window.__APP_CONFIG__ not available. ' +
                'Check that server loader is injecting config into HTML via Layout component.'
        );
    }

    context.set(appConfigContext, appConfig);
};
