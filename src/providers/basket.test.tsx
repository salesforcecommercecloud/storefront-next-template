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
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import type { PropsWithChildren } from 'react';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import type { BasketSnapshot } from '@/middlewares/basket.server';
import BasketProvider, {
    useBasket,
    useBasketHydrated,
    useBasketReset,
    useBasketSnapshot,
    useBasketUpdater,
    useMiniCart,
} from './basket';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';
import { BASKET_COOKIE_NAME } from '@/lib/basket/cookie';

type MockFetcher = {
    load: ReturnType<typeof vi.fn>;
    data?: ShopperBasketsV2.schemas['Basket'];
    success: boolean;
    state: string;
    errors?: string[];
};

const mockFetcher: MockFetcher = {
    load: vi.fn(),
    data: undefined,
    success: false,
    state: 'idle',
    errors: undefined,
};

vi.mock('@/hooks/use-scapi-fetcher', () => ({
    useScapiFetcher: vi.fn(() => ({ ...mockFetcher }) as unknown as ReturnType<typeof useScapiFetcher>),
}));

vi.mock('@/hooks/use-scapi-fetcher-effect', async () => {
    const React = await import('react');
    return {
        useScapiFetcherEffect: (
            fetcher: MockFetcher,
            config: { onSuccess?: (data?: unknown) => void; onError?: (errors?: string[]) => void }
        ) => {
            const { onSuccess, onError } = config;
            const prevStateRef = React.useRef<string | undefined>(fetcher.state);
            const prevSuccessRef = React.useRef<boolean>(fetcher.success);

            React.useEffect(() => {
                const stateChanged = prevStateRef.current !== fetcher.state;
                const successChanged = prevSuccessRef.current !== fetcher.success;
                if ((stateChanged && fetcher.state === 'idle') || successChanged) {
                    if (fetcher.success && onSuccess) {
                        onSuccess(fetcher.data);
                    } else if (!fetcher.success && fetcher.errors && onError) {
                        onError(fetcher.errors);
                    }
                }
                prevStateRef.current = fetcher.state;
                prevSuccessRef.current = fetcher.success;
            }, [fetcher.state, fetcher.success, fetcher.data, fetcher.errors, onSuccess, onError]);
        },
    };
});

