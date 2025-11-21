/**
 * Analytics Hook Tests
 *
 * Tests the useAnalytics hook functionality including event tracking,
 * user context integration, and analytics provider integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnalytics } from './use-analytics';
import type { EventMediator } from '@salesforce/storefront-next-runtime/events';
import type { SessionData } from '@/lib/api/types';
import type { ShopperBasketsV2, ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';

vi.mock('@/providers/analytics', () => ({
    useAnalytics: vi.fn(),
}));

vi.mock('@/providers/auth', () => ({
    useAuth: vi.fn(),
}));

import { useAnalytics as useAnalyticsContext } from '@/providers/analytics';
import { useAuth } from '@/providers/auth';

const mockAnalytics: EventMediator = {
    track: vi.fn(),
};

// Mock user
const mockAuth: SessionData = {
    access_token: 'test-token',
    refresh_token: 'test-refresh-token',
    usid: 'test-usid',
    customer_id: 'test-customer-id',
    idp_access_token: 'test-idp-token',
    userType: 'registered',
};

// Mock product data
const mockProduct: ShopperProducts.schemas['Product'] = {
    id: 'test-product-id',
    name: 'Test Product',
    type: {
        master: true,
    },
} as ShopperProducts.schemas['Product'];

// Mock cart item data
const mockCartItem: ShopperBasketsV2.schemas['ProductItem'] = {
    itemId: 'test-cart-item-id',
    productId: 'test-product-id',
    quantity: 2,
    price: 29.99,
    product: {} as Partial<ShopperProducts.schemas['Product']>,
} as ShopperBasketsV2.schemas['ProductItem'];

// Mock basket data
const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
    basketId: 'test-basket-id',
    productSubTotal: 59.98,
    productItems: [mockCartItem],
} as ShopperBasketsV2.schemas['Basket'];

// Mock search result data
const mockSearchResult: ShopperSearch.schemas['ProductSearchHit'] = {
    productId: 'test-product-id',
    productName: 'Test Product',
    currency: 'USD',
    price: 29.99,
} as ShopperSearch.schemas['ProductSearchHit'];

describe('useAnalytics', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('trackViewPage', () => {
        it('should track page view for user', () => {
            vi.mocked(useAnalyticsContext).mockReturnValue(mockAnalytics);
            vi.mocked(useAuth).mockReturnValue(mockAuth);

            const { result } = renderHook(() => useAnalytics());

            result.current.trackViewPage({ url: '/test-page' });

            expect(mockAnalytics.track).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'view_page',
                    path: '/test-page',
                    payload: {
                        userType: 'registered',
                        usid: 'test-usid',
                    },
                })
            );
        });

        it('should handle undefined auth gracefully', () => {
            vi.mocked(useAnalyticsContext).mockReturnValue(mockAnalytics);
            vi.mocked(useAuth).mockReturnValue(undefined);

            const { result } = renderHook(() => useAnalytics());

            result.current.trackViewPage({ url: '/test-page' });

            expect(mockAnalytics.track).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'view_page',
                    path: '/test-page',
                    payload: {
                        userType: 'guest',
                        usid: undefined,
                    },
                })
            );
        });
    });

    describe('trackProductView', () => {
        it('should track product view with correct user context', () => {
            vi.mocked(useAnalyticsContext).mockReturnValue(mockAnalytics);
            vi.mocked(useAuth).mockReturnValue(mockAuth);

            const { result } = renderHook(() => useAnalytics());

            result.current.trackViewProduct({ product: mockProduct });

            expect(mockAnalytics.track).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'view_product',
                    product: mockProduct,
                    payload: {
                        userType: 'registered',
                        usid: 'test-usid',
                    },
                })
            );
        });
    });

    describe('trackCartItemAdd', () => {
        it('should track add to cart with cart items', () => {
            vi.mocked(useAnalyticsContext).mockReturnValue(mockAnalytics);
            vi.mocked(useAuth).mockReturnValue(mockAuth);

            const { result } = renderHook(() => useAnalytics());

            result.current.trackCartItemAdd({ cartItems: [mockCartItem] });

            expect(mockAnalytics.track).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'cart_item_add',
                    cartItems: [mockCartItem],
                    payload: {
                        userType: 'registered',
                        usid: 'test-usid',
                    },
                })
            );
        });
    });

    describe('trackCheckoutStart', () => {
        it('should track checkout start with basket data', () => {
            vi.mocked(useAnalyticsContext).mockReturnValue(mockAnalytics);
            vi.mocked(useAuth).mockReturnValue(mockAuth);

            const { result } = renderHook(() => useAnalytics());

            result.current.trackCheckoutStart({ basket: mockBasket });

            expect(mockAnalytics.track).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'checkout_start',
                    basket: mockBasket,
                    payload: {
                        userType: 'registered',
                        usid: 'test-usid',
                    },
                })
            );
        });
    });

    describe('trackSearch', () => {
        it('should track search with query and results', () => {
            vi.mocked(useAnalyticsContext).mockReturnValue(mockAnalytics);
            vi.mocked(useAuth).mockReturnValue(mockAuth);

            const { result } = renderHook(() => useAnalytics());

            result.current.trackViewSearch({
                searchInputText: 'test search',
                searchResults: [mockSearchResult],
            });

            expect(mockAnalytics.track).toHaveBeenCalledWith(
                expect.objectContaining({
                    eventType: 'view_search',
                    searchInputText: 'test search',
                    searchResults: [mockSearchResult],
                    payload: {
                        userType: 'registered',
                        usid: 'test-usid',
                    },
                })
            );
        });
    });

    describe('user context handling', () => {
        it('should use guest as fallback when userType is undefined', () => {
            const mockAuthWithUndefinedUserType = {
                ...mockAuth,
                userType: undefined,
            };

            vi.mocked(useAnalyticsContext).mockReturnValue(mockAnalytics);
            vi.mocked(useAuth).mockReturnValue(mockAuthWithUndefinedUserType);

            const { result } = renderHook(() => useAnalytics());

            result.current.trackViewPage({ url: '/test-page' });

            expect(mockAnalytics.track).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: {
                        userType: 'guest',
                        usid: 'test-usid',
                    },
                })
            );
        });

        it('should handle undefined usid gracefully', () => {
            const mockAuthWithUndefinedUsid = {
                ...mockAuth,
                usid: undefined,
            };

            vi.mocked(useAnalyticsContext).mockReturnValue(mockAnalytics);
            vi.mocked(useAuth).mockReturnValue(mockAuthWithUndefinedUsid);

            const { result } = renderHook(() => useAnalytics());

            result.current.trackViewPage({ url: '/test-page' });

            expect(mockAnalytics.track).toHaveBeenCalledWith(
                expect.objectContaining({
                    payload: {
                        userType: 'registered',
                        usid: undefined,
                    },
                })
            );
        });
    });
});
