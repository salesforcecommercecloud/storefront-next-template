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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import {
    useBasketWithPromotions,
    useBasketWithPromotionsLoader,
    type ProductsWithPromotionsMap,
} from './use-basket-with-promotions';

const mockFetcher = {
    state: 'idle' as 'idle' | 'loading' | 'submitting',
    data: null as ProductsWithPromotionsMap | null,
    load: vi.fn(),
};

vi.mock('react-router', () => ({
    useFetcher: vi.fn(() => mockFetcher),
}));

const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
    basketId: 'basket-123',
    productItems: [{ itemId: 'item-1', productId: 'product-1', quantity: 1 }],
};

describe('useBasketWithPromotionsLoader', () => {
    beforeEach(() => {
        mockFetcher.state = 'idle';
        mockFetcher.data = null;
        mockFetcher.load.mockReset();
    });

    it('loads the basket-products-promotions resource when called', () => {
        const { result } = renderHook(() => useBasketWithPromotionsLoader());

        act(() => {
            result.current();
        });

        expect(mockFetcher.load).toHaveBeenCalledWith('/resource/basket-products-promotions');
    });

    it('skips dispatch when fetcher is in flight', () => {
        mockFetcher.state = 'loading';

        const { result } = renderHook(() => useBasketWithPromotionsLoader());

        act(() => {
            result.current();
        });

        expect(mockFetcher.load).not.toHaveBeenCalled();
    });

    it('skips dispatch when fetcher already has data', () => {
        mockFetcher.data = { 'product-1': { id: 'product-1' } };

        const { result } = renderHook(() => useBasketWithPromotionsLoader());

        act(() => {
            result.current();
        });

        expect(mockFetcher.load).not.toHaveBeenCalled();
    });

    it('returns a reference-stable callback across renders', () => {
        const { result, rerender } = renderHook(() => useBasketWithPromotionsLoader());

        const first = result.current;
        rerender();
        rerender();
        expect(result.current).toBe(first);
    });
});

describe('useBasketWithPromotions', () => {
    beforeEach(() => {
        mockFetcher.state = 'idle';
        mockFetcher.data = null;
        mockFetcher.load.mockReset();
    });

    it('does not load when basket has no items', () => {
        renderHook(() => useBasketWithPromotions({ basketId: 'b', productItems: [] }));
        expect(mockFetcher.load).not.toHaveBeenCalled();
    });

    it('loads when basket has items and fetcher is idle without data', async () => {
        renderHook(() => useBasketWithPromotions(mockBasket));
        await waitFor(() => {
            expect(mockFetcher.load).toHaveBeenCalledWith('/resource/basket-products-promotions');
        });
    });

    it('does not re-dispatch when fetcher already has data covering all basket items', () => {
        mockFetcher.data = { 'product-1': { id: 'product-1' } };
        renderHook(() => useBasketWithPromotions(mockBasket));
        expect(mockFetcher.load).not.toHaveBeenCalled();
    });

    it('triggers fetch when basket includes unfetched product IDs', () => {
        // product-2 is missing from existing fetcher data
        mockFetcher.data = { 'product-1': { id: 'product-1' } };
        const basketWithTwoItems: ShopperBasketsV2.schemas['Basket'] = {
            basketId: 'basket-123',
            productItems: [
                { itemId: 'item-1', productId: 'product-1', quantity: 1 },
                { itemId: 'item-2', productId: 'product-2', quantity: 1 },
            ],
        };

        renderHook(() => useBasketWithPromotions(basketWithTwoItems));

        expect(mockFetcher.load).toHaveBeenCalledWith('/resource/basket-products-promotions');
    });

    it('exposes isLoading=true while the fetcher is loading', () => {
        mockFetcher.state = 'loading';
        const { result } = renderHook(() => useBasketWithPromotions(mockBasket));
        expect(result.current.isLoading).toBe(true);
    });

    it('exposes the productsWithPromotions map from fetcher data', () => {
        mockFetcher.data = {
            'product-1': {
                id: 'product-1',
                productPromotions: [{ promotionId: 'promo-1', calloutMsg: '10% off', promotionalPrice: 9 }],
            },
        };
        const { result } = renderHook(() => useBasketWithPromotions(mockBasket));
        expect(result.current.productsWithPromotions['product-1']?.productPromotions?.[0]?.promotionId).toBe('promo-1');
    });
});
