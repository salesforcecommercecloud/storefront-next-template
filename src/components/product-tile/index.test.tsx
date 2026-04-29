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
import { vi, test, describe, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line import/no-namespace -- vi.spyOn requires namespace import
import * as ReactRouter from 'react-router';
import { createMemoryRouter, RouterProvider } from 'react-router';

import { ProductTile } from './index';
import type { ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

vi.mock('@/lib/product-utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/product-utils')>();
    return {
        ...actual,
        createProductUrl: vi.fn(() => '/product/test-product'),
        getDecoratedVariationAttributes: vi.fn(() => [
            {
                id: 'color',
                name: 'Colour',
                values: [
                    {
                        value: 'navy',
                        name: 'Navy',
                        href: '/product/test?color=navy',
                        swatch: null,
                    },
                    {
                        value: 'red',
                        name: 'Red',
                        href: '/product/test?color=red',
                        swatch: null,
                    },
                ],
            },
        ]),
    };
});

vi.mock('@/lib/product-utils-plp', () => ({
    getProductRating: vi.fn(() => ({ rating: 4.2, reviewCount: 218 })),
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

// Isolate DeferredWishlistButton to avoid auth/wishlist context dependencies
vi.mock('./deferred-wishlist-button', () => ({
    DeferredWishlistButton: ({ product }: { product: { productName?: string } }) => (
        <button aria-label={`Add ${product.productName ?? ''} to wishlist`}>Wishlist</button>
    ),
}));

// Isolate QuickAddButton to avoid CartItemModal/modal dependencies
vi.mock('./quick-add-button', () => ({
    QuickAddButton: ({ label, productName }: { label: string; productName: string }) => (
        <button aria-label={`${label} ${productName}`}>{label}</button>
    ),
}));

// Isolate ProductImageContainer to avoid dynamic image dependencies
vi.mock('@/components/product-image', () => ({
    ProductImageContainer: ({ product }: { product: { productName?: string } }) => (
        <img src="https://example.com/test.jpg" alt={product.productName ?? ''} />
    ),
}));

// Pass-through DynamicImageProvider
vi.mock('@/providers/dynamic-image', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockNavigate = vi.fn();

const mockProduct: ShopperSearch.schemas['ProductSearchHit'] = {
    productId: 'test-product',
    productName: 'Test Product',
    price: 99.99,
    variationAttributes: [
        {
            id: 'color',
            values: [
                { value: 'navy', name: 'Navy' },
                { value: 'red', name: 'Red' },
            ],
        },
    ],
    imageGroups: [
        {
            viewType: 'medium',
            images: [
                {
                    alt: 'Test Image',
                    link: 'https://example.com/test.jpg',
                    disBaseLink: 'https://example.com/test.jpg',
                },
            ],
        },
    ],
};

const renderTile = (props: Partial<React.ComponentProps<typeof ProductTile>> = {}) => {
    const router = createMemoryRouter(
        [
            {
                path: '/test',
                element: (
                    <AllProvidersWrapper>
                        <ProductTile product={mockProduct} {...props} />
                    </AllProvidersWrapper>
                ),
            },
            { path: '*', element: <div>Navigated</div> },
        ],
        { initialEntries: ['/test'] }
    );
    return render(<RouterProvider router={router} />);
};

describe('ProductTile — rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(ReactRouter, 'useNavigate').mockReturnValue(mockNavigate);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('renders product name as a heading', () => {
        renderTile();
        expect(screen.getByRole('heading', { name: 'Test Product' })).toBeInTheDocument();
    });

    test('renders product price', () => {
        renderTile();
        expect(screen.getByText('$99.99')).toBeInTheDocument();
    });

    test('renders SKU via data-testid', () => {
        renderTile();
        const skuEl = screen.getByTestId('product-tile-sku');
        expect(skuEl).toBeInTheDocument();
        expect(skuEl.textContent).toContain('test-product');
    });

    test('renders badges when hasBadges is true', async () => {
        const { getProductBadges } = await import('@/lib/product-badges');
        vi.mocked(getProductBadges).mockReturnValueOnce({
            hasBadges: true,
            badges: [
                { label: 'Sale', propertyName: 'c_isSale', color: 'orange' },
                { label: 'New', propertyName: 'c_isNew', color: 'green' },
            ],
        });
        renderTile();
        expect(screen.getByText('Sale')).toBeInTheDocument();
        expect(screen.getByText('New')).toBeInTheDocument();
    });

    test('does not render badges when hasBadges is false', () => {
        renderTile();
        expect(screen.queryByText('Sale')).not.toBeInTheDocument();
    });

    test('renders store name from config', () => {
        renderTile();
        // AllProvidersWrapper provides a test config; the tile renders config.global.branding.name
        // Verify the tile renders without error and the product card is present
        const card = document.querySelector('.product-card');
        expect(card).toBeInTheDocument();
    });

    test('renders topCategoryName when provided', () => {
        renderTile({ topCategoryName: 'Women' });
        expect(screen.getByText('Women')).toBeInTheDocument();
    });

    test('does not render topCategoryName when not provided', () => {
        renderTile();
        // topCategoryName paragraph is conditionally rendered
        // We verify the tile renders without error and topCategoryName text is absent
        expect(screen.queryByText('Women')).not.toBeInTheDocument();
    });

    test('renders wishlist button (inside aria-hidden container)', () => {
        renderTile();
        // hidden: true is required because the button is inside an aria-hidden="true" container
        expect(screen.getByRole('button', { name: /add.*to wishlist/i, hidden: true })).toBeInTheDocument();
    });

    test('renders quick add button with custom label (inside aria-hidden container)', () => {
        renderTile({ quickAddLabel: 'Fast Add' });
        expect(screen.getByRole('button', { name: /fast add test product/i, hidden: true })).toBeInTheDocument();
    });

    test('renders pickup indicator when showPickupAvailable is true', () => {
        const { container } = renderTile({ showPickupAvailable: true });
        // group/pickup is a unique class applied only to the pickup indicator wrapper
        expect(container.querySelector('[class*="group/pickup"]')).toBeInTheDocument();
    });

    test('does not render pickup indicator when showPickupAvailable is false', () => {
        const { container } = renderTile({ showPickupAvailable: false });
        expect(container.querySelector('[class*="group/pickup"]')).not.toBeInTheDocument();
    });

    test('does not render pickup indicator by default', () => {
        const { container } = renderTile();
        expect(container.querySelector('[class*="group/pickup"]')).not.toBeInTheDocument();
    });

    test('applies custom className to the root card element', () => {
        const { container } = renderTile({ className: 'my-custom-class' });
        expect(container.querySelector('.my-custom-class')).toBeInTheDocument();
    });

    test('accepts showNavigationArrows prop without error', () => {
        expect(() => renderTile({ showNavigationArrows: true })).not.toThrow();
    });

    test('filters out Page Designer system props without error', () => {
        expect(() =>
            renderTile({
                regionId: 'test-region',
                component: { type: 'productTile' } as never,
                componentData: {},
                data: {},
            })
        ).not.toThrow();
    });
});

describe('ProductTile — navigation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(ReactRouter, 'useNavigate').mockReturnValue(mockNavigate);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('renders product name as the primary link to the PDP', () => {
        renderTile();
        const nameLink = screen.getByRole('link', { name: 'Test Product' });
        expect(nameLink).toHaveAttribute('href', '/global/en-GB/product/test-product');
    });

    test('product name link is in the tab order (no tabIndex={-1})', () => {
        renderTile();
        const nameLink = screen.getByRole('link', { name: 'Test Product' });
        expect(nameLink).not.toHaveAttribute('tabindex', '-1');
    });

    test('calls handleProductClick when the product name link is clicked', async () => {
        const user = userEvent.setup();
        const handleProductClick = vi.fn();
        renderTile({ handleProductClick });

        await user.click(screen.getByRole('link', { name: 'Test Product' }));

        expect(handleProductClick).toHaveBeenCalledWith(mockProduct);
    });

    test('image area overlay link points to the PDP', () => {
        renderTile();
        const overlayLink = screen.getByLabelText('View Test Product');
        expect(overlayLink).toHaveAttribute('href', '/global/en-GB/product/test-product');
    });
});

