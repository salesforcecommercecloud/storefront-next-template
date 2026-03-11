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
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { type ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { ConfigWrapper, mockConfig } from '@/test-utils/config';
import { CurrencyProvider } from '@/providers/currency';
import ProductGrid from './index';

const addSourceSpy = vi.fn();
const hasSourceSpy = vi.fn();

vi.mock('@/providers/dynamic-image', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/providers/dynamic-image')>();
    return {
        ...original,
        useDynamicImageContext: () => {
            // Get the real context value
            const originalContext = original.useDynamicImageContext();
            // Wrap `addSource` to spy on calls while preserving original behavior
            return {
                ...originalContext,
                addSource: (src: string) => {
                    if (typeof originalContext?.addSource === 'function') {
                        const result = originalContext?.addSource(src);
                        addSourceSpy(src, result);
                        return result;
                    }
                    return false;
                },
                hasSource: (src: string) => {
                    if (typeof originalContext?.hasSource === 'function') {
                        const result = originalContext?.hasSource(src);
                        hasSourceSpy(src, result);
                        return result;
                    }
                    return false;
                },
            };
        },
    };
});

vi.mock('@/lib/product-utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/product-utils')>();
    return {
        ...actual,
        createProductUrl: vi.fn(() => '/product/test-product'),
        getImagesForColor: vi.fn((product: { productId: string; productName: string }, color: string) => {
            const colorSuffix = color || 'default';
            return [
                {
                    link: `https://example.com/${product.productId}-${colorSuffix}.jpg`,
                    disBaseLink: `https://example.com/${product.productId}-${colorSuffix}.jpg`,
                    alt: `${product.productName} Image`,
                },
            ];
        }),
        getDecoratedVariationAttributes: vi.fn(() => [
            {
                id: 'color',
                name: 'Colour',
                values: [
                    {
                        value: 'navy',
                        name: 'Navy',
                        swatch: { link: 'https://example.com/navy.jpg', disBaseLink: 'https://example.com/navy.jpg' },
                    },
                ],
            },
        ]),
    };
});

vi.mock('@/lib/currency', () => ({
    formatCurrency: vi.fn((price) => `$${price}`),
}));

vi.mock('@/lib/product-badges', () => ({
    getProductBadges: vi.fn(() => ({
        hasBadges: false,
        badges: [],
    })),
}));

vi.mock('@/config/get-config', () => ({
    useConfig: () => mockConfig,
}));

vi.mock('@/components/category-skeleton', () => ({
    ProductTileSkeleton: () => <div data-testid="product-tile-skeleton">product-tile-skeleton</div>,
    ProductTileSwatchesSkeleton: () => (
        <div data-testid="product-tile-swatches-skeleton">product-tile-swatches-skeleton</div>
    ),
}));

const createMockProduct = (id: string, name: string): ShopperSearch.schemas['ProductSearchHit'] => ({
    productId: id,
    productName: name,
    price: 99.99,
    variationAttributes: [
        {
            id: 'color',
            values: [{ value: 'navy', name: 'Navy' }],
        },
    ],
    imageGroups: [
        {
            viewType: 'medium',
            images: [
                {
                    alt: `${name} image`,
                    link: `https://example.com/${id}.jpg`,
                    disBaseLink: `https://example.com/${id}.jpg`,
                },
            ],
        },
    ],
});

const mockProducts = [
    createMockProduct('product-1', 'Product One'),
    createMockProduct('product-2', 'Product Two'),
    createMockProduct('product-3', 'Product Three'),
];

const mockProductsExtended = [
    ...mockProducts,
    createMockProduct('product-4', 'Product Four'),
    createMockProduct('product-5', 'Product Five'),
    createMockProduct('product-6', 'Product Six'),
];

const renderComponent = (
    props: {
        critical?: ShopperSearch.schemas['ProductSearchHit'][];
        nonCritical?: Promise<ShopperSearch.schemas['ProductSearchHit'][]>;
        nonCriticalCount?: number;
        handleProductClick?: (product: ShopperSearch.schemas['ProductSearchHit']) => void;
    } = {}
) => {
    const router = createMemoryRouter(
        [
            {
                path: '/test',
                element: (
                    <ConfigWrapper>
                        <CurrencyProvider value="USD">
                            <ProductGrid
                                critical={props.critical ?? (!props.nonCritical ? mockProductsExtended : [])}
                                nonCritical={props.nonCritical}
                                nonCriticalCount={props.nonCriticalCount}
                                handleProductClick={props.handleProductClick}
                            />
                        </CurrencyProvider>
                    </ConfigWrapper>
                ),
            },
            {
                path: '/product/:productId',
                element: <div>Product Page</div>,
            },
            {
                path: '*',
                element: <div>Navigated</div>,
            },
        ],
        { initialEntries: ['/test'] }
    );
    return render(<RouterProvider router={router} />);
};

describe('ProductGrid', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('renders all products in the grid', () => {
        renderComponent();

        expect(screen.getByText('Product One')).toBeInTheDocument();
        expect(screen.getByText('Product Two')).toBeInTheDocument();
        expect(screen.getByText('Product Three')).toBeInTheDocument();
    });

    test('displays empty state message when no products', () => {
        renderComponent({ critical: [] });

        expect(screen.getByText('No products found')).toBeInTheDocument();
    });

    test('calls handleProductClick when product is clicked', async () => {
        const user = userEvent.setup();
        const handleProductClick = vi.fn();
        renderComponent({ handleProductClick });

        const productLink = screen.getByRole('link', { name: 'Product One' });
        await user.click(productLink);

        expect(handleProductClick).toHaveBeenCalledWith(mockProducts[0]);
    });
});

