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
import { createContext, createCookie, type MiddlewareFunction, type RouterContextProvider } from 'react-router';
import { type ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import { createApiClients } from '@/lib/api-clients';
import { getCookieConfig } from '@/lib/cookie-utils';

// Types
type Basket = ShopperBasketsV2.schemas['Basket'];

export type BasketMiddlewareMode = 'lazy' | 'eager';

export type BasketMiddlewareConfig = {
    mode?: BasketMiddlewareMode;
    cookieName?: string;
    cookieDurationRegistered?: number;
    cookieDurationGuest?: number;
    currency?: string;
    calculateBasketSnapshot?: BasketSnapshotCalculator;
};

export type BasketSnapshotCalculator = (basket: Basket) => Partial<BasketSnapshot> | null | undefined;

/**
 * Options for creating basket snapshots.
 */
export type BasketSnapshotOptions = {
    /**
     * Optional calculator for custom snapshot fields.
     */
    calculateSnapshot?: BasketSnapshotCalculator;
};

// Cookie-safe snapshot of a basket used before full hydration.
export type BasketSnapshot = {
    basketId: string;
    itemsCount: number;
    [key: string]: unknown;
};

// Request-scoped basket resource with optional hydration.
export type BasketResource = {
    /** Always available (from cookie or null) */
    snapshot: BasketSnapshot | null;

    /** Cached basket value when loaded */
    current: Basket | null;

    /** Whether full basket has been loaded */
    hydrated: boolean;

    /** Error encountered during hydration, if any */
    error?: Error | null;
};

/**
 * Supplemental basket metadata stored in a separate context to avoid
 * polluting the primary basket resource shape with internal-only fields.
 */
export type BasketMetadata = {
    calculateSnapshot?: BasketSnapshotCalculator;
    currency: string;
    basketMarkedForDeletion: boolean;
};

// Constants
// Shared basket identifiers across server and client
export const BASKET_COOKIE_NAME = '__sfdc_basket';
const GUEST_BASKET_COOKIE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const REGISTERED_BASKET_COOKIE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_BASKET_MIDDLEWARE_CONFIG: Required<
    Pick<
        BasketMiddlewareConfig,
        'mode' | 'cookieName' | 'cookieDurationRegistered' | 'cookieDurationGuest' | 'currency'
    >
> = {
    mode: 'lazy',
    cookieName: BASKET_COOKIE_NAME,
    cookieDurationRegistered: REGISTERED_BASKET_COOKIE_DURATION_MS,
    cookieDurationGuest: GUEST_BASKET_COOKIE_DURATION_MS,
    currency: import.meta.env.PUBLIC__app__site__currency ?? 'USD',
};

export const basketResourceContext = createContext<BasketResource | undefined>();
export const basketMetadataContext = createContext<BasketMetadata | undefined>();

// Thrown when basket context is accessed without the middleware initializing it.
export class BasketContextError extends Error {
    constructor() {
        super(
            'Basket context is not initialized for this request. ' +
                'Ensure the basket middleware runs before calling getBasket().'
        );
        this.name = 'BasketContextError';
    }
}

/**
 * Create the default snapshot for cookie storage.
 *
 * This is the baseline snapshot used by `createSnapshot` before merging any
 * custom fields. It ensures `basketId` and `itemsCount` are always present.
 *
 * @param basket - Basket to snapshot.
 * @returns Default basket snapshot for cookie persistence.
 *
 * @example
 * ```ts
 * const snapshot = defaultCreateSnapshot(basket);
 * ```
 */
export const defaultCreateSnapshot = (basket: Basket): BasketSnapshot => ({
    basketId: basket.basketId ?? '',
    itemsCount: (basket.productItems ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0),
});

/**
 * Create a cookie-safe basket snapshot with required defaults.
 *
 * Merges custom snapshot fields (if provided) with the default snapshot and
 * ensures `basketId` and `itemsCount` are always present from the default.
 *
 * @param basket - Basket to snapshot.
 * @param options - Optional snapshot customization options.
 * @returns Basket snapshot safe for cookie persistence.
 *
 * @example
 * ```ts
 * const snapshot = createSnapshot(basket);
 * // { basketId: 'b1', itemsCount: 2 }
 * ```
 *
 * @example
 * ```ts
 * const snapshot = createSnapshot(basket, {
 *   calculateSnapshot: (b) => ({
 *     hasPickupItems: Boolean(b.productItems?.some((item) => item.shipmentId)),
 *   }),
 * });
 * // { basketId: 'b1', itemsCount: 2, hasPickupItems: true }
 * ```
 */
const createSnapshot = (basket: Basket, options?: BasketSnapshotOptions): BasketSnapshot => {
    const defaultSnapshot = defaultCreateSnapshot(basket);
    const customSnapshot = options?.calculateSnapshot?.(basket);
    const customSnapshotObject = customSnapshot && typeof customSnapshot === 'object' ? customSnapshot : {};

    return {
        ...customSnapshotObject,
        ...defaultSnapshot,
    };
};

/**
 * Create a basket resource for request context storage.
 *
 * @param snapshot - Basket snapshot derived from cookie or basket data
 * @param value - Hydrated basket, when available
 * @param hydrated - Whether the basket has been loaded
 * @param error - Error from hydration attempts, when applicable
 * @returns Basket resource wrapper
 *
 * @example
 * ```ts
 * const resource = createBasketResource(snapshot, basket, true);
 * context.set(basketResourceContext, resource);
 * ```
 */
const createBasketResource = (
    snapshot: BasketSnapshot | null,
    value?: Basket,
    hydrated = false,
    error: Error | null = null
): BasketResource => {
    return {
        snapshot,
        current: value ?? null,
        hydrated,
        error,
    };
};

/**
 * Compute the basket cookie expiry date.
 *
 * Uses a configured duration when provided; otherwise uses `lastModified` with a "now" fallback.
 *
 * @param basket - Basket used to derive the expiry base time
 * @returns Expiry date for cookie serialization
 *
 * @example
 * ```ts
 * const expires = getBasketExpiryDate(basket, { userType: 'guest' });
 * ```
 */
const getBasketExpiryDate = (
    basket: ShopperBasketsV2.schemas['Basket'],
    options: {
        userType?: 'guest' | 'registered';
        cookieDurationRegistered?: number;
        cookieDurationGuest?: number;
    }
): Date => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const duration = options.userType === 'registered' ? options.cookieDurationRegistered : options.cookieDurationGuest;

    const lastModified = basket.lastModified;
    const ts = Date.parse(lastModified || new Date().toISOString());
    const base = Number.isNaN(ts) ? Date.now() : ts;

    if (typeof duration === 'number' && duration >= 0 && Number.isFinite(duration)) {
        return new Date(base + duration);
    }

    return new Date(base + SEVEN_DAYS_MS);
};

