import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import uiStringsSL from '@/extensions/store-locator/temp-ui-string-store-locator';
import StoreLocatorList from './list';
import { useStoreLocatorList } from '@/extensions/store-locator/hooks/use-store-locator-list';

const baseState = {
    mode: 'input',
    searchParams: { countryCode: 'US', postalCode: '94105' },
    config: {
        supportedCountries: [{ countryCode: 'US', countryName: 'United States' }],
        radius: 25,
        radiusUnit: 'mi',
    },
    selectedStoreInfo: null as { id: string; name: string; inventoryId?: string } | null,
    setSelectedStoreInfo: vi.fn(),
    geoError: false,
    hasSearched: true,
    hasError: false,
    isLoading: false,
    stores: [
        {
            id: 'a',
            name: 'A',
            address1: '1 Market St',
            city: 'SF',
            stateCode: 'CA',
            postalCode: '94105',
            inventoryId: 'inv-a',
        },
        {
            id: 'b',
            name: 'B',
            address1: '2 Main St',
            city: 'SF',
            stateCode: 'CA',
            postalCode: '94107',
            inventoryId: 'inv-b',
        },
        {
            id: 'c',
            name: 'C',
            address1: '3 Pine St',
            city: 'SF',
            stateCode: 'CA',
            postalCode: '94109',
            inventoryId: 'inv-c',
        },
    ],
    storesPaginated: [
        {
            id: 'a',
            name: 'A',
            address1: '1 Market St',
            city: 'SF',
            stateCode: 'CA',
            postalCode: '94105',
            inventoryId: 'inv-a',
        },
        {
            id: 'b',
            name: 'B',
            address1: '2 Main St',
            city: 'SF',
            stateCode: 'CA',
            postalCode: '94107',
            inventoryId: 'inv-b',
        },
    ],
    setPage: vi.fn(),
};

vi.mock('@/extensions/store-locator/hooks/use-store-locator-list', () => ({
    useStoreLocatorList: vi.fn(() => baseState),
}));

describe('StoreLocatorList', () => {
    beforeEach(() => {
        baseState.setSelectedStoreInfo.mockClear();
        baseState.setPage.mockClear();
    });

    test('renders status and items, shows Load More when more results', () => {
        render(<StoreLocatorList />);

        const statusText = uiStringsSL.storeLocator.list.statusInput
            .replace('{distanceText}', `${baseState.config.radius} ${baseState.config.radiusUnit}`)
            .replace('{postal}', baseState.searchParams.postalCode)
            .replace('{countryName}', 'United States');
        expect(screen.getByText(statusText)).toBeInTheDocument();

        expect(screen.getByText('A')).toBeInTheDocument();
        expect(screen.getByText('B')).toBeInTheDocument();

        expect(screen.getByRole('button', { name: uiStringsSL.storeLocator.list.loadMoreButton })).toBeInTheDocument();
    });

    test('selecting a store updates selectedStoreInfo', async () => {
        render(<StoreLocatorList />);

        const radios = screen.getAllByRole('radio');
        await userEvent.click(radios[0]);
        expect(baseState.setSelectedStoreInfo).toHaveBeenCalledWith({
            id: 'a',
            name: 'A',
            inventoryId: 'inv-a',
        });
    });

    test('clicking Load More requests next page', async () => {
        render(<StoreLocatorList />);
        await userEvent.click(screen.getByRole('button', { name: uiStringsSL.storeLocator.list.loadMoreButton }));
        expect(baseState.setPage).toHaveBeenCalled();
    });

    test('renders nothing when hasSearched is false', () => {
        const state = { ...baseState, hasSearched: false };
        vi.mocked(useStoreLocatorList).mockReturnValueOnce(state as any);

        const { container } = render(<StoreLocatorList />);
        expect(container.firstChild).toBeNull();
    });

    test('renders loading skeleton when isLoading is true', () => {
        const state = { ...baseState, isLoading: true };
        vi.mocked(useStoreLocatorList).mockReturnValueOnce(state as any);

        render(<StoreLocatorList />);
        // Check for the skeleton's aria-label
        expect(screen.getByLabelText('loading store results')).toBeInTheDocument();
    });

    test('renders no results message when stores array is empty', () => {
        const state = { ...baseState, stores: [], storesPaginated: [] };
        vi.mocked(useStoreLocatorList).mockReturnValueOnce(state as any);

        render(<StoreLocatorList />);
        expect(screen.getByText(uiStringsSL.storeLocator.list.noResults)).toBeInTheDocument();
    });

    test('renders geo error message when geoError is true', () => {
        const state = { ...baseState, geoError: true };
        vi.mocked(useStoreLocatorList).mockReturnValueOnce(state as any);

        render(<StoreLocatorList />);
        expect(screen.getByText(uiStringsSL.storeLocator.list.geoError)).toBeInTheDocument();
    });

    test('renders fetch error message when hasError is true', () => {
        const state = { ...baseState, hasError: true };
        vi.mocked(useStoreLocatorList).mockReturnValueOnce(state as any);

        render(<StoreLocatorList />);
        expect(screen.getByText(uiStringsSL.storeLocator.list.fetchError)).toBeInTheDocument();
    });

    test('renders device mode status message', () => {
        const state = { ...baseState, mode: 'device' as const, searchParams: null };
        vi.mocked(useStoreLocatorList).mockReturnValueOnce(state as any);

        render(<StoreLocatorList />);
        expect(screen.getByText(uiStringsSL.storeLocator.list.statusLocation)).toBeInTheDocument();
    });
});
