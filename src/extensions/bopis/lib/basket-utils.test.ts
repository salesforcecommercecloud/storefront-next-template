/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { describe, it, expect } from 'vitest';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import {
    getPickupItemsFromBasket,
    getInventoryIdsFromPickupShipments,
    getStoreIdsFromBasket,
    getStoreIdForBasketItem,
} from './basket-utils';

describe('getPickupItemsFromBasket', () => {
    it('returns empty map when basket is undefined', () => {
        const result = getPickupItemsFromBasket(undefined);
        expect(result.size).toBe(0);
    });

    it('returns empty map when basket has no shipments', () => {
        const basket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'test-basket',
            productItems: [
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    quantity: 1,
                },
            ],
        };
        const result = getPickupItemsFromBasket(basket);
        expect(result.size).toBe(0);
    });

    it('returns empty map when basket has no product items', () => {
        const basket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'test-basket',
            shipments: [
                {
                    shipmentId: 'me',
                    c_fromStoreId: 'store-1',
                },
            ],
        };
        const result = getPickupItemsFromBasket(basket);
        expect(result.size).toBe(0);
    });

    it('extracts pickup items when shipment has c_fromStoreId', () => {
        const basket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'test-basket',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
            productItems: [
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    shipmentId: 'shipment-1',
                    quantity: 1,
                },
                {
                    productId: 'product-2',
                    inventoryId: 'inventory-B',
                    shipmentId: 'shipment-1',
                    quantity: 2,
                },
            ],
        };

        const result = getPickupItemsFromBasket(basket);

        expect(result.size).toBe(2);
        expect(result.get('product-1')).toEqual({
            inventoryId: 'inventory-A',
            storeId: 'store-123',
        });
        expect(result.get('product-2')).toEqual({
            inventoryId: 'inventory-B',
            storeId: 'store-123',
        });
    });

    it('ignores items without inventoryId', () => {
        const basket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'test-basket',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
            productItems: [
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    shipmentId: 'shipment-1',
                    quantity: 1,
                },
                {
                    productId: 'product-2',
                    // Missing inventoryId
                    shipmentId: 'shipment-1',
                    quantity: 2,
                },
            ],
        };

        const result = getPickupItemsFromBasket(basket);

        expect(result.size).toBe(1);
        expect(result.get('product-1')).toEqual({
            inventoryId: 'inventory-A',
            storeId: 'store-123',
        });
        expect(result.has('product-2')).toBe(false);
    });

    it('ignores items when shipment has no c_fromStoreId', () => {
        const basket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'test-basket',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    // Missing c_fromStoreId - this is a regular delivery shipment
                },
            ],
            productItems: [
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    shipmentId: 'shipment-1',
                    quantity: 1,
                },
                {
                    productId: 'product-2',
                    inventoryId: 'inventory-B',
                    shipmentId: 'shipment-1',
                    quantity: 2,
                },
            ],
        };

        const result = getPickupItemsFromBasket(basket);

        expect(result.size).toBe(0);
    });

    it('ignores items without productId', () => {
        const basket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'test-basket',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
            productItems: [
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    shipmentId: 'shipment-1',
                    quantity: 1,
                },
                {
                    // Missing productId
                    inventoryId: 'inventory-B',
                    shipmentId: 'shipment-1',
                    quantity: 2,
                } as ShopperBasketsV2.schemas['ProductItem'],
            ],
        };

        const result = getPickupItemsFromBasket(basket);

        expect(result.size).toBe(1);
        expect(result.get('product-1')).toEqual({
            inventoryId: 'inventory-A',
            storeId: 'store-123',
        });
    });

    it('ignores items without shipmentId', () => {
        const basket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'test-basket',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
            productItems: [
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    shipmentId: 'shipment-1',
                    quantity: 1,
                },
                {
                    productId: 'product-2',
                    inventoryId: 'inventory-B',
                    // Missing shipmentId
                    quantity: 2,
                },
            ],
        };

        const result = getPickupItemsFromBasket(basket);

        expect(result.size).toBe(1);
        expect(result.get('product-1')).toEqual({
            inventoryId: 'inventory-A',
            storeId: 'store-123',
        });
        expect(result.has('product-2')).toBe(false);
    });

    it('handles duplicate productIds by keeping the last one', () => {
        const basket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'test-basket',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
            productItems: [
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    shipmentId: 'shipment-1',
                    quantity: 1,
                },
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-B',
                    shipmentId: 'shipment-1',
                    quantity: 2,
                },
            ],
        };

        const result = getPickupItemsFromBasket(basket);

        expect(result.size).toBe(1);
        // Last item wins when there are duplicates
        expect(result.get('product-1')).toEqual({
            inventoryId: 'inventory-B',
            storeId: 'store-123',
        });
    });

    it('handles multiple shipments with mixed pickup and delivery', () => {
        const basket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'test-basket',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-2',
                    // No c_fromStoreId - regular delivery
                },
            ],
            productItems: [
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    shipmentId: 'shipment-1', // Pickup shipment
                    quantity: 1,
                },
                {
                    productId: 'product-2',
                    inventoryId: 'inventory-B',
                    shipmentId: 'shipment-2', // Delivery shipment
                    quantity: 2,
                },
            ],
        };

        const result = getPickupItemsFromBasket(basket);

        // Only items from pickup shipment are included
        expect(result.size).toBe(1);
        expect(result.get('product-1')).toEqual({
            inventoryId: 'inventory-A',
            storeId: 'store-123',
        });
        expect(result.has('product-2')).toBe(false);
    });

    it('handles multiple pickup shipments from different stores', () => {
        const basket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'test-basket',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-2',
                    c_fromStoreId: 'store-456',
                },
            ],
            productItems: [
                {
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    shipmentId: 'shipment-1',
                    quantity: 1,
                },
                {
                    productId: 'product-2',
                    inventoryId: 'inventory-B',
                    shipmentId: 'shipment-2',
                    quantity: 2,
                },
            ],
        };

        const result = getPickupItemsFromBasket(basket);

        // Both items are pickup items from different stores
        expect(result.size).toBe(2);
        expect(result.get('product-1')).toEqual({
            inventoryId: 'inventory-A',
            storeId: 'store-123',
        });
        expect(result.get('product-2')).toEqual({
            inventoryId: 'inventory-B',
            storeId: 'store-456',
        });
    });
});

