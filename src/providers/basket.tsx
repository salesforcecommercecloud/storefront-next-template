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
import {
    createContext,
    type PropsWithChildren,
    useCallback,
    useEffect,
    useContext,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import type { BasketSnapshot } from '@/middlewares/basket.server';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useScapiFetcherEffect } from '@/hooks/use-scapi-fetcher-effect';
import { parseBasketCookie } from '@/lib/basket/cookie';

// Cookie changes are not observable via an event; the store returns a noop unsubscribe and relies on existing
// re-render triggers (updater callbacks on mutations) to refresh. useSyncExternalStore guarantees SSR (null) and
// client (cookie) snapshots can diverge without a hydration-mismatch warning.
// eslint-disable-next-line @typescript-eslint/no-empty-function
const subscribeBasketCookie = () => () => {};
const getServerBasketCookieSnapshot = (): BasketSnapshot | null => null;

export type BasketProviderValue = {
    snapshot?: BasketSnapshot | null;
    current?: ShopperBasketsV2.schemas['Basket'];
    /** Whether the full basket has been hydrated */
    hydrated?: boolean;
    /** Error encountered during hydration, if any */
    error?: string[] | null;
};

const defaultCreateSnapshot = (basket: ShopperBasketsV2.schemas['Basket']): BasketSnapshot => ({
    basketId: basket.basketId ?? '',
    totalItemCount: (basket.productItems ?? []).reduce((sum, item) => sum + (item.quantity ?? 0), 0),
    uniqueProductCount: (basket.productItems ?? []).length,
});

/*
 * Shared basket context that exposes snapshot data, current basket data, and hydration state.
 * `hydrated` indicates whether a full basket load has been attempted.
 * `error` holds any hydration errors from the last attempt.
 */
const BasketContext = createContext<BasketProviderValue>({
    snapshot: undefined,
    current: undefined,
    hydrated: undefined,
    error: undefined,
});
type BasketUpdater = {
    setBasket: (next: BasketProviderValue) => void;
    miniCartOpen: boolean;
    setMiniCartOpen: (open: boolean) => void;
};

const BasketUpdaterContext = createContext<BasketUpdater | undefined>(undefined);

