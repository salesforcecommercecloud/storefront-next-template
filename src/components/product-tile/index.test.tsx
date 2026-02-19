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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// eslint-disable-next-line import/no-namespace -- vi.spyOn requires namespace import
import * as ReactRouter from 'react-router';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { getTranslation } from '@/lib/i18next';

const { t } = getTranslation();
import { ProductTile } from './index';
import { type ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { ConfigWrapper } from '@/test-utils/config';
import { CurrencyProvider } from '@/providers/currency';

vi.mock('@/lib/product-utils', () => ({
    createProductUrl: vi.fn(() => '/product/test-product'),
    getImagesForColor: vi.fn(() => [
        {
            link: 'https://example.com/default1.jpg',
            disBaseLink: 'https://example.com/default1.jpg',
            alt: 'Default Image 1',
        },
        {
            link: 'https://example.com/default2.jpg',
            disBaseLink: 'https://example.com/default2.jpg',
            alt: 'Default Image 2',
        },
    ]),
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
                {
                    value: 'red',
                    name: 'Red',
                    swatch: { link: 'https://example.com/red.jpg', disBaseLink: 'https://example.com/red.jpg' },
                },
                {
                    value: 'blue',
                    name: 'Blue',
                    swatch: { link: 'https://example.com/blue.jpg', disBaseLink: 'https://example.com/blue.jpg' },
                },
                {
                    value: 'black',
                    name: 'Black',
                    swatch: { link: 'https://example.com/black.jpg', disBaseLink: 'https://example.com/black.jpg' },
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
        hasBadges: true,
        badges: [{ label: 'Sale' }, { label: 'New' }],
    })),
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
                { value: 'blue', name: 'Blue' },
                { value: 'black', name: 'Black' },
            ],
        },
    ],
    imageGroups: [
        {
            viewType: 'swatch',
            images: [
                {
                    alt: 'Navy swatch',
                    link: 'https://example.com/navy.jpg',
                    disBaseLink: 'https://example.com/navy.jpg',
                },
                {
                    alt: 'Red swatch',
                    link: 'https://example.com/red.jpg',
                    disBaseLink: 'https://example.com/red.jpg',
                },
            ],
        },
    ],
};

const renderComponent = (props = {}) => {
    // Using createMemoryRouter in framework mode is fine
    // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
    // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
    const router = createMemoryRouter(
        [
            {
                path: '/test',
                element: (
                    <ConfigWrapper>
                        <CurrencyProvider value="USD">
                            <ProductTile product={mockProduct} {...props} />
                        </CurrencyProvider>
                    </ConfigWrapper>
                ),
            },
            {
                path: '/product/:productId',
                element: <div>Product Page</div>,
            },
            // Catch-all route to prevent 404 errors when navigating
            {
                path: '*',
                element: <div>Navigated</div>,
            },
        ],
        { initialEntries: ['/test'] }
    );
    return render(<RouterProvider router={router} />);
};

describe('ProductTile', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Use vi.spyOn to mock useNavigate while keeping real router exports
        vi.spyOn(ReactRouter, 'useNavigate').mockReturnValue(mockNavigate);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('renders product information correctly', () => {
        renderComponent();

        expect(screen.getByText('Test Product')).toBeInTheDocument();
        expect(screen.getByText('$99.99')).toBeInTheDocument();
        expect(screen.getByText(t('product:moreOptions'))).toBeInTheDocument();
    });

    test('displays product badges', () => {
        renderComponent();

        expect(screen.getByText('Sale')).toBeInTheDocument();
        expect(screen.getByText('New')).toBeInTheDocument();
    });

    test('navigates to PDP when clicking product name', async () => {
        const user = userEvent.setup();
        renderComponent();

        const productLink = screen.getByRole('link', { name: 'Test Product' });
        await user.click(productLink);

        // Link should have correct href
        expect(productLink).toHaveAttribute('href', '/product/test-product');
    });

    test('navigates to PDP with selected attribute when clicking More Options', async () => {
        const user = userEvent.setup();
        renderComponent();

        // First select an attribute
        const swatches = screen
            .getAllByRole('button')
            .filter(
                (button) =>
                    button.className.includes('cursor-pointer') &&
                    !button.textContent?.includes(t('product:moreOptions'))
            );

        if (swatches.length > 1) {
            await user.click(swatches[1]); // Select 'small'
        }

        // Then click More Options button
        const moreOptionsButton = screen.getByText(t('product:moreOptions'));
        await user.click(moreOptionsButton);

        expect(mockNavigate).toHaveBeenCalledWith('/product/test-product');
    });

    test('applies custom className', () => {
        const customClass = 'custom-product-tile';
        const { container } = renderComponent({ className: customClass });

        // The className should be applied to the main ProductTile div (first child of the container)
        const productTileElement = container.querySelector('.border.rounded-xl');
        expect(productTileElement).toHaveClass(customClass);
    });
});

describe('ProductTile UI Variants', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(ReactRouter, 'useNavigate').mockReturnValue(mockNavigate);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('renders custom footer action when provided', () => {
        const customFooter = <button>Add to Cart</button>;
        renderComponent({ footerAction: customFooter });

        expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument();
        expect(screen.queryByText(/more options/i)).not.toBeInTheDocument();
    });
});
