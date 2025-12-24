/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { ShopperStores } from '@salesforce/storefront-next-runtime/scapi';
import type { SelectedStoreInfo } from '@/extensions/store-locator/stores/store-locator-store';
import PickupStoreInfo from './index';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

// Mock useFetcher from react-router
const mockFetcher = {
    state: 'idle' as const,
    data: null,
    submit: vi.fn(),
    load: vi.fn(),
    Form: vi.fn(),
};

vi.mock('react-router', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        useFetcher: vi.fn(() => mockFetcher),
    };
});

// Mock useToast
const mockAddToast = vi.fn();
vi.mock('@/components/toast', () => ({
    useToast: vi.fn(() => ({ addToast: mockAddToast })),
}));

// Mock useStoreLocator
const mockSelectedStoreInfo = vi.fn<() => SelectedStoreInfo | null>(() => null);
const mockIsStoreLocatorOpen = vi.fn<() => boolean>(() => false);
const mockOpenStoreLocator = vi.fn();
const mockSetSelectedStoreInfoRaw = vi.fn();

vi.mock('@/extensions/store-locator/providers/store-locator', () => ({
    default: ({ children }: { children: ReactNode }) => <>{children}</>,
    useStoreLocator: vi.fn((selector: (store: any) => any) => {
        const mockStore = {
            selectedStoreInfo: mockSelectedStoreInfo(),
            isOpen: mockIsStoreLocatorOpen(),
            open: mockOpenStoreLocator,
            setSelectedStoreInfo: mockSetSelectedStoreInfoRaw,
        };
        return selector(mockStore);
    }),
}));

// Mock useChangePickupStore
const mockChangeStore = vi.fn();
vi.mock('@/extensions/bopis/hooks/use-change-pickup-store', () => ({
    useChangePickupStore: () => ({
        changeStore: mockChangeStore,
    }),
}));

const mockStore: ShopperStores.schemas['Store'] = {
    id: 'store-001',
    name: 'Somerville Square',
    address1: '478 Artisan Way',
    city: 'Somerville',
    stateCode: 'MA',
    postalCode: '02145',
    countryCode: 'US',
    inventoryId: 'inventory-001',
};

