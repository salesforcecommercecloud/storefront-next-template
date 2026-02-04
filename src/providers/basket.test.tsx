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
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';
import type { BasketSnapshot } from '@/middlewares/basket.server';
import BasketProvider, { useBasket } from './basket';
import { useScapiFetcher } from '@/hooks/use-scapi-fetcher';

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
    useScapiFetcher: vi.fn(() => mockFetcher as unknown as ReturnType<typeof useScapiFetcher>),
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

describe('BasketProvider hooks', () => {
    const mockBasket: ShopperBasketsV2.schemas['Basket'] = {
        basketId: 'basket-123',
        productItems: [],
    };
    const mockSnapshot: BasketSnapshot = {
        basketId: 'basket-123',
        itemsCount: 0,
    };

    beforeEach(() => {
        mockFetcher.load = vi.fn();
        mockFetcher.data = undefined;
        mockFetcher.success = false;
        mockFetcher.state = 'idle';
        mockFetcher.errors = undefined;
        vi.mocked(useScapiFetcher).mockClear();
    });

    const wrapperWithProps = (props: { basket?: ShopperBasketsV2.schemas['Basket']; snapshot?: BasketSnapshot }) => {
        const Wrapper = ({ children }: PropsWithChildren) => <BasketProvider {...props}>{children}</BasketProvider>;
        Wrapper.displayName = 'BasketProviderTestWrapper';
        return Wrapper;
    };

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
});
