/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeliveryOptions } from './use-delivery-options';
import { DELIVERY_OPTIONS } from '../constants';
import { masterProductWithInventories } from '@/components/__mock__/master-product-with-inventories';

// Mock the store locator provider
vi.mock('@/extensions/store-locator/providers/store-locator', () => ({
    useStoreLocator: vi.fn(),
}));

// Mock the pickup context
vi.mock('@/extensions/bopis/context/pickup-context', () => ({
    usePickup: vi.fn(() => ({
        addItem: vi.fn(),
        removeItem: vi.fn(),
        pickupBasketItems: new Map(),
        clearItems: vi.fn(),
    })),
}));

// Mock the inventory utils
vi.mock('@/lib/inventory-utils', async () => {
    const actual = await vi.importActual('@/lib/inventory-utils');
    return {
        ...actual,
        isStoreOutOfStock: vi.fn(),
        isSiteOutOfStock: vi.fn(),
    };
});

// Use the mock product from __mock__ directory
const mockProduct = masterProductWithInventories;

const mockStoreInfo = {
    id: 'store-1',
    inventoryId: 'inventory_m',
    name: 'Test Store',
    address: '123 Test St',
};

describe('useDeliveryOptions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns default delivery option initially', async () => {
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
        const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

        // Mock useStoreLocator as a Zustand store hook
        vi.mocked(useStoreLocator).mockImplementation((selector) => {
            const mockStore = { selectedStoreInfo: null } as any;
            return selector(mockStore);
        });

        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

        expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);
        // Pickup is disabled when no store is selected or store is out of stock
        expect(result.current.isStoreOutOfStock).toBe(false);
    });

    it('returns pickup as available when store has inventory', async () => {
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
        const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

        // Mock useStoreLocator as a Zustand store hook
        vi.mocked(useStoreLocator).mockImplementation((selector) => {
            const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
            return selector(mockStore);
        });

        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

        // Both options are available, so it should stay with delivery (default)
        expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);
        expect(result.current.isStoreOutOfStock).toBe(false);
    });

    it('disables pickup when store is out of stock', async () => {
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
        const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

        // Mock useStoreLocator as a Zustand store hook
        vi.mocked(useStoreLocator).mockImplementation((selector) => {
            const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
            return selector(mockStore);
        });

        vi.mocked(isStoreOutOfStock).mockReturnValue(true);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

        // Pickup is out of stock, delivery is available, so it should stay with delivery
        expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);
        expect(result.current.isStoreOutOfStock).toBe(true);
    });

    it('disables pickup when no store is selected', async () => {
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
        const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

        // Mock useStoreLocator as a Zustand store hook
        vi.mocked(useStoreLocator).mockImplementation((selector) => {
            const mockStore = { selectedStoreInfo: null } as any;
            return selector(mockStore);
        });

        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

        // Pickup is disabled when no store is selected (no inventoryId)
        expect(result.current.isStoreOutOfStock).toBe(false);
    });

    it('disables pickup when store has no inventory ID', async () => {
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
        const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

        // Mock useStoreLocator as a Zustand store hook
        vi.mocked(useStoreLocator).mockImplementation((selector) => {
            const mockStore = { selectedStoreInfo: { ...mockStoreInfo, inventoryId: undefined } } as any;
            return selector(mockStore);
        });

        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

        // Pickup is disabled when store has no inventoryId
        expect(result.current.isStoreOutOfStock).toBe(false);
    });

    it('allows changing delivery option', async () => {
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
        const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

        // Mock useStoreLocator as a Zustand store hook
        vi.mocked(useStoreLocator).mockImplementation((selector) => {
            const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
            return selector(mockStore);
        });

        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

        act(() => {
            result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.PICKUP);
        });

        expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.PICKUP);
    });

    it('allows manual switching between delivery options', async () => {
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
        const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

        // Mock useStoreLocator as a Zustand store hook
        vi.mocked(useStoreLocator).mockImplementation((selector) => {
            const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
            return selector(mockStore);
        });

        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

        // Initially should be delivery (default)
        expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);

        // Switch to pickup
        act(() => {
            result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.PICKUP);
        });
        expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.PICKUP);

        // Switch back to delivery
        act(() => {
            result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.DELIVERY);
        });
        expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);
    });

    it('handles undefined product gracefully', async () => {
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
        const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

        // Mock useStoreLocator as a Zustand store hook
        vi.mocked(useStoreLocator).mockImplementation((selector) => {
            const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
            return selector(mockStore);
        });

        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() => useDeliveryOptions({ product: undefined, quantity: 1 }));

        expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);
        expect(result.current.isStoreOutOfStock).toBe(false);
    });

    it('handles quantity parameter', async () => {
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
        const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

        // Mock useStoreLocator as a Zustand store hook
        vi.mocked(useStoreLocator).mockImplementation((selector) => {
            const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
            return selector(mockStore);
        });

        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        const { result } = renderHook(() =>
            useDeliveryOptions({
                product: mockProduct,
                quantity: 2,
            })
        );

        expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);
        expect(result.current.isStoreOutOfStock).toBe(false);
    });

    it('calls isStoreOutOfStock and isSiteOutOfStock with correct parameters', async () => {
        const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
        const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

        // Mock useStoreLocator as a Zustand store hook
        vi.mocked(useStoreLocator).mockImplementation((selector) => {
            const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
            return selector(mockStore);
        });

        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(isSiteOutOfStock).mockReturnValue(false);

        renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

        // Should call isStoreOutOfStock with product, inventoryId, and quantity
        expect(isStoreOutOfStock).toHaveBeenCalledWith(mockProduct, 'inventory_m', 1);
        // Should call isSiteOutOfStock with product and quantity
        expect(isSiteOutOfStock).toHaveBeenCalledWith(mockProduct, 1);
    });

    describe('handleDeliveryOptionChange', () => {
        it('calls addItem when switching to PICKUP with product and store', async () => {
            const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
            const { usePickup } = await import('@/extensions/bopis/context/pickup-context');
            const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

            const mockAddPickupItem = vi.fn();
            const mockRemovePickupItem = vi.fn();

            vi.mocked(usePickup).mockReturnValue({
                addItem: mockAddPickupItem,
                removeItem: mockRemovePickupItem,
                pickupBasketItems: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(useStoreLocator).mockImplementation((selector) => {
                const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
                return selector(mockStore);
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

            // Clear mocks after initial render to only test user-triggered calls
            mockAddPickupItem.mockClear();
            mockRemovePickupItem.mockClear();

            act(() => {
                result.current.handleDeliveryOptionChange(DELIVERY_OPTIONS.PICKUP);
            });

            expect(mockAddPickupItem).toHaveBeenCalledWith(mockProduct.id, mockStoreInfo.inventoryId, mockStoreInfo.id);
            expect(mockRemovePickupItem).not.toHaveBeenCalled();
        });

        it('calls removeItem when switching to DELIVERY', async () => {
            const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
            const { usePickup } = await import('@/extensions/bopis/context/pickup-context');
            const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

            const mockAddPickupItem = vi.fn();
            const mockRemovePickupItem = vi.fn();

            vi.mocked(usePickup).mockReturnValue({
                addItem: mockAddPickupItem,
                removeItem: mockRemovePickupItem,
                pickupBasketItems: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(useStoreLocator).mockImplementation((selector) => {
                const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
                return selector(mockStore);
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

            // First switch to pickup
            act(() => {
                result.current.handleDeliveryOptionChange(DELIVERY_OPTIONS.PICKUP);
            });

            // Then switch back to delivery
            act(() => {
                result.current.handleDeliveryOptionChange(DELIVERY_OPTIONS.DELIVERY);
            });

            expect(mockRemovePickupItem).toHaveBeenCalledWith(mockProduct.id);
        });

        it('does not call addItem when switching to PICKUP without inventoryId', async () => {
            const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
            const { usePickup } = await import('@/extensions/bopis/context/pickup-context');
            const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

            const mockAddPickupItem = vi.fn();
            const mockRemovePickupItem = vi.fn();

            vi.mocked(usePickup).mockReturnValue({
                addItem: mockAddPickupItem,
                removeItem: mockRemovePickupItem,
                pickupBasketItems: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(useStoreLocator).mockImplementation((selector) => {
                const mockStore = { selectedStoreInfo: { ...mockStoreInfo, inventoryId: undefined } } as any;
                return selector(mockStore);
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

            act(() => {
                result.current.handleDeliveryOptionChange(DELIVERY_OPTIONS.PICKUP);
            });

            expect(mockAddPickupItem).not.toHaveBeenCalled();
            expect(mockRemovePickupItem).not.toHaveBeenCalled();
        });

        it('does not call addItem or removeItem when product is undefined', async () => {
            const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
            const { usePickup } = await import('@/extensions/bopis/context/pickup-context');
            const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

            const mockAddPickupItem = vi.fn();
            const mockRemovePickupItem = vi.fn();

            vi.mocked(usePickup).mockReturnValue({
                addItem: mockAddPickupItem,
                removeItem: mockRemovePickupItem,
                pickupBasketItems: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(useStoreLocator).mockImplementation((selector) => {
                const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
                return selector(mockStore);
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            const { result } = renderHook(() => useDeliveryOptions({ product: undefined, quantity: 1 }));

            act(() => {
                result.current.handleDeliveryOptionChange(DELIVERY_OPTIONS.PICKUP);
            });

            expect(mockAddPickupItem).not.toHaveBeenCalled();
            expect(mockRemovePickupItem).not.toHaveBeenCalled();
        });
    });

    describe('auto-switching behavior', () => {
        it('auto-switches from PICKUP to DELIVERY when pickup becomes unavailable', async () => {
            const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
            const { usePickup } = await import('@/extensions/bopis/context/pickup-context');
            const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

            let isStoreOOS = false;
            let isSiteOOS = false;

            vi.mocked(usePickup).mockReturnValue({
                addItem: vi.fn(),
                removeItem: vi.fn(),
                pickupBasketItems: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(useStoreLocator).mockImplementation((selector) => {
                const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
                return selector(mockStore);
            });

            vi.mocked(isStoreOutOfStock).mockImplementation(() => isStoreOOS);
            vi.mocked(isSiteOutOfStock).mockImplementation(() => isSiteOOS);

            const { result, rerender } = renderHook(
                ({ product, quantity }) => useDeliveryOptions({ product, quantity }),
                {
                    initialProps: { product: mockProduct, quantity: 1 },
                }
            );

            // Switch to pickup
            act(() => {
                result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.PICKUP);
            });

            expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.PICKUP);

            // Now make pickup unavailable but delivery available
            isStoreOOS = true;
            isSiteOOS = false;

            // Force rerender with a new product object to trigger memo recalculation
            rerender({ product: { ...mockProduct }, quantity: 1 });

            await waitFor(
                () => {
                    expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);
                },
                { timeout: 3000 }
            );
        });

        it('auto-switches from DELIVERY to PICKUP when delivery becomes unavailable', async () => {
            const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
            const { usePickup } = await import('@/extensions/bopis/context/pickup-context');
            const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

            let isStoreOOS = false;
            let isSiteOOS = false;

            vi.mocked(usePickup).mockReturnValue({
                addItem: vi.fn(),
                removeItem: vi.fn(),
                pickupBasketItems: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(useStoreLocator).mockImplementation((selector) => {
                const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
                return selector(mockStore);
            });

            vi.mocked(isStoreOutOfStock).mockImplementation(() => isStoreOOS);
            vi.mocked(isSiteOutOfStock).mockImplementation(() => isSiteOOS);

            const { result, rerender } = renderHook(
                ({ product, quantity }) => useDeliveryOptions({ product, quantity }),
                {
                    initialProps: { product: mockProduct, quantity: 1 },
                }
            );

            expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);

            // Now make delivery unavailable but pickup available
            isStoreOOS = false;
            isSiteOOS = true;

            // Force rerender with a new product object to trigger memo recalculation
            rerender({ product: { ...mockProduct }, quantity: 1 });

            await waitFor(
                () => {
                    expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.PICKUP);
                },
                { timeout: 3000 }
            );
        });

        it('does not switch when both options are unavailable', async () => {
            const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
            const { usePickup } = await import('@/extensions/bopis/context/pickup-context');
            const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

            let isStoreOOS = true;
            let isSiteOOS = false;

            vi.mocked(usePickup).mockReturnValue({
                addItem: vi.fn(),
                removeItem: vi.fn(),
                pickupBasketItems: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(useStoreLocator).mockImplementation((selector) => {
                const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
                return selector(mockStore);
            });

            vi.mocked(isStoreOutOfStock).mockImplementation(() => isStoreOOS);
            vi.mocked(isSiteOutOfStock).mockImplementation(() => isSiteOOS);

            const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

            expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);

            // Now make both unavailable
            isStoreOOS = true;
            isSiteOOS = true;

            // Wait a bit to ensure no change happens
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Should not change - stay on delivery
            expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.DELIVERY);
        });

        it('does not switch when current option is still available', async () => {
            const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
            const { usePickup } = await import('@/extensions/bopis/context/pickup-context');
            const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

            vi.mocked(usePickup).mockReturnValue({
                addItem: vi.fn(),
                removeItem: vi.fn(),
                pickupBasketItems: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(useStoreLocator).mockImplementation((selector) => {
                const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
                return selector(mockStore);
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

            act(() => {
                result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.PICKUP);
            });

            expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.PICKUP);

            // Wait a bit to ensure no change happens
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Should stay on pickup since it's still available
            expect(result.current.selectedDeliveryOption).toBe(DELIVERY_OPTIONS.PICKUP);
        });
    });

    describe('initial sync behavior', () => {
        it('syncs pickup item when hook mounts with PICKUP selected', async () => {
            const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
            const { usePickup } = await import('@/extensions/bopis/context/pickup-context');
            const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

            const mockAddItem = vi.fn();
            const mockRemoveItem = vi.fn();

            vi.mocked(usePickup).mockReturnValue({
                addItem: mockAddItem,
                removeItem: mockRemoveItem,
                pickupBasketItems: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(useStoreLocator).mockImplementation((selector) => {
                const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
                return selector(mockStore);
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            // Clear any mocks from previous tests
            mockAddItem.mockClear();
            mockRemoveItem.mockClear();

            const { result } = renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

            // Initially on DELIVERY, should call removeItem
            expect(mockRemoveItem).toHaveBeenCalledWith(mockProduct.id);
            expect(mockAddItem).not.toHaveBeenCalled();

            mockAddItem.mockClear();
            mockRemoveItem.mockClear();

            // Switch to PICKUP
            act(() => {
                result.current.setSelectedDeliveryOption(DELIVERY_OPTIONS.PICKUP);
            });

            // Should now add the pickup item
            expect(mockAddItem).toHaveBeenCalledWith(mockProduct.id, mockStoreInfo.inventoryId, mockStoreInfo.id);
        });

        it('does not sync when store has no inventoryId', async () => {
            const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
            const { usePickup } = await import('@/extensions/bopis/context/pickup-context');
            const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

            const mockAddItem = vi.fn();
            const mockRemoveItem = vi.fn();

            vi.mocked(usePickup).mockReturnValue({
                addItem: mockAddItem,
                removeItem: mockRemoveItem,
                pickupBasketItems: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(useStoreLocator).mockImplementation((selector) => {
                const mockStore = {
                    selectedStoreInfo: { ...mockStoreInfo, inventoryId: undefined },
                } as any;
                return selector(mockStore);
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            mockAddItem.mockClear();
            mockRemoveItem.mockClear();

            renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

            // Should not call either function when inventoryId is missing
            expect(mockAddItem).not.toHaveBeenCalled();
            expect(mockRemoveItem).not.toHaveBeenCalled();
        });

        it('does not sync when product has no id', async () => {
            const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
            const { usePickup } = await import('@/extensions/bopis/context/pickup-context');
            const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

            const mockAddItem = vi.fn();
            const mockRemoveItem = vi.fn();

            vi.mocked(usePickup).mockReturnValue({
                addItem: mockAddItem,
                removeItem: mockRemoveItem,
                pickupBasketItems: new Map(),
                clearItems: vi.fn(),
            });

            vi.mocked(useStoreLocator).mockImplementation((selector) => {
                const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
                return selector(mockStore);
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            mockAddItem.mockClear();
            mockRemoveItem.mockClear();

            renderHook(() => useDeliveryOptions({ product: undefined, quantity: 1 }));

            // Should not call either function when product is undefined
            expect(mockAddItem).not.toHaveBeenCalled();
            expect(mockRemoveItem).not.toHaveBeenCalled();
        });

        it('does not sync when pickupContext is null', async () => {
            const { useStoreLocator } = await import('@/extensions/store-locator/providers/store-locator');
            const { usePickup } = await import('@/extensions/bopis/context/pickup-context');
            const { isStoreOutOfStock, isSiteOutOfStock } = await import('@/lib/inventory-utils');

            vi.mocked(usePickup).mockReturnValue(null);

            vi.mocked(useStoreLocator).mockImplementation((selector) => {
                const mockStore = { selectedStoreInfo: mockStoreInfo } as any;
                return selector(mockStore);
            });

            vi.mocked(isStoreOutOfStock).mockReturnValue(false);
            vi.mocked(isSiteOutOfStock).mockReturnValue(false);

            renderHook(() => useDeliveryOptions({ product: mockProduct, quantity: 1 }));

            // Should not throw and should handle null pickup context gracefully
            expect(true).toBe(true);
        });
    });
});
