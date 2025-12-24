import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initI18next } from './i18next.client';
import i18next from 'i18next';

// Mock the config module
vi.mock('@/config', () => ({
    getConfig: vi.fn(() => ({
        i18n: {
            fallbackLng: 'en-US',
            supportedLngs: ['en-US', 'it-IT'], // Fallback language should be last
        },
    })),
}));

// Mock translation modules for dynamic imports
vi.mock('@/locales/en-US/index.ts', () => ({
    default: {
        translations: { hello: 'Hello', welcome: 'Welcome' },
        common: { yes: 'Yes', no: 'No' },
    },
}));

vi.mock('@/locales/it-IT/index.ts', () => ({
    default: {
        translations: { hello: 'Ciao', welcome: 'Benvenuto' },
        common: { yes: 'Sì', no: 'No' },
    },
}));

describe('i18next.client', () => {
    let testInstance: ReturnType<typeof i18next.createInstance>;

    beforeEach(() => {
        // Create a fresh isolated i18next instance for each test
        testInstance = i18next.createInstance();
    });

    describe('initI18next', () => {
        it('should return the global i18next instance when no instance is provided', () => {
            const result = initI18next();

            expect(result).toBe(i18next);
        });

        it('should return the provided instance when an instance is passed', () => {
            const result = initI18next({ instance: testInstance });

            expect(result).toBe(testInstance);
        });

        it('should initialize with correct configuration', () => {
            const initSpy = vi.spyOn(testInstance, 'init');

            initI18next({ instance: testInstance });

            const callArgs = initSpy.mock.calls[0][0];
            expect(callArgs).toBeDefined();
            expect(callArgs.ns).toEqual([]);
            expect(callArgs.detection).toMatchObject({
                order: ['htmlTag'],
                caches: [],
            });
        });
    });

    describe('dynamic import backend behavior', () => {
        beforeEach(() => {
            // Initialize the test instance using initI18next
            initI18next({ language: 'en-US', instance: testInstance });
        });

        it('should load all namespaces for a language when a translation is requested', async () => {
            // Request a translation that will trigger loading
            await testInstance.loadNamespaces('translations');

            // Verify all namespaces for English are now in the store
            expect(testInstance.store.data['en-US']?.translations).toEqual({
                hello: 'Hello',
                welcome: 'Welcome',
            });
            expect(testInstance.store.data['en-US']?.common).toEqual({
                yes: 'Yes',
                no: 'No',
            });
        });

        it('should load translations for different languages', async () => {
            // Change language to Italian
            await testInstance.changeLanguage('it-IT');
            await testInstance.loadNamespaces('translations');

            // Verify Italian translations are in the store
            expect(testInstance.store.data['it-IT']?.translations).toEqual({
                hello: 'Ciao',
                welcome: 'Benvenuto',
            });
            expect(testInstance.store.data['it-IT']?.common).toEqual({
                yes: 'Sì',
                no: 'No',
            });
        });

        it('should handle non-existent namespace gracefully', async () => {
            // Load a namespace that doesn't exist in the mocked translations
            await testInstance.loadNamespaces('nonexistent-namespace');

            // Verify empty or undefined data for the nonexistent namespace
            const data = testInstance.store.data['en-US']?.['nonexistent-namespace'];
            expect(data).toEqual({});
        });

        it('should handle import errors gracefully', async () => {
            // Try to load a language that doesn't exist
            await testInstance.changeLanguage('fr');

            // Attempt to load - this will fail but should not crash
            try {
                await testInstance.loadNamespaces('translations');
            } catch (error) {
                // Expected to catch an error for a non-existent language
                expect(error).toBeDefined();
            }

            // Verify the store doesn't have French translations
            expect(testInstance.store.data.fr?.translations).toBeUndefined();
        });

        it('should load multiple namespaces at once', async () => {
            // Load multiple namespaces
            await testInstance.loadNamespaces(['translations', 'common']);

            // Verify both are in the store
            expect(testInstance.store.data['en-US']?.translations).toBeDefined();
            expect(testInstance.store.data['en-US']?.common).toBeDefined();
        });
    });
});