/**
 * Creates a basket middleware factory with configurable behavior.
 *
 * Defaults are applied for mode, cookie name, and cookie durations.
 * - `mode: 'lazy' | 'eager'` controls whether the basket is hydrated before `next()`.
 * - `cookieDurationGuest` and `cookieDurationRegistered` are millisecond durations.
 * - Registered detection relies on `basket.customerInfo` when a basket is present.
 * - `currency` is used when creating a new basket.
 * - `calculateBasketSnapshot` can add custom snapshot fields.
 *
 * @param config - Optional middleware configuration overrides
 * @returns Middleware function that manages basket cookie and context state
 *
 * @example
 * ```ts
 * // In root.tsx or server entry:
 * import createBasketMiddleware from '@/middlewares/basket.server';
 *
 * export const middleware = [
 *   appConfigMiddlewareServer,
 *   i18nextMiddleware,
 *   currencyMiddleware,
 *   authMiddlewareServer,
 *   createBasketMiddleware({ mode: 'eager' }),
 * ];
 * ```
 */
export const createBasketMiddleware = (config: BasketMiddlewareConfig = {}): MiddlewareFunction<Response> => {
    const { mode, cookieName, cookieDurationRegistered, cookieDurationGuest, currency, calculateBasketSnapshot } = {
        ...DEFAULT_BASKET_MIDDLEWARE_CONFIG,
        ...config,
    };

    return async ({ request, context }, next) => {
        let basket: Basket | undefined = undefined;
        let snapshot: BasketSnapshot | null = null;

        // Cookie defaults. NOTE: We bypass the encoding/decoding of the cookie value so that we can read these
        // values on the browser without need for specialized decoders.
        const cookieConfig = getCookieConfig(
            { httpOnly: false, encode: (value: string) => value, decode: (value: string) => value },
            context
        );

        // Create and parse cookie.
        const basketCookie = createCookie(cookieName, cookieConfig);
        const cookieHeader = request.headers.get('Cookie') || '';

        // Get the snapshot from the cookie.
        snapshot = cookieHeader ? await basketCookie.parse(cookieHeader) : undefined;

        // Build and set the basket in the context.
        context.set(basketResourceContext, createBasketResource(snapshot, basket));
        context.set(basketMetadataContext, {
            calculateSnapshot: calculateBasketSnapshot,
            currency,
            basketMarkedForDeletion: false,
        });

        // If the mode is eager we'll load the basket into the context. WARNING: If mode is eager, as long as there is a
        // valid basket id, it will be fetched from the API. This will add a non-trivial amount to total request time.
        if (mode === 'eager') {
            await getBasket(context, { ensureBasket: true });
        }

        // Call the next middleware.
        const response = await next();

        // Update basket reference as it could have been created/modified in other middleware or actions/loaders.
        basket = (await getBasket(context, { ensureBasket: false })).current ?? undefined;

        // If we have a basket loaded, update the cookie.
        const metadata = context.get(basketMetadataContext);
        if (metadata?.basketMarkedForDeletion) {
            const expired = await basketCookie.serialize({ basketId: '', itemsCount: 0 }, { expires: new Date(0) });
            response.headers.append('Set-Cookie', expired);
            return response;
        }

        if (basket) {
            // Derive expiry from configured duration when available; fall back to lastModified when present.
            const isRegistered = Boolean(basket.customerInfo?.customerId || basket.customerInfo?.customerNo);
            const userType: 'guest' | 'registered' = isRegistered ? 'registered' : 'guest';
            const expires = getBasketExpiryDate(basket, {
                userType,
                cookieDurationGuest,
                cookieDurationRegistered,
            });
            const basketSnapshotCookieValue = createSnapshot(basket, { calculateSnapshot: calculateBasketSnapshot });

            response.headers.append('Set-Cookie', await basketCookie.serialize(basketSnapshotCookieValue, { expires }));
        }

        return response;
    };
};

