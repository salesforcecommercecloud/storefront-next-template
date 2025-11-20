/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import StorePickup from './store-pickup';
import { createMockBasketWithPickupItems, createMockStore } from '@/extensions/bopis/tests/__mocks__/basket';

const { mockReactUse, mockUseBasket, mockUsePickup, mockUseCheckoutContext, mockStoreDetails } = vi.hoisted(() => {
    return {
        mockReactUse: vi.fn(),
        mockUseBasket: vi.fn(),
        mockUsePickup: vi.fn(),
        mockUseCheckoutContext: vi.fn(),
        mockStoreDetails: vi.fn(),
    };
});

vi.mock('react', async (importOriginal: () => Promise<any>) => {
    const actual = await importOriginal();
    return {
        ...actual,
        use: (...args: unknown[]) => mockReactUse(...args),
    };
});

vi.mock('@/providers/basket', () => ({
    useBasket: mockUseBasket,
}));

vi.mock('@/extensions/bopis/context/pickup-context', () => ({
    usePickup: mockUsePickup,
}));

vi.mock('@/hooks/use-checkout', () => ({
    useCheckoutContext: mockUseCheckoutContext,
}));

vi.mock('@/extensions/store-locator/components/store-locator/details', () => ({
    __esModule: true,
    default: (props: any) => {
        mockStoreDetails(props);
        return <div data-testid="store-details">{props.store ? (props.store.name ?? props.store.id) : 'no-store'}</div>;
    },
}));

describe('StorePickup', () => {
    const storeId = 'store-123';
    const inventoryId = 'inventory-123';
    const mockBasket = createMockBasketWithPickupItems([{ productId: 'product-1', inventoryId, storeId }]);
    const mockStore = createMockStore(storeId, inventoryId);
    const mockPickupStores = new Map([[storeId, mockStore]]);

    beforeEach(() => {
        vi.clearAllMocks();
        mockReactUse.mockReset();

        mockUseBasket.mockReturnValue(mockBasket);
        mockUsePickup.mockReturnValue({
            pickupStores: mockPickupStores,
        });
        mockUseCheckoutContext.mockReturnValue({
            shippingDefaultSet: null,
        });
    });

    it('renders store pickup card with store details', () => {
        render(<StorePickup />);

        expect(screen.getByText('Store Pickup Location')).toBeInTheDocument();

        expect(screen.getByTestId('store-details')).toBeInTheDocument();
        expect(screen.getByTestId('store-details')).toHaveTextContent('Test Store');
        expect(mockStoreDetails).toHaveBeenCalledWith(
            expect.objectContaining({
                store: mockStore,
                showDistance: true,
                showEmail: true,
                showStoreHours: true,
                showPhone: true,
                mobileLayout: true,
                compactAddress: true,
            })
        );
    });

    it('awaits on shippingDefaultSet promise', () => {
        const shippingDefaultSet = Promise.resolve();

        mockUseCheckoutContext.mockReturnValue({
            shippingDefaultSet,
        });

        render(<StorePickup />);

        expect(mockReactUse).toHaveBeenCalledWith(shippingDefaultSet);
    });
});