describe('getInventoryIdsFromPickupShipments', () => {
    it('should return empty array for undefined basket', () => {
        const result = getInventoryIdsFromPickupShipments(undefined);
        expect(result).toEqual([]);
    });

    it('should return empty array for null basket', () => {
        const result = getInventoryIdsFromPickupShipments(null);
        expect(result).toEqual([]);
    });

    it('should return empty array when basket has no shipments', () => {
        const basket = {
            basketId: 'basket-1',
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                    shipmentId: 'shipment-1',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getInventoryIdsFromPickupShipments(basket);
        expect(result).toEqual([]);
    });

    it('should return empty array when basket has no product items', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getInventoryIdsFromPickupShipments(basket);
        expect(result).toEqual([]);
    });

    it('should return empty array when no shipments have c_fromStoreId', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    // No c_fromStoreId - regular delivery shipment
                },
            ],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    inventoryId: 'inventory-global',
                    shipmentId: 'shipment-1',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getInventoryIdsFromPickupShipments(basket);
        expect(result).toEqual([]);
    });

    it('should extract inventory ID from single pickup item', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    inventoryId: 'inventory-store-123',
                    shipmentId: 'shipment-1',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getInventoryIdsFromPickupShipments(basket);
        expect(result).toEqual(['inventory-store-123']);
    });

    it('should extract unique inventory IDs from multiple pickup items', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    inventoryId: 'inventory-store-123',
                    shipmentId: 'shipment-1',
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    inventoryId: 'inventory-store-123',
                    shipmentId: 'shipment-1',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getInventoryIdsFromPickupShipments(basket);
        expect(result).toEqual(['inventory-store-123']);
    });

    it('should ignore items in non-pickup shipments', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-2',
                    // No c_fromStoreId - regular delivery
                },
            ],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    inventoryId: 'inventory-store-123',
                    shipmentId: 'shipment-1',
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    inventoryId: 'inventory-global',
                    shipmentId: 'shipment-2',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getInventoryIdsFromPickupShipments(basket);
        expect(result).toEqual(['inventory-store-123']);
    });

    it('should ignore items without inventoryId', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    inventoryId: 'inventory-store-123',
                    shipmentId: 'shipment-1',
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    // Missing inventoryId
                    shipmentId: 'shipment-1',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getInventoryIdsFromPickupShipments(basket);
        expect(result).toEqual(['inventory-store-123']);
    });

    it('should ignore items without shipmentId', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    inventoryId: 'inventory-store-123',
                    shipmentId: 'shipment-1',
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    inventoryId: 'inventory-store-456',
                    // Missing shipmentId
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getInventoryIdsFromPickupShipments(basket);
        expect(result).toEqual(['inventory-store-123']);
    });

    it('should handle multiple pickup shipments from different stores', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-2',
                    c_fromStoreId: 'store-456',
                },
            ],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    inventoryId: 'inventory-store-123',
                    shipmentId: 'shipment-1',
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    inventoryId: 'inventory-store-456',
                    shipmentId: 'shipment-2',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getInventoryIdsFromPickupShipments(basket);
        // Should return sorted array
        expect(result).toEqual(['inventory-store-123', 'inventory-store-456']);
    });

    it('should return sorted array of inventory IDs', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    inventoryId: 'inventory-zebra',
                    shipmentId: 'shipment-1',
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    inventoryId: 'inventory-apple',
                    shipmentId: 'shipment-1',
                },
                {
                    itemId: 'item-3',
                    productId: 'product-3',
                    inventoryId: 'inventory-banana',
                    shipmentId: 'shipment-1',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getInventoryIdsFromPickupShipments(basket);
        expect(result).toEqual(['inventory-apple', 'inventory-banana', 'inventory-zebra']);
    });

    it('should handle mixed shipments (pickup and delivery) correctly', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-pickup',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-delivery',
                    // No c_fromStoreId
                },
            ],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    inventoryId: 'inventory-store-123',
                    shipmentId: 'shipment-pickup',
                },
                {
                    itemId: 'item-2',
                    productId: 'product-2',
                    inventoryId: 'inventory-global',
                    shipmentId: 'shipment-delivery',
                },
                {
                    itemId: 'item-3',
                    productId: 'product-3',
                    inventoryId: 'inventory-store-123',
                    shipmentId: 'shipment-pickup',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getInventoryIdsFromPickupShipments(basket);
        // Should only include inventory from pickup shipment, not delivery
        expect(result).toEqual(['inventory-store-123']);
    });

    it('should ignore shipments without shipmentId even if they have c_fromStoreId', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    // Missing shipmentId
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-2',
                    c_fromStoreId: 'store-456',
                },
            ],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    inventoryId: 'inventory-store-456',
                    shipmentId: 'shipment-2',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getInventoryIdsFromPickupShipments(basket);
        expect(result).toEqual(['inventory-store-456']);
    });
});

