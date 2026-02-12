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
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';
import { mockConfig } from '@/test-utils/config';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import resources from '@/locales';
import 'vitest-localstorage-mock';

// Mock static asset imports that fail on Windows due to absolute path resolution
// Windows converts '/path' to 'file:///path' which is invalid (missing drive letter)
vi.mock('/favicon.ico', () => ({ default: '/favicon.ico' }));
vi.mock('/images/GoogleMaps_Logo_Gray_4x.png', () => ({ default: '/images/GoogleMaps_Logo_Gray_4x.png' }));
vi.mock('/images/hero-cube.webp', () => ({ default: '/images/hero-cube.webp' }));
vi.mock('/images/hero-new-arrivals.webp', () => ({ default: '/images/hero-new-arrivals.webp' }));
// Payment logo SVGs (added in PR #909) - return data URLs to match Vite's test environment behavior
vi.mock('/images/apple-pay-logo.svg', () => ({
    default:
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48L3N2Zz4=',
}));
vi.mock('/images/google-pay-logo.svg', () => ({
    default:
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48L3N2Zz4=',
}));
vi.mock('/images/paypal.svg', () => ({
    default:
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48L3N2Zz4=',
}));
vi.mock('/images/venmo.svg', () => ({
    default:
        'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48L3N2Zz4=',
}));

// Clear engagement-related PUBLIC__ env vars before any modules load
// The engagement config is protected from env var overrides, so these must be cleared
// to prevent defineConfig from throwing during module initialization
for (const key of Object.keys(process.env)) {
    if (key.startsWith('PUBLIC__') && key.toLowerCase().includes('engagement')) {
        delete process.env[key];
    }
}

// Set window.__APP_CONFIG__ before any modules are imported
// This ensures getConfig() works during module initialization in tests where it is used before the config provider is rendered.
// to initialize AuthContext for hydration.
(window as Window & { __APP_CONFIG__: typeof mockConfig }).__APP_CONFIG__ = mockConfig;

// Initialize i18next for tests that use components with useTranslation
// This runs before all tests but individual tests can reinitialize as needed
beforeAll(() => {
    if (!i18next.isInitialized) {
        void i18next.use(initReactI18next).init({
            lng: 'en-US',
            fallbackLng: 'en-US',
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
                let value: any = resources['en-US'][ns as keyof (typeof resources)['en-US']];
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
        language: 'en-US',
    };

    return {
        ...actual,
        getI18nextInstance: () => mockI18next,
        getLocale: () => 'en-US',
    };
});

afterEach(() => {
    cleanup();
});

// Mock window.matchMedia for required components
// Use a regular function instead of vi.fn() to prevent vi.restoreAllMocks() from clearing it
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {
            // noop
        },
        removeListener: () => {
            // noop
        },
        addEventListener: () => {
            // noop
        },
        removeEventListener: () => {
            // noop
        },
        dispatchEvent: () => true,
    }),
});

// Mock ResizeObserver - use class for Vitest 4 compatibility
global.ResizeObserver = class ResizeObserver {
    observe() {
        // noop for test mock
    }
    unobserve() {
        // noop for test mock
    }
    disconnect() {
        // noop for test mock
    }
};

// Mock IntersectionObserver for carousel components - use class for Vitest 4 compatibility
global.IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds: number[] = [];
    observe() {
        // noop for test mock
    }
    unobserve() {
        // noop for test mock
    }
    disconnect() {
        // noop for test mock
    }
    takeRecords(): IntersectionObserverEntry[] {
        return [];
    }
};
