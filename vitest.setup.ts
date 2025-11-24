import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { mockConfig } from '@/test-utils/config';

// Set window.__APP_CONFIG__ before any modules are imported
// This ensures getConfig() works during module initialization in tests where it is used before the config provider is rendered.
// to initialize AuthContext for hydration.
(window as Window & { __APP_CONFIG__: typeof mockConfig }).__APP_CONFIG__ = mockConfig;

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