describe('PickupStoreInfo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSelectedStoreInfo.mockReturnValue(null);
        mockIsStoreLocatorOpen.mockReturnValue(false);
    });

    describe('Rendering', () => {
        it('renders store name and address', () => {
            render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            expect(screen.getByText(/Pick up in/)).toBeInTheDocument();
            expect(screen.getByText('Somerville Square')).toBeInTheDocument();
            expect(screen.getByText(/478 Artisan Way/)).toBeInTheDocument();
            expect(screen.getByText(/Somerville, MA 02145/)).toBeInTheDocument();
        });

        it('renders Change Store button', () => {
            render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            expect(screen.getByText('Change Store')).toBeInTheDocument();
        });

        it('renders with data-testid attribute', () => {
            render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            expect(screen.getByTestId('pickup-store-info-card')).toBeInTheDocument();
        });

        it('renders store icon', () => {
            const { container } = render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            // Check for Store icon from lucide-react (rendered as SVG)
            const storeIcon = container.querySelector('svg');
            expect(storeIcon).toBeInTheDocument();
        });

        it('renders StoreAddress component with store prop', () => {
            render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            // StoreAddress should render the address
            expect(screen.getByText(/478 Artisan Way/)).toBeInTheDocument();
            expect(screen.getByText(/Somerville, MA 02145/)).toBeInTheDocument();
        });

        it('handles store without name', () => {
            const storeWithoutName: ShopperStores.schemas['Store'] = {
                ...mockStore,
                name: undefined,
            };

            render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={storeWithoutName} />
                </AllProvidersWrapper>
            );

            // Should still render "Pick up in" text
            expect(screen.getByText(/Pick up in/)).toBeInTheDocument();
            // Store name should not be displayed when name is undefined
            expect(screen.queryByText('store-001')).not.toBeInTheDocument();
        });
    });

    describe('Change Store Button Interaction', () => {
        it('sets selectedStoreInfo and opens store locator when button is clicked', async () => {
            const user = userEvent.setup();

            render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            const changeStoreButton = screen.getByText('Change Store');
            await user.click(changeStoreButton);

            // Verify that setSelectedStoreInfoRaw was called with the full store object
            // (normalization happens inside setSelectedStoreInfo)
            expect(mockSetSelectedStoreInfoRaw).toHaveBeenCalledWith(mockStore);

            // Verify that openStoreLocator was called
            expect(mockOpenStoreLocator).toHaveBeenCalledTimes(1);
        });

        it('uses store.id as fallback when store.name is undefined', async () => {
            const user = userEvent.setup();
            const storeWithoutName: ShopperStores.schemas['Store'] = {
                ...mockStore,
                name: undefined,
            };

            render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={storeWithoutName} />
                </AllProvidersWrapper>
            );

            const changeStoreButton = screen.getByText('Change Store');
            await user.click(changeStoreButton);

            // Verify that setSelectedStoreInfoRaw was called with the full store object
            // (normalization with name fallback happens inside setSelectedStoreInfo)
            expect(mockSetSelectedStoreInfoRaw).toHaveBeenCalledWith(storeWithoutName);
        });
    });

    describe('Store Selection Change Handling', () => {
        it('calls changeStore when different store is selected and locator is open', async () => {
            const differentStore: SelectedStoreInfo = {
                id: 'store-002',
                name: 'Different Store',
                inventoryId: 'inventory-002',
            };

            // Set up initial state: locator is open, different store is selected
            mockIsStoreLocatorOpen.mockReturnValue(true);
            mockSelectedStoreInfo.mockReturnValue(differentStore);

            const { rerender } = render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            // Trigger re-render to simulate store selection change
            rerender(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            await waitFor(() => {
                expect(mockChangeStore).toHaveBeenCalledWith({
                    id: 'store-002',
                    name: 'Different Store',
                    inventoryId: 'inventory-002',
                });
            });
        });

        it('does not call changeStore when same store is selected', async () => {
            const sameStore: SelectedStoreInfo = {
                id: 'store-001',
                name: 'Somerville Square',
                inventoryId: 'inventory-001',
            };

            // Set up initial state: locator is open, same store is selected
            mockIsStoreLocatorOpen.mockReturnValue(true);
            mockSelectedStoreInfo.mockReturnValue(sameStore);

            const { rerender } = render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            // Trigger re-render
            rerender(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            // Wait a bit to ensure useEffect has run
            await waitFor(
                () => {
                    // changeStore should not be called because it's the same store
                    expect(mockChangeStore).not.toHaveBeenCalled();
                },
                { timeout: 100 }
            );
        });

        it('does not call changeStore when locator is closed', async () => {
            const differentStore: SelectedStoreInfo = {
                id: 'store-002',
                name: 'Different Store',
                inventoryId: 'inventory-002',
            };

            // Set up initial state: locator is closed, different store is selected
            mockIsStoreLocatorOpen.mockReturnValue(false);
            mockSelectedStoreInfo.mockReturnValue(differentStore);

            const { rerender } = render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            // Trigger re-render
            rerender(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            // Wait a bit to ensure useEffect has run
            await waitFor(
                () => {
                    // changeStore should not be called because locator is closed
                    expect(mockChangeStore).not.toHaveBeenCalled();
                },
                { timeout: 100 }
            );
        });

        it('does not call changeStore when selectedStoreInfo is null', async () => {
            // Set up initial state: locator is open, but no store is selected
            mockIsStoreLocatorOpen.mockReturnValue(true);
            mockSelectedStoreInfo.mockReturnValue(null);

            const { rerender } = render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            // Trigger re-render
            rerender(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            // Wait a bit to ensure useEffect has run
            await waitFor(
                () => {
                    // changeStore should not be called because selectedStoreInfo is null
                    expect(mockChangeStore).not.toHaveBeenCalled();
                },
                { timeout: 100 }
            );
        });

        it('does not call changeStore when selectedStoreInfo is missing inventoryId', async () => {
            const storeWithoutInventoryId: SelectedStoreInfo = {
                id: 'store-002',
                name: 'Different Store',
                // inventoryId is missing
            };

            // Set up initial state: locator is open, different store is selected but without inventoryId
            mockIsStoreLocatorOpen.mockReturnValue(true);
            mockSelectedStoreInfo.mockReturnValue(storeWithoutInventoryId);

            const { rerender } = render(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            // Trigger re-render
            rerender(
                <AllProvidersWrapper>
                    <PickupStoreInfo store={mockStore} />
                </AllProvidersWrapper>
            );

            // Wait a bit to ensure useEffect has run
            await waitFor(
                () => {
                    // changeStore should not be called because inventoryId is missing
                    expect(mockChangeStore).not.toHaveBeenCalled();
                },
                { timeout: 100 }
            );
        });
    });
});
