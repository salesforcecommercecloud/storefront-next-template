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
import type {
    AnalyticsEvent,
    AnalyticsUser,
    ConsentPreferences,
    EventSiteInfo,
} from '@salesforce/storefront-next-runtime/events';
import { hasConsent, type EngagementAdapter, type EngagementAdapterConfig } from '@/lib/adapters';
import type { ShopperProducts, ShopperBasketsV2, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import type { Recommendation, RecommendersAdapter, Product } from '@/hooks/recommenders/use-recommenders';

export const EINSTEIN_ADAPTER_NAME = 'einstein' as const;

/**
 * Einstein Recommender Name Constants
 *
 * These constants represent the recommender names configured in Business Manager
 * and can be used when calling the recommendations API.
 *
 * @example
 * ```tsx
 * import { EINSTEIN_RECOMMENDERS } from '@/adapters/einstein';
 *
 * <ProductRecommendations
 *   recommenderName={EINSTEIN_RECOMMENDERS.PDP_MIGHT_ALSO_LIKE}
 *   title="You May Also Like"
 * />
 * ```
 */
export const EINSTEIN_RECOMMENDERS = {
    /** Similar items modal shown when adding product to cart */
    ADD_TO_CART_MODAL: 'pdp-similar-items',
    /** Recently viewed products shown on cart page */
    CART_RECENTLY_VIEWED: 'viewed-recently-einstein',
    /** You may also like products shown on cart page */
    CART_MAY_ALSO_LIKE: 'product-to-product-einstein',
    /** Complete the set recommendations on PDP */
    PDP_COMPLETE_SET: 'complete-the-set',
    /** Similar items recommendations on PDP */
    PDP_MIGHT_ALSO_LIKE: 'pdp-similar-items',
    /** Recently viewed products shown on PDP */
    PDP_RECENTLY_VIEWED: 'viewed-recently-einstein',
    /** Top selling products for empty search results */
    EMPTY_SEARCH_RESULTS_TOP_SELLERS: 'home-top-revenue-for-category',
    /** Most viewed products for empty search results */
    EMPTY_SEARCH_RESULTS_MOST_VIEWED: 'products-in-all-categories',
} as const;

/**
 * Type representing all valid Einstein recommender names
 */
export type EinsteinRecommenderName = (typeof EINSTEIN_RECOMMENDERS)[keyof typeof EINSTEIN_RECOMMENDERS];

const einteinEventToEndpointMap: Record<AnalyticsEvent['eventType'], string> = {
    view_page: 'viewPage',
    /** Einstein has no dedicated commerce-agent activity; use viewPage so the event reaches the same pipeline. */
    commerce_agent_engagement: 'viewPage',
    view_product: 'viewProduct',
    view_search: 'viewSearch',
    view_category: 'viewCategory',
    view_recommender: 'viewReco',
    click_product_in_category: 'clickCategory',
    click_product_in_search: 'clickSearch',
    click_product_in_recommender: 'clickReco',
    cart_item_add: 'addToCart',
    checkout_start: 'beginCheckout',
    checkout_step: 'checkoutStep',
    view_search_suggestion: 'viewSearchSuggestion',
    click_search_suggestion: 'clickSearchSuggestion',
};

export type EinsteinActivity = {
    userId?: string;
    cookieId: string;
    instanceType: 'prd' | 'sbx';
    clientIp?: string;
    clientUserAgent?: string;
    realm?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
};

type EinsteinItem = {
    id: string;
    quantity: number;
    price: number;
    sku?: string;
    type?: string;
};

/**
 * Product format for Einstein API requests
 */
export type EinsteinProduct = {
    id: string;
    sku?: string;
    altId?: string;
    type?: string;
    price?: number;
};

export type EinsteinConfig = EngagementAdapterConfig & {
    siteId: string;
    host: string;
    einsteinId: string;
    isProduction: boolean;
    realm: string;
};

/**
 * Map analytics event types to Einstein activity endpoints
 *
 * See https://developer.salesforce.com/docs/commerce/einstein-api/references/einstein-activities?meta=Summary
 * for the list of available endpoints
 *
 * @param eventType - The type of event to map
 * @returns The Einstein activity endpoint for the event type
 */
function mapEventTypeToEinsteinEndpoint(eventType: AnalyticsEvent['eventType']): string | undefined {
    return einteinEventToEndpointMap[eventType] || undefined;
}

/**
 * Helper to extract base product mapping (id and sku) based on product type
 *
 * @param product - Product data to map
 * @param price - Optional price to include in mapping (undefined = not included, 0 = included as 0)
 */
function getProductMapping(product: Partial<ShopperProducts.schemas['Product']>, price?: number): EinsteinProduct {
    const productId = product.id || '';
    const masterId = product.master?.masterId ?? productId;

    let mapping: EinsteinProduct;

    if (product.type?.variant) {
        mapping = { id: masterId, sku: productId };
    } else if (product.type?.variationGroup) {
        mapping = { id: masterId, sku: productId, altId: productId, type: 'vgroup' };
    } else {
        // Handles all other product types or scenarios where type is not defined
        mapping = { id: productId };
    }

    // Only include price if explicitly provided (even if 0)
    if (price !== undefined) {
        mapping.price = price;
    }

    return mapping;
}

/**
 * Helper to map ProductSearchHit to Einstein product format
 * Used for consistent mapping of search results in analytics events
 */
function mapProductSearchHitToEinstein(p: ShopperSearch.schemas['ProductSearchHit']): EinsteinProduct {
    return {
        id: p.productId,
        sku: p.productId,
    };
}

/**
 * Given a cart item, returns the data that Einstein requires
 *
 * Assumes item is a ProductItem from SCAPI Shopper-Baskets:
 * https://developer.salesforce.com/docs/commerce/commerce-api/references/shopper-baskets?meta=type%3AProductItem
 */
function extractEinsteinItemInfoFromCartItem(item: ShopperBasketsV2.schemas['ProductItem']): EinsteinItem {
    const { product, productId, price, quantity } = item;

    // Type assertion: product can contain product data even though schema types it as {}
    const productData = product as Partial<ShopperProducts.schemas['Product']> | undefined;

    // If product data exists and has meaningful data (id or type), use it; otherwise use productId from item
    const hasProductData = productData && (productData.id || productData.type);
    const mapping = getProductMapping(hasProductData ? productData : { id: productId ?? '' });

    return {
        ...mapping,
        quantity: quantity ?? 0,
        price: price ?? 0,
    };
}

/**
 * Type guard to check if payload is AnalyticsUser
 */
function isAnalyticsUser(payload: unknown): payload is AnalyticsUser {
    return typeof payload === 'object' && payload !== null && 'userType' in payload;
}

/**
 * Convert an analytics event to an Einstein activity
 */
function convertEventToEinsteinActivity(event: AnalyticsEvent, realm: string, isProduction: boolean): EinsteinActivity {
    // For now, payload will always be AnalyticsUser, but we check for type safety
    const user = isAnalyticsUser(event.payload) ? event.payload : null;
    const baseActivity: EinsteinActivity = {
        userId: user?.userType === 'registered' ? user?.encUserId : undefined,
        cookieId: user?.usid ?? '', // Ensure string type for cookieId
        instanceType: isProduction ? 'prd' : 'sbx',
        realm,
    };

    switch (event.eventType) {
        case 'view_product':
            return {
                ...baseActivity,
                product: getProductMapping(event.product, event.product.price),
            };

        case 'cart_item_add':
            return {
                ...baseActivity,
                products: event.cartItems.map((item: ShopperBasketsV2.schemas['ProductItem']) =>
                    extractEinsteinItemInfoFromCartItem(item)
                ),
            };

        case 'view_search':
            return {
                ...baseActivity,
                searchText: event.searchInputText,
                showProducts: Boolean(event.searchResults.length),
                products: event.searchResults.map(mapProductSearchHitToEinstein),
            };

        case 'view_category':
            return {
                ...baseActivity,
                category: {
                    id: event.category.id,
                },
                showProducts: Boolean(event.searchResults.length),
                products: event.searchResults.map(mapProductSearchHitToEinstein),
            };

        case 'view_recommender':
            return {
                ...baseActivity,
                recoId: event.recommenderId,
                recoType: event.recommenderName,
                // For view_recommender, we only need product IDs (not full product objects)
                products: event.products.map((p: ShopperSearch.schemas['ProductSearchHit']) => p.productId),
            };

        case 'click_product_in_category':
            return {
                ...baseActivity,
                category: {
                    id: event.category.id,
                },
                product: mapProductSearchHitToEinstein(event.product),
            };
        case 'click_product_in_search':
            return {
                ...baseActivity,
                searchText: event.searchInputText,
                product: mapProductSearchHitToEinstein(event.product),
            };
        case 'click_product_in_recommender':
            return {
                ...baseActivity,
                recoId: event.recommenderId,
                recoType: event.recommenderName,
                product: mapProductSearchHitToEinstein(event.product),
            };

        case 'checkout_start':
            return {
                ...baseActivity,
                products: event.basket.productItems?.map((item: ShopperBasketsV2.schemas['ProductItem']) =>
                    extractEinsteinItemInfoFromCartItem(item)
                ),
                amount: event.basket.productSubTotal ?? 0,
                checkoutType: 'one-click',
            };

        case 'checkout_step':
            return {
                ...baseActivity,
                stepName: event.stepName,
                stepNumber: event.stepNumber,
                basketId: event.basket.basketId,
                checkoutType: 'one-click',
            };

        case 'view_page':
            return {
                ...baseActivity,
                currentLocation: event.path,
            };

        case 'commerce_agent_engagement':
            return {
                ...baseActivity,
                currentLocation:
                    event.surface === 'header' ? '/__sfnext/commerce-agent/header' : '/__sfnext/commerce-agent/search',
            };

        case 'view_search_suggestion':
            return {
                ...baseActivity,
                searchText: event.searchInputText,
                suggestions: event.suggestions,
            };

        case 'click_search_suggestion':
            return {
                ...baseActivity,
                searchText: event.searchInputText,
                suggestion: event.suggestion,
            };

        default:
            // If this error is reached, the type of `event` is incorrect or a new event type needs to be handled.
            throw new Error('Unsupported event type in Einstein adapter', {
                cause: (event as Record<string, unknown>)?.eventType,
            });
    }
}

function validateEinsteinConfig(config: EinsteinConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.host || config.host.trim() === '') {
        errors.push(`Missing required field: host`);
    }
    if (!config.einsteinId || config.einsteinId.trim() === '') {
        errors.push(`Missing required field: einsteinId`);
    }
    if (!config.siteId || config.siteId.trim() === '') {
        errors.push(`Missing required field: siteId`);
    }
    if (!config.realm || config.realm.trim() === '') {
        errors.push(`Missing required field: realm`);
    }
    if (!config.eventToggles) {
        errors.push(`Missing required field: eventToggles`);
    }
    return { valid: errors.length === 0, errors };
}

