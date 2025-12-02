import { beforeAll, vi } from 'vitest';
import { mockConfig } from '../src/test-utils/config';

// CRITICAL: Set window.__APP_CONFIG__ BEFORE importing any modules
// This ensures getConfig() works during module initialization in tests where it is used
// before the config provider is rendered (e.g., AuthContext initialization)
(window as Window & { __APP_CONFIG__: typeof mockConfig }).__APP_CONFIG__ = mockConfig;

// Now we can safely import other modules that depend on config
// eslint-disable-next-line import/no-namespace
import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import { setProjectAnnotations } from '@storybook/react-vite';
// eslint-disable-next-line import/no-namespace
import * as projectAnnotations from './preview';

// Mock react-router BEFORE any other imports to provide createCookie that middlewares/i18next needs
// But preserve the actual router functionality for tests
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        createCookie: (name: string) => ({
            name,
            parse: () => null,
            serialize: () => ''
        }),
    };
});

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import resources from '../src/locales';


// Initialize i18next for tests that use components with useTranslation
// This runs before all tests but individual tests can reinitialize as needed
beforeAll(() => {
    if (!i18next.isInitialized) {
        void i18next.use(initReactI18next).init({
            lng: 'en',
            fallbackLng: 'en',
            resources,
            interpolation: {
                escapeValue: false,
            },
        });
    }
});

// Mock getInstance to return an i18next instance for server actions
// Individual tests can override this if needed
vi.mock('@/middlewares/i18next', () => {
    // Create a simple mock i18next that has the t function with proper namespaces
    const mockI18next = {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        t: (key: string, options?: any) => {
            // Handle namespace:key format
            if (key.includes(':')) {
                const [ns, ...keyParts] = key.split(':');
                const keyPath = keyParts.join(':'); // rejoin in case there are multiple colons

                // Navigate nested object using dot notation
                const keys = keyPath.split('.');
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let value: any = resources.en[ns as keyof typeof resources.en];
                for (const k of keys) {
                    if (value && typeof value === 'object') {
                        value = value[k];
                    } else {
                        break;
                    }
                }

                if (typeof value === 'string' && options) {
                    // Simple interpolation for {{variable}} syntax
                    return value.replace(/\{\{(\w+)\}\}/g, (_, prop) => options[prop] || `{{${prop}}}`);
                }
                return value || key;
            }
            return key;
        },
        language: 'en',
    };

    return {
        getInstance: () => mockI18next,
        getLocale: () => 'en',
        i18nextMiddleware: vi.fn(),
        localeCookie: { name: 'locale' },
    };
});

// Mock document.elementFromPoint for libraries that require it (e.g., input-otp)
// JSDOM doesn't implement this method, so we provide a simple mock
if (typeof document !== 'undefined' && !document.elementFromPoint) {
    document.elementFromPoint = () => null;
}

// Handle unhandled promise rejections from React Router navigation
// React Router sometimes creates requests with URLSearchParams in a way that
// Node.js's undici doesn't accept, but this doesn't affect test correctness
process.on('unhandledRejection', (reason) => {
    if (
        reason instanceof Error &&
        reason.message.includes('URLSearchParams') &&
        reason.message.includes('Request constructor')
    ) {
        // Suppress React Router navigation errors that don't affect test results
        return;
    }
    // Re-throw other unhandled rejections
    throw reason;
});

// Handle uncaught exceptions from libraries that use document.elementFromPoint
// These are typically from third-party libraries and don't affect test correctness
process.on('uncaughtException', (error) => {
    if (
        error instanceof Error &&
        error.message.includes('document.elementFromPoint is not a function')
    ) {
        // Suppress elementFromPoint errors from libraries like input-otp
        return;
    }
    // Re-throw other uncaught exceptions
    throw error;
});

// This is an important step to apply the right configuration when testing your stories.
// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
const project = setProjectAnnotations([a11yAddonAnnotations, projectAnnotations]);

beforeAll(project.beforeAll);
