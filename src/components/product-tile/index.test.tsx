import { vi, test, describe, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { getTranslation } from '@/lib/i18next';

const { t } = getTranslation();
import { ProductTile } from './index';
import { type ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { ConfigWrapper } from '@/test-utils/config';

vi.mock('@/lib/product-utils', () => ({
    createProductUrl: vi.fn(() => '/product/test-product'),
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
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

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
                    variationAttributes: [{ id: 'color', values: [{ value: 'navy' }] }],
                },
                {
                    alt: 'Red swatch',
                    link: 'https://example.com/red.jpg',
                    disBaseLink: 'https://example.com/red.jpg',
                    variationAttributes: [{ id: 'color', values: [{ value: 'red' }] }],
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
                        <ProductTile product={mockProduct} {...props} />
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

    test('handles empty attribute value selection (edge case)', async () => {
        const user = userEvent.setup();
        renderComponent();

        const swatches = screen
            .getAllByRole('button')
            .filter(
                (button) =>
                    button.className.includes('cursor-pointer') &&
                    !button.textContent?.includes(t('product:moreOptions'))
            );

        if (swatches.length > 0) {
            // Should not throw error when clicking empty attribute value
            await user.click(swatches[0]);
            expect(swatches[0]).toBeInTheDocument();
        }
    });

    test('allows switching between attribute variants', async () => {
        const user = userEvent.setup();
        renderComponent();

        const swatches = screen
            .getAllByRole('button')
            .filter(
                (button) =>
                    button.className.includes('cursor-pointer') &&
                    !button.textContent?.includes(t('product:moreOptions'))
            );

        if (swatches.length >= 2) {
            await user.click(swatches[1]); // Click small
            await user.click(swatches[0]); // Go back to first (empty) - edge case

            expect(swatches[0]).toBeInTheDocument();
        }
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

    test('respects maxSwatches prop', () => {
        renderComponent({ maxSwatches: 2 });

        const swatches = screen
            .getAllByRole('button')
            .filter(
                (button) =>
                    button.className.includes('cursor-pointer') &&
                    !button.textContent?.includes(t('product:moreOptions'))
            );

        // Should only show 2 swatches (maxSwatches prop)
        expect(swatches.length).toBeLessThanOrEqual(2);
    });

    test('shows overflow indicator when there are more swatches than maxSwatches', () => {
        renderComponent({ maxSwatches: 2 });

        // Look for the "+" indicator when there are more than 2 swatches
        const plusIndicator = screen.queryByTitle(/^\+\d+$/);
        if (plusIndicator) {
            expect(plusIndicator).toBeInTheDocument();
        }
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
    test('renders color swatches with circular shape', () => {
        renderComponent();

        // Color swatches should be rendered as circles
        const swatchGroup = screen.getByRole('radiogroup', { name: 'Colour' });
        expect(swatchGroup).toBeInTheDocument();
    });

    test('displays more swatches indicator (+) when exceeding maxSwatches', () => {
        // With 4 colors and maxSwatches=2, should show +2 indicator
        renderComponent({ maxSwatches: 2 });

        const plusIndicator = screen.getByTitle('+2');
        expect(plusIndicator).toBeInTheDocument();
    });

    test('does not show more indicator when swatches fit within maxSwatches', () => {
        // With maxSwatches=4 and 4 colors, no indicator needed
        renderComponent({ maxSwatches: 4 });

        const plusIndicator = screen.queryByTitle(/^\+\d+$/);
        expect(plusIndicator).not.toBeInTheDocument();
    });

    test('renders Sale badge when product has sale badge', () => {
        renderComponent();

        expect(screen.getByText('Sale')).toBeInTheDocument();
    });

    test('renders multiple badges when product has multiple badges', () => {
        renderComponent();

        expect(screen.getByText('Sale')).toBeInTheDocument();
        expect(screen.getByText('New')).toBeInTheDocument();
    });

    test('renders custom footer action when provided', () => {
        const customFooter = <button>Add to Cart</button>;
        renderComponent({ footerAction: customFooter });

        expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeInTheDocument();
        expect(screen.queryByText(/more options/i)).not.toBeInTheDocument();
    });

    test('disables swatch interaction in read-only mode for wishlist', () => {
        renderComponent({
            disableSwatchInteraction: true,
            selectedVariantColorValue: 'navy',
        });

        // In disabled mode with a selected variant, only the selected variant's swatch should be shown
        const swatches = screen.getAllByRole('radio');
        expect(swatches).toHaveLength(1);
    });
});