/**
 * Get site identifier in realm-siteId format for Einstein API endpoints
 */
function getSiteIdentifier(config: EinsteinConfig): string {
    return config.realm ? `${config.realm}-${config.siteId}` : config.siteId;
}

/**
 * Utility to transform a product to Einstein product format
 *
 * This is the unified function for all product mapping to Einstein format.
 * Use this instead of inline mapping to ensure consistency.
 */
function transformProductToEinsteinProduct(
    product: Product | ShopperSearch.schemas['ProductSearchHit']
): EinsteinProduct {
    // Check if it's a ShopperSearch ProductSearchHit
    if ('hitType' in product || 'productId' in product) {
        // ProductSearchHit format - use productId for both id and sku
        return {
            id: product.productId as string,
            sku: product.productId as string,
        };
    }

    // Otherwise it's a ShopperProducts Product
    const fullProduct = product;
    return getProductMapping(fullProduct, fullProduct.price);
}

/**
 * Make an Einstein API request
 */
async function einsteinFetch(
    config: EinsteinConfig,
    endpoint: string,
    method: 'GET' | 'POST',
    body?: Record<string, unknown>
): Promise<Recommendation> {
    const headers = {
        'Content-Type': 'application/json',
        'x-cq-client-id': config.einsteinId,
    };

    const url = `${config.host}/v3${endpoint}`;

    try {
        const response = await fetch(url, {
            method,
            headers,
            ...(body && {
                body: JSON.stringify(body),
            }),
        });

        if (!response.ok) {
            return {};
        }

        const responseJson = await response.json();

        // Convert snake_case keys to camelCase
        const camelCased = keysToCamel(responseJson);
        return camelCased;
    } catch {
        return {};
    }
}

