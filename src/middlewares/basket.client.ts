import {
    createContext,
    type DataStrategyResult,
    type MiddlewareFunction,
    type RouterContextProvider,
} from 'react-router';
import { ApiError, type ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import {
    clearStorage,
    type StorageErrorData,
    type StorageMetaData,
    unpackStorage,
    updateStorage,
    updateStorageObject,
} from '@/lib/middleware';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';

type BasketStorageData = ShopperBasketsV2.schemas['Basket'] & StorageMetaData & StorageErrorData;

/**
 * As we're on the client, we can define and use a singleton basket store instance here.
 */
const basketCache: { ref: ShopperBasketsV2.schemas['Basket'] | undefined } = { ref: undefined };
const basketStorageKey = '__sfdc_basket';
const basketStorageContext = createContext<Map<keyof BasketStorageData, BasketStorageData[keyof BasketStorageData]>>();

const retrieveBasket = (
    context: Readonly<RouterContextProvider>,
    storage: Map<keyof BasketStorageData, BasketStorageData[keyof BasketStorageData]>
): Promise<ShopperBasketsV2.schemas['Basket']> => {
    const config = getConfig(context);
    const clients = createApiClients(context);
    const basketId = storage.get('basketId');

    const createBasket = async (): Promise<ShopperBasketsV2.schemas['Basket']> => {
        try {
            const { data } = await clients.shopperBasketsV2.createBasket({
                params: {
                    path: {
                        organizationId: config.commerce.api.organizationId,
                    },
                    query: {
                        siteId: config.commerce.api.siteId,
                    },
                },
                body: {
                    currency: import.meta.env.PUBLIC_SITE_CURRENCY || 'USD',
                },
            });
            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                if (
                    error.body?.type ===
                    'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/customer-baskets-quota-exceeded'
                ) {
                    // Extract basket ID from the error body
                    const basketIds = error.body?.basketIds;
                    const id = (Array.isArray(basketIds) ? basketIds : [String(basketIds)]).at(0) as string;
                    const { data } = await clients.shopperBasketsV2.getBasket({
                        params: {
                            path: { organizationId: config.commerce.api.organizationId, basketId: id },
                            query: {
                                siteId: config.commerce.api.siteId,
                            },
                        },
                    });
                    return data;
                }
            }
            throw error;
        }
    };

    if (typeof basketId === 'string' && basketId.length) {
        return clients.shopperBasketsV2
            .getBasket({
                params: {
                    path: { organizationId: config.commerce.api.organizationId, basketId },
                    query: {
                        siteId: config.commerce.api.siteId,
                    },
                },
            })
            .then(({ data }) => data)
            .catch(async (error) => {
                if (error instanceof ApiError) {
                    if (
                        error.body?.type ===
                        'https://api.commercecloud.salesforce.com/documentation/error/v1/errors/basket-not-found'
                    ) {
                        return createBasket();
                    }

                    // Handle 400 Bad Request errors (invalid basket ID format) by creating a new basket
                    if (error.status === 400) {
                        // Invalid basket ID format, creating new basket
                        return createBasket();
                    }
                }

                throw error;
            });
    }

    return createBasket();
};

const retrieveBasketStorageData = (
    context: Readonly<RouterContextProvider>,
    storage: Map<keyof BasketStorageData, BasketStorageData[keyof BasketStorageData]>
): Promise<void> => {
    return retrieveBasket(context, storage).then(
        (basket: ShopperBasketsV2.schemas['Basket']) => {
            // Store current/updated basket
            basketCache.ref = basket;
            updateStorageObject(storage, basket);
        },
        (error) => {
            // Mark storage as destroyed
            storage.set('isDestroyed', true);
            throw error;
        }
    );
};

