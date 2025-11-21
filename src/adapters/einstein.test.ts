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
    siteId: 'test-site-id',
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
                'https://api.cquotient.com/v3/activities/test-site-id/viewPage?clientId=test-einstein-id',
                expect.any(Blob)
            );

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                path: '/test-page',
            });
        });

        it('should send product view event with correct payload', async () => {
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(mockProductViewEvent);

            expect(mockSendBeacon).toHaveBeenCalledWith(
                'https://api.cquotient.com/v3/activities/test-site-id/viewProduct?clientId=test-einstein-id',
                expect.any(Blob)
            );

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                product: {
                    id: 'test-product-id',
                },
            });
        });

        it('should send search event with correct payload', async () => {
            const adapter = createEinsteinAdapter(mockConfig) as EinsteinAdapter;
            await adapter.sendEvent(mockSearchEvent);

            expect(mockSendBeacon).toHaveBeenCalledWith(
                'https://api.cquotient.com/v3/activities/test-site-id/viewSearch?clientId=test-einstein-id',
                expect.any(Blob)
            );

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
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
                'https://api.cquotient.com/v3/activities/test-site-id/addToCart?clientId=test-einstein-id',
                expect.any(Blob)
            );

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
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
                'https://api.cquotient.com/v3/activities/test-site-id/beginCheckout?clientId=test-einstein-id',
                expect.any(Blob)
            );

            const payload = await getBeaconPayload();

            expect(payload).toEqual({
                userId: 'test-enc-user-id',
                cookieId: 'test-usid',
                instanceType: 'sbx',
                products: [
                    {
                        id: 'test-product-id',
                        quantity: 2,
                        price: 29.99,
                    },
                ],
                amount: 59.98,
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
                path: '/test-page',
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
            } as any;
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
                stepName: 'shipping',
                stepNumber: 1,
                basketId: 'test-basket-id',
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

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow('Einstein adapter configuration is invalid:');
        });

        it('should throw error when host is whitespace-only string', () => {
            const invalidConfig = {
                ...mockConfig,
                host: '   ',
            };

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow('Einstein adapter configuration is invalid:');
        });

        it('should throw error when einsteinId is empty string', () => {
            const invalidConfig = {
                ...mockConfig,
                einsteinId: '',
            };

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow('Einstein adapter configuration is invalid:');
        });

        it('should throw error when einsteinId is whitespace-only string', () => {
            const invalidConfig = {
                ...mockConfig,
                einsteinId: '\t\n  ',
            };

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow('Einstein adapter configuration is invalid:');
        });

        it('should throw error when siteId is empty string', () => {
            const invalidConfig = {
                ...mockConfig,
                siteId: '',
            };

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow('Einstein adapter configuration is invalid:');
        });

        it('should throw error when siteId is whitespace-only string', () => {
            const invalidConfig = {
                ...mockConfig,
                siteId: '  \r\n  ',
            };

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow('Einstein adapter configuration is invalid:');
        });

        it('should accept valid config with trimmed strings', () => {
            const validConfig = {
                ...mockConfig,
                host: '  https://api.cquotient.com  ',
                einsteinId: '  test-einstein-id  ',
                siteId: '  test-site-id  ',
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

            expect(() => createEinsteinAdapter(invalidConfig)).toThrow('Einstein adapter configuration is invalid:');
        });
    });
});
