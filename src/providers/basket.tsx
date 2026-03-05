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
'use client';

import {
    createContext,
    type PropsWithChildren,
    useCallback,
    useEffect,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import type { BasketSnapshot } from '@/middlewares/basket.server';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { useScapiFetcherEffect } from '@/hooks/use-scapi-fetcher-effect';

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
};

const BasketUpdaterContext = createContext<BasketUpdater | undefined>(undefined);

/**
 * Provider for basket data that's typically retrieved by the basket middleware.
 * Exposes a setter so any component can update the basket state after lazy loads.
 *
 * @param props - Provider props.
 * @param props.children - Children to render within the provider.
 * @param props.basket - Full basket payload when available.
 * @param props.snapshot - Basket snapshot payload when available.
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

    // Updates the basket value while preserving the current snapshot.
    const setBasket = useCallback((next: BasketProviderValue) => {
        setState((current) => ({
            snapshot: Object.prototype.hasOwnProperty.call(next, 'snapshot') ? next.snapshot : current?.snapshot,
            current: Object.prototype.hasOwnProperty.call(next, 'current') ? next.current : current?.current,
            hydrated: Object.prototype.hasOwnProperty.call(next, 'hydrated') ? next.hydrated : current?.hydrated,
            error: Object.prototype.hasOwnProperty.call(next, 'error') ? next.error : current?.error,
        }));
    }, []);

    const ctxValue = useMemo(
        () => ({
            snapshot: state?.snapshot,
            current: state?.current,
            hydrated: state?.hydrated,
            error: state?.error,
        }),
        [state]
    );

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

    const updaterValue = useMemo(() => ({ setBasket }), [setBasket]);

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

export default BasketProvider;