/**
 * Get a list of available recommenders
 */
async function getEinsteinRecommenders(config: EinsteinConfig): Promise<Recommendation> {
    const siteIdentifier = getSiteIdentifier(config);
    const endpoint = `/personalization/recommenders/${siteIdentifier}`;
    return einsteinFetch(config, endpoint, 'GET');
}

/**
 * Get recommendations by recommender name
 *
 */
async function getEinsteinRecommendations(
    config: EinsteinConfig,
    recommenderName: string,
    products?: Product[],
    args?: Record<string, unknown>
): Promise<Recommendation> {
    const siteIdentifier = getSiteIdentifier(config);
    const endpoint = `/personalization/recs/${siteIdentifier}/${recommenderName}`;
    const body: Record<string, unknown> = {
        ...args,
    };

    if (products && products.length > 0) {
        body.products = products.map(transformProductToEinsteinProduct);
    }

    return einsteinFetch(config, endpoint, 'POST', body);
}

/**
 * Get recommendations for a specific zone
 *
 */
async function getEinsteinZoneRecommendations(
    config: EinsteinConfig,
    zoneName: string,
    products?: Product[],
    args?: Record<string, unknown>
): Promise<Recommendation> {
    const siteIdentifier = getSiteIdentifier(config);
    const endpoint = `/personalization/${siteIdentifier}/zones/${zoneName}/recs`;
    const body: Record<string, unknown> = {
        ...args,
    };

    if (products && products.length > 0) {
        body.products = products.map(transformProductToEinsteinProduct);
    }

    return einsteinFetch(config, endpoint, 'POST', body);
}