const clearBasketCookie = () => {
    document.cookie = `${BASKET_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
};

const writeBasketCookie = (value: string) => {
    document.cookie = `${BASKET_COOKIE_NAME}=${value}; path=/`;
};

describe('BasketProvider hooks', () => {
    const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
        basketId: 'basket-123',
        productItems: [],
    };
    const mockSnapshot: BasketSnapshot = {
        basketId: 'basket-123',
        totalItemCount: 0,
        uniqueProductCount: 0,
    };

    beforeEach(() => {
        mockFetcher.load = vi.fn();
        mockFetcher.data = undefined;
        mockFetcher.success = false;
        mockFetcher.state = 'idle';
        mockFetcher.errors = undefined;
        vi.mocked(useScapiFetcher).mockClear();
        clearBasketCookie();
    });

    afterEach(() => {
        clearBasketCookie();
    });

    const wrapperWithProps = (props: {
        basket?: ShopperBasketsV2.schemas['Basket'];
        snapshot?: BasketSnapshot | null;
    }) => {
        const Wrapper = ({ children }: PropsWithChildren) => <BasketProvider {...props}>{children}</BasketProvider>;
        Wrapper.displayName = 'BasketProviderTestWrapper';
        return Wrapper;
    };

    describe('useBasket', () => {
        it('returns the basket from context without fetching', () => {
            const { result } = renderHook(() => useBasket(), {
                wrapper: wrapperWithProps({ basket: mockBasket }),
            });

            expect(result.current).toBe(mockBasket);
            expect(mockFetcher.load).not.toHaveBeenCalled();
        });

        it('loads the basket when missing but snapshot exists', async () => {
            renderHook(() => useBasket(), {
                wrapper: wrapperWithProps({ snapshot: mockSnapshot }),
            });

            await waitFor(() => {
                expect(mockFetcher.load).toHaveBeenCalledTimes(1);
            });
        });

        it('hydrates the basket in context on successful fetch', async () => {
            const { result, rerender } = renderHook(() => useBasket(), {
                wrapper: wrapperWithProps({ snapshot: mockSnapshot }),
            });

            expect(result.current).toBeUndefined();

            mockFetcher.data = mockBasket;
            mockFetcher.success = true;
            rerender();

            await waitFor(() => {
                expect(result.current).toBe(mockBasket);
            });
        });

        it('does not call load when neither basket nor snapshot is present', () => {
            renderHook(() => useBasket(), {
                wrapper: wrapperWithProps({}),
            });

            expect(mockFetcher.load).not.toHaveBeenCalled();
        });

        it('does not refetch the same basketId after an initial load', async () => {
            const { rerender } = renderHook(() => useBasket(), {
                wrapper: wrapperWithProps({ snapshot: mockSnapshot }),
            });

            await waitFor(() => {
                expect(mockFetcher.load).toHaveBeenCalledTimes(1);
            });

            rerender();
            rerender();

            expect(mockFetcher.load).toHaveBeenCalledTimes(1);
        });

        it('refetches when basketId changes between renders', async () => {
            type Props = { snapshot?: BasketSnapshot | null };
            let currentProps: Props = { snapshot: mockSnapshot };

            const { rerender } = renderHook(() => useBasket(), {
                wrapper: ({ children }) => <BasketProvider snapshot={currentProps.snapshot}>{children}</BasketProvider>,
            });

            await waitFor(() => {
                expect(mockFetcher.load).toHaveBeenCalledTimes(1);
            });

            currentProps = { snapshot: { ...mockSnapshot, basketId: 'basket-changed' } };
            rerender();

            // lastFetchedIdRef only guards against re-fetching the *same* id; a new id must trigger load()
            // again, otherwise a basket hand-off (e.g. guest → registered merge) would leave the UI stuck.
            await waitFor(() => {
                expect(mockFetcher.load).toHaveBeenCalledTimes(2);
            });
        });

        it('does not hydrate the basket when the fetch succeeds without data', async () => {
            mockFetcher.state = 'loading';

            const Consumer = () => ({
                basket: useBasket(),
                hydrated: useBasketHydrated(),
            });

            const { result, rerender } = renderHook(() => Consumer(), {
                wrapper: wrapperWithProps({ snapshot: mockSnapshot }),
            });

            mockFetcher.state = 'idle';
            mockFetcher.success = true;
            mockFetcher.data = undefined;
            rerender();

            // Nothing to assert on state besides the absence of a hydration flip — the
            // onSuccess branch short-circuits when data is falsy.
            await waitFor(() => {
                expect(mockFetcher.load).toHaveBeenCalled();
            });
            expect(result.current.basket).toBeUndefined();
            expect(result.current.hydrated).toBe(false);
        });

        it('marks hydration as true and records errors on failed fetch', async () => {
            mockFetcher.state = 'loading';

            const Consumer = () => {
                const basket = useBasket();
                const hydrated = useBasketHydrated();
                return { basket, hydrated };
            };

            const { result, rerender } = renderHook(() => Consumer(), {
                wrapper: wrapperWithProps({ snapshot: mockSnapshot }),
            });

            expect(result.current.hydrated).toBe(false);

            mockFetcher.state = 'idle';
            mockFetcher.success = false;
            mockFetcher.errors = ['network-error'];
            rerender();

            await waitFor(() => {
                expect(result.current.hydrated).toBe(true);
            });
            expect(result.current.basket).toBeUndefined();
        });
    });

    describe('useBasketSnapshot', () => {
        it('returns the snapshot passed via props', () => {
            const { result } = renderHook(() => useBasketSnapshot(), {
                wrapper: wrapperWithProps({ snapshot: mockSnapshot }),
            });

            expect(result.current).toEqual(mockSnapshot);
        });

        it('returns undefined when no snapshot or basket is provided', () => {
            const { result } = renderHook(() => useBasketSnapshot(), {
                wrapper: wrapperWithProps({}),
            });

            expect(result.current).toBeUndefined();
        });

        it('prefers the cookie snapshot over the props snapshot', () => {
            const cookieSnapshot: BasketSnapshot = {
                basketId: 'basket-from-cookie',
                totalItemCount: 5,
                uniqueProductCount: 2,
            };
            writeBasketCookie(btoa(JSON.stringify(cookieSnapshot)));

            const { result } = renderHook(() => useBasketSnapshot(), {
                wrapper: wrapperWithProps({ snapshot: mockSnapshot }),
            });

            expect(result.current).toEqual(cookieSnapshot);
        });

        it('falls back to the props snapshot when cookie JSON cannot be parsed', () => {
            writeBasketCookie(encodeURIComponent('not-a-valid-json-string'));

            const { result } = renderHook(() => useBasketSnapshot(), {
                wrapper: wrapperWithProps({ snapshot: mockSnapshot }),
            });

            expect(result.current).toEqual(mockSnapshot);
        });

        it('falls back to the props snapshot when cookie JSON lacks basketId', () => {
            writeBasketCookie(btoa(JSON.stringify({ totalItemCount: 1, uniqueProductCount: 1 })));

            const { result } = renderHook(() => useBasketSnapshot(), {
                wrapper: wrapperWithProps({ snapshot: mockSnapshot }),
            });

            expect(result.current).toEqual(mockSnapshot);
        });

        it('exposes null when snapshot={null} is passed explicitly (cache-safe SSR mode)', () => {
            // Distinct from `snapshot` being omitted: `null` is the documented entry point for shared-HTML
            // caching — the context must preserve the null so SSR emits no per-visitor snapshot, while still
            // allowing the cookie to augment it post-hydration.
            const { result } = renderHook(() => useBasketSnapshot(), {
                wrapper: wrapperWithProps({ snapshot: null }),
            });

            expect(result.current).toBeNull();
        });

        it('picks up a changed cookie value between reads (per-provider cache invalidation)', () => {
            writeBasketCookie(
                btoa(
                    JSON.stringify({
                        basketId: 'cookie-id-1',
                        totalItemCount: 1,
                        uniqueProductCount: 1,
                    })
                )
            );

            const { result, rerender } = renderHook(() => useBasketSnapshot(), {
                wrapper: wrapperWithProps({ snapshot: mockSnapshot }),
            });

            expect(result.current?.basketId).toBe('cookie-id-1');

            // Key-on-header guard in getClientBasketCookieSnapshot must re-parse when document.cookie
            // changes; a sticky ref-backed snapshot would keep surfacing the old id here.
            writeBasketCookie(
                btoa(
                    JSON.stringify({
                        basketId: 'cookie-id-2',
                        totalItemCount: 4,
                        uniqueProductCount: 2,
                    })
                )
            );
            rerender();

            expect(result.current?.basketId).toBe('cookie-id-2');
        });
    });

    describe('useBasketHydrated', () => {
        it('is false when only a snapshot is provided', () => {
            const { result } = renderHook(() => useBasketHydrated(), {
                wrapper: wrapperWithProps({ snapshot: mockSnapshot }),
            });

            expect(result.current).toBe(false);
        });

        it('is true when a basket is provided', () => {
            const { result } = renderHook(() => useBasketHydrated(), {
                wrapper: wrapperWithProps({ basket: mockBasket }),
            });

            expect(result.current).toBe(true);
        });

        it('is false when neither basket nor snapshot is provided', () => {
            const { result } = renderHook(() => useBasketHydrated(), {
                wrapper: wrapperWithProps({}),
            });

            expect(result.current).toBe(false);
        });
    });

    describe('useBasketUpdater', () => {
        it('sets the basket and derives a snapshot from it', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-abc',
                productItems: [
                    { quantity: 2, productId: 'p1' },
                    { quantity: 3, productId: 'p2' },
                ],
            };

            const Consumer = () => ({
                snapshot: useBasketSnapshot(),
                current: useBasket(),
                hydrated: useBasketHydrated(),
                update: useBasketUpdater(),
            });

            const { result } = renderHook(() => Consumer(), { wrapper: wrapperWithProps({}) });

            act(() => {
                result.current.update(basket);
            });

            expect(result.current.current).toEqual(basket);
            expect(result.current.hydrated).toBe(true);
            expect(result.current.snapshot).toEqual({
                basketId: 'basket-abc',
                totalItemCount: 5,
                uniqueProductCount: 2,
            });
        });

        it('derives a zero-count snapshot for a basket without id or productItems', () => {
            const Consumer = () => ({
                snapshot: useBasketSnapshot(),
                update: useBasketUpdater(),
            });

            const { result } = renderHook(() => Consumer(), { wrapper: wrapperWithProps({}) });

            act(() => {
                result.current.update({} as ShopperBasketsV2.schemas['Basket']);
            });

            expect(result.current.snapshot).toEqual({
                basketId: '',
                totalItemCount: 0,
                uniqueProductCount: 0,
            });
        });

        it('treats product items without an explicit quantity as zero', () => {
            const basket: ShopperBasketsV2.schemas['Basket'] = {
                basketId: 'basket-xyz',
                productItems: [{ productId: 'p1' }],
            };

            const Consumer = () => ({
                snapshot: useBasketSnapshot(),
                update: useBasketUpdater(),
            });

            const { result } = renderHook(() => Consumer(), { wrapper: wrapperWithProps({}) });

            act(() => {
                result.current.update(basket);
            });

            expect(result.current.snapshot).toEqual({
                basketId: 'basket-xyz',
                totalItemCount: 0,
                uniqueProductCount: 1,
            });
        });

        it('clears the snapshot when called with undefined', () => {
            const Consumer = () => ({
                snapshot: useBasketSnapshot(),
                hydrated: useBasketHydrated(),
                update: useBasketUpdater(),
            });

            const { result } = renderHook(() => Consumer(), {
                wrapper: wrapperWithProps({ basket: mockBasket, snapshot: mockSnapshot }),
            });

            act(() => {
                result.current.update(undefined);
            });

            expect(result.current.snapshot).toBeUndefined();
            expect(result.current.hydrated).toBe(true);
        });

        it('returns a noop updater without a provider', () => {
            const { result } = renderHook(() => useBasketUpdater());

            // The setter must be defined and safe to call; the `updater?.setBasket` shortchain is the
            // load-bearing piece protecting lazy consumers that sit outside the provider tree.
            expect(typeof result.current).toBe('function');
            expect(() => result.current(mockBasket)).not.toThrow();
        });
    });

    describe('useBasketReset', () => {
        it('clears current basket, snapshot, and hydration flag', () => {
            const Consumer = () => ({
                current: useBasket(),
                snapshot: useBasketSnapshot(),
                hydrated: useBasketHydrated(),
                reset: useBasketReset(),
            });

            const { result } = renderHook(() => Consumer(), {
                wrapper: wrapperWithProps({ basket: mockBasket, snapshot: mockSnapshot }),
            });

            expect(result.current.current).toBe(mockBasket);

            act(() => {
                result.current.reset();
            });

            expect(result.current.current).toBeUndefined();
            expect(result.current.snapshot).toBeUndefined();
            expect(result.current.hydrated).toBe(false);
        });

        it('returns a noop reset without a provider', () => {
            const { result } = renderHook(() => useBasketReset());

            expect(typeof result.current).toBe('function');
            expect(() => result.current()).not.toThrow();
        });
    });

    describe('useMiniCart', () => {
        it('defaults miniCartOpen to false and toggles via setter', () => {
            const { result } = renderHook(() => useMiniCart(), {
                wrapper: wrapperWithProps({}),
            });

            expect(result.current.miniCartOpen).toBe(false);

            act(() => {
                result.current.setMiniCartOpen(true);
            });

            expect(result.current.miniCartOpen).toBe(true);
        });

        it('falls back to a noop setter and closed state without a provider', () => {
            const { result } = renderHook(() => useMiniCart());

            expect(result.current.miniCartOpen).toBe(false);
            expect(() => result.current.setMiniCartOpen(true)).not.toThrow();
            expect(result.current.miniCartOpen).toBe(false);
        });
    });

    describe('SSR', () => {
        const foreignCookieSnapshot: BasketSnapshot = {
            basketId: 'cookie-id-from-another-shopper',
            totalItemCount: 7,
            uniqueProductCount: 3,
        };

        const SnapshotProbe = () => {
            const snapshot = useBasketSnapshot();
            return (
                <span
                    data-id={snapshot?.basketId ?? 'null'}
                    data-total={snapshot?.totalItemCount ?? 'null'}
                    data-unique={snapshot?.uniqueProductCount ?? 'null'}
                />
            );
        };

        it('renders with a null cookie snapshot on the server', () => {
            writeBasketCookie(btoa(JSON.stringify({ ...mockSnapshot, basketId: 'cookie-id' })));

            const html = renderToString(
                <BasketProvider snapshot={mockSnapshot}>
                    <SnapshotProbe />
                </BasketProvider>
            );

            // SSR must use the server snapshot (null) and fall back to the props snapshot.
            expect(html).toContain(`data-id="${mockSnapshot.basketId}"`);
            expect(html).not.toContain('cookie-id');
        });

        it('emits no visitor cookie data into SSR HTML when snapshot={null}', () => {
            // Cache-safe SSR contract: when the caller explicitly opts out by passing `snapshot={null}`,
            // the SSR HTML must remain shopper-agnostic even if a foreign cookie is present in the
            // environment. getServerBasketCookieSnapshot returns null on the server, and the props
            // snapshot is null, so the effective snapshot is null and no per-visitor data is serialized.
            writeBasketCookie(btoa(JSON.stringify(foreignCookieSnapshot)));

            const html = renderToString(
                <BasketProvider snapshot={null}>
                    <SnapshotProbe />
                </BasketProvider>
            );

            expect(html).toContain('data-id="null"');
            expect(html).toContain('data-total="null"');
            expect(html).toContain('data-unique="null"');
            expect(html).not.toContain(foreignCookieSnapshot.basketId);
        });

        it('emits no visitor cookie data into SSR HTML when snapshot is omitted', () => {
            // Same guarantee as the explicit `null` path: an omitted snapshot prop produces no
            // initial state and the cookie must not bleed through on the server. This protects
            // callers that simply forget to pass the prop on cacheable routes.
            writeBasketCookie(btoa(JSON.stringify(foreignCookieSnapshot)));

            const html = renderToString(
                <BasketProvider>
                    <SnapshotProbe />
                </BasketProvider>
            );

            expect(html).toContain('data-id="null"');
            expect(html).toContain('data-total="null"');
            expect(html).toContain('data-unique="null"');
            expect(html).not.toContain(foreignCookieSnapshot.basketId);
        });
    });

    describe('prop updates', () => {
        it('updates context state when basket/snapshot props change', async () => {
            type Props = { basket?: ShopperBasketsV2.schemas['Basket']; snapshot?: BasketSnapshot | null };

            let currentProps: Props = { basket: undefined, snapshot: mockSnapshot };

            const { result, rerender } = renderHook(
                () => ({
                    current: useBasket(),
                    snapshot: useBasketSnapshot(),
                    hydrated: useBasketHydrated(),
                }),
                {
                    wrapper: ({ children }) => (
                        <BasketProvider basket={currentProps.basket} snapshot={currentProps.snapshot}>
                            {children}
                        </BasketProvider>
                    ),
                }
            );

            expect(result.current.hydrated).toBe(false);
            expect(result.current.snapshot).toEqual(mockSnapshot);

            currentProps = { basket: mockBasket, snapshot: mockSnapshot };
            rerender();

            await waitFor(() => {
                expect(result.current.current).toBe(mockBasket);
            });
            expect(result.current.hydrated).toBe(true);
        });
    });
});