/**
 * Provider for basket data that's typically retrieved by the basket middleware.
 * Exposes a setter so any component can update the basket state after lazy loads.
 *
 * ## Two-source state model
 *
 * The effective snapshot exposed on the context is derived from two independent inputs, merged in a single `useMemo`:
 *
 * 1. **Props** (`snapshot`, `basket`) — typically passed down from a route loader that reads the basket middleware's
 *    request-scoped context. Set on SSR and on every loader revalidation.
 * 2. **`__sfdc_basket` cookie** — written by the basket middleware's response step (`Set-Cookie`) and by client-side
 *    mutations. Read on the client via `useSyncExternalStore`. Treated as ground truth post-hydration: it overrides
 *    the prop snapshot whenever present.
 *
 * The merge rule is `cookieSnapshot ?? state.snapshot`, i.e. cookie wins whenever the visitor has one.
 *
 * ## Why two sources — enabling cache-safe SSR
 *
 * This split is what allows a caller to decide, per request, how much per-visitor state to bake into the SSR HTML.
 * Two scenarios the model is designed to support:
 *
 * - **Shared HTML caching.** If a route emits SSR HTML that may be served from a shared cache (e.g. a guest segment
 *   at a CDN), the caller can pass `snapshot={null}` so no per-visitor count is serialized. After hydration, the
 *   client reads the visitor's own cookie and fills the counter in — the cached HTML stays visitor-agnostic, but
 *   the UI still reflects the current visitor's basket.
 * - **Per-user or uncached HTML.** If the caller knows the response is per-user (uncached, or cached under a per-user
 *   key), it can pass the middleware snapshot directly. The badge renders with the correct count during SSR, no
 *   post-hydration flash.
 *
 * The provider itself is indifferent to which mode the caller picks; the contract is simply "whatever you pass as
 * `snapshot` ends up in the SSR HTML, and the cookie will augment or correct it on the client."
 *
 * ## SSR → hydrate → augment lifecycle
 *
 * The mechanism that makes the above possible is a single `useSyncExternalStore` call with asymmetric snapshot
 * functions:
 *
 *   - `getServerSnapshot` returns `null` — the value baked into SSR HTML.
 *   - `getSnapshot` reads `document.cookie` — available only on the client.
 *
 * React's `useSyncExternalStore` contract explicitly permits the server and client snapshots to diverge without
 * emitting a hydration-mismatch warning. It is the **only** hook that offers this guarantee; reaching for plain
 * `useEffect` + `useState` for the same trick would either warn on hydration or flicker a tick after first paint.
 *
 * Flow when the caller opts out of baking the snapshot (e.g. shared SSR HTML):
 *
 * ```
 *  SSR                         Hydration                    Post-hydration
 *  ───                         ─────────                    ──────────────
 *  props.snapshot = null       1st client commit replays    getSnapshot re-reads
 *  cookieSnapshot = null       getServerSnapshot = null     cookie → fresh snapshot
 *  → effective = null          → identical DOM, no warning  → context re-renders,
 *  → HTML: "0 items"                                          badge shows the visitor's
 *                                                             own count
 * ```
 *
 * When the caller passes a real `snapshot`, the same flow applies but `effective` starts as the prop snapshot and is
 * then corrected (or confirmed) by the cookie after hydration.
 *
 * ## Load-bearing invariants
 *
 * These are prerequisites for the cache-safe SSR property above. Breaking any of them removes the guarantee that SSR
 * HTML is safe to share across visitors when the caller passes `snapshot={null}`:
 *
 * - `getServerBasketCookieSnapshot` must return `null`. Any non-null value would be baked into the SSR HTML and
 *   defeat the opt-out.
 * - The cookie-derived snapshot must take precedence over the prop snapshot in the context value
 *   (`cookieSnapshot ?? state.snapshot`). Reversing the order would let a stale or foreign prop snapshot win over
 *   the visitor's own cookie.
 * - The per-provider snapshot cache (`cacheRef` inside the component) is required for referential stability.
 *   `useSyncExternalStore` compares successive `getSnapshot` return values with `Object.is`; without the cache,
 *   every call would allocate a fresh object, fail the comparison, and drive an infinite render loop. The cache
 *   lives on a ref (not module scope) so concurrent SSR requests in the same process cannot observe each other's
 *   state — important even though `getServerSnapshot` always returns `null` today, because it keeps the code
 *   resilient to future changes (and to reviewer scrutiny).
 * - The `getSnapshot` callback passed to `useSyncExternalStore` must itself be stable across renders; a fresh
 *   function reference would force the store to re-subscribe and re-read on every render. The component wraps it
 *   in `useCallback` with empty deps so the ref-backed closure stays identity-stable.
 * - `subscribe` is a noop because cookies emit no events. Re-reads are triggered indirectly by other re-renders
 *   (mutations → `setBasket` → context change → descendants re-render → store snapshot re-read).
 *
 * @param props - Provider props.
 * @param props.children - Children to render within the provider.
 * @param props.basket - Full basket payload when available.
 * @param props.snapshot - Basket snapshot payload when available. Pass `null`
 *   to keep per-visitor state out of the SSR HTML (cache-safe mode); pass the
 *   middleware snapshot to render the counter during SSR (per-user mode).
 * @example
 * ```tsx
 * <BasketProvider snapshot={basketSnapshot}>
 *   <App />
 * </BasketProvider>
 * ```
 *
 * @example
 * ```tsx
 * <BasketProvider basket={basket} snapshot={basketSnapshot}>
 *   <Cart />
 * </BasketProvider>
 * ```
 */
const BasketProvider = (
    props: PropsWithChildren<{ basket?: ShopperBasketsV2.schemas['Basket']; snapshot?: BasketSnapshot | null }>
) => {
    const { basket, snapshot, children } = props;

    // Providers internal state management.
    const [state, setState] = useState<BasketProviderValue | undefined>(() => {
        if (props.basket === undefined && props.snapshot === undefined) {
            return undefined;
        }

        return {
            current: props.basket,
            snapshot: props.snapshot,
            hydrated: Boolean(props.basket),
            error: null,
        };
    });

    const setBasket = useCallback((next: BasketProviderValue) => {
        setState(next);
    }, []);

    // Per-provider cache for the parsed cookie snapshot. useSyncExternalStore compares successive getSnapshot
    // return values via Object.is and would infinite-loop if a fresh object were produced on every read. Keeping
    // the cache on a ref (not module scope) guarantees isolation across concurrent SSR requests — the cache is
    // written to only inside getClientBasketCookieSnapshot, which is only ever invoked on the client today, but
    // ref-scoping keeps the code resilient to future changes.
    const cookieCacheRef = useRef<{ header?: string; snapshot: BasketSnapshot | null }>({ snapshot: null });

    // Stable identity across renders is required: useSyncExternalStore will re-subscribe on every render if the
    // subscribe or getSnapshot references change, which would defeat the Object.is cache.
    const getClientBasketCookieSnapshot = useCallback((): BasketSnapshot | null => {
        const header = document.cookie;
        const cache = cookieCacheRef.current;
        if (header !== cache.header) {
            cache.header = header;
            cache.snapshot = parseBasketCookie(header);
        }
        return cache.snapshot;
    }, []);

    // Post-hydration, prefer the cookie over the props snapshot so a stale server snapshot (e.g. per-user cached HTML
    // that no longer matches the latest basket) is corrected once __sfdc_basket is available.
    //
    // Cross-user leakage on guest-segment CDN hits is NOT prevented here — the `?? state?.snapshot` fallback would
    // still surface another guest's count when the current user has no cookie yet. That leak is prevented at the
    // source: root.tsx emits `null` for guests, so the SSR HTML carries no foreign snapshot to begin with.
    //
    // SSR and the initial hydration commit both return null (matching the server output); useSyncExternalStore
    // permits SSR/client divergence so a post-hydration cookie read does not warn as a hydration mismatch.
    const cookieSnapshot = useSyncExternalStore(
        subscribeBasketCookie,
        getClientBasketCookieSnapshot,
        getServerBasketCookieSnapshot
    );

    const ctxValue = useMemo(() => {
        const effectiveSnapshot = cookieSnapshot ?? state?.snapshot;
        return {
            snapshot: effectiveSnapshot,
            current: state?.current,
            hydrated: state?.hydrated,
            error: state?.error,
        };
    }, [state, cookieSnapshot]);

    // Update the internal state when the props change.
    useEffect(() => {
        if (basket === undefined && snapshot === undefined) {
            return;
        }
        setState((current) => ({
            current: basket === undefined ? current?.current : basket,
            snapshot: snapshot === undefined ? current?.snapshot : snapshot,
            hydrated: basket === undefined ? current?.hydrated : Boolean(basket),
            error: basket === undefined ? current?.error : null,
        }));
    }, [basket, snapshot]);

    const [miniCartOpen, setMiniCartOpen] = useState(false);

    const updaterValue = useMemo(() => ({ setBasket, miniCartOpen, setMiniCartOpen }), [setBasket, miniCartOpen]);

    return (
        <BasketUpdaterContext.Provider value={updaterValue}>
            <BasketContext.Provider value={ctxValue}>{children}</BasketContext.Provider>
        </BasketUpdaterContext.Provider>
    );
};