/**
 * Helper function to convert snake_case keys to camelCase
 */
function keysToCamel(obj: unknown): Recommendation {
    if (Array.isArray(obj)) {
        return obj.map((item) => keysToCamel(item)) as Recommendation;
    }

    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce(
            (result, key) => {
                const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                result[camelKey] = keysToCamel((obj as Record<string, unknown>)[key]);
                return result;
            },
            {} as Record<string, unknown>
        ) as Recommendation;
    }

    return obj as Recommendation;
}

/**
 * Extended Einstein adapter type that implements both EngagementAdapter and RecommendersAdapter
 */
export type EinsteinUnifiedAdapter = EngagementAdapter & RecommendersAdapter;

/**
 * Create an Einstein adapter that implements both EngagementAdapter and RecommendersAdapter interfaces
 */
export function createEinsteinAdapter(config: EinsteinConfig): EinsteinUnifiedAdapter {
    const validConfig = validateEinsteinConfig(config);
    if (!validConfig.valid) {
        const errorMessage = `Einstein adapter configuration is invalid: ${validConfig.errors.join('; ')}`;
        throw new Error(errorMessage, { cause: validConfig.errors });
    }

    return {
        name: EINSTEIN_ADAPTER_NAME,

        // EngagementAdapter methods
        sendEvent: async (
            event: AnalyticsEvent,
            _siteInfo?: EventSiteInfo,
            consentPreferences?: ConsentPreferences
        ): Promise<unknown> => {
            // Don't send events if adapter lacks required consent
            if (!hasConsent(config.consentCategory, consentPreferences)) {
                return Promise.resolve({});
            }

            // Don't send events that are not enabled for this adapter
            if (!config.eventToggles[event.eventType]) {
                return Promise.resolve({});
            }

            const endpoint = mapEventTypeToEinsteinEndpoint(event.eventType);
            if (!endpoint) throw new Error('Unsupported event type in Einstein adapter', { cause: event.eventType });

            const activity = convertEventToEinsteinActivity(event, config.realm, config.isProduction);

            const targetEndpointUrl = `${config.host}/v3/activities/${config.realm}-${config.siteId}/${endpoint}?clientId=${config.einsteinId}`;
            const payload = new Blob([JSON.stringify(activity)], { type: 'application/json' });

            const success = navigator.sendBeacon(targetEndpointUrl, payload);

            return Promise.resolve({ success });
        },

        // RecommendersAdapter methods
        getRecommenders: () => getEinsteinRecommenders(config),
        getRecommendations: (recommenderName, products, args) =>
            getEinsteinRecommendations(config, recommenderName, products, args),
        getZoneRecommendations: (zoneName, products, args) =>
            getEinsteinZoneRecommendations(config, zoneName, products, args),
    };
}