describe('getStoreIdsFromBasket', () => {
    it('should return empty array for undefined basket', () => {
        const result = getStoreIdsFromBasket(undefined);
        expect(result).toEqual([]);
    });

    it('should return empty array for null basket', () => {
        const result = getStoreIdsFromBasket(null);
        expect(result).toEqual([]);
    });

    it('should return empty array when basket has no shipments', () => {
        const basket = {
            basketId: 'basket-1',
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    inventoryId: 'inventory-A',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getStoreIdsFromBasket(basket);
        expect(result).toEqual([]);
    });

    it('should return empty array when basket has empty shipments array', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getStoreIdsFromBasket(basket);
        expect(result).toEqual([]);
    });

    it('should return empty array when no shipments have c_fromStoreId', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    // No c_fromStoreId - regular delivery shipment
                },
                {
                    shipmentId: 'shipment-2',
                    // No c_fromStoreId - regular delivery shipment
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getStoreIdsFromBasket(basket);
        expect(result).toEqual([]);
    });

    it('should extract single store ID from pickup shipment', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getStoreIdsFromBasket(basket);
        expect(result).toEqual(['store-123']);
    });

    it('should extract unique store IDs from multiple pickup shipments', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-2',
                    c_fromStoreId: 'store-456',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getStoreIdsFromBasket(basket);
        expect(result).toHaveLength(2);
        expect(result).toContain('store-123');
        expect(result).toContain('store-456');
    });

    it('should return sorted array of store IDs', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-zebra',
                },
                {
                    shipmentId: 'shipment-2',
                    c_fromStoreId: 'store-apple',
                },
                {
                    shipmentId: 'shipment-3',
                    c_fromStoreId: 'store-banana',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getStoreIdsFromBasket(basket);
        expect(result).toEqual(['store-apple', 'store-banana', 'store-zebra']);
    });

    it('should remove duplicate store IDs', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-2',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-3',
                    c_fromStoreId: 'store-456',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getStoreIdsFromBasket(basket);
        expect(result).toEqual(['store-123', 'store-456']);
    });

    it('should ignore shipments without c_fromStoreId in mixed basket', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: 'store-123',
                },
                {
                    shipmentId: 'shipment-2',
                    // No c_fromStoreId - regular delivery
                },
                {
                    shipmentId: 'shipment-3',
                    c_fromStoreId: 'store-456',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getStoreIdsFromBasket(basket);
        expect(result).toEqual(['store-123', 'store-456']);
    });

    it('should ignore empty string c_fromStoreId', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: '',
                },
                {
                    shipmentId: 'shipment-2',
                    c_fromStoreId: 'store-123',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getStoreIdsFromBasket(basket);
        // Empty strings are falsy in JS and should be excluded (invalid store ID)
        expect(result).toEqual(['store-123']);
    });

    it('should handle numeric store IDs as strings', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                {
                    shipmentId: 'shipment-1',
                    c_fromStoreId: '123',
                },
                {
                    shipmentId: 'shipment-2',
                    c_fromStoreId: '456',
                },
                {
                    shipmentId: 'shipment-3',
                    c_fromStoreId: '001',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getStoreIdsFromBasket(basket);
        // Alphabetical sort treats them as strings
        expect(result).toEqual(['001', '123', '456']);
    });

    it('should work with real-world basket structure', () => {
        const basket = {
            basketId: 'basket-abc123',
            shipments: [
                {
                    shipmentId: 'pickup-shipment-1',
                    c_fromStoreId: 'NYC-001',
                },
                {
                    shipmentId: 'pickup-shipment-2',
                    c_fromStoreId: 'LA-005',
                },
                {
                    shipmentId: 'delivery-shipment-1',
                    // Regular delivery - no c_fromStoreId
                },
            ],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-A',
                    inventoryId: 'inventory-NYC-001',
                    shipmentId: 'pickup-shipment-1',
                },
                {
                    itemId: 'item-2',
                    productId: 'product-B',
                    inventoryId: 'inventory-LA-005',
                    shipmentId: 'pickup-shipment-2',
                },
                {
                    itemId: 'item-3',
                    productId: 'product-C',
                    inventoryId: 'inventory-global',
                    shipmentId: 'delivery-shipment-1',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        const result = getStoreIdsFromBasket(basket);
        expect(result).toEqual(['LA-005', 'NYC-001']);
    });
});

