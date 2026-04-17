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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBasketWithProducts } from './use-basket-with-products';
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { findImageGroupBy } from '@/lib/image-groups-utils';

// Mock React Router's useFetcher
const mockFetcher = {
    state: 'idle' as 'idle' | 'loading' | 'submitting',
    data: null as Record<string, ShopperProducts.schemas['Product']> | null,
    load: vi.fn(),
};

vi.mock('react-router', () => ({
    useFetcher: vi.fn(() => mockFetcher),
}));

// Mock image group utility
vi.mock('@/lib/image-groups-utils', () => ({
    findImageGroupBy: vi.fn(() => ({
        viewType: 'small',
        images: [{ link: 'https://example.com/small.jpg', alt: 'Small image' }],
    })),
}));

const mockedFindImageGroupBy = vi.mocked(findImageGroupBy);

describe('useBasketWithProducts', () => {
    const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
        basketId: 'basket-123',
        productItems: [
            {
                itemId: 'item-1',
                productId: 'product-1',
                productName: 'Test Product 1',
                quantity: 2,
                price: 50,
                priceAfterItemDiscount: 45,
                variationValues: { color: 'red', size: 'M' },
            },
            {
                itemId: 'item-2',
                productId: 'product-2',
                productName: 'Test Product 2',
                quantity: 1,
                price: 100,
                priceAfterItemDiscount: 100,
            },
        ],
    };

    const mockProductsData: Record<string, ShopperProducts.schemas['Product']> = {
        'product-1': {
            id: 'product-1',
            name: 'Full Product 1',
            imageGroups: [
                {
                    viewType: 'large',
                    images: [{ link: 'https://example.com/large1.jpg', alt: 'Large image 1' }],
                },
            ],
            variationAttributes: [
                { id: 'color', name: 'Color', values: [{ value: 'red', name: 'Red' }] },
                { id: 'size', name: 'Size', values: [{ value: 'M', name: 'Medium' }] },
            ],
        },
        'product-2': {
            id: 'product-2',
            name: 'Full Product 2',
            imageGroups: [
                {
                    viewType: 'large',
                    images: [{ link: 'https://example.com/large2.jpg', alt: 'Large image 2' }],
                },
            ],
        },
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockFetcher.state = 'idle';
        mockFetcher.data = null;
        mockFetcher.load.mockReturnValue(Promise.resolve());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should return empty array when basket is undefined', () => {
        const { result } = renderHook(() => useBasketWithProducts(undefined));

        expect(result.current.productItems).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('should return empty array when basket has no product items', () => {
        const emptyBasket: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'basket-123',
            productItems: [],
        };

        const { result } = renderHook(() => useBasketWithProducts(emptyBasket));

        expect(result.current.productItems).toEqual([]);
        expect(result.current.isLoading).toBe(false);
    });

    it('should trigger fetch when basket has items', () => {
        renderHook(() => useBasketWithProducts(mockBasket));

        expect(mockFetcher.load).toHaveBeenCalledWith('/resource/basket-products');
    });

    it('should return basic basket items while loading', () => {
        const { result } = renderHook(() => useBasketWithProducts(mockBasket));

        expect(result.current.productItems).toEqual(mockBasket.productItems);
    });

    it('should return loading state when fetcher is loading', () => {
        mockFetcher.state = 'loading';

        const { result } = renderHook(() => useBasketWithProducts(mockBasket));

        expect(result.current.isLoading).toBe(true);
    });

    it('should merge basket items with product data', async () => {
        mockFetcher.data = mockProductsData;

        const { result } = renderHook(() => useBasketWithProducts(mockBasket));

        await waitFor(() => {
            expect(result.current.productItems.length).toBe(2);
        });

        // Check that the first item is enriched with product data
        const firstItem = result.current.productItems[0];
        expect(firstItem.itemId).toBe('item-1');
        expect(firstItem.quantity).toBe(2);
        expect(firstItem.price).toBe(50);
        expect(firstItem.variationAttributes).toBeDefined();
    });

    it('should preserve basket-specific data when merging', async () => {
        mockFetcher.data = mockProductsData;

        const { result } = renderHook(() => useBasketWithProducts(mockBasket));

        await waitFor(() => {
            expect(result.current.productItems.length).toBe(2);
        });

        const firstItem = result.current.productItems[0];
        // Basket-specific data should be preserved
        expect(firstItem.itemId).toBe('item-1');
        expect(firstItem.quantity).toBe(2);
        expect(firstItem.price).toBe(50);
        expect(firstItem.priceAfterItemDiscount).toBe(45);
    });

    it('should return basic item when product data is not found', async () => {
        // Only provide data for product-1
        mockFetcher.data = {
            'product-1': mockProductsData['product-1'],
        };

        const { result } = renderHook(() => useBasketWithProducts(mockBasket));

        await waitFor(() => {
            expect(result.current.productItems.length).toBe(2);
        });

        // Second item should still be the basic basket item
        const secondItem = result.current.productItems[1];
        expect(secondItem.itemId).toBe('item-2');
        expect(secondItem.productName).toBe('Test Product 2');
    });

    it('should not trigger fetch when fetcher already has data', () => {
        mockFetcher.data = mockProductsData;

        renderHook(() => useBasketWithProducts(mockBasket));

        // load should not be called because data already exists
        expect(mockFetcher.load).not.toHaveBeenCalled();
    });

    it('should trigger fetch when basket includes unfetched product IDs', () => {
        // product-2 is missing from existing fetcher data
        mockFetcher.data = {
            'product-1': mockProductsData['product-1'],
        };

        renderHook(() => useBasketWithProducts(mockBasket));

        expect(mockFetcher.load).toHaveBeenCalledWith('/resource/basket-products');
    });

    it('derives variation values from single-value variation attributes when basket variation values are missing', async () => {
        const basketWithoutVariationValues: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'basket-123',
            productItems: [
                {
                    itemId: 'item-1',
                    productId: 'product-1',
                    productName: 'Test Product 1',
                    quantity: 1,
                    price: 50,
                },
            ],
        };
        mockFetcher.data = {
            'product-1': {
                ...mockProductsData['product-1'],
                variationValues: undefined,
                variationAttributes: [{ id: 'color', name: 'Color', values: [{ value: 'yellow', name: 'Yellow' }] }],
            },
        };

        const { result } = renderHook(() => useBasketWithProducts(basketWithoutVariationValues));

        await waitFor(() => {
            expect(result.current.productItems.length).toBe(1);
        });

        expect(mockedFindImageGroupBy).not.toHaveBeenCalled();
        expect(result.current.productItems[0].variationValues).toEqual({ color: 'yellow' });
    });

    it('uses variation image matching when explicit variation values exist', async () => {
        mockFetcher.data = mockProductsData;

        renderHook(() => useBasketWithProducts(mockBasket));

        await waitFor(() => {
            expect(mockedFindImageGroupBy).toHaveBeenCalledWith(expect.any(Array), {
                viewType: 'small',
                selectedVariationAttributes: { color: 'red', size: 'M' },
            });
        });
    });
});
