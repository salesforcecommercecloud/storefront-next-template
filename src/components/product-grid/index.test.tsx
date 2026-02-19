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
import { type ComponentType } from 'react';
import { vi, test, describe, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
                    const result = originalContext?.addSource(src);
                    addSourceSpy(src, result);
                    return result;
                },
                hasSource: (src: string) => {
                    const result = originalContext?.hasSource(src);
                    hasSourceSpy(src, result);
                    return result;
                },
            };
        },
    };
});

vi.mock('@/lib/product-utils', () => ({
    createProductUrl: vi.fn(() => '/product/test-product'),
    getImagesForColor: vi.fn((product, color) => {
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
}));

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
        products?: ShopperSearch.schemas['ProductSearchHit'][];
        handleProductClick?: (product: ShopperSearch.schemas['ProductSearchHit']) => void;
        critical?: number;
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
                                products={props.products ?? mockProducts}
                                handleProductClick={props.handleProductClick}
                                critical={props.critical}
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
        renderComponent({ products: [] });

        expect(screen.getByText('No products found.')).toBeInTheDocument();
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

    test('renders all products without split when critical is undefined', () => {
        renderComponent({ products: mockProductsExtended });

        for (const product of mockProductsExtended) {
            expect(screen.getByText(product?.productName as string)).toBeInTheDocument();
        }
    });

    test('renders all products without split when critical >= products.length', () => {
        renderComponent({ products: mockProducts, critical: 10 });

        expect(screen.getByText('Product One')).toBeInTheDocument();
        expect(screen.getByText('Product Two')).toBeInTheDocument();
        expect(screen.getByText('Product Three')).toBeInTheDocument();
    });

    test('displays empty state with critical set', () => {
        renderComponent({ products: [], critical: 4 });

        expect(screen.getByText('No products found.')).toBeInTheDocument();
    });

    test('shows skeleton fallback while lazy component is pending, then resolves to real tiles', async () => {
        // Create a deferred promise so we can control when React.lazy resolves
        let resolveLazy!: (value: { default: ComponentType<never> }) => void;
        const lazyPromise = new Promise<{ default: ComponentType<never> }>((resolve) => {
            resolveLazy = resolve;
        });

        // Mock react to intercept lazy() and wrap the factory with our deferred promise
        vi.doMock('react', async (importOriginal) => {
            const actual = await importOriginal<typeof import('react')>();
            return {
                ...actual,
                lazy: (factory: () => Promise<{ default: ComponentType }>) => {
                    // Chain: wait for our deferred, then call the real factory to get the actual component
                    return actual.lazy(() => lazyPromise.then(() => factory()));
                },
            };
        });

        // Re-import ProductGrid so it picks up the mocked React.lazy
        vi.resetModules();
        const { default: ProductGridDeferred } = await import('./index');
        const { createMemoryRouter: createRouter, RouterProvider: Router } = await import('react-router');
        const {
            render: renderDeferred,
            screen: screenDeferred,
            act: actDeferred,
        } = await import('@testing-library/react');
        const { ConfigWrapper: ConfigWrapperDeferred } = await import('@/test-utils/config');
        const { CurrencyProvider: CurrencyProviderDeferred } = await import('@/providers/currency');

        const router = createRouter(
            [
                {
                    path: '/test',
                    element: (
                        <ConfigWrapperDeferred>
                            <CurrencyProviderDeferred value="USD">
                                <ProductGridDeferred products={mockProductsExtended} critical={2} />
                            </CurrencyProviderDeferred>
                        </ConfigWrapperDeferred>
                    ),
                },
            ],
            { initialEntries: ['/test'] }
        );
        renderDeferred(<Router router={router} />);

        // Critical products should be visible immediately
        expect(screenDeferred.getByText('Product One')).toBeInTheDocument();
        expect(screenDeferred.getByText('Product Two')).toBeInTheDocument();

        // Non-critical products should NOT be visible yet (lazy is pending)
        expect(screenDeferred.queryByText('Product Three')).not.toBeInTheDocument();
        expect(screenDeferred.queryByText('Product Six')).not.toBeInTheDocument();

        // Skeleton fallbacks should be rendered by Suspense
        const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
        expect(skeletons.length).toBeGreaterThan(0);

        // Resolve the deferred — this unblocks React.lazy which then calls the real factory
        actDeferred(() => {
            resolveLazy({ default: (() => null) as ComponentType<never> });
        });

        // After resolving, non-critical products should now be visible
        expect(await screenDeferred.findByText('Product Three')).toBeInTheDocument();
        expect(screenDeferred.getByText('Product Four')).toBeInTheDocument();
        expect(screenDeferred.getByText('Product Five')).toBeInTheDocument();
        expect(screenDeferred.getByText('Product Six')).toBeInTheDocument();

        // Skeletons should be gone
        const remainingSkeletons = document.querySelectorAll('[data-slot="skeleton"]');
        expect(remainingSkeletons.length).toBe(0);

        vi.doUnmock('react');
    });

    test('calls handleProductClick for non-critical products after lazy resolves', async () => {
        const user = userEvent.setup();
        const handleProductClick = vi.fn();
        renderComponent({ products: mockProductsExtended, critical: 2, handleProductClick });

        // Wait for non-critical products to render (default lazy resolves immediately in tests)
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

    test('Verify calls to the DynamicImageProvider context from nested components', () => {
        renderComponent();

        // Verify `addSource` was called by each ProductTile with its image URL
        expect(addSourceSpy).toHaveBeenCalledTimes(3);
        expect(addSourceSpy).toHaveBeenCalledWith('https://example.com/product-1-default.jpg', expect.any(Boolean));
        expect(addSourceSpy).toHaveBeenCalledWith('https://example.com/product-2-default.jpg', expect.any(Boolean));
        expect(addSourceSpy).toHaveBeenCalledWith('https://example.com/product-3-default.jpg', expect.any(Boolean));

        // Verify `hasSource` was called by each DynamicImage to check priority
        expect(hasSourceSpy).toHaveBeenCalledTimes(3);
        expect(hasSourceSpy).toHaveBeenCalledWith('https://example.com/product-1-default.jpg', expect.any(Boolean));
        expect(hasSourceSpy).toHaveBeenCalledWith('https://example.com/product-2-default.jpg', expect.any(Boolean));
        expect(hasSourceSpy).toHaveBeenCalledWith('https://example.com/product-3-default.jpg', expect.any(Boolean));

        // Verify return values: first call returns true, others return false
        expect(addSourceSpy.mock.calls[0][1]).toBe(true); // First image gets priority
        expect(addSourceSpy.mock.calls[1][1]).toBe(false);
        expect(addSourceSpy.mock.calls[2][1]).toBe(false);

        // Verify return values: first image was added as priority, so hasSource returns true for it
        expect(hasSourceSpy.mock.calls[0][1]).toBe(true); // First image is in the set
        expect(hasSourceSpy.mock.calls[1][1]).toBe(false); // Others are not (addSource returned false)
        expect(hasSourceSpy.mock.calls[2][1]).toBe(false);
    });
});
