import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initI18next } from './i18next.client';
import i18next from 'i18next';

// Mock the config module
vi.mock('@/config', () => ({
    getConfig: vi.fn(() => ({
        i18n: {
            fallbackLng: 'en',
            supportedLngs: ['en', 'es'],
        },
    })),
}));

// Mock window._BUNDLE_ID
Object.defineProperty(window, '_BUNDLE_ID', {
    writable: true,
    value: 'test-bundle-123',
});

describe('i18next.client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock i18next methods
        vi.spyOn(i18next, 'use').mockReturnThis();
        vi.spyOn(i18next, 'init').mockResolvedValue(i18next as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('initI18next', () => {
        it('should return the i18next instance', () => {
            const result = initI18next();

            expect(result).toBe(i18next);
        });

        it('should use cache breaker in the backend loadPath', () => {
            // Update window._BUNDLE_ID
            window._BUNDLE_ID = 'custom-bundle-456';

            initI18next();

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(i18next.init).toHaveBeenCalledWith(
                expect.objectContaining({
                    backend: { loadPath: '/resource/api/locales/{{lng}}/{{ns}}?bundle=custom-bundle-456' },
                })
            );
        });

        it('should configure language detection to use htmlTag, where the server side has serialized the language code', () => {
            initI18next();

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(i18next.init).toHaveBeenCalledWith(
                expect.objectContaining({
                    detection: { order: ['htmlTag'], caches: [] },
                })
            );
        });

        it('should not preload any namespaces', () => {
            initI18next();

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(i18next.init).toHaveBeenCalledWith(
                expect.objectContaining({
                    ns: [],
                })
            );
        });

        it('should use fallback language from config', () => {
            initI18next();

            // eslint-disable-next-line @typescript-eslint/unbound-method
            expect(i18next.init).toHaveBeenCalledWith(
                expect.objectContaining({
                    fallbackLng: 'en',
                })
            );
        });
    });
});