/**
 * Get the basket resource for this request, fetching and caching it when needed.
 *
 * Differs from the old client helper: there is no localStorage fallback and no creation.
 *
 * @param context - React Router request context
 * @param options - Options to control basket hydration
 * @returns The basket resource for this request
 * @throws BasketContextError when middleware has not initialized context
 *
 * @example
 * ```ts
 * const basketResource = await getBasket(context, { ensureBasket: true });
 * const basket = basketResource.current;
 * ```
 */
export const getBasket = async (
    context: Readonly<RouterContextProvider>,
    options: { ensureBasket?: boolean } = { ensureBasket: true }
): Promise<BasketResource> => {
    const basketResource = context.get(basketResourceContext);
    const { ensureBasket = true } = options;

    if (!basketResource) {
        throw new BasketContextError();
    }

    // If the basket is already loaded, or hydration isn't requested, return the resource.
    if (basketResource.current || !ensureBasket) {
        return basketResource;
    }

    const basketId = basketResource.snapshot?.basketId;
    const metadata = context.get(basketMetadataContext);
    const currency = metadata?.currency ?? DEFAULT_BASKET_MIDDLEWARE_CONFIG.currency;
    const calculateBasketSnapshot = metadata?.calculateSnapshot;

    try {
        const clients = createApiClients(context);
        const basket = await clients.basket.getOrCreateBasket({
            params: { path: { basketId } },
            body: { currency },
        });
        const nextSnapshot = createSnapshot(basket, { calculateSnapshot: calculateBasketSnapshot });
        context.set(basketResourceContext, createBasketResource(nextSnapshot, basket, true, null));
        return context.get(basketResourceContext) as BasketResource;
    } catch (err) {
        const loadError = err instanceof Error ? err : new Error('Failed to load basket');
        context.set(basketResourceContext, createBasketResource(basketResource.snapshot, undefined, true, loadError));
        throw loadError;
    }
};

/**
 * Resolve the basket id from snapshot or by fetching the basket if needed.
 *
 * @param context - React Router request context
 * @returns Basket id or null when unavailable
 *
 * @example
 * ```ts
 * const basketId = await ensureBasketId(context);
 * ```
 */
export const ensureBasketId = async (context: Readonly<RouterContextProvider>): Promise<string | null> => {
    const basketResource = context.get(basketResourceContext);

    if (!basketResource) {
        throw new BasketContextError();
    }

    const snapshot = basketResource.snapshot;
    const hydratedResource = await getBasket(context);
    return hydratedResource.current?.basketId ?? snapshot?.basketId ?? null;
};

/**
 * Update the basket in the request-scoped context.
 *
 * @param context - React Router request context
 * @param updater - New basket or updater function
 * @returns void
 *
 * @example
 * ```ts
 * updateBasketResource(context, (current) => ({
 *   ...current,
 *   itemsCount: (current?.itemsCount ?? 0) + 1,
 * }));
 * ```
 */
export const updateBasketResource = (
    context: Readonly<RouterContextProvider>,
    updater: Basket | ((basket: Basket | undefined) => Basket)
): void => {
    const current = context.get(basketResourceContext);
    const currentValue = current?.current;
    const calculateBasketSnapshot = context.get(basketMetadataContext)?.calculateSnapshot;
    const nextValue =
        typeof updater === 'function' ? (updater as (b?: Basket) => Basket)(currentValue ?? undefined) : updater;
    const snapshot = createSnapshot(nextValue, { calculateSnapshot: calculateBasketSnapshot });

    context.set(basketResourceContext, createBasketResource(snapshot, nextValue, true, null));
};

/**
 * Clear the basket from the request-scoped context and mark the basket for deletion.
 * This will cause the cookie to be deleted as the middleware processes the response.
 *
 * @param context - React Router request context
 * @returns void
 *
 * @example
 * ```ts
 * destroyBasket(context);
 * ```
 */
export const destroyBasket = (context: Readonly<RouterContextProvider>): void => {
    context.set(basketResourceContext, createBasketResource(null, undefined, false, null));
    const metadata = context.get(basketMetadataContext);
    context.set(basketMetadataContext, {
        calculateSnapshot: metadata?.calculateSnapshot,
        currency: metadata?.currency ?? DEFAULT_BASKET_MIDDLEWARE_CONFIG.currency,
        basketMarkedForDeletion: true,
    });
};

export default createBasketMiddleware;
