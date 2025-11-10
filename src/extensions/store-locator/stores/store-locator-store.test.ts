import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    createStoreLocatorStore,
    type StoreLocatorConfig,
    type SelectedStoreInfo,
    type FormSearchParams,
    type GeoCoordinates,
} from './store-locator-store';

// Mock js-cookie
vi.mock('js-cookie', () => ({
    default: {
        set: vi.fn(),
        remove: vi.fn(),
    },
}));

// Mock cookie utils
vi.mock('@/lib/cookie-utils', () => ({
    getCookieConfig: vi.fn(),
}));

// Mock store locator utils
vi.mock('@/extensions/store-locator/utils', () => ({
    getSelectedStoreInfoCookieName: vi.fn(),
}));

describe('createStoreLocatorStore', () => {
    let mockCookies: { set: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
    let mockGetCookieConfig: ReturnType<typeof vi.fn>;
    let mockGetSelectedStoreInfoCookieName: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        // Get the mocked functions
        const { default: cookies } = await import('js-cookie');
        const { getCookieConfig } = await import('@/lib/cookie-utils');
        const { getSelectedStoreInfoCookieName } = await import('@/extensions/store-locator/utils');

        mockCookies = cookies as any;
        mockGetCookieConfig = getCookieConfig as any;
        mockGetSelectedStoreInfoCookieName = getSelectedStoreInfoCookieName as any;

        mockGetCookieConfig.mockReturnValue({ path: '/', secure: true });
        mockGetSelectedStoreInfoCookieName.mockReturnValue('selectedStoreInfo');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('initial state', () => {
        it('creates store with default state', () => {
            const store = createStoreLocatorStore();
            const state = store.getState();

            expect(state.isOpen).toBe(false);
            expect(state.mode).toBe('input');
            expect(state.shouldSearch).toBe(false);
            expect(state.searchParams).toBeNull();
            expect(state.deviceCoordinates).toEqual({ latitude: null, longitude: null });
            expect(state.geoError).toBe(false);
            expect(state.selectedStoreInfo).toBeNull();
            expect(state.config).toEqual({
                supportedCountries: [
                    { countryCode: 'US', countryName: 'United States' },
                    { countryCode: 'GB', countryName: 'United Kingdom' },
                ],
                radius: 100,
                radiusUnit: 'km',
                limit: 200,
                geoTimeout: 10000,
            });
        });

        it('creates store with initial state overrides', () => {
            const initState = {
                isOpen: true,
                mode: 'device' as const,
                selectedStoreInfo: { id: 'store1', name: 'Test Store', inventoryId: 'inv1' },
            };

            const store = createStoreLocatorStore(initState);
            const state = store.getState();

            expect(state.isOpen).toBe(true);
            expect(state.mode).toBe('device');
            expect(state.selectedStoreInfo).toEqual({ id: 'store1', name: 'Test Store', inventoryId: 'inv1' });
            // Other properties should still be default
            expect(state.shouldSearch).toBe(false);
            expect(state.searchParams).toBeNull();
        });
    });

    describe('actions', () => {
        let store: ReturnType<typeof createStoreLocatorStore>;

        beforeEach(() => {
            store = createStoreLocatorStore();
        });

        describe('open', () => {
            it('sets isOpen to true', () => {
                expect(store.getState().isOpen).toBe(false);

                store.getState().open();

                expect(store.getState().isOpen).toBe(true);
            });
        });

        describe('close', () => {
            it('sets isOpen to false', () => {
                store.getState().open();
                expect(store.getState().isOpen).toBe(true);

                store.getState().close();

                expect(store.getState().isOpen).toBe(false);
            });
        });

        describe('searchByForm', () => {
            it('sets form search parameters and triggers search', () => {
                const searchParams: FormSearchParams = {
                    countryCode: 'US',
                    postalCode: '12345',
                };

                store.getState().searchByForm(searchParams);

                const state = store.getState();
                expect(state.mode).toBe('input');
                expect(state.searchParams).toEqual(searchParams);
                expect(state.shouldSearch).toBe(true);
                expect(state.geoError).toBe(false);
            });
        });

        describe('setShouldSearch', () => {
            it('sets shouldSearch flag', () => {
                expect(store.getState().shouldSearch).toBe(false);

                store.getState().setShouldSearch(true);

                expect(store.getState().shouldSearch).toBe(true);
            });
        });

        describe('setDeviceCoordinates', () => {
            it('sets device coordinates and triggers search', () => {
                const coords: GeoCoordinates = {
                    latitude: 40.7128,
                    longitude: -74.006,
                };

                store.getState().setDeviceCoordinates(coords);

                const state = store.getState();
                expect(state.mode).toBe('device');
                expect(state.deviceCoordinates).toEqual(coords);
                expect(state.searchParams).toBeNull();
                expect(state.shouldSearch).toBe(true);
                expect(state.geoError).toBe(false);
            });
        });

        describe('setGeoError', () => {
            it('sets geoError flag', () => {
                expect(store.getState().geoError).toBe(false);

                store.getState().setGeoError(true);

                expect(store.getState().geoError).toBe(true);
            });
        });

        describe('setSelectedStoreInfo', () => {
            it('sets selected store info and persists to cookie', () => {
                const storeInfo: SelectedStoreInfo = {
                    id: 'store1',
                    name: 'Test Store',
                    inventoryId: 'inv1',
                };

                store.getState().setSelectedStoreInfo(storeInfo);

                const state = store.getState();
                expect(state.selectedStoreInfo).toEqual(storeInfo);
                expect(mockCookies.set).toHaveBeenCalledWith('selectedStoreInfo', JSON.stringify(storeInfo), {
                    path: '/',
                    secure: true,
                });
            });

            it('clears selected store info and removes cookie when null', () => {
                // First set a store
                const storeInfo: SelectedStoreInfo = {
                    id: 'store1',
                    name: 'Test Store',
                    inventoryId: 'inv1',
                };
                store.getState().setSelectedStoreInfo(storeInfo);
                expect(store.getState().selectedStoreInfo).toEqual(storeInfo);

                // Then clear it
                store.getState().setSelectedStoreInfo(null);

                const state = store.getState();
                expect(state.selectedStoreInfo).toBeNull();
                expect(mockCookies.remove).toHaveBeenCalledWith('selectedStoreInfo', { path: '/', secure: true });
            });

            it('handles cookie write errors on server', () => {
                // Mock server environment
                const originalWindow = global.window;
                // @ts-expect-error - Deleting window for server environment test
                delete global.window;

                // Mock cookie set to throw an error
                mockCookies.set.mockImplementation(() => {
                    throw new Error('Cookie write failed');
                });

                const storeInfo: SelectedStoreInfo = {
                    id: 'store1',
                    name: 'Test Store',
                    inventoryId: 'inv1',
                };

                expect(() => {
                    store.getState().setSelectedStoreInfo(storeInfo);
                }).toThrow('Cookie write failed');

                // Restore window
                global.window = originalWindow;
            });

            it('handles cookie write errors on client gracefully', () => {
                // Mock cookie set to throw an error
                mockCookies.set.mockImplementation(() => {
                    throw new Error('Cookie write failed');
                });

                const storeInfo: SelectedStoreInfo = {
                    id: 'store1',
                    name: 'Test Store',
                    inventoryId: 'inv1',
                };

                // Should not throw on client
                expect(() => {
                    store.getState().setSelectedStoreInfo(storeInfo);
                }).not.toThrow();

                // State should still be updated
                expect(store.getState().selectedStoreInfo).toEqual(storeInfo);
            });
        });
    });

    describe('state updates', () => {
        it('maintains state consistency across multiple actions', () => {
            const store = createStoreLocatorStore();

            // Open store
            store.getState().open();
            expect(store.getState().isOpen).toBe(true);

            // Set device coordinates
            store.getState().setDeviceCoordinates({ latitude: 40.7128, longitude: -74.006 });
            expect(store.getState().mode).toBe('device');
            expect(store.getState().shouldSearch).toBe(true);

            // Set selected store
            const storeInfo: SelectedStoreInfo = { id: 'store1', name: 'Test Store' };
            store.getState().setSelectedStoreInfo(storeInfo);
            expect(store.getState().selectedStoreInfo).toEqual(storeInfo);

            // Close store
            store.getState().close();
            expect(store.getState().isOpen).toBe(false);
        });
    });

    describe('config', () => {
        it('uses default config when no override provided', () => {
            const store = createStoreLocatorStore();
            const config = store.getState().config;

            expect(config).toEqual({
                supportedCountries: [
                    { countryCode: 'US', countryName: 'United States' },
                    { countryCode: 'GB', countryName: 'United Kingdom' },
                ],
                radius: 100,
                radiusUnit: 'km',
                limit: 200,
                geoTimeout: 10000,
            });
        });

        it('allows config override in initial state', () => {
            const customConfig: StoreLocatorConfig = {
                supportedCountries: [{ countryCode: 'CA', countryName: 'Canada' }],
                radius: 50,
                radiusUnit: 'mi',
                limit: 200,
                geoTimeout: 5000,
            };

            const store = createStoreLocatorStore({ config: customConfig });
            const config = store.getState().config;

            expect(config).toEqual(customConfig);
        });
    });
});
