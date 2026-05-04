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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { createMemoryRouter, RouterProvider } from 'react-router';
import type { ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import { variantProduct } from '@/components/__mocks__/master-variant-product';

const { t } = getTranslation();

type Product = ShopperProducts.schemas['Product'];

const mockLoad = vi.fn().mockResolvedValue(undefined);

interface MockFetcherState {
    load: typeof mockLoad;
    data: Product | null;
    state: 'idle' | 'loading';
    success: boolean;
}

let fullProductFetcherState: MockFetcherState;
let variantFetcherState: MockFetcherState;

const mockUseScapiFetcher = vi.fn((_client: string, _method: string, opts: Record<string, unknown>) => {
    const params = opts.params as { path: { id: string }; query: Record<string, unknown> };
    const hasExpand = !!params?.query?.expand;
    const expandValues = params?.query?.expand as string[] | undefined;
    const isFullProductFetcher = hasExpand && expandValues && expandValues.includes('variations');

    if (isFullProductFetcher) {
        return fullProductFetcherState;
    }
    return variantFetcherState;
});

vi.mock('@/hooks/use-scapi-fetcher', () => ({
    useScapiFetcher: (...args: unknown[]) => mockUseScapiFetcher(...(args as Parameters<typeof mockUseScapiFetcher>)),
}));

// Lazy import so the mock is installed first
const { CartItemModalEditContainer } = await import('./edit-container');

const basketProduct: Product = {
    id: '640188017041M',
    name: 'Charcoal Flat Front Athletic Fit Shadow Striped Wool Suit',
    variationValues: { color: 'CHARCWL', size: '040', width: 'S' },
    price: 299.99,
    currency: 'USD',
};

function renderEditContainer(overrides: Partial<React.ComponentProps<typeof CartItemModalEditContainer>> = {}) {
    const props = {
        product: basketProduct,
        itemId: 'item-1',
        open: true,
        onOpenChange: vi.fn(),
        initialQuantity: 2,
        ...overrides,
    };
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: (
                    <AllProvidersWrapper>
                        <CartItemModalEditContainer {...props} />
                    </AllProvidersWrapper>
                ),
            },
        ],
        { initialEntries: ['/'] }
    );
    return { ...render(<RouterProvider router={router} />), props };
}

describe('CartItemModalEditContainer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fullProductFetcherState = {
            load: mockLoad,
            data: null,
            state: 'idle' as const,
            success: false,
        };
        variantFetcherState = {
            load: mockLoad,
            data: null,
            state: 'idle' as const,
            success: false,
        };
    });

    describe('full product fetcher', () => {
        test('calls fullProductFetcher.load when modal is open and no data yet', () => {
            renderEditContainer();

            expect(mockLoad).toHaveBeenCalled();
        });

        test('does not call load when modal is closed', () => {
            renderEditContainer({ open: false });

            expect(mockLoad).not.toHaveBeenCalled();
        });

        test('does not call load when data already exists', () => {
            fullProductFetcherState = {
                load: mockLoad,
                data: variantProduct,
                state: 'idle' as const,
                success: true,
            };
            renderEditContainer();

            expect(mockLoad).not.toHaveBeenCalled();
        });

        test('configures fullProductFetcher with expand params including variations', () => {
            renderEditContainer();

            const fullProductCall = mockUseScapiFetcher.mock.calls.find((call) => {
                const params = call[2].params as {
                    query: { expand?: string[] };
                };
                return params?.query?.expand?.includes('variations');
            });

            expect(fullProductCall).toBeDefined();
            const params = (fullProductCall as NonNullable<typeof fullProductCall>)[2].params as {
                path: { id: string };
                query: { expand: string[]; allImages: boolean };
            };
            expect(params.path.id).toBe('640188017041M');
            expect(params.query.allImages).toBe(true);
            expect(params.query.expand).toContain('availability');
            expect(params.query.expand).toContain('prices');
            expect(params.query.expand).toContain('promotions');
        });
    });

    describe('loading state', () => {
        test('shows loading spinner when fetcher is loading and has no data', () => {
            fullProductFetcherState = {
                load: mockLoad,
                data: null,
                state: 'loading' as const,
                success: false,
            };
            renderEditContainer();

            expect(document.querySelector('.animate-spin')).toBeInTheDocument();
            expect(screen.getByText(t('editItem:loadingProduct'))).toBeInTheDocument();
        });

        test('does not show loading when fetcher has data', () => {
            fullProductFetcherState = {
                load: mockLoad,
                data: variantProduct,
                state: 'idle' as const,
                success: true,
            };
            renderEditContainer();

            expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
        });
    });

    describe('product display', () => {
        test('falls back to product prop when fetcher has no data yet', () => {
            fullProductFetcherState = {
                load: mockLoad,
                data: null,
                state: 'idle' as const,
                success: false,
            };
            renderEditContainer();

            expect(screen.getByText(basketProduct.name as string)).toBeInTheDocument();
        });

        test('renders full product data once fetcher resolves', () => {
            fullProductFetcherState = {
                load: mockLoad,
                data: variantProduct,
                state: 'idle' as const,
                success: true,
            };
            renderEditContainer();

            expect(screen.getByText(variantProduct.name as string)).toBeInTheDocument();
        });
    });

    describe('variant fetcher', () => {
        test('does not trigger variant fetch when selected variant matches productId', () => {
            fullProductFetcherState = {
                load: mockLoad,
                data: variantProduct,
                state: 'idle' as const,
                success: true,
            };
            renderEditContainer();

            const variantFetcherCall = mockUseScapiFetcher.mock.calls.find((call) => {
                const params = call[2].params as {
                    query: { expand?: string[] };
                };
                const expand = params?.query?.expand;
                return expand && !expand.includes('variations');
            });

            expect(variantFetcherCall).toBeDefined();
            const params = (variantFetcherCall as NonNullable<typeof variantFetcherCall>)[2].params as {
                path: { id: string };
            };
            expect(params.path.id).toBe('');
        });

        test('configures variant fetcher with expand params for availability, images, prices, promotions', () => {
            fullProductFetcherState = {
                load: mockLoad,
                data: variantProduct,
                state: 'idle' as const,
                success: true,
            };
            renderEditContainer();

            const variantFetcherCall = mockUseScapiFetcher.mock.calls.find((call) => {
                const params = call[2].params as {
                    query: { expand?: string[] };
                };
                const expand = params?.query?.expand;
                return expand && !expand.includes('variations');
            });

            expect(variantFetcherCall).toBeDefined();
            const params = (variantFetcherCall as NonNullable<typeof variantFetcherCall>)[2].params as {
                query: { expand: string[] };
            };
            expect(params.query.expand).toEqual(['availability', 'images', 'prices', 'promotions']);
        });
    });

    describe('modal rendering', () => {
        test('renders dialog with edit title when open', () => {
            fullProductFetcherState = {
                load: mockLoad,
                data: variantProduct,
                state: 'idle' as const,
                success: true,
            };
            renderEditContainer();

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText(t('editItem:title'))).toBeInTheDocument();
        });

        test('does not render dialog when closed', () => {
            renderEditContainer({ open: false });

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
    });
});