describe('getStoreIdForBasketItem', () => {
    it('should return undefined for null/undefined basket', () => {
        expect(getStoreIdForBasketItem(null, 'item-1')).toBeUndefined();
        expect(getStoreIdForBasketItem(undefined, 'item-1')).toBeUndefined();
    });

    it('should return undefined when item is not found', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [{ shipmentId: 'shipment-1', c_fromStoreId: 'store-123' }],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    shipmentId: 'shipment-1',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        expect(getStoreIdForBasketItem(basket, 'item-999')).toBeUndefined();
    });

    it('should return undefined for delivery items (no c_fromStoreId)', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [{ shipmentId: 'shipment-1' }], // No c_fromStoreId
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    shipmentId: 'shipment-1',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        expect(getStoreIdForBasketItem(basket, 'item-1')).toBeUndefined();
    });

    it('should return store ID for pickup items', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [{ shipmentId: 'shipment-1', c_fromStoreId: 'store-123' }],
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    shipmentId: 'shipment-1',
                },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        expect(getStoreIdForBasketItem(basket, 'item-1')).toBe('store-123');
    });

    it('should handle mixed basket with pickup and delivery items', () => {
        const basket = {
            basketId: 'basket-1',
            shipments: [
                { shipmentId: 'pickup-1', c_fromStoreId: 'store-NYC' },
                { shipmentId: 'pickup-2', c_fromStoreId: 'store-LA' },
                { shipmentId: 'delivery-1' }, // No c_fromStoreId
            ],
            productItems: [
                { itemId: 'item-1', productId: 'product-A', shipmentId: 'pickup-1' },
                { itemId: 'item-2', productId: 'product-B', shipmentId: 'pickup-2' },
                { itemId: 'item-3', productId: 'product-C', shipmentId: 'delivery-1' },
            ],
        } as ShopperBasketsV2.schemas['Basket'];

        expect(getStoreIdForBasketItem(basket, 'item-1')).toBe('store-NYC');
        expect(getStoreIdForBasketItem(basket, 'item-2')).toBe('store-LA');
        expect(getStoreIdForBasketItem(basket, 'item-3')).toBeUndefined();
    });
});
