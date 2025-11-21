import type { AnalyticsEvent, AnalyticsUser } from '@salesforce/storefront-next-runtime/events';
import type { EngagementAdapter, EngagementAdapterConfig } from '@/lib/adapters';
import type { ShopperProducts, ShopperBasketsV2, ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';

const einteinEventToEndpointMap: Record<AnalyticsEvent['eventType'], string> = {
    view_page: 'viewPage',
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

type EinsteinProduct = {
    id: string;
    sku?: string;
    altId?: string;
    altIdType?: string;
};

type EinsteinItem = {
    id: string;
    quantity: number;
    price: number;
    sku?: string;
    type?: string;
};

export type EinsteinConfig = EngagementAdapterConfig & {
    host: string;
    einsteinId: string;
    isProduction: boolean;
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
 * Given a product or item source, returns the product data that Einstein requires
 */
function extractEinsteinProductInfoFromProduct(product: ShopperProducts.schemas['Product']): EinsteinProduct {
    // Handle variants for PDP / viewProduct
    if (product.type) {
        if (product.type.variant) {
            return {
                id: product.master?.masterId ?? product.id,
                sku: product.id,
            };
        }

        // In case of variation group, send the "altId" and "type" attributes
        if (product.type.variationGroup) {
            return {
                id: product.master?.masterId ?? product.id,
                sku: product.id,
                altId: product.id,
                altIdType: 'vgroup',
            };
        }
    }
    // Handle non-variant products, like master, set, bundle, item.
    // This code follows the implementation in the plugin_einstein_api.
    // https://github.com/SalesforceCommerceCloud/plugin_einstein_api/blob/c8168d5b8e2e34bfb9413da73969d59b0f3adabd/plugin_einstein_api/cartridge/scripts/helpers/RecommendationsHelper.js#L315
    return {
        id: product.id,
    };
}

/**
 * Extract Einstein product info from a product search hit
 */
function extractEinsteinProductInfoFromProductSearchHit(
    product: ShopperSearch.schemas['ProductSearchHit']
): EinsteinProduct {
    return {
        id: product.productId,
        sku: product.productId, //TODO: Should we switch this to product.representedProduct.id once we allow non-master products in search results?
    };
}

/**
 * Given a cart item, returns the data that Einstein requires
 *
 * Assumes item is a ProductItemfrom SCAPI Shopper-Baskets:
 * https://developer.salesforce.com/docs/commerce/commerce-api/references/shopper-baskets?meta=type%3AProductItem
 *
 * This code follows the implementation in the plugin_einstein_api.
 * https://github.com/SalesforceCommerceCloud/plugin_einstein_api/blob/c8168d5b8e2e34bfb9413da73969d59b0f3adabd/plugin_einstein_api/cartridge/scripts/helpers/RecommendationsHelper.js#L315
 */
function extractEinsteinItemInfoFromCartItem(item: ShopperBasketsV2.schemas['ProductItem']): EinsteinItem {
    const { product, productId, price, quantity } = item;

    // Type assertion: product can contain product data even though schema types it as {}
    const productData = product as Partial<ShopperProducts.schemas['Product']> | undefined;

    // In case of variant, send the "sku" attribute
    if (productData?.type?.variant) {
        return {
            id: productData.master?.masterId ?? productId ?? '',
            quantity: quantity ?? 0,
            price: price ?? 0,
            sku: productData.id ?? productId ?? '',
        };
    }

    // In case of variation group, send the "altId" and "type" attributes
    if (productData?.type?.variationGroup) {
        return {
            id: productData.master?.masterId ?? productId ?? '',
            quantity: quantity ?? 0,
            price: price ?? 0,
            sku: productData.id ?? productId ?? '',
            type: 'vgroup',
        };
    }

    // Otherwise send default attributes.
    return {
        id: productId ?? '',
        price: price ?? 0,
        quantity: quantity ?? 0,
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
function convertEventToEinsteinActivity(event: AnalyticsEvent, isProduction: 'prd' | 'sbx'): EinsteinActivity {
    // For now, payload will always be AnalyticsUser, but we check for type safety
    const user = isAnalyticsUser(event.payload) ? event.payload : null;
    const baseActivity: EinsteinActivity = {
        userId: user?.userType === 'registered' ? user?.encUserId : undefined,
        cookieId: user?.usid ?? '', // Ensure string type for cookieId
        instanceType: isProduction, // instanceType should be prd for the event to appear in Reports & Dashboards
    };

    switch (event.eventType) {
        case 'view_product':
            return {
                ...baseActivity,
                product: extractEinsteinProductInfoFromProduct(event.product),
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
                products: event.searchResults.map((p: ShopperSearch.schemas['ProductSearchHit']) => {
                    return extractEinsteinProductInfoFromProductSearchHit(p);
                }),
            };

        case 'view_category':
            return {
                ...baseActivity,
                category: {
                    id: event.category.id,
                },
                showProducts: Boolean(event.searchResults.length),
                products: event.searchResults.map((p: ShopperSearch.schemas['ProductSearchHit']) => {
                    return extractEinsteinProductInfoFromProductSearchHit(p);
                }),
            };

        case 'view_recommender':
            return {
                ...baseActivity,
                recoId: event.recommenderId,
                recoType: event.recommenderName,
                products: event.products.map((p: ShopperSearch.schemas['ProductSearchHit']) => p.productId),
            };

        case 'click_product_in_category':
            return {
                ...baseActivity,
                category: {
                    id: event.category.id,
                },
                product: extractEinsteinProductInfoFromProductSearchHit(event.product),
            };
        case 'click_product_in_search':
            return {
                ...baseActivity,
                searchText: event.searchInputText,
                product: extractEinsteinProductInfoFromProductSearchHit(event.product),
            };
        case 'click_product_in_recommender':
            return {
                ...baseActivity,
                recoId: event.recommenderId,
                recoType: event.recommenderName,
                product: extractEinsteinProductInfoFromProductSearchHit(event.product),
            };

        case 'checkout_start':
            return {
                ...baseActivity,
                products: event.basket.productItems?.map((item: ShopperBasketsV2.schemas['ProductItem']) =>
                    extractEinsteinItemInfoFromCartItem(item)
                ),
                amount: event.basket.productSubTotal ?? 0,
            };

        case 'checkout_step':
            return {
                ...baseActivity,
                stepName: event.stepName,
                stepNumber: event.stepNumber,
                basketId: event.basket.basketId,
            };

        case 'view_page':
            return {
                ...baseActivity,
                path: event.path,
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
        errors.push(`Einstein adapter is missing required field: host`);
    }
    if (!config.einsteinId || config.einsteinId.trim() === '') {
        errors.push(`Einstein adapter is missing required field: einsteinId`);
    }
    if (!config.siteId || config.siteId.trim() === '') {
        errors.push(`Einstein adapter is missing required field: siteId`);
    }
    if (!config.eventToggles) {
        errors.push(`Einstein adapter is missing required field: eventToggles`);
    }
    return { valid: errors.length === 0, errors };
}

/**
 * Create an Einstein adapter function that implements the EngagementAdapter interface
 */
export function createEinsteinAdapter(config: EinsteinConfig): EngagementAdapter {
    const validConfig = validateEinsteinConfig(config);
    if (!validConfig.valid) {
        throw new Error('Einstein adapter configuration is invalid:', { cause: validConfig.errors });
    }

    return {
        name: 'einstein',
        sendEvent: async (event: AnalyticsEvent): Promise<unknown> => {
            // Don't send events that are not enabled for this adapter
            if (!config.eventToggles[event.eventType]) return Promise.resolve({});

            const endpoint = mapEventTypeToEinsteinEndpoint(event.eventType);
            if (!endpoint) throw new Error('Unsupported event type in Einstein adapter', { cause: event.eventType });

            const activity = convertEventToEinsteinActivity(event, config.isProduction ? 'prd' : 'sbx');

            const targetEndpointUrl = `${config.host}/v3/activities/${config.siteId}/${endpoint}?clientId=${config.einsteinId}`;
            const payload = new Blob([JSON.stringify(activity)], { type: 'application/json' });

            navigator.sendBeacon(targetEndpointUrl, payload);
        },
    };
}
