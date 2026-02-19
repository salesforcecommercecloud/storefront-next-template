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
import { useRef, useEffect } from 'react';
import { useAuth } from '@/providers/auth';
import type { SessionData } from '@/lib/api/types';
import type { ShopperBasketsV2, ShopperProducts, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import {
    createEvent,
    getEventMediator,
    type EventMediator,
    type AnalyticsEvent,
} from '@salesforce/storefront-next-runtime/events';
import { useConfig, type AppConfig } from '@/config';
import { ensureAdaptersInitialized } from '@/lib/adapters/initialize-adapters';
import { getAllAdapters } from '@/lib/adapters';
import { useTrackingConsent } from './use-tracking-consent';
import { TrackingConsent } from '@/types/tracking-consent';

/**
 * Ensures adapters are initialized and returns the event mediator
 *
 * @param appConfig - The application configuration needed to initialize adapters
 * @returns EventMediator instance or undefined if not available
 */
async function getInitializedMediator(appConfig: AppConfig): Promise<EventMediator | undefined> {
    await ensureAdaptersInitialized(appConfig);
    return getEventMediator(getAllAdapters);
}

/**
 * Helper function to track an event with auth validation and mediator initialization
 *
 * @param authPromise - Promise that resolves when auth is available
 * @param appConfig - The application configuration
 * @param trackingConsent - The user's tracking consent status
 * @param eventType - The type of event to track
 * @param eventData - The event data (without user payload, as payload is added automatically)
 * @returns Promise that resolves when tracking is complete or undefined if auth/mediator is unavailable or consent is declined
 */
async function trackEvent<TEventType extends AnalyticsEvent['eventType']>(
    authPromise: Promise<SessionData | undefined>,
    appConfig: AppConfig,
    trackingConsent: TrackingConsent | undefined,
    eventType: TEventType,
    eventData: Omit<Parameters<typeof createEvent<TEventType>>[1], 'payload'>
): Promise<void> {
    // Don't track if user has declined tracking or hasn't provided consent
    if (trackingConsent !== TrackingConsent.Accepted) {
        return;
    }

    // Wait for auth to be defined before tracking
    const auth = await authPromise;
    if (auth === undefined) {
        // Auth not available - silently fail to not break the app
        return;
    }

    const mediator = await getInitializedMediator(appConfig);
    if (!mediator) {
        return;
    }

    const event = createEvent(eventType, {
        ...eventData,
        payload: {
            userType: auth.userType ?? 'guest',
            encUserId: auth.encUserId ?? undefined,
            usid: auth.usid,
        },
    } as Parameters<typeof createEvent<TEventType>>[1]);
    return void mediator.track(event);
}

/**
 * Analytics hook provides tracking functions
 */
export const useAnalytics = () => {
    const auth = useAuth();
    const appConfig = useConfig();
    const { trackingConsent } = useTrackingConsent();

    // Store the promise resolver so we can resolve it when auth becomes available
    const authResolverRef = useRef<((value: SessionData | undefined) => void) | null>(null);

    // Create a promise that resolves when auth is available
    // This promise is updated via useEffect when auth changes
    const authPromiseRef = useRef<Promise<SessionData | undefined>>(
        auth !== undefined
            ? Promise.resolve(auth)
            : new Promise<SessionData | undefined>((resolve) => {
                  authResolverRef.current = resolve;
              })
    );

    // Update the promise when auth changes
    useEffect(() => {
        if (auth !== undefined) {
            // Auth is now available - resolve any pending promises
            if (authResolverRef.current) {
                authResolverRef.current(auth);
                authResolverRef.current = null;
            }
            // Create a new resolved promise for future calls
            authPromiseRef.current = Promise.resolve(auth);
        } else {
            // Auth is undefined - create a new pending promise
            authPromiseRef.current = new Promise<SessionData | undefined>((resolve) => {
                authResolverRef.current = resolve;
            });
        }
    }, [auth]);

    // On the server, return empty functions
    if (typeof window === 'undefined') {
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
            trackViewSearchSuggestions: () => {},
            trackClickSearchSuggestion: () => {},
        };
        /* eslint-enable @typescript-eslint/no-empty-function */
    }

    /**
     * Tracks a page view event
     *
     * Page view events are sent automatically by the PageViewTracker component but this
     * function is provided for manual firing of page views.
     */
    const trackViewPage = async (data: { url: string }) => {
        return trackEvent(authPromiseRef.current, appConfig, trackingConsent, 'view_page', {
            path: data.url,
        });
    };

    /**
     * Track a product view
     */
    const trackViewProduct = async (data: { product: ShopperProducts.schemas['Product'] }) => {
        return trackEvent(authPromiseRef.current, appConfig, trackingConsent, 'view_product', {
            product: data.product,
        });
    };

    /**
     * Track add to cart
     */
    const trackCartItemAdd = async (data: { cartItems: ShopperBasketsV2.schemas['ProductItem'][] }) => {
        return trackEvent(authPromiseRef.current, appConfig, trackingConsent, 'cart_item_add', {
            cartItems: data.cartItems,
        });
    };

    /**
     * Track start of checkout process
     */
    const trackCheckoutStart = async (data: { basket: ShopperBasketsV2.schemas['Basket'] }) => {
        return trackEvent(authPromiseRef.current, appConfig, trackingConsent, 'checkout_start', {
            basket: data.basket,
        });
    };

    /**
     * Track start of given checkout step
     */
    const trackCheckoutStep = async (data: {
        stepName: string;
        stepNumber: number;
        basket: ShopperBasketsV2.schemas['Basket'];
    }) => {
        return trackEvent(authPromiseRef.current, appConfig, trackingConsent, 'checkout_step', {
            stepName: data.stepName,
            stepNumber: data.stepNumber,
            basket: data.basket,
        });
    };

    /**
     * Track search
     */
    const trackViewSearch = async (data: {
        searchInputText: string;
        searchResults: ShopperSearch.schemas['ProductSearchHit'][];
        sort: string;
        refinements: ShopperSearch.schemas['ProductSearchResult']['selectedRefinements'];
    }) => {
        return trackEvent(authPromiseRef.current, appConfig, trackingConsent, 'view_search', {
            searchInputText: data.searchInputText,
            searchResults: data.searchResults,
            sort: data.sort || '',
            refinements: data.refinements || {},
        });
    };

    /**
     * Track category view
     */
    const trackViewCategory = async (data: {
        category: ShopperProducts.schemas['Category'];
        searchResults: ShopperSearch.schemas['ProductSearchHit'][];
        sort: string;
        refinements: ShopperSearch.schemas['ProductSearchResult']['selectedRefinements'];
    }) => {
        return trackEvent(authPromiseRef.current, appConfig, trackingConsent, 'view_category', {
            category: data.category,
            searchResults: data.searchResults,
            sort: data.sort || '',
            refinements: data.refinements || {},
        });
    };

    /**
     * Track click on a product in a category
     */
    const trackClickProductInCategory = async (data: {
        category: ShopperProducts.schemas['Category'];
        product: ShopperSearch.schemas['ProductSearchHit'];
    }) => {
        return trackEvent(authPromiseRef.current, appConfig, trackingConsent, 'click_product_in_category', {
            category: data.category,
            product: data.product,
        });
    };

    /**
     * Track click on a product in a search
     */
    const trackClickProductInSearch = async (data: {
        searchInputText: string;
        product: ShopperSearch.schemas['ProductSearchHit'];
    }) => {
        return trackEvent(authPromiseRef.current, appConfig, trackingConsent, 'click_product_in_search', {
            searchInputText: data.searchInputText,
            product: data.product,
        });
    };

    /**
     * Track view of search suggestions
     */
    const trackViewSearchSuggestions = async (data: { searchInputText: string; suggestions: Array<string> }) => {
        return trackEvent(authPromiseRef.current, appConfig, trackingConsent, 'view_search_suggestion', {
            searchInputText: data.searchInputText,
            suggestions: data.suggestions,
        });
    };

    /**
     * Track click on a search suggestion
     */
    const trackClickSearchSuggestion = async (data: { searchInputText: string; suggestion: string }) => {
        return trackEvent(authPromiseRef.current, appConfig, trackingConsent, 'click_search_suggestion', {
            searchInputText: data.searchInputText,
            suggestion: data.suggestion,
        });
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
        trackViewSearchSuggestions,
        trackClickSearchSuggestion,
    };
};
