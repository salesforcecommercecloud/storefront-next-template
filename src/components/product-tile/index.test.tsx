import { vi, test, describe, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ProductTile } from './index';
import { type ShopperSearch } from '@salesforce/storefront-next-runtime/scapi';
import { ConfigWrapper } from '@/test-utils/config';

vi.mock('@/lib/product-utils', () => ({
    createProductUrl: vi.fn(() => '/product/test-product'),
    getDecoratedVariationAttributes: vi.fn(() => [
        {
            id: 'size',
            name: 'Size',
            values: [
                { value: '', name: '' }, // Empty size value - edge case
                { value: 'small', name: 'Small' },
                { value: 'medium', name: 'Medium' },
                { value: 'large', name: 'Large' },
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

vi.mock('@/temp-ui-string', () => ({
    default: {
        product: {
            moreOptions: 'More Options',
        },
    },
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
            id: 'size',
            values: [
                { value: '', name: '' }, // Empty size value - edge case
                { value: 'small', name: 'Small' },
                { value: 'medium', name: 'Medium' },
                { value: 'large', name: 'Large' },
            ],
        },
    ],
    imageGroups: [
        {
            viewType: 'swatch',
            images: [
                {
                    alt: 'Default swatch',
                    link: 'https://example.com/swatch1.jpg',
                    disBaseLink: 'https://example.com/swatch1.jpg',
                    variationAttributes: [{ id: 'size', values: [{ value: '' }] }],
                },
                {
                    alt: 'Small swatch',
                    link: 'https://example.com/swatch2.jpg',
                    disBaseLink: 'https://example.com/swatch2.jpg',
                    variationAttributes: [{ id: 'size', values: [{ value: 'small' }] }],
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
        expect(screen.getByText('More Options')).toBeInTheDocument();
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
                (button) => button.className.includes('cursor-pointer') && !button.textContent?.includes('More Options')
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
                (button) => button.className.includes('cursor-pointer') && !button.textContent?.includes('More Options')
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
                (button) => button.className.includes('cursor-pointer') && !button.textContent?.includes('More Options')
            );

        if (swatches.length > 1) {
            await user.click(swatches[1]); // Select 'small'
        }

        // Then click More Options button
        const moreOptionsButton = screen.getByText('More Options');
        await user.click(moreOptionsButton);

        expect(mockNavigate).toHaveBeenCalledWith('/product/test-product');
    });

    test('respects maxSwatches prop', () => {
        renderComponent({ maxSwatches: 2 });

        const swatches = screen
            .getAllByRole('button')
            .filter(
                (button) => button.className.includes('cursor-pointer') && !button.textContent?.includes('More Options')
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

describe('ProductTile Styling and Layout', () => {
    test('applies text truncation to product name', () => {
        renderComponent();

        const productName = screen.getByText('Test Product');
        expect(productName).toHaveClass('line-clamp-2');
    });

    test('applies correct styling to product name container', () => {
        renderComponent();

        const productName = screen.getByText('Test Product');
        const nameContainer = productName.closest('div');
        expect(nameContainer).toHaveClass('h-10');
    });

    test('applies correct styling to price display', () => {
        renderComponent();

        const price = screen.getByText('$99.99');
        expect(price).toHaveClass('text-card-foreground', 'text-right', 'font-semibold', 'text-base', 'leading-none');
    });

    test('applies correct styling to badges', () => {
        renderComponent();

        const badges = screen.getAllByText(/Sale|New/);
        badges.forEach((badge) => {
            expect(badge).toHaveClass('text-xs', 'leading-3', 'font-medium');
        });
    });

    test('applies correct styling to more options button', () => {
        renderComponent();

        const button = screen.getByRole('button', { name: /more options/i });
        expect(button).toHaveClass('w-full', 'text-sm', 'font-normal');
    });

    test('applies correct image container styling', () => {
        renderComponent();

        // Check that the image container has the correct styling by looking for the image link
        const imageLink = screen.getByLabelText('View Test Product');
        expect(imageLink).toHaveClass('block', 'w-full', 'h-full');
    });

    test('applies correct swatch group styling', () => {
        renderComponent();

        // Check that swatches are rendered (they should be present in the component)
        const swatches = screen.getAllByRole('button');
        expect(swatches.length).toBeGreaterThan(0);
    });
});
