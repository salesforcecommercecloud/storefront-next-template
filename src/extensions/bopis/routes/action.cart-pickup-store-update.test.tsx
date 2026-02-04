/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { action } from './action.cart-pickup-store-update';
import { getBasket, updateBasketResource } from '@/middlewares/basket.server';
import { updateShipmentForPickup } from '@/extensions/bopis/lib/api/shipment';
import { isStoreOutOfStock } from '@/lib/inventory-utils';
import { extractResponseError } from '@/lib/utils';
import { getPickupShipment, getPickupProductItemsForStore } from '@/extensions/bopis/lib/basket-utils';
import { createApiClients } from '@/lib/api-clients';
import { currencyContext } from '@/lib/currency';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

vi.mock('@/middlewares/basket.server');
vi.mock('@/extensions/bopis/lib/api/shipment');
vi.mock('@/lib/inventory-utils');
vi.mock('@/extensions/bopis/lib/basket-utils');
vi.mock('@/lib/api-clients');
vi.mock('@/providers/currency', () => ({
    getCurrency: vi.fn(() => 'USD'),
}));
vi.mock('@/lib/utils', () => ({
    extractResponseError: vi.fn((error) => ({
        responseMessage: error instanceof Error ? error.message : 'Unknown error',
        status_code: '400',
    })),
}));

import { createFormDataRequest } from '@/test-utils/request-helpers';