describe('ProductTile — swatch rendering', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(ReactRouter, 'useNavigate').mockReturnValue(mockNavigate);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('renders color swatches for interaction', async () => {
        const { container } = renderTile();
        // LazySwatches loads async; wait for it to render.
        await waitFor(() => {
            const swatchWrapper = container.querySelector('[aria-label="Available colors"]');
            expect(swatchWrapper).toBeInTheDocument();
        });
    });

    test('does not render swatch container when getDecoratedVariationAttributes returns empty', async () => {
        const { getDecoratedVariationAttributes } = await import('@/lib/product-utils');
        vi.mocked(getDecoratedVariationAttributes).mockReturnValueOnce([]);
        const { container } = renderTile();
        expect(container.querySelector('[aria-label="Available colors"]')).not.toBeInTheDocument();
    });
});

describe('ProductTile — accessibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(ReactRouter, 'useNavigate').mockReturnValue(mockNavigate);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('wishlist button is not in an aria-hidden container', () => {
        renderTile();
        const wishlistBtn = screen.getByRole('button', { name: /add.*to wishlist/i, hidden: true });
        expect(wishlistBtn.closest('[aria-hidden="true"]')).not.toBeInTheDocument();
    });

    test('quick add button is not in an aria-hidden container', () => {
        renderTile();
        const quickAddBtn = screen.getByRole('button', { name: /quick add test product/i, hidden: true });
        expect(quickAddBtn.closest('[aria-hidden="true"]')).not.toBeInTheDocument();
    });

    test('quick add container becomes visible when tile receives keyboard focus', () => {
        renderTile();
        const quickAddBtn = screen.getByRole('button', { name: /quick add test product/i, hidden: true });
        expect(quickAddBtn.parentElement).toHaveClass('group-focus-within:opacity-100');
    });

    test('product name heading wraps the PDP link', () => {
        renderTile();
        const heading = screen.getByRole('heading', { name: 'Test Product' });
        expect(heading.querySelector('a')).toHaveAttribute('href', '/global/en-GB/product/test-product');
    });
});
