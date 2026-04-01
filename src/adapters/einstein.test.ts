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

/**
 * Einstein Adapter Tests
 *
 * Tests the Einstein analytics adapter functionality including event transformation,
 * product extraction, and activity creation for various event types.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEinsteinAdapter, type EinsteinConfig } from './einstein';
import type { ShopperBasketsV2, ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import type { AnalyticsEvent } from '@salesforce/storefront-next-runtime/events';
import type { EngagementAdapter } from '@/lib/adapters';

// Helper type that guarantees sendEvent is implemented (Einstein adapter implements it)
type EinsteinAdapter = EngagementAdapter & {
    sendEvent: (event: AnalyticsEvent) => Promise<unknown>;
};

// Mock navigator.sendBeacon
const mockSendBeacon = vi.fn();
Object.defineProperty(navigator, 'sendBeacon', {
    value: mockSendBeacon,
    writable: true,
});

// Helper function to get the payload from the sendBeacon call
const getBeaconPayload = async (): Promise<any> => {
    const call = mockSendBeacon.mock.calls[0];
    const blob = call[1] as Blob;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const content = JSON.parse(reader.result as string);
                resolve(content);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsText(blob);
    });
};

// Mock configuration
const mockConfig: EinsteinConfig = {
    enabled: true,
    realm: 'realm',
    siteId: 'siteId',
    host: 'https://api.cquotient.com',
    einsteinId: 'test-einstein-id',
    isProduction: false,
    eventToggles: {
        view_page: true,
        view_product: true,
        view_search: true,
        view_category: true,
        view_recommender: true,
        click_product_in_category: true,
        click_product_in_search: true,
        click_product_in_recommender: true,
        cart_item_add: true,
        checkout_start: true,
        checkout_step: true,
        view_search_suggestion: true,
        click_search_suggestion: true,
    },
};

// Mock user data
const mockUser = {
    userType: 'registered' as const,
    usid: 'test-usid',
    encUserId: 'test-enc-user-id',
};

// Mock product data
const mockProduct: ShopperProducts.schemas['Product'] = {
    id: 'test-product-id',
    name: 'Test Product',
    type: {
        master: true,
    },
} as ShopperProducts.schemas['Product'];

const mockVariantProduct: ShopperProducts.schemas['Product'] = {
    id: 'test-variant-id',
    name: 'Test Variant',
    type: {
        variant: true,
    },
    master: {
        masterId: 'test-master-id',
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

// Mock analytics events
const mockPageViewEvent: AnalyticsEvent = {
    eventType: 'view_page',
    payload: mockUser,
    path: '/test-page',
} as AnalyticsEvent;

const mockProductViewEvent: AnalyticsEvent = {
    eventType: 'view_product',
    payload: mockUser,
    product: mockProduct,
} as AnalyticsEvent;

const mockSearchEvent: AnalyticsEvent = {
    eventType: 'view_search',
    payload: mockUser,
    searchInputText: 'test search',
    searchResults: [mockSearchResult],
} as AnalyticsEvent;

const mockCartItemAddEvent: AnalyticsEvent = {
    eventType: 'cart_item_add',
    payload: mockUser,
    cartItems: [mockCartItem],
} as AnalyticsEvent;

const mockCheckoutStartEvent: AnalyticsEvent = {
    eventType: 'checkout_start',
    payload: mockUser,
    basket: mockBasket,
} as AnalyticsEvent;

describe('Einstein Adapter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('sendEvent', () => {
        it('should send page view event with correct payload', async () => {
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(mockPageViewEvent);

            expect(mockSendBeacon).toHaveBeenCalledWith(
                'https://api.cquotient.com/v3/activities/realm-siteId/viewPage?clientId=test-einstein-id',
                expect.any(Blob)
            );

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                realm: 'realm',
                currentLocation: '/test-page',
            });
        });

        it('should send product view event with correct payload', async () => {
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(mockProductViewEvent);

            expect(mockSendBeacon).toHaveBeenCalledWith(
                'https://api.cquotient.com/v3/activities/realm-siteId/viewProduct?clientId=test-einstein-id',
                expect.any(Blob)
            );

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                realm: 'realm',
                product: {
                    id: 'test-product-id',
                },
            });
        });

        it('should send search event with correct payload', async () => {
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(mockSearchEvent);

            expect(mockSendBeacon).toHaveBeenCalledWith(
                'https://api.cquotient.com/v3/activities/realm-siteId/viewSearch?clientId=test-einstein-id',
                expect.any(Blob)
            );

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                realm: 'realm',
                searchText: 'test search',
                showProducts: true,
                products: [
                    {
                        id: 'test-product-id',
                        sku: 'test-product-id',
                    },
                ],
            });
        });

        it('should send cart item add event with correct payload', async () => {
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(mockCartItemAddEvent);

            expect(mockSendBeacon).toHaveBeenCalledWith(
                'https://api.cquotient.com/v3/activities/realm-siteId/addToCart?clientId=test-einstein-id',
                expect.any(Blob)
            );

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                realm: 'realm',
                products: [
                    {
                        id: 'test-product-id',
                        quantity: 2,
                        price: 29.99,
                    },
                ],
            });
        });

        it('should send checkout start event with correct payload', async () => {
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(mockCheckoutStartEvent);

            expect(mockSendBeacon).toHaveBeenCalledWith(
                'https://api.cquotient.com/v3/activities/realm-siteId/beginCheckout?clientId=test-einstein-id',
                expect.any(Blob)
            );

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                realm: 'realm',
                products: [
                    {
                        id: 'test-product-id',
                        quantity: 2,
                        price: 29.99,
                    },
                ],
                amount: 59.98,
                checkoutType: 'one-click',
            });
        });

        it('should handle guest user correctly', async () => {
            const guestUser = { ...mockUser, userType: 'guest' as const };
            const guestEvent = { ...mockPageViewEvent, payload: guestUser };
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(guestEvent);

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: undefined,
                cookieId: 'test-usid',
                instanceType: 'sbx',
                realm: 'realm',
                currentLocation: '/test-page',
            });
        });

        it('should use production instance type when configured', async () => {
            const prodConfig = { ...mockConfig, isProduction: true };
            const adapter = createEinsteinAdapter(prodConfig) as EinsteinAdapter;
            await adapter.sendEvent(mockPageViewEvent);

            const payload = await getBeaconPayload();

            expect(payload.instanceType).toBe('prd');
        });

        it('should handle undefined usid gracefully', async () => {
            const userWithoutUsid = { ...mockUser, usid: undefined };
            const eventWithoutUsid = { ...mockPageViewEvent, payload: userWithoutUsid };
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(eventWithoutUsid);

            const payload = await getBeaconPayload();

            expect(payload.cookieId).toBe('');
        });

        it('should throw error for unsupported event types', async () => {
            const unsupportedEvent = { ...mockPageViewEvent, eventType: 'unsupported' };
            // Enable the unsupported event type so it bypasses the early return and reaches the error check
            const configWithUnsupported = {
                ...mockConfig,
                eventToggles: {
                    ...mockConfig.eventToggles,
                    unsupported: true,
                },
            };
            const adapter = createEinsteinAdapter(configWithUnsupported) as EinsteinAdapter;

            await expect(adapter.sendEvent(unsupportedEvent)).rejects.toThrow(
                'Unsupported event type in Einstein adapter'
            );
            expect(mockSendBeacon).not.toHaveBeenCalled();
        });
    });

    describe('additional event types', () => {
        it('should send category view event with correct payload', async () => {
            const categoryViewEvent: AnalyticsEvent = {
                eventType: 'view_category',
                payload: mockUser,
                category: {
                    id: 'test-category-id',
                },
                searchResults: [mockSearchResult],
            } as AnalyticsEvent;
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(categoryViewEvent);

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                realm: 'realm',
                category: {
                    id: 'test-category-id',
                },
                showProducts: true,
                products: [
                    {
                        id: 'test-product-id',
                        sku: 'test-product-id',
                    },
                ],
            });
        });

        it('should send recommender view event with correct payload', async () => {
            const recommenderViewEvent: AnalyticsEvent = {
                eventType: 'view_recommender',
                payload: mockUser,
                recommenderId: 'test-recommender-id',
                recommenderName: 'Test Recommender',
                products: [mockSearchResult],
            } as AnalyticsEvent;
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(recommenderViewEvent);

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                realm: 'realm',
                recoId: 'test-recommender-id',
                recoType: 'Test Recommender',
                products: ['test-product-id'],
            });
        });

        it('should send click product in category event with correct payload', async () => {
            const clickProductInCategoryEvent: AnalyticsEvent = {
                eventType: 'click_product_in_category',
                payload: mockUser,
                category: {
                    id: 'test-category-id',
                },
                product: mockSearchResult,
            } as AnalyticsEvent;
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(clickProductInCategoryEvent);

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                realm: 'realm',
                category: {
                    id: 'test-category-id',
                },
                product: {
                    id: 'test-product-id',
                    sku: 'test-product-id',
                },
            });
        });

        it('should send click product in search event with correct payload', async () => {
            const clickProductInSearchEvent: AnalyticsEvent = {
                eventType: 'click_product_in_search',
                payload: mockUser,
                searchInputText: 'test search',
                product: mockSearchResult,
            } as AnalyticsEvent;
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(clickProductInSearchEvent);

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                realm: 'realm',
                searchText: 'test search',
                product: {
                    id: 'test-product-id',
                    sku: 'test-product-id',
                },
            });
        });

        it('should send click product in recommender event with correct payload', async () => {
            const clickProductInRecommenderEvent: AnalyticsEvent = {
                eventType: 'click_product_in_recommender',
                payload: mockUser,
                recommenderId: 'test-recommender-id',
                recommenderName: 'Test Recommender',
                product: mockSearchResult,
            } as AnalyticsEvent;
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(clickProductInRecommenderEvent);

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                realm: 'realm',
                recoId: 'test-recommender-id',
                recoType: 'Test Recommender',
                product: {
                    id: 'test-product-id',
                    sku: 'test-product-id',
                },
            });
        });

        it('should send checkout step event with correct payload', async () => {
            const checkoutStepEvent: AnalyticsEvent = {
                eventType: 'checkout_step',
                payload: mockUser,
                stepName: 'shipping',
                stepNumber: 1,
                basket: mockBasket,
            } as AnalyticsEvent;
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(checkoutStepEvent);

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                realm: 'realm',
                stepName: 'shipping',
                stepNumber: 1,
                basketId: 'test-basket-id',
                checkoutType: 'one-click',
            });
        });
    });

    describe('edge cases and error handling', () => {
        it('should handle missing product data gracefully', async () => {
            const eventWithoutProduct = { ...mockProductViewEvent, product: undefined };
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;

            // This should throw because the adapter expects product data for product_view events
            await expect(adapter.sendEvent(eventWithoutProduct)).rejects.toThrow();
        });

        it('should handle missing cart items gracefully', async () => {
            const eventWithoutCartItems = { ...mockCartItemAddEvent, cartItems: undefined };
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;

            // This should throw because the adapter expects cartItems for cart_item_add events
            await expect(adapter.sendEvent(eventWithoutCartItems)).rejects.toThrow();
        });

        it('should handle missing basket data gracefully', async () => {
            const eventWithoutBasket = { ...mockCheckoutStartEvent, basket: undefined };
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;

            // This should throw because the adapter expects basket for checkout_start events
            await expect(adapter.sendEvent(eventWithoutBasket)).rejects.toThrow();
        });

        it('should handle products with missing master data', async () => {
            const productWithoutMaster = {
                ...mockVariantProduct,
                master: undefined,
            };
            const productViewEventWithoutMaster: AnalyticsEvent = {
                eventType: 'view_product',
                payload: mockUser,
                product: productWithoutMaster,
            } as AnalyticsEvent;
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(productViewEventWithoutMaster);

            const payload = await getBeaconPayload();

            expect(payload.product).toEqual({
                id: 'test-variant-id', // Should fallback to product.id
                sku: 'test-variant-id',
            });
        });

        it('should handle cart items with missing quantity and price', async () => {
            const cartItemWithMissingData = {
                ...mockCartItem,
                quantity: undefined,
                price: undefined,
            };
            const cartEventWithMissingData = {
                ...mockCartItemAddEvent,
                cartItems: [cartItemWithMissingData],
            };
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(cartEventWithMissingData);

            const payload = await getBeaconPayload();

            expect(payload.products[0]).toEqual({
                id: 'test-product-id',
                quantity: 0,
                price: 0,
            });
        });

        it('should handle basket with missing subtotal', async () => {
            const basketWithoutSubtotal = {
                ...mockBasket,
                productSubTotal: undefined,
            };
            const checkoutEventWithoutSubtotal = {
                ...mockCheckoutStartEvent,
                basket: basketWithoutSubtotal,
            };
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(checkoutEventWithoutSubtotal);

            const payload = await getBeaconPayload();

            expect(payload.amount).toBe(0);
        });
    });

    describe('Configuration Validation', () => {
        it('should throw error when host is empty string', () => {
            const invalidConfig = {
                ...mockConfig,
                host: '',
            };

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow(
                /Einstein adapter configuration is invalid:.*Missing required field: host/
            );
        });

        it('should throw error when host is whitespace-only string', () => {
            const invalidConfig = {
                ...mockConfig,
                host: '   ',
            };

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow(
                /Einstein adapter configuration is invalid:.*Missing required field: host/
            );
        });

        it('should throw error when einsteinId is empty string', () => {
            const invalidConfig = {
                ...mockConfig,
                einsteinId: '',
            };

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow(
                /Einstein adapter configuration is invalid:.*Missing required field: einsteinId/
            );
        });

        it('should throw error when einsteinId is whitespace-only string', () => {
            const invalidConfig = {
                ...mockConfig,
                einsteinId: '\t\n  ',
            };

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow(
                /Einstein adapter configuration is invalid:.*Missing required field: einsteinId/
            );
        });

        it('should throw error when siteId is empty string', () => {
            const invalidConfig = {
                ...mockConfig,
                siteId: '',
            };

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow(
                /Einstein adapter configuration is invalid:.*Missing required field: siteId/
            );
        });

        it('should throw error when siteId is whitespace-only string', () => {
            const invalidConfig = {
                ...mockConfig,
                siteId: '  \r\n  ',
            };

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow(
                /Einstein adapter configuration is invalid:.*Missing required field: siteId/
            );
        });

        it('should accept valid config with trimmed strings', () => {
            const validConfig = {
                ...mockConfig,
                host: '  https://api.cquotient.com  ',
                einsteinId: '  test-einstein-id  ',
                siteId: '  siteId  ',
                realm: '  realm  ',
            };

            // Should not throw
            expect(() => createEinsteinAdapter(validConfig)).not.toThrow();
        });

        it('should throw error when multiple fields are empty', () => {
            const invalidConfig = {
                ...mockConfig,
                host: '',
                einsteinId: '   ',
                siteId: '',
            };

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow(
                /Einstein adapter configuration is invalid:.*Missing required field: host.*Missing required field: einsteinId.*Missing required field: siteId/
            );
        });
    });

    describe('API Error Handling', () => {
        beforeEach(() => {
            vi.clearAllMocks();
            global.fetch = vi.fn();
        });

        it('should return empty object on fetch network error', async () => {
            (global.fetch as any).mockRejectedValue(new Error('Network error'));

            const adapter = createEinsteinAdapter(mockConfig) as any;
            const result = await adapter.getRecommendations('test-recommender');

            expect(result).toEqual({});
        });

        it('should return empty object on non-OK response', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            });

            const adapter = createEinsteinAdapter(mockConfig) as any;
            const result = await adapter.getRecommendations('test-recommender');

            expect(result).toEqual({});
        });

        it('should return empty object on JSON parse error', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.reject(new Error('Invalid JSON')),
            });

            const adapter = createEinsteinAdapter(mockConfig) as any;
            const result = await adapter.getRecommendations('test-recommender');

            expect(result).toEqual({});
        });

        it('should handle zone recommendations errors silently', async () => {
            (global.fetch as any).mockRejectedValue(new Error('Network error'));

            const adapter = createEinsteinAdapter(mockConfig) as any;
            const result = await adapter.getZoneRecommendations('test-zone');

            expect(result).toEqual({});
        });

        it('should handle getRecommenders errors silently', async () => {
            (global.fetch as any).mockRejectedValue(new Error('Network error'));

            const adapter = createEinsteinAdapter(mockConfig) as any;
            const result = await adapter.getRecommenders();

            expect(result).toEqual({});
        });

        it('should not throw when recommendations fail', async () => {
            (global.fetch as any).mockRejectedValue(new Error('Server error'));

            const adapter = createEinsteinAdapter(mockConfig) as any;

            // Should not throw - all should resolve to empty object
            await expect(adapter.getRecommendations('test')).resolves.toEqual({});
            await expect(adapter.getZoneRecommendations('test')).resolves.toEqual({});
            await expect(adapter.getRecommenders()).resolves.toEqual({});
        });

        it('should handle 500 server errors gracefully', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            });

            const adapter = createEinsteinAdapter(mockConfig) as any;
            const result = await adapter.getRecommendations('test-recommender');

            expect(result).toEqual({});
        });

        it('should handle timeout errors gracefully', async () => {
            (global.fetch as any).mockRejectedValue(new Error('Request timeout'));

            const adapter = createEinsteinAdapter(mockConfig) as any;
            const result = await adapter.getRecommendations('test-recommender');

            expect(result).toEqual({});
        });
    });

    describe('keysToCamel conversion', () => {
        it('should convert snake_case response to camelCase', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        reco_uuid: 'test-123',
                        recommender_name: 'test-recommender',
                        display_message: 'Test Message',
                        recs: [
                            {
                                id: 'prod-1',
                                image_url: 'https://example.com/image.jpg',
                                product_name: 'Test Product',
                                product_url: 'https://example.com/product',
                            },
                        ],
                    }),
            });

            const adapter = createEinsteinAdapter(mockConfig) as any;
            const result = await adapter.getRecommendations('test-recommender');

            // Check that snake_case keys are converted to camelCase
            expect(result.recoUuid).toBe('test-123');
            expect(result.recommenderName).toBe('test-recommender');
            expect(result.displayMessage).toBe('Test Message');
            expect(result.recs[0].imageUrl).toBe('https://example.com/image.jpg');
            expect(result.recs[0].productName).toBe('Test Product');
            expect(result.recs[0].productUrl).toBe('https://example.com/product');
        });

        it('should handle nested objects and arrays', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        outer_key: {
                            inner_key: 'value',
                            nested_array: [{ array_item_key: 'item' }],
                        },
                    }),
            });

            const adapter = createEinsteinAdapter(mockConfig) as any;
            const result = await adapter.getRecommendations('test-recommender');

            expect(result.outerKey.innerKey).toBe('value');
            expect(result.outerKey.nestedArray[0].arrayItemKey).toBe('item');
        });

        it('should preserve non-object values', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () =>
                    Promise.resolve({
                        string_value: 'text',
                        number_value: 42,
                        boolean_value: true,
                        null_value: null,
                    }),
            });

            const adapter = createEinsteinAdapter(mockConfig) as any;
            const result = await adapter.getRecommendations('test-recommender');

            expect(result.stringValue).toBe('text');
            expect(result.numberValue).toBe(42);
            expect(result.booleanValue).toBe(true);
            expect(result.nullValue).toBeNull();
        });
    });

    describe('recently viewed recommender', () => {
        it('should use special endpoint for viewed-recently-einstein', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ recs: [] }),
            });

            const adapter = createEinsteinAdapter(mockConfig) as any;
            await adapter.getRecommendations('viewed-recently-einstein', undefined, { userId: '123' });

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/personalization/recs/realm-siteId/viewed-recently-einstein'),
                expect.objectContaining({
                    method: 'POST',
                })
            );

            const callArgs = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            // Recently viewed should NOT include products array
            expect(body.products).toBeUndefined();
            expect(body.userId).toBe('123');
        });

        it('should include products for standard recommenders', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ recs: [] }),
            });

            const products = [{ id: 'prod-1', price: 99.99 }];
            const adapter = createEinsteinAdapter(mockConfig) as any;
            await adapter.getRecommendations('pdp-similar-items', products);

            const callArgs = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            // Standard recommenders SHOULD include products array
            expect(body.products).toBeDefined();
            expect(body.products).toHaveLength(1);
        });
    });

    describe('configuration validation', () => {
        it.each([
            ['host', ''],
            ['einsteinId', ''],
            ['siteId', ''],
            ['eventToggles', undefined],
        ])('should throw error when %s is missing or invalid', (field, value) => {
            const invalidConfig = { ...mockConfig, [field]: value };
            expect(() => createEinsteinAdapter(invalidConfig)).toThrow('Einstein adapter configuration is invalid');
        });

        it('should accept valid configuration', () => {
            expect(() => createEinsteinAdapter(mockConfig)).not.toThrow();
        });
    });

    describe('product transformation', () => {
        it('should transform ProductSearchHit products', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ recs: [] }),
            });

            const searchHit = {
                productId: 'search-hit-1',
                hitType: 'product',
                price: 49.99,
            };

            const adapter = createEinsteinAdapter(mockConfig) as any;
            await adapter.getRecommendations('test-recommender', [searchHit]);

            const callArgs = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body.products[0].id).toBe('search-hit-1');
            expect(body.products[0].sku).toBe('search-hit-1');
        });

        it('should transform variant products with master info', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ recs: [] }),
            });

            const variantProduct = {
                id: 'variant-123',
                price: 99.99,
                type: { variant: true },
                master: { masterId: 'master-123' },
            };

            const adapter = createEinsteinAdapter(mockConfig) as any;
            await adapter.getRecommendations('test-recommender', [variantProduct]);

            const callArgs = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            // For variants, id should be masterId and sku should be variant id
            expect(body.products[0].id).toBe('master-123');
            expect(body.products[0].sku).toBe('variant-123');
            expect(body.products[0].price).toBe(99.99);
        });

        it('should transform variation group products', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ recs: [] }),
            });

            const vgroupProduct = {
                id: 'vgroup-456',
                price: 79.99,
                type: { variationGroup: true },
                master: { masterId: 'master-456' },
            };

            const adapter = createEinsteinAdapter(mockConfig) as any;
            await adapter.getRecommendations('test-recommender', [vgroupProduct]);

            const callArgs = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            // For variation groups, should include altId and type
            expect(body.products[0].id).toBe('master-456');
            expect(body.products[0].sku).toBe('vgroup-456');
            expect(body.products[0].altId).toBe('vgroup-456');
            expect(body.products[0].type).toBe('vgroup');
        });

        it('should transform standard products', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ recs: [] }),
            });

            const standardProduct = {
                id: 'standard-789',
                price: 59.99,
            };

            const adapter = createEinsteinAdapter(mockConfig) as any;
            await adapter.getRecommendations('test-recommender', [standardProduct]);

            const callArgs = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            // For standard products, just use the id
            expect(body.products[0].id).toBe('standard-789');
            expect(body.products[0].price).toBe(59.99);
        });

        it('should handle products without price', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ recs: [] }),
            });

            const productWithoutPrice = {
                id: 'no-price',
            };

            const adapter = createEinsteinAdapter(mockConfig) as any;
            await adapter.getRecommendations('test-recommender', [productWithoutPrice]);

            const callArgs = (global.fetch as any).mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body.products[0].id).toBe('no-price');
            expect(body.products[0].price).toBeUndefined();
        });
    });

    describe('DNT (Do Not Track) handling', () => {
        it('should still fetch recommendations when DNT is enabled (DNT only applies to analytics)', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ recs: [] }),
            });

            const dntConfig = { ...mockConfig, dnt: true };
            const adapter = createEinsteinAdapter(dntConfig) as any;

            const result = await adapter.getRecommendations('test-recommender');

            // Recommendations should still work with DNT enabled
            expect(global.fetch).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });
});
