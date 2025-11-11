import { describe, it, expect, vi, beforeEach } from 'vitest';
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

// Mock translation modules for dynamic imports
vi.mock('@/locales/en/index.ts', () => ({
    default: {
        translations: { hello: 'Hello', welcome: 'Welcome' },
        common: { yes: 'Yes', no: 'No' },
    },
}));

vi.mock('@/locales/es/index.ts', () => ({
    default: {
        translations: { hello: 'Hola', welcome: 'Bienvenido' },
        common: { yes: 'Sí', no: 'No' },
    },
}));

describe('i18next.client', () => {
    beforeEach(async () => {
        // Create a fresh i18next instance for each test
        await i18next.init({
            lng: 'en',
            fallbackLng: 'en',
            ns: [],
            defaultNS: false,
        });
    });

    describe('initI18next', () => {
        it('should return the i18next instance', () => {
            const result = initI18next();

            expect(result).toBe(i18next);
        });

        it('should initialize with correct configuration', () => {
            const initSpy = vi.spyOn(i18next, 'init');

            initI18next();

            const callArgs = initSpy.mock.calls[0][0];
            expect(callArgs).toBeDefined();
            expect(callArgs.ns).toEqual([]);
            // i18next normalizes fallbackLng string to array internally
            expect(callArgs.fallbackLng).toEqual(expect.arrayContaining(['en']));
            expect(callArgs.detection).toMatchObject({
                order: ['htmlTag'],
                caches: [],
            });
        });
    });

    describe('dynamic import backend behavior', () => {
        it('should load all namespaces for a language when a translation is requested', async () => {
            const i18n = initI18next();

            // Request a translation that will trigger loading
            await i18n.loadNamespaces('translations');

            // Verify all namespaces for English are now in the store
            expect(i18n.store.data.en?.translations).toEqual({
                hello: 'Hello',
                welcome: 'Welcome',
            });
            expect(i18n.store.data.en?.common).toEqual({
                yes: 'Yes',
                no: 'No',
            });
        });

        it('should load translations for different languages', async () => {
            const i18n = initI18next();

            // Change language to Spanish
            await i18n.changeLanguage('es');
            await i18n.loadNamespaces('translations');

            // Verify Spanish translations are in the store
            expect(i18n.store.data.es?.translations).toEqual({
                hello: 'Hola',
                welcome: 'Bienvenido',
            });
            expect(i18n.store.data.es?.common).toEqual({
                yes: 'Sí',
                no: 'No',
            });
        });

        it('should handle non-existent namespace gracefully', async () => {
            const i18n = initI18next();

            // Load a namespace that doesn't exist in the mocked translations
            await i18n.loadNamespaces('nonexistent-namespace');

            // Verify empty or undefined data for the nonexistent namespace
            const data = i18n.store.data.en?.['nonexistent-namespace'];
            expect(data).toEqual({});
        });

        it('should handle import errors gracefully', async () => {
            const i18n = initI18next();

            // Try to load a language that doesn't exist
            await i18n.changeLanguage('fr');

            // Attempt to load - this will fail but should not crash
            try {
                await i18n.loadNamespaces('translations');
            } catch (error) {
                // Expected to catch an error for a non-existent language
                expect(error).toBeDefined();
            }

            // Verify the store doesn't have French translations
            expect(i18n.store.data.fr?.translations).toBeUndefined();
        });

        it('should load multiple namespaces at once', async () => {
            const i18n = initI18next();

            // Load multiple namespaces
            await i18n.loadNamespaces(['translations', 'common']);

            // Verify both are in the store
            expect(i18n.store.data.en?.translations).toBeDefined();
            expect(i18n.store.data.en?.common).toBeDefined();
        });
    });
});