describe('ProductGrid critical/non-critical split', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('renders critical array immediately', () => {
        renderComponent({ critical: mockProducts.slice(0, 2) });

        expect(screen.getByText('Product One')).toBeInTheDocument();
        expect(screen.getByText('Product Two')).toBeInTheDocument();
    });

    test('renders non-critical array deferred', () => {
        const { queryAllByTestId } = renderComponent({
            nonCritical: Promise.resolve(mockProductsExtended.slice(2)),
            nonCriticalCount: 4,
        });
        // Verify skeleton tiles
        expect(queryAllByTestId('product-tile-skeleton')).toHaveLength(4);
    });

    test('renders critical and nonCritical arrays together', async () => {
        const criticalProducts = mockProductsExtended.slice(0, 2);
        const nonCriticalProducts = Promise.resolve(mockProductsExtended.slice(2));

        await act(() => renderComponent({ critical: criticalProducts, nonCritical: nonCriticalProducts }));

        // Critical products render immediately
        expect(screen.getByText('Product One')).toBeInTheDocument();
        expect(screen.getByText('Product Two')).toBeInTheDocument();

        // NonCritical products render after lazy resolves (immediate in tests)
        expect(screen.getByText('Product Three')).toBeInTheDocument();
        expect(screen.getByText('Product Four')).toBeInTheDocument();
        expect(screen.getByText('Product Five')).toBeInTheDocument();
        expect(screen.getByText('Product Six')).toBeInTheDocument();
        expect(screen.queryAllByTestId('product-tile-skeleton')).toHaveLength(0);
    });

    test('does not display empty state when nonCritical has items', async () => {
        await act(() =>
            renderComponent({ critical: [], nonCritical: Promise.resolve(mockProducts), nonCriticalCount: 3 })
        );
        expect(screen.queryByText('No products found')).not.toBeInTheDocument();
        expect(screen.getByText('Product One')).toBeInTheDocument();
    });

    test('displays empty state when nonCritical resolves to empty array', async () => {
        await act(() => renderComponent({ critical: [], nonCritical: Promise.resolve([]) }));
        expect(screen.getByText('No products found')).toBeInTheDocument();
    });

    test('does not display empty state when critical has products but nonCritical is empty', async () => {
        await act(() => renderComponent({ critical: mockProducts.slice(0, 2), nonCritical: Promise.resolve([]) }));

        expect(screen.queryByText('No products found')).not.toBeInTheDocument();
        expect(screen.getByText('Product One')).toBeInTheDocument();
        expect(screen.getByText('Product Two')).toBeInTheDocument();
    });

    test('calls handleProductClick for non-critical array products after lazy resolves', async () => {
        const user = userEvent.setup();
        const handleProductClick = vi.fn();

        await act(() => {
            return renderComponent({
                critical: mockProductsExtended.slice(0, 2),
                nonCritical: Promise.resolve(mockProductsExtended.slice(2)),
                nonCriticalCount: 4,
                handleProductClick,
            });
        });

        // Wait for non-critical products to render
        const productLink = await screen.findByRole('link', { name: 'Product Five' });
        await user.click(productLink);

        expect(handleProductClick).toHaveBeenCalledWith(mockProductsExtended[4]);
    });
});

describe('ProductGrid DynamicImageProvider Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('Verify calls to the DynamicImageProvider context from nested components', async () => {
        await act(() => {
            return renderComponent({
                critical: mockProductsExtended.slice(0, 2),
                nonCritical: Promise.resolve(mockProductsExtended.slice(2)),
                nonCriticalCount: 4,
            });
        });

        // Verify `addSource` was called by each ProductTile with its image URL
        expect(addSourceSpy).toHaveBeenCalledTimes(6);
        expect(addSourceSpy).toHaveBeenNthCalledWith(
            1,
            'https://example.com/product-1-default.jpg',
            expect.any(Boolean)
        );
        expect(addSourceSpy).toHaveBeenNthCalledWith(
            2,
            'https://example.com/product-2-default.jpg',
            expect.any(Boolean)
        );

        // Verify `hasSource` was called by each DynamicImage to check priority
        expect(hasSourceSpy).toHaveBeenCalledTimes(6);
        expect(hasSourceSpy).toHaveBeenNthCalledWith(
            1,
            'https://example.com/product-1-default.jpg',
            expect.any(Boolean)
        );
        expect(hasSourceSpy).toHaveBeenNthCalledWith(
            2,
            'https://example.com/product-2-default.jpg',
            expect.any(Boolean)
        );

        expect(addSourceSpy.mock.calls[0][1]).toBe(false); // not implemented
        expect(addSourceSpy.mock.calls[1][1]).toBe(false); // not implemented
        expect(addSourceSpy.mock.calls[2][1]).toBe(false); // not implemented
        expect(addSourceSpy.mock.calls[3][1]).toBe(false); // not implemented
        expect(addSourceSpy.mock.calls[4][1]).toBe(false); // not implemented
        expect(addSourceSpy.mock.calls[5][1]).toBe(false); // not implemented
        expect(hasSourceSpy.mock.calls[0][1]).toBe(true); // returns true, despite `addSourceSpy` not implemented
        expect(hasSourceSpy.mock.calls[1][1]).toBe(true); // returns true, despite `addSourceSpy` not implemented
        expect(hasSourceSpy.mock.calls[2][1]).toBe(false);
        expect(hasSourceSpy.mock.calls[3][1]).toBe(false);
        expect(hasSourceSpy.mock.calls[4][1]).toBe(false);
        expect(hasSourceSpy.mock.calls[5][1]).toBe(false);
    });
});
