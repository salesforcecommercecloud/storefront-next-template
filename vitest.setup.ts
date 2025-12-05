import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';
import { mockConfig } from '@/test-utils/config';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import resources from '@/locales';

// Set window.__APP_CONFIG__ before any modules are imported
// This ensures getConfig() works during module initialization in tests where it is used before the config provider is rendered.
// to initialize AuthContext for hydration.
(window as Window & { __APP_CONFIG__: typeof mockConfig }).__APP_CONFIG__ = mockConfig;

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

// Mock getI18nextInstance to return an i18next instance for server actions
// Individual tests can override this if needed
vi.mock('@/middlewares/i18next', async () => {
    const actual = await vi.importActual('@/middlewares/i18next');
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
        ...actual,
        getI18nextInstance: () => mockI18next,
        getLocale: () => 'en',
    };
});

afterEach(() => {
    cleanup();
});

// Mock window.matchMedia for required components
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock IntersectionObserver for carousel components
global.IntersectionObserver = vi.fn().mockImplementation((_callback) => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    root: null,
    rootMargin: '',
    thresholds: [],
}));