describe('action.cart-pickup-store-update', () => {
    const mockBasketId = 'test-basket-123';
    const mockStoreId = 'store-123';
    const mockInventoryId = 'inventory-123';
    const mockStoreName = 'Test Store';

    const mockBasketWithPickupItems: Partial<ShopperBasketsV2.schemas['Basket']> = {
        basketId: mockBasketId,
        productItems: [
            {
                itemId: 'item-1',
                productId: 'product-1',
                quantity: 2,
                shipmentId: 'me',
            },
            {
                itemId: 'item-2',
                productId: 'product-2',
                quantity: 1,
                shipmentId: 'me',
            },
        ],
        shipments: [
            {
                shipmentId: 'me',
                c_fromStoreId: 'old-store-123',
            },
        ],
    };

    const mockUpdatedBasket: Partial<ShopperBasketsV2.schemas['Basket']> = {
        ...mockBasketWithPickupItems,
        shipments: [
            {
                shipmentId: 'me',
                c_fromStoreId: mockStoreId,
            },
        ],
    };

    const mockProduct1: Partial<ShopperProducts.schemas['Product']> = {
        id: 'product-1',
        inventories: [
            {
                id: mockInventoryId,
                stockLevel: 10,
                orderable: true,
            },
        ],
    };

    const mockProduct2: Partial<ShopperProducts.schemas['Product']> = {
        id: 'product-2',
        inventories: [
            {
                id: mockInventoryId,
                stockLevel: 5,
                orderable: true,
            },
        ],
    };

    const mockProductsResponse = {
        data: { data: [mockProduct1, mockProduct2] },
    };

    const createBasketResource = (basket?: Partial<ShopperBasketsV2.schemas['Basket']> | null) => ({
        snapshot: basket?.basketId ? { basketId: basket.basketId, itemsCount: basket.productItems?.length ?? 0 } : null,
        current: basket ?? null,
        hydrated: Boolean(basket),
        error: null,
    });

    // Mock for shopperBasketsV2 using new API client structure
    const mockShopperBasketsV2 = {
        updateItemsInBasket: vi.fn(),
        getBasket: vi.fn(),
    };

    // Mock for shopperProducts using new API client structure
    const mockShopperProducts = {
        getProducts: vi.fn(),
    };

    // Mock for createApiClients return value
    const mockApiClients = {
        shopperBasketsV2: mockShopperBasketsV2,
        shopperProducts: mockShopperProducts,
    };

    const mockContext = {
        get: vi.fn((context) => {
            if (context === currencyContext || context?.key === 'currency') {
                return 'USD';
            }
            // Return undefined for any other context - tests can mock specific contexts as needed
            return undefined;
        }),
    } as any;
    const mockServerAction = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getBasket).mockResolvedValue(
            createBasketResource(mockBasketWithPickupItems as ShopperBasketsV2.schemas['Basket']) as any
        );
        vi.mocked(updateShipmentForPickup).mockResolvedValue(mockUpdatedBasket);
        vi.mocked(isStoreOutOfStock).mockReturnValue(false);
        vi.mocked(getPickupShipment).mockReturnValue({
            shipmentId: 'me',
            c_fromStoreId: 'old-store-123',
        } as ShopperBasketsV2.schemas['Shipment']);
        vi.mocked(getPickupProductItemsForStore).mockImplementation((basket, storeId) => {
            if (!basket?.productItems || !basket?.shipments) return [];
            // Return items that belong to shipments with the matching storeId
            const shipmentIds = basket.shipments
                .filter((s) => s.shipmentId && s.c_fromStoreId === storeId)
                .map((s) => s.shipmentId);
            return basket.productItems.filter((item) => item.shipmentId && shipmentIds.includes(item.shipmentId));
        });
        vi.mocked(createApiClients).mockReturnValue(mockApiClients as any);
        mockShopperBasketsV2.getBasket.mockResolvedValue({
            data: mockUpdatedBasket,
        });
        mockShopperProducts.getProducts.mockResolvedValue(mockProductsResponse);
    });

    describe('action', () => {
        test('throws 405 error for non-PATCH requests', async () => {
            const request = new Request('http://localhost/action/cart-pickup-store-update', {
                method: 'POST',
            });

            await expect(
                action({
                    request,
                    context: mockContext,
                    params: {},
                    serverAction: mockServerAction,
                })
            ).rejects.toThrow();
        });

        test('returns error when basket is not found', async () => {
            vi.mocked(getBasket).mockResolvedValue(createBasketResource(undefined) as any);

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
        });

        test('returns error when storeId is missing', async () => {
            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toContain('Store ID');
        });

        test('returns error when inventoryId is missing', async () => {
            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toContain('Inventory ID');
        });

        test('returns error when no pickup shipment found', async () => {
            vi.mocked(getPickupShipment).mockReturnValue(undefined);

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('No pickup shipment found. Cannot change pickup store.');
            expect(updateShipmentForPickup).not.toHaveBeenCalled();
        });

        test('successfully updates pickup store when no pickup items exist', async () => {
            const basketWithoutPickup: Partial<ShopperBasketsV2.schemas['Basket']> = {
                basketId: mockBasketId,
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                        shipmentId: 'me',
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'me',
                        c_fromStoreId: 'old-store-123', // Has pickup store
                    },
                ],
            };

            vi.mocked(getBasket).mockResolvedValue(
                createBasketResource(basketWithoutPickup as ShopperBasketsV2.schemas['Basket']) as any
            );
            vi.mocked(getPickupProductItemsForStore).mockReturnValue([]); // No pickup items
            vi.mocked(updateShipmentForPickup).mockResolvedValue({
                ...basketWithoutPickup,
                shipments: [
                    {
                        shipmentId: 'me',
                        c_fromStoreId: mockStoreId,
                    },
                ],
            } as ShopperBasketsV2.schemas['Basket']);

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(true);
            expect(updateShipmentForPickup).toHaveBeenCalledWith(mockContext, mockBasketId, 'me', mockStoreId);
            expect(updateBasketResource).toHaveBeenCalled();
        });

        test('successfully updates pickup store when all items are in stock', async () => {
            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
                storeName: mockStoreName,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(true);
            expect(response.basket).toBeDefined();

            // Verify inventory validation was performed
            expect(mockShopperProducts.getProducts).toHaveBeenCalledWith({
                params: {
                    query: {
                        ids: ['product-1', 'product-2'],
                        allImages: true,
                        perPricebook: true,
                        inventoryIds: [mockInventoryId],
                        currency: 'USD',
                    },
                },
            });

            // Verify isStoreOutOfStock was called for each item
            expect(isStoreOutOfStock).toHaveBeenCalledWith(mockProduct1, mockInventoryId, 2);
            expect(isStoreOutOfStock).toHaveBeenCalledWith(mockProduct2, mockInventoryId, 1);

            // Verify shipment was updated
            expect(updateShipmentForPickup).toHaveBeenCalledWith(mockContext, mockBasketId, 'me', mockStoreId);

            // Verify items were updated with new inventory ID
            expect(mockShopperBasketsV2.updateItemsInBasket).toHaveBeenCalledWith({
                params: {
                    path: { basketId: mockBasketId },
                },
                body: expect.arrayContaining([
                    expect.objectContaining({
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 2,
                        inventoryId: mockInventoryId,
                    }),
                    expect.objectContaining({
                        itemId: 'item-2',
                        productId: 'product-2',
                        quantity: 1,
                        inventoryId: mockInventoryId,
                    }),
                ]),
            });

            // Verify basket was refreshed using new API clients
            expect(createApiClients).toHaveBeenCalledWith(mockContext);
            expect(mockShopperBasketsV2.getBasket).toHaveBeenCalledWith({
                params: {
                    path: { basketId: mockBasketId },
                },
            });

            expect(updateBasketResource).toHaveBeenCalled();
        });

        test('returns error when items are out of stock at new store', async () => {
            vi.mocked(isStoreOutOfStock).mockReturnValue(true);

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
                storeName: mockStoreName,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toContain(mockStoreName);
            expect(response.error).toContain('out of stock');

            // Verify shipment was NOT updated
            expect(updateShipmentForPickup).not.toHaveBeenCalled();
            expect(mockShopperBasketsV2.updateItemsInBasket).not.toHaveBeenCalled();
        });

        test('uses storeId as fallback when storeName is not provided in out of stock error', async () => {
            vi.mocked(isStoreOutOfStock).mockReturnValue(true);

            // No storeName included
            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toContain(mockStoreId);
        });

        test('returns error when product is not found during validation', async () => {
            // Mock products response without one of the products
            mockShopperProducts.getProducts.mockResolvedValue({
                data: { data: [mockProduct1] }, // Missing product-2
            });

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toContain('out of stock');
        });

        test('handles items without productId gracefully', async () => {
            const basketWithMissingProductId: Partial<ShopperBasketsV2.schemas['Basket']> = {
                basketId: mockBasketId,
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                        shipmentId: 'me',
                    },
                    {
                        itemId: 'item-2',
                        // Missing productId
                        quantity: 1,
                        shipmentId: 'me',
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'me',
                        c_fromStoreId: 'old-store-123',
                    },
                ],
            };

            vi.mocked(getBasket).mockResolvedValue(
                createBasketResource(basketWithMissingProductId as ShopperBasketsV2.schemas['Basket']) as any
            );

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            // Should still succeed, but only validate product-1
            expect(mockShopperProducts.getProducts).toHaveBeenCalledWith({
                params: {
                    query: {
                        ids: ['product-1'],
                        allImages: true,
                        perPricebook: true,
                        inventoryIds: [mockInventoryId],
                        currency: 'USD',
                    },
                },
            });
        });

        test('handles duplicate product IDs correctly', async () => {
            const basketWithDuplicates: Partial<ShopperBasketsV2.schemas['Basket']> = {
                basketId: mockBasketId,
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                        shipmentId: 'me',
                    },
                    {
                        itemId: 'item-2',
                        productId: 'product-1', // Duplicate
                        quantity: 2,
                        shipmentId: 'me',
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'me',
                        c_fromStoreId: 'old-store-123',
                    },
                ],
            };

            vi.mocked(getBasket).mockResolvedValue(
                createBasketResource(basketWithDuplicates as ShopperBasketsV2.schemas['Basket']) as any
            );

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            // Should only fetch product-1 once (duplicates removed)
            expect(mockShopperProducts.getProducts).toHaveBeenCalledWith({
                params: {
                    query: {
                        ids: ['product-1'],
                        allImages: true,
                        perPricebook: true,
                        inventoryIds: [mockInventoryId],
                        currency: 'USD',
                    },
                },
            });
        });

        test('handles empty products response gracefully', async () => {
            mockShopperProducts.getProducts.mockResolvedValue({ data: { data: undefined } });

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            // Should still proceed with update if no products data
            expect(response.success).toBe(true);
            expect(updateShipmentForPickup).toHaveBeenCalled();
        });

        test('handles API errors during update', async () => {
            const mockError = new Error('API Error');
            mockShopperBasketsV2.updateItemsInBasket.mockRejectedValue(mockError);

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('API Error');
            expect(extractResponseError).toHaveBeenCalledWith(mockError);
        });

        test('handles errors during shipment update', async () => {
            const mockError = new Error('Shipment update failed');
            vi.mocked(updateShipmentForPickup).mockRejectedValue(mockError);

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('Shipment update failed');
        });

        test('rolls back shipment update when error occurs after shipment update', async () => {
            const originalStoreId = 'old-store-123';
            const mockError = new Error('Item update failed');

            // Mock successful shipment update, but item update fails
            vi.mocked(updateShipmentForPickup)
                .mockResolvedValueOnce(mockUpdatedBasket) // First call succeeds
                .mockResolvedValueOnce(mockBasketWithPickupItems); // Rollback succeeds

            mockShopperBasketsV2.updateItemsInBasket.mockRejectedValue(mockError);

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('Item update failed');

            // Verify shipment was updated first
            expect(updateShipmentForPickup).toHaveBeenCalledWith(mockContext, mockBasketId, 'me', mockStoreId);

            // Verify rollback was called with original store ID
            expect(updateShipmentForPickup).toHaveBeenCalledWith(mockContext, mockBasketId, 'me', originalStoreId);
            expect(updateShipmentForPickup).toHaveBeenCalledTimes(2);
        });

        test('handles rollback failure gracefully', async () => {
            const originalStoreId = 'old-store-123';
            const mockError = new Error('Item update failed');
            const rollbackError = new Error('Rollback failed');

            // Mock successful shipment update, item update fails, and rollback also fails
            vi.mocked(updateShipmentForPickup)
                .mockResolvedValueOnce(mockUpdatedBasket as any) // First call succeeds
                .mockRejectedValueOnce(rollbackError); // Rollback fails

            mockShopperBasketsV2.updateItemsInBasket.mockRejectedValue(mockError);

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            // Should still return the original error, not the rollback error
            expect(response.success).toBe(false);
            expect(response.error).toBe('Item update failed');

            // Verify rollback was attempted
            expect(updateShipmentForPickup).toHaveBeenCalledWith(mockContext, mockBasketId, 'me', originalStoreId);
        });

        test('does not rollback when shipment was not updated', async () => {
            vi.mocked(isStoreOutOfStock).mockReturnValue(true);

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toContain('out of stock');

            // Verify shipment was NOT updated (error occurred before update)
            expect(updateShipmentForPickup).not.toHaveBeenCalled();
        });

        test('does not rollback when original store ID is missing', async () => {
            const basketWithoutOriginalStore: Partial<ShopperBasketsV2.schemas['Basket']> = {
                basketId: mockBasketId,
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                        shipmentId: 'me',
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'me',
                        // No c_fromStoreId - no original store to rollback to
                    },
                ],
            };

            vi.mocked(getBasket).mockResolvedValue(
                createBasketResource(basketWithoutOriginalStore as ShopperBasketsV2.schemas['Basket']) as any
            );
            // Action fails early when getPickupShipment returns undefined
            vi.mocked(getPickupShipment).mockReturnValue(undefined);

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('No pickup shipment found. Cannot change pickup store.');

            // Verify shipment was NOT updated (error occurred before update)
            expect(updateShipmentForPickup).not.toHaveBeenCalled();
        });

        test('rolls back when error occurs during basket retrieval after item update', async () => {
            const originalStoreId = 'old-store-123';
            const mockError = new Error('Basket retrieval failed');

            // Mock successful shipment update and item update, but basket retrieval fails
            vi.mocked(updateShipmentForPickup)
                .mockResolvedValueOnce(mockUpdatedBasket) // First call succeeds
                .mockResolvedValueOnce(mockBasketWithPickupItems); // Rollback succeeds

            mockShopperBasketsV2.updateItemsInBasket.mockResolvedValue({} as any);
            mockShopperBasketsV2.getBasket.mockRejectedValue(mockError);

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('Basket retrieval failed');

            // Verify rollback was called
            expect(updateShipmentForPickup).toHaveBeenCalledWith(mockContext, mockBasketId, 'me', originalStoreId);
            expect(updateShipmentForPickup).toHaveBeenCalledTimes(2);
        });

        test('skips item update when no pickup items found after shipment update', async () => {
            const basketAfterUpdate: Partial<ShopperBasketsV2.schemas['Basket']> = {
                basketId: mockBasketId,
                productItems: [
                    {
                        itemId: 'item-1',
                        productId: 'product-1',
                        quantity: 1,
                        shipmentId: 'me',
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'me',
                        c_fromStoreId: mockStoreId,
                    },
                ],
            };

            // Mock that after shipment update, getPickupProductItemsForStore returns empty array
            vi.mocked(updateShipmentForPickup).mockResolvedValue(basketAfterUpdate);
            vi.mocked(getPickupProductItemsForStore).mockReturnValueOnce(mockBasketWithPickupItems.productItems || []); // First call for validation
            vi.mocked(getPickupProductItemsForStore).mockReturnValueOnce([]); // Second call after update returns empty

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            expect(response.success).toBe(true);
            // Should not update items if none match the new store
            expect(mockShopperBasketsV2.updateItemsInBasket).not.toHaveBeenCalled();
        });

        test('handles items with missing itemId - API call fails and error is returned to user', async () => {
            const basketWithMissingItemId: Partial<ShopperBasketsV2.schemas['Basket']> = {
                basketId: mockBasketId,
                productItems: [
                    {
                        // Missing itemId
                        productId: 'product-1',
                        quantity: 1,
                        shipmentId: 'me',
                    },
                ],
                shipments: [
                    {
                        shipmentId: 'me',
                        c_fromStoreId: mockStoreId,
                    },
                ],
            };

            vi.mocked(updateShipmentForPickup).mockResolvedValue(basketWithMissingItemId);

            const mockError = new Error('API Error: itemId is required');
            mockShopperBasketsV2.updateItemsInBasket.mockRejectedValue(mockError);

            const request = createFormDataRequest('http://localhost/action/cart-pickup-store-update', 'PATCH', {
                storeId: mockStoreId,
                inventoryId: mockInventoryId,
            });

            const response = await action({
                request,
                context: mockContext,
                params: {},
                serverAction: mockServerAction,
            });

            // API should be called with undefined itemId, which will fail
            expect(mockShopperBasketsV2.updateItemsInBasket).toHaveBeenCalledWith({
                params: {
                    path: { basketId: mockBasketId },
                },
                body: [
                    {
                        itemId: undefined,
                        productId: 'product-1',
                        quantity: 1,
                        inventoryId: mockInventoryId,
                    },
                ],
            });

            // Error should be returned to user
            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
        });
    });
});