/*
 * Returns the current basket. If missing, triggers a fetch using the snapshot ID
 * and hydrates the context on success.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useBasket = (): ShopperBasketsV2.schemas['Basket'] | undefined => {
    const { current, snapshot } = useContext(BasketContext);
    const updater = useContext(BasketUpdaterContext);
    const basketId = snapshot?.basketId ?? '';
    const lastFetchedIdRef = useRef<string | null>(null);
    const basketFetcher = useScapiFetcher('shopperBasketsV2', 'getBasket', {
        params: { path: { basketId } },
    });

    // Load the basket when it's not available and the snapshot is present.
    useEffect(() => {
        if (current || !basketId) {
            return;
        }
        if (lastFetchedIdRef.current === basketId) {
            return;
        }
        lastFetchedIdRef.current = basketId;
        void basketFetcher.load();
    }, [current, basketFetcher, basketId]);

    // Update the context basket on success.
    useScapiFetcherEffect(basketFetcher, {
        onSuccess: (data) => {
            if (data) {
                updater?.setBasket({
                    snapshot,
                    current: data,
                    hydrated: true,
                    error: null,
                });
            }
        },
        onError: (errors) => {
            updater?.setBasket({
                snapshot,
                current,
                hydrated: true,
                error: errors,
            });
        },
    });

    return current;
};

/* Returns the current basket snapshot, if available. */
// eslint-disable-next-line react-refresh/only-export-components
export const useBasketSnapshot = (): BasketSnapshot | null | undefined => {
    return useContext(BasketContext).snapshot;
};

/** Whether the full basket has been fetched at least once. */
// eslint-disable-next-line react-refresh/only-export-components
export const useBasketHydrated = (): boolean => {
    return useContext(BasketContext).hydrated ?? false;
};

/* Returns a setter for updating the basket in context. */
// eslint-disable-next-line react-refresh/only-export-components
export const useBasketUpdater = (): ((basket?: ShopperBasketsV2.schemas['Basket']) => void) => {
    const updater = useContext(BasketUpdaterContext);
    return useCallback(
        (basket?: ShopperBasketsV2.schemas['Basket']) => {
            updater?.setBasket({
                current: basket,
                hydrated: true,
                snapshot: basket ? defaultCreateSnapshot(basket) : undefined,
                error: null,
            });
        },
        [updater]
    );
};

// Returns a callback that clears the basket context when invoked.
// eslint-disable-next-line react-refresh/only-export-components
export const useBasketReset = (): (() => void) => {
    const updater = useContext(BasketUpdaterContext);
    return useCallback(() => {
        updater?.setBasket({
            current: undefined,
            snapshot: undefined,
            hydrated: false,
            error: null,
        });
    }, [updater]);
};

// eslint-disable-next-line @typescript-eslint/no-empty-function
const noopSetMiniCartOpen: (open: boolean) => void = () => {};

// eslint-disable-next-line react-refresh/only-export-components
export const useMiniCart = () => {
    const updater = useContext(BasketUpdaterContext);
    const miniCartOpen = updater?.miniCartOpen ?? false;
    const setMiniCartOpen = updater?.setMiniCartOpen ?? noopSetMiniCartOpen;
    return useMemo(() => ({ miniCartOpen, setMiniCartOpen }), [miniCartOpen, setMiniCartOpen]);
};

export default BasketProvider;