/**
 * Middleware to retrieve basket data for the current user and provide it as part of the router `context`.
 *
 * The router context is available in other middlewares, loader and action functions. Use it as root middleware,
 * to ensure the Commerce API context portion becomes available throughout the whole application.
 *
 * This middleware is tailored for client-side use. It uses a `localStorage`-based approach to store the current
 * basket ID only. The rest of the basket data is only available via the `context. Additionally this middleware uses
 * a global cache to store a reference the full basket data. That way we're able to achieve the following behavior:
 * 1. On page load, we retrieve the current basket ID from `localStorage`, if available.
 * 2. If the current basket ID is available, we retrieve the full basket data from and update the cache.
 * 3. If the current basket ID is not available, we create a new basket and update the cache.
 * 4. On subsequent navigations, we use the basket data from the cache without having to retrieve it again.
 *
 * TODO: This middleware should also handle aspects like basket TTL.
 */
const basketMiddleware: MiddlewareFunction<Record<string, DataStrategyResult>> = async ({ context }, next) => {
    // Before calling the handler: Load current basket data from `basketCache` or `localStorage`, if applicable
    const basketData = (basketCache.ref ??
        JSON.parse(globalThis.localStorage?.getItem?.(basketStorageKey) ?? '{}')) satisfies BasketStorageData;
    const basketStorage = new Map<keyof BasketStorageData, BasketStorageData[keyof BasketStorageData]>(
        Object.entries(basketData) as [keyof BasketStorageData, BasketStorageData[keyof BasketStorageData]][]
    );

    // Before calling the handler: Retrieve a basket (or reuse the existing one)
    if (!basketCache.ref?.basketId) {
        await retrieveBasketStorageData(context, basketStorage).catch(() => {
            // Intentionally empty
        });
    }

    // Write basket data to request `context` to make it available to other client middlewares, client loaders,
    // or client actions
    context.set(basketStorageContext, basketStorage);

    // Execute handler (loader/action/render)
    await next();

    // After calling the handler: Write back storage data, if required
    if (basketStorage.has('isDestroyed') || basketStorage.has('error')) {
        // Remove the stored data from the client/browser storage
        globalThis.localStorage?.removeItem?.(basketStorageKey);
        basketCache.ref = undefined;

        // Clean up the storage container. That way the information is immediately updated for eventually
        // running middlewares after this one as well.
        clearStorage(basketStorage, false);
    } else if (basketStorage.has('isUpdated')) {
        basketStorage.delete('isUpdated');

        // Update the stored data in the client/browser storage
        basketCache.ref = Object.fromEntries(basketStorage);
        globalThis.localStorage?.setItem?.(
            basketStorageKey,
            JSON.stringify({
                basketId: basketStorage.get('basketId'),
            })
        );
    }
};

export const getBasket = (
    context: Readonly<RouterContextProvider>
): ShopperBasketsV2.schemas['Basket'] & StorageErrorData => {
    const storage = context.get(basketStorageContext);
    if (!storage) {
        throw new Error('getBasket must be used within the basket middleware');
    }
    return basketCache.ref ?? unpackStorage(storage);
};

export const updateBasket = (
    context: Readonly<RouterContextProvider>,
    updater:
        | undefined
        | (ShopperBasketsV2.schemas['Basket'] & StorageErrorData)
        | ((
              data: (ShopperBasketsV2.schemas['Basket'] & StorageErrorData) | undefined
          ) => (ShopperBasketsV2.schemas['Basket'] & StorageErrorData) | undefined)
): void => {
    const storage = context.get(basketStorageContext);
    if (!storage) {
        throw new Error('updateBasket must be used within the basket middleware');
    }
    updateStorage(storage, typeof updater === 'function' ? updater : () => updater);
    basketCache.ref = storage.has('error')
        ? undefined
        : (unpackStorage(storage) satisfies ShopperBasketsV2.schemas['Basket']);
};

/**
 * Destroy the current basket from cache and localStorage
 * This marks the basket as destroyed, which triggers automatic cleanup in the middleware
 *
 * @param context - Router context for basket storage access
 */
export const destroyBasket = (context: Readonly<RouterContextProvider>): void => {
    const storage = context.get(basketStorageContext);
    if (!storage) {
        throw new Error('destroyBasket must be used within the basket middleware');
    }

    // Mark the basket as destroyed - this will trigger cleanup in the middleware
    storage.set('isDestroyed', true);

    // Clear the cache immediately for instant effect
    basketCache.ref = undefined;

    // Note: localStorage cleanup happens automatically in the middleware after this action completes
};

export default basketMiddleware;
