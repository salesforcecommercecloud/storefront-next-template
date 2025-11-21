import { useRef } from 'react';
import { useAnalytics as useAnalyticsContext } from '@/providers/analytics';
import { useAuth } from '@/providers/auth';
import type { ShopperBasketsV2, ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { createEvent } from '@salesforce/storefront-next-runtime/events';

/**
 * Enhanced analytics hook with helper functions
 */
export const useAnalytics = () => {
    const analytics = useAnalyticsContext();
    const auth = useAuth();

    // We want to track page view only once per component mount
    const hasTrackedPageViewRef = useRef(false);

    // On the server, analytics context is not available, so we return empty functions.
    if (!analytics) {
        // Warn on the client side if analytics context is not found since we expect it to be available on the client side.
        if (typeof window !== 'undefined') {
            // eslint-disable-next-line no-console
            console.warn(
                'Analytics context not found. Please ensure the AnalyticsProvider is mounted. No events will be tracked.'
            );
        }

        /* eslint-disable @typescript-eslint/no-empty-function */
        return {
            trackViewPage: () => {},
            trackViewProduct: () => {},
            trackCartItemAdd: () => {},
            trackCheckoutStart: () => {},
            trackCheckoutStep: () => {},
            trackViewSearch: () => {},
            trackViewCategory: () => {},
            trackClickProductInCategory: () => {},
            trackClickProductInSearch: () => {},
        };
        /* eslint-enable @typescript-eslint/no-empty-function */
    }

    /**
     * Tracks a page view event on component mount
     *
     * Calling this function after mount will not send an event.
     */
    const trackViewPage = (data: { url: string }) => {
        if (!hasTrackedPageViewRef.current) {
            const event = createEvent('view_page', {
                path: data.url,
                payload: {
                    userType: auth?.userType ?? 'guest',
                    usid: auth?.usid,
                },
            });
            hasTrackedPageViewRef.current = true;
            return void analytics.track(event);
        }
    };

    /**
     * Track a product view
     */
    const trackViewProduct = (data: { product: ShopperProducts.schemas['Product'] }) => {
        const event = createEvent('view_product', {
            product: data.product,
            payload: {
                userType: auth?.userType ?? 'guest',
                usid: auth?.usid,
            },
        });
        return void analytics.track(event);
    };

    /**
     * Track add to cart
     */
    const trackCartItemAdd = (data: { cartItems: ShopperBasketsV2.schemas['ProductItem'][] }) => {
        const event = createEvent('cart_item_add', {
            cartItems: data.cartItems,
            payload: {
                userType: auth?.userType ?? 'guest',
                usid: auth?.usid,
            },
        });
        return void analytics.track(event);
    };

    /**
     * Track start of checkout process
     */
    const trackCheckoutStart = (data: { basket: ShopperBasketsV2.schemas['Basket'] }) => {
        const event = createEvent('checkout_start', {
            basket: data.basket,
            payload: {
                userType: auth?.userType ?? 'guest',
                usid: auth?.usid,
            },
        });
        return void analytics.track(event);
    };

    /**
     * Track start of given checkout step
     */
    const trackCheckoutStep = (data: {
        stepName: string;
        stepNumber: number;
        basket: ShopperBasketsV2.schemas['Basket'];
    }) => {
        const event = createEvent('checkout_step', {
            stepName: data.stepName,
            stepNumber: data.stepNumber,
            basket: data.basket,
            payload: {
                userType: auth?.userType ?? 'guest',
                usid: auth?.usid,
            },
        });
        return void analytics.track(event);
    };

    /**
     * Track search
     */
    const trackViewSearch = (data: {
        searchInputText: string;
        searchResults: ShopperSearch.schemas['ProductSearchHit'][];
    }) => {
        const event = createEvent('view_search', {
            searchInputText: data.searchInputText,
            searchResults: data.searchResults,
            payload: {
                userType: auth?.userType ?? 'guest',
                usid: auth?.usid,
            },
        });
        return void analytics.track(event);
    };

    /**
     * Track category view
     */
    const trackViewCategory = (data: {
        category: ShopperProducts.schemas['Category'];
        searchResults: ShopperSearch.schemas['ProductSearchHit'][];
    }) => {
        const event = createEvent('view_category', {
            category: data.category,
            searchResults: data.searchResults,
            payload: {
                userType: auth?.userType ?? 'guest',
                usid: auth?.usid,
            },
        });
        return void analytics.track(event);
    };

    /**
     * Track click on a product in a category
     */
    const trackClickProductInCategory = (data: {
        category: ShopperProducts.schemas['Category'];
        product: ShopperSearch.schemas['ProductSearchHit'];
    }) => {
        const event = createEvent('click_product_in_category', {
            category: data.category,
            product: data.product,
            payload: {
                userType: auth?.userType ?? 'guest',
                usid: auth?.usid,
            },
        });
        return void analytics.track(event);
    };

    /**
     * Track click on a product in a search
     */
    const trackClickProductInSearch = (data: {
        searchInputText: string;
        product: ShopperSearch.schemas['ProductSearchHit'];
    }) => {
        const event = createEvent('click_product_in_search', {
            searchInputText: data.searchInputText,
            product: data.product,
            payload: {
                userType: auth?.userType ?? 'guest',
                usid: auth?.usid,
            },
        });
        return void analytics.track(event);
    };

    return {
        trackViewPage,
        trackViewProduct,
        trackCartItemAdd,
        trackCheckoutStart,
        trackCheckoutStep,
        trackViewSearch,
        trackViewCategory,
        trackClickProductInCategory,
        trackClickProductInSearch,
    };
};
