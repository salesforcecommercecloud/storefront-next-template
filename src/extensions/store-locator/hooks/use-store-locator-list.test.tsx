import { describe, test, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import { useStoreLocatorList, type SearchStoresResult } from './use-store-locator-list';
import { StoreLocatorWrapper } from '@/test-utils/context-provider';
import type { ShopperStores } from '@salesforce/storefront-next-runtime/scapi';

// Mock react-router useFetcher and useSearchParams
const mockFetcher = {
    state: 'idle' as 'idle' | 'loading',
    data: undefined as SearchStoresResult | undefined,
    load: vi.fn(),
};

const mockSearchParams = new URLSearchParams();
const mockSetSearchParams = vi.fn();

vi.mock('react-router', () => ({
    useFetcher: () => mockFetcher,
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
    createContext: vi.fn(),
}));

// Mock React to avoid createContext issues
vi.mock('react', async () => {
    const actual = await vi.importActual('react');
    return {
        ...actual,
        createContext: actual.createContext,
    };
});

// Mock store state used by the hook
const mockStore = {
    mode: 'input' as 'input' | 'device',
    searchParams: undefined as { countryCode: string; postalCode: string } | undefined,
    deviceCoordinates: { latitude: undefined as number | undefined, longitude: undefined as number | undefined },
    config: {
        radius: 25,
        radiusUnit: 'mi',
        limit: 50,
        supportedCountries: [{ countryCode: 'US', countryName: 'United States' }],
    },
    selectedStoreInfo: null as { id: string; name: string; inventoryId?: string } | null,
    setSelectedStoreInfo: vi.fn(),
    geoError: false,
    shouldSearch: false,
    setShouldSearch: vi.fn(),
};
vi.mock('@/extensions/store-locator/providers/store-locator', () => ({
    default: ({ children }: { children: React.ReactNode }) => children,
    useStoreLocator: (selector: any) => selector(mockStore),
}));

describe('useStoreLocatorList', () => {
    beforeEach(() => {
        mockFetcher.state = 'idle';
        mockFetcher.data = undefined;
        mockFetcher.load.mockClear();
        mockStore.mode = 'input';
        mockStore.searchParams = undefined;
        mockStore.deviceCoordinates = { latitude: undefined, longitude: undefined };
        mockStore.shouldSearch = false;
        mockStore.setShouldSearch.mockClear();
    });

    test('triggers search when shouldSearch and input params present', () => {
        mockStore.shouldSearch = true;
        mockStore.searchParams = { countryCode: 'US', postalCode: '94105' };
        renderHook(() => useStoreLocatorList(), { wrapper: StoreLocatorWrapper });
        expect(mockFetcher.load).toHaveBeenCalled();
        expect(mockStore.setShouldSearch).toHaveBeenCalledWith(false);
    });

    test('triggers search for device mode when coordinates present', () => {
        mockStore.mode = 'device';
        mockStore.shouldSearch = true;
        mockStore.deviceCoordinates = { latitude: 1, longitude: 2 };
        renderHook(() => useStoreLocatorList(), { wrapper: StoreLocatorWrapper });
        expect(mockFetcher.load).toHaveBeenCalled();
        expect(mockStore.setShouldSearch).toHaveBeenCalledWith(false);
    });

    test('exposes stores from fetcher data and supports pagination', async () => {
        // initial render — no data yet
        const { result, rerender } = renderHook(() => useStoreLocatorList(), { wrapper: StoreLocatorWrapper });
        expect(result.current.stores).toEqual([]);

        // provide data from fetcher
        mockFetcher.data = {
            success: true,
            stores: {
                data: new Array(15)
                    .fill(null)
                    .map((_, i) => ({ id: String(i) })) as unknown as ShopperStores.schemas['Store'][],
                limit: 15,
                total: 15,
            },
        };
        rerender();
        expect(result.current.stores.length).toBe(15);
        expect(result.current.storesPaginated.length).toBe(10);

        act(() => {
            result.current.setPage((p) => p + 1);
        });

        await waitFor(() => {
            expect(result.current.storesPaginated.length).toBe(15);
        });
    });
});
