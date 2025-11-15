// Testing libraries
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// React Router
import { createMemoryRouter, RouterProvider, useFetchers } from 'react-router';

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts, ShopperPromotions } from '@salesforce/storefront-next-runtime/scapi';

// Components
import ProductItem from './index';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';

// Mock data
import { bundleProd as mockedBundleProduct } from '../__mocks__/bundle-product';

// Mock useFetchers
vi.mock('react-router', async () => {
    const actual = await vi.importActual('react-router');
    return {
        ...actual,
        useFetchers: vi.fn(),
    };
});

const mockUseFetchers = vi.mocked(useFetchers);

// Helper function to create mock fetchers
const createMockFetcher = (key: string, state: 'idle' | 'submitting' | 'loading') =>
    ({
        key,
        state,
        submit: vi.fn(),
    }) as unknown as ReturnType<typeof useFetchers>[0];

const renderWithRouter = (component: React.ReactElement) => {
    // Using createMemoryRouter in framework mode is fine
    // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
    // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
    const router = createMemoryRouter(
        [
            {
                path: '/cart',
                element: <ConfigProvider config={mockConfig}>{component}</ConfigProvider>,
            },
        ],
        { initialEntries: ['/cart'] }
    );

    return render(<RouterProvider router={router} />);
};

describe('ProductItem', () => {
    const mockProduct: ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']> = {
        id: 'test-product-id',
        itemId: 'item-1',
        productId: 'test-product-id',
        productName: 'Test Product',
        name: 'Test Product',
        price: 39.99,
        priceAfterItemDiscount: 29.99,
        pricePerUnit: 29.99,
        quantity: 2,
        variationValues: {
            color: 'red',
            size: 'medium',
        },
        variationAttributes: [
            {
                id: 'color',
                name: 'Color',
                values: [{ value: 'red', name: 'Red' }],
            },
            {
                id: 'size',
                name: 'Size',
                values: [{ value: 'medium', name: 'Medium' }],
            },
        ],
        imageGroups: [
            {
                viewType: 'small',
                images: [
                    {
                        disBaseLink: 'https://example.com/image.jpg',
                        link: 'https://example.com/image.jpg',
                        alt: 'Product image',
                    },
                ],
            },
        ],
        showInventoryMessage: false,
        inventoryMessage: '',
    };

    const mockPrimaryAction = (
        _product: ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>
    ) => <button data-testid="primary-action">Update Quantity</button>;
    const mockSecondaryActions = (
        product: ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>
    ) => <button data-testid={`remove-item-${product.itemId}`}>Remove Item</button>;

    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock: no active fetchers
        mockUseFetchers.mockReturnValue([]);
    });

    describe('ProductItem', () => {
        test('renders product item properly', () => {
            renderWithRouter(<ProductItem productItem={mockProduct} />);

            // check for all data on screen
            // product title as link
            const link = screen.getByRole('link', { name: 'Test Product' });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', `/product/${mockProduct.productId}`);
            expect(link).toHaveTextContent('Test Product');

            // image
            const image = screen.getByRole('img');
            expect(image).toBeInTheDocument();
            expect(image).toHaveAttribute('src', 'https://example.com/image.jpg?sw=160&q=60');
            expect(image).toHaveAttribute('alt', 'Product image');

            expect(screen.getByText('Color: Red')).toBeInTheDocument();
            expect(screen.getByText('Size: Medium')).toBeInTheDocument();

            // Should render the quantity picker component
            const quantityPicker = screen.getByDisplayValue('2');
            expect(quantityPicker).toBeInTheDocument();

            // Price appears in both mobile and desktop views
            const priceElements = screen.getAllByText('$29.99');
            //Since we are using Tailwind css classes to show/hide (md:hidden),
            // JSDOM does not compute these classes into proper css properties
            // we can only assert if these two exists in DOM, but can't check the visibility
            // it can only visible on proper browser (or E2E tests)
            expect(priceElements).toHaveLength(2); // Mobile and desktop
        });

        test('does not render quantity text in default variant', () => {
            renderWithRouter(<ProductItem productItem={mockProduct} />);

            // In default variant, quantity is not displayed as text, only in the quantity picker
            expect(screen.queryByText('Qty: 2')).not.toBeInTheDocument();
        });

        test('renders inventory message when showInventoryMessage is true', () => {
            const productWithInventoryMessage = {
                ...mockProduct,
                showInventoryMessage: true,
                inventoryMessage: 'Low stock warning',
            };

            renderWithRouter(<ProductItem productItem={productWithInventoryMessage} />);

            expect(screen.getByText('Low stock warning')).toBeInTheDocument();
        });

        test('renders primary action and secondary actions', () => {
            renderWithRouter(
                <ProductItem
                    productItem={mockProduct}
                    primaryAction={mockPrimaryAction}
                    secondaryActions={mockSecondaryActions}
                />
            );

            // Primary action is rendered once with mobile-primary-action testid
            expect(screen.getByTestId('mobile-primary-action')).toBeInTheDocument();
            // Secondary actions are rendered
            expect(screen.getByTestId('remove-item-item-1')).toBeInTheDocument();
        });

        test('calls render prop functions with correct parameters', () => {
            const mockPrimaryActionSpy = vi.fn((_product) => (
                <button data-testid="primary-action">Update Quantity</button>
            ));
            const mockSecondaryActionsSpy = vi.fn((_product) => (
                <button data-testid={`remove-item-${_product.itemId}`}>Remove Item</button>
            ));

            renderWithRouter(
                <ProductItem
                    productItem={mockProduct}
                    primaryAction={mockPrimaryActionSpy}
                    secondaryActions={mockSecondaryActionsSpy}
                />
            );

            // Verify that render prop functions were called with correct parameters
            expect(mockPrimaryActionSpy).toHaveBeenCalledWith(expect.objectContaining(mockProduct));
            expect(mockSecondaryActionsSpy).toHaveBeenCalledWith(expect.objectContaining(mockProduct));
        });

        test('renders without primary action and secondary actions', () => {
            renderWithRouter(<ProductItem productItem={mockProduct} />);

            expect(screen.queryByTestId('mobile-primary-action')).not.toBeInTheDocument();
            expect(screen.queryByTestId('remove-item-item-1')).not.toBeInTheDocument();
        });

        test('does not show loading spinner when no fetchers are active', () => {
            renderWithRouter(<ProductItem productItem={mockProduct} />);

            // Verify that the component renders without errors
            expect(screen.getByTestId(`sf-product-item-${mockProduct.productId}`)).toBeInTheDocument();

            // Verify that loading spinner is not shown when no fetchers are active
            expect(screen.queryByTestId(`sf-product-item-loading-${mockProduct.productId}`)).not.toBeInTheDocument();
        });

        test('shows loading spinner when fetcher for this item is submitting', () => {
            // Mock fetchers with one active fetcher for this item
            mockUseFetchers.mockReturnValue([
                createMockFetcher(`${mockProduct.itemId}-cart-quantity-picker`, 'submitting'),
            ]);

            renderWithRouter(<ProductItem productItem={mockProduct} />);

            // Verify that loading spinner is shown
            expect(screen.getByTestId(`sf-product-item-loading-${mockProduct.productId}`)).toBeInTheDocument();
        });

        test('does not show loading spinner when fetcher for different item is submitting', () => {
            // Mock fetchers with one active fetcher for a different item
            mockUseFetchers.mockReturnValue([
                createMockFetcher('different-item-id-cart-quantity-picker', 'submitting'),
            ]);

            renderWithRouter(<ProductItem productItem={mockProduct} />);

            // Verify that loading spinner is not shown for this item
            expect(screen.queryByTestId(`sf-product-item-loading-${mockProduct.productId}`)).not.toBeInTheDocument();
        });

        test('shows loading spinner when any fetcher for this item is submitting', () => {
            // Mock fetchers with multiple active fetchers for this item
            mockUseFetchers.mockReturnValue([
                createMockFetcher(`${mockProduct.itemId}-cart-quantity-picker`, 'idle'),
                createMockFetcher(`${mockProduct.itemId}-remove-item-button`, 'submitting'),
            ]);

            renderWithRouter(<ProductItem productItem={mockProduct} />);

            // Verify that loading spinner is shown when any fetcher is submitting
            expect(screen.getByTestId(`sf-product-item-loading-${mockProduct.productId}`)).toBeInTheDocument();
        });

        test('does not show loading spinner when fetcher for this item is idle', () => {
            // Mock fetchers with one idle fetcher for this item
            mockUseFetchers.mockReturnValue([createMockFetcher(`${mockProduct.itemId}-cart-quantity-picker`, 'idle')]);

            renderWithRouter(<ProductItem productItem={mockProduct} />);

            // Verify that loading spinner is not shown when fetcher is idle
            expect(screen.queryByTestId(`sf-product-item-loading-${mockProduct.productId}`)).not.toBeInTheDocument();
        });

        test('handles missing itemId gracefully', () => {
            const productWithoutItemId = {
                ...mockProduct,
                itemId: undefined,
            };

            // Mock fetchers with active fetchers
            mockUseFetchers.mockReturnValue([createMockFetcher('some-item-id-cart-quantity-picker', 'submitting')]);

            renderWithRouter(<ProductItem productItem={productWithoutItemId} />);

            // Verify that loading spinner is not shown when itemId is missing
            expect(screen.queryByTestId(`sf-product-item-loading-${mockProduct.productId}`)).not.toBeInTheDocument();
        });
    });

    describe('Summary variant', () => {
        test('renders summary variant with row layout for price', () => {
            renderWithRouter(<ProductItem productItem={mockProduct} displayVariant="summary" />);

            // In summary variant, the price is currently commented out in the row layout
            // So we just verify the summary variant renders successfully
            expect(screen.getByTestId('sf-product-item-summary-test-product-id')).toBeInTheDocument();
        });

        test('renders summary variant with quantity included', () => {
            renderWithRouter(<ProductItem productItem={mockProduct} displayVariant="summary" />);

            // In summary variant, quantity is shown as "Qty: 2" text
            expect(screen.getByText('Qty: 2')).toBeInTheDocument();
        });

        test('renders summary variant with smaller image width', () => {
            renderWithRouter(<ProductItem productItem={mockProduct} displayVariant="summary" />);

            const imageContainer = screen.getByRole('img').parentElement;
            expect(imageContainer).toHaveClass('w-20');
        });
    });

    describe('Edge cases', () => {
        test('handles missing product data gracefully', () => {
            const emptyProduct = {} as ShopperBasketsV2.schemas['ProductItem'] &
                Partial<ShopperProducts.schemas['Product']>;

            renderWithRouter(<ProductItem productItem={emptyProduct} />);

            expect(screen.getByTestId('sf-product-item-undefined')).toBeInTheDocument();
            expect(screen.getByText('Product Name')).toBeInTheDocument(); // Default name
            const priceElements = screen.getAllByText('$0.00');
            expect(priceElements).toHaveLength(2); // Mobile and desktop
        });

        test('handles product with only productId', () => {
            const minimalProduct = {
                productId: 'minimal-product-id',
            } as ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>;

            renderWithRouter(<ProductItem productItem={minimalProduct} />);

            expect(screen.getByTestId('sf-product-item-minimal-product-id')).toBeInTheDocument();
            expect(screen.getByText('Product Name')).toBeInTheDocument();
        });

        test('handles product with only id (no productId)', () => {
            const productWithIdOnly = {
                id: 'product-with-id-only',
            } as ShopperBasketsV2.schemas['ProductItem'] & Partial<ShopperProducts.schemas['Product']>;

            renderWithRouter(<ProductItem productItem={productWithIdOnly} />);

            expect(screen.getByTestId('sf-product-item-product-with-id-only')).toBeInTheDocument();
        });

        test('handles missing image groups', () => {
            const productWithoutImages = {
                ...mockProduct,
                imageGroups: undefined,
            };

            renderWithRouter(<ProductItem productItem={productWithoutImages} />);

            // Should render placeholder div instead of image
            const imageContainer = document.querySelector('.bg-muted');
            expect(imageContainer).toBeInTheDocument();
            expect(imageContainer).toHaveClass('bg-muted');
        });

        test('handles missing variation attributes', () => {
            const productWithoutVariations = {
                ...mockProduct,
                variationAttributes: undefined,
                variationValues: undefined,
            };

            renderWithRouter(<ProductItem productItem={productWithoutVariations} />);

            // Should not render variation attributes
            expect(screen.queryByText('Color: Red')).not.toBeInTheDocument();
            expect(screen.queryByText('Size: Medium')).not.toBeInTheDocument();
        });

        test('handles zero quantity (defaults to 1)', () => {
            const productWithZeroQuantity = {
                ...mockProduct,
                quantity: 0,
            };

            renderWithRouter(<ProductItem productItem={productWithZeroQuantity} displayVariant="summary" />);

            // Component defaults to 1 when quantity is 0 (falsy)
            expect(screen.getByText('Qty: 1')).toBeInTheDocument();
        });

        test('handles undefined quantity (defaults to 1)', () => {
            const productWithoutQuantity = {
                ...mockProduct,
                quantity: undefined,
            };

            renderWithRouter(<ProductItem productItem={productWithoutQuantity} displayVariant="summary" />);

            expect(screen.getByText('Qty: 1')).toBeInTheDocument();
        });

        test('handles zero price', () => {
            const productWithZeroPrice = {
                ...mockProduct,
                price: 0,
                priceAfterItemDiscount: 0,
            };

            renderWithRouter(<ProductItem productItem={productWithZeroPrice} />);

            // Check that price appears in both mobile and desktop views
            const priceElements = screen.getAllByText('$0.00');
            expect(priceElements).toHaveLength(2); // Mobile and desktop
        });

        test('handles missing price (defaults to 0)', () => {
            const productWithoutPrice = {
                ...mockProduct,
                price: undefined,
                priceAfterItemDiscount: undefined,
            };

            renderWithRouter(<ProductItem productItem={productWithoutPrice} />);

            // Check that price appears in both mobile and desktop views
            const priceElements = screen.getAllByText('$0.00');
            expect(priceElements).toHaveLength(2); // Mobile and desktop
        });
    });

    describe('Product name fallbacks', () => {
        test('uses productName when available', () => {
            const productWithProductName = {
                ...mockProduct,
                productName: 'Product Name',
                name: 'Fallback Name',
            };

            renderWithRouter(<ProductItem productItem={productWithProductName} />);

            const link = screen.getByRole('link', { name: 'Product Name' });
            expect(link).toHaveTextContent('Product Name');
        });

        test('falls back to name when productName is not available', () => {
            const productWithNameOnly = {
                ...mockProduct,
                productName: undefined,
                name: 'Fallback Name',
            };

            renderWithRouter(<ProductItem productItem={productWithNameOnly} />);

            const link = screen.getByRole('link', { name: 'Fallback Name' });
            expect(link).toHaveTextContent('Fallback Name');
        });

        test('falls back to default name when neither productName nor name is available', () => {
            const productWithoutNames = {
                ...mockProduct,
                productName: undefined,
                name: undefined,
            };

            renderWithRouter(<ProductItem productItem={productWithoutNames} />);

            const link = screen.getByRole('link', { name: 'Product Name' });
            expect(link).toHaveTextContent('Product Name');
        });
    });

    describe('Product ID fallbacks', () => {
        test('uses master.masterId when available', () => {
            const productWithMaster = {
                ...mockProduct,
                master: { masterId: 'master-product-id' },
                id: 'variant-id',
                productId: 'variant-product-id',
            };

            renderWithRouter(<ProductItem productItem={productWithMaster} />);

            const link = screen.getByRole('link', { name: 'Test Product' });
            expect(link).toHaveAttribute('href', '/product/master-product-id');
        });
    });

    describe('Price calculation', () => {
        test('uses priceAfterItemDiscount when available', () => {
            const productWithDiscountPrice = {
                ...mockProduct,
                price: 39.99,
                priceAfterItemDiscount: 29.99,
            };

            renderWithRouter(<ProductItem productItem={productWithDiscountPrice} />);

            // Component uses priceAfterItemDiscount directly
            const priceElements = screen.getAllByText('$29.99');
            expect(priceElements).toHaveLength(2); // Mobile and desktop price elements
        });

        test('handles missing priceAfterItemDiscount gracefully', () => {
            const productWithoutDiscountPrice = {
                ...mockProduct,
                price: 39.99,
                priceAfterItemDiscount: undefined,
            };

            renderWithRouter(<ProductItem productItem={productWithoutDiscountPrice} />);

            // Component should handle undefined priceAfterItemDiscount gracefully
            // This might show $0.00 or handle it in some other way
            const priceElements = screen.getAllByText('$0.00');
            expect(priceElements).toHaveLength(2); // Mobile and desktop price elements
        });
    });

    describe('PromoPopover and promotion info', () => {
        const mockPromotions: Record<string, ShopperPromotions.schemas['Promotion']> = {
            'promo-1': {
                id: 'promo-1',
                calloutMsg: '<strong>20% Off!</strong> Limited time offer',
                name: 'Summer Sale',
                description: 'Get 20% off on all summer items',
            },
            'promo-2': {
                id: 'promo-2',
                calloutMsg: 'Free shipping on orders over $50',
                name: 'Free Shipping',
                description: 'Complimentary shipping for qualifying orders',
            },
        };

        test('renders PromoPopover properly when product has promotions', () => {
            const productWithPromotions = {
                ...mockProduct,
                price: 50.0,
                priceAfterItemDiscount: 40.0,
                priceAdjustments: [{ promotionId: 'promo-1', itemText: '20% discount applied', price: -10 }],
            };

            renderWithRouter(<ProductItem productItem={productWithPromotions} promotions={mockPromotions} />);

            // Check that the PromoPopover trigger button is rendered and accessible
            const infoButton = screen.getByRole('button', { name: 'Info' });
            expect(infoButton).toBeInTheDocument();
            expect(infoButton).toBeVisible();
            // Check that the discount amount is displayed
            expect(screen.getByText('Promotions:')).toBeInTheDocument();

            expect(screen.getByText(/-\$10.00/)).toBeInTheDocument();
        });

        test('displays promotion messages in PromoPopover on hover', async () => {
            const user = userEvent.setup();
            const productWithPromotions = {
                ...mockProduct,
                priceAdjustments: [
                    { promotionId: 'promo-1', itemText: '20% discount applied' },
                    { promotionId: 'promo-2', itemText: 'Free shipping applied' },
                ],
            };

            renderWithRouter(<ProductItem productItem={productWithPromotions} promotions={mockPromotions} />);

            // Check that the info button is present for users to interact with
            const infoButton = screen.getByRole('button', { name: 'Info' });
            expect(infoButton).toBeInTheDocument();
            expect(infoButton).toBeVisible();

            // Hover over the info button to trigger tooltip
            await user.hover(infoButton);

            // Wait for tooltip to appear and check for promotion content
            await waitFor(() => {
                // one for visiable and one for hidden for a11y
                // Check that promotion messages are displayed
                const promo1MessagesFirstHalf = screen.getAllByText(/20% Off!/);
                expect(promo1MessagesFirstHalf.length).toBe(2);

                const promo1MessagesSecondHalf = screen.getAllByText(/Limited time offer/);
                expect(promo1MessagesSecondHalf.length).toBe(2);

                const promo2Messages = screen.getAllByText(/Free shipping on orders over \$50/);
                expect(promo2Messages.length).toBe(2); // one for visible and one for hidden for a11y
            });
        });

        test('does not render PromoPopover when no promotions or discounts', () => {
            const productWithoutPromotions = {
                ...mockProduct,
                priceAdjustments: undefined,
                price: 29.99,
                priceAfterItemDiscount: 29.99, // Same as price, no discount
            };

            renderWithRouter(<ProductItem productItem={productWithoutPromotions} />);

            // PromoPopover should not be rendered
            expect(screen.queryByRole('button', { name: 'Info' })).not.toBeInTheDocument();
            expect(screen.queryByText('Promotions:')).not.toBeInTheDocument();
        });

        test('handles missing promotions gracefully', () => {
            const productWithPromotions = {
                ...mockProduct,
                priceAdjustments: [{ promotionId: 'promo-1', itemText: '20% discount applied' }],
            };

            renderWithRouter(<ProductItem productItem={productWithPromotions} />);

            // Should still render the PromoPopover trigger for user interaction
            const infoButton = screen.getByRole('button', { name: 'Info' });
            expect(infoButton).toBeInTheDocument();
            expect(infoButton).toBeVisible();
        });

        test('render properly when no promotions', () => {
            const productWithEmptyAdjustments = {
                ...mockProduct,
                priceAdjustments: [],
                price: 29.99,
                priceAfterItemDiscount: 29.99,
            };

            renderWithRouter(<ProductItem productItem={productWithEmptyAdjustments} />);

            // PromoPopover should not be rendered
            expect(screen.queryByRole('button', { name: 'Info' })).not.toBeInTheDocument();
        });

        test('handles very large discount amounts', () => {
            const productWithLargeDiscount = {
                ...mockProduct,
                price: 999.99,
                priceAfterItemDiscount: 0.01, // Almost free
                priceAdjustments: [{ promotionId: 'promo-1', itemText: 'Large discount', price: -999.98 }],
            };

            renderWithRouter(<ProductItem productItem={productWithLargeDiscount} />);

            // Should display the large discount amount correctly
            expect(screen.getByText(/-\$999.98/)).toBeInTheDocument();
        });

        // NOTE: adjust this test when display price is implemented
        test('displays correct discount calculation for zero original price', () => {
            const productWithZeroPrice = {
                ...mockProduct,
                price: 0,
                priceAfterItemDiscount: 0,
            };

            renderWithRouter(<ProductItem productItem={productWithZeroPrice} />);

            // Should show $0.00 discount in both mobile and desktop views
            const priceElements = screen.getAllByText('$0.00');
            expect(priceElements).toHaveLength(2); // Mobile and desktop price elements
        });

        test('render properly for bonus product', () => {
            const productWithEmptyAdjustments = {
                ...mockProduct,
                bonusProductLineItem: true,
                priceAdjustments: [{ promotionId: 'promo-1', itemText: 'bonus product' }],
                price: 29.99,
                priceAfterItemDiscount: 29.99,
            };

            renderWithRouter(<ProductItem productItem={productWithEmptyAdjustments} />);

            // PromoPopover should not be rendered
            expect(screen.queryByRole('button', { name: 'Info' })).not.toBeInTheDocument();
        });
    });

    describe('Bonus Products', () => {
        test('identifies bonus product correctly when bonusProductLineItem is true', () => {
            const bonusProduct = {
                ...mockProduct,
                bonusProductLineItem: true,
                bonusDiscountLineItemId: 'bonus-discount-1',
            };

            renderWithRouter(<ProductItem productItem={bonusProduct} />);

            // Check for bonus product badge
            expect(screen.getByText('Bonus Product')).toBeInTheDocument();
        });

        test('does not show bonus badge for regular product', () => {
            const regularProduct = {
                ...mockProduct,
                bonusProductLineItem: false,
            };

            renderWithRouter(<ProductItem productItem={regularProduct} />);

            // Should not show bonus product badge
            expect(screen.queryByText('Bonus Product')).not.toBeInTheDocument();
        });

        test('shows strikethrough original price for bonus product', () => {
            const bonusProduct = {
                ...mockProduct,
                bonusProductLineItem: true,
                price: 39.99,
                pricePerUnit: 39.99,
            };

            renderWithRouter(<ProductItem productItem={bonusProduct} />);

            // Should show original price with strikethrough
            const originalPriceElements = screen.getAllByText('$39.99');
            expect(originalPriceElements.length).toBeGreaterThanOrEqual(1);

            // Check that at least one has line-through class
            const hasLineThrough = originalPriceElements.some((el) => el.className.includes('line-through'));
            expect(hasLineThrough).toBe(true);
        });

        test('disables quantity picker for bonus product', () => {
            const bonusProduct = {
                ...mockProduct,
                bonusProductLineItem: true,
                quantity: 1,
            };

            renderWithRouter(<ProductItem productItem={bonusProduct} />);

            // Quantity picker input should be disabled
            const quantityInput = screen.getByRole('spinbutton');
            expect(quantityInput).toBeDisabled();
        });

        test('shows correct quantity for bonus product', () => {
            const bonusProduct = {
                ...mockProduct,
                bonusProductLineItem: true,
                quantity: 2,
            };

            renderWithRouter(<ProductItem productItem={bonusProduct} />);

            // Quantity picker should show the actual quantity value
            const quantityInput = screen.getByRole('spinbutton');
            expect(quantityInput).toHaveValue(2);
            expect(quantityInput).toBeDisabled();
        });

        test('handles bonus product with all required fields', () => {
            const completeBonusProduct = {
                ...mockProduct,
                bonusProductLineItem: true,
                bonusDiscountLineItemId: 'bonus-discount-123',
                price: 49.99,
                pricePerUnit: 49.99,
                quantity: 1,
                productName: 'Free Bonus Tie',
            };

            renderWithRouter(<ProductItem productItem={completeBonusProduct} />);

            // Verify all bonus product elements that ARE implemented
            expect(screen.getByText('Bonus Product')).toBeInTheDocument();
            expect(screen.getByText('Free Bonus Tie')).toBeInTheDocument();

            // Check for $0.00 price (appears in both mobile and desktop views)
            const zeroPriceElements = screen.getAllByText('$0.00');
            expect(zeroPriceElements.length).toBeGreaterThanOrEqual(1);

            // Check for original price (appears in both mobile and desktop views)
            const originalPriceElements = screen.getAllByText('$49.99');
            expect(originalPriceElements.length).toBeGreaterThanOrEqual(1);
        });

        test('hides both primary and secondary actions for bonus product', () => {
            const bonusProduct = {
                ...mockProduct,
                bonusProductLineItem: true,
            };

            renderWithRouter(
                <ProductItem
                    productItem={bonusProduct}
                    primaryAction={mockPrimaryAction}
                    secondaryActions={mockSecondaryActions}
                />
            );

            // Both primary and secondary actions should be hidden
            expect(screen.queryByTestId('mobile-primary-action')).not.toBeInTheDocument();
            expect(screen.queryByTestId('primary-action')).not.toBeInTheDocument();
            expect(screen.queryByTestId(`remove-item-${mockProduct.itemId}`)).not.toBeInTheDocument();
        });
    });

    describe('Bundled Products', () => {
        test('renders BundledProductItems when product is a bundle', () => {
            // Use first bundled product from mock (Turquoise and Gold Bracelet)
            const productWithBundle = {
                ...mockedBundleProduct,
                bundledProducts: mockedBundleProduct.bundledProducts ? [mockedBundleProduct.bundledProducts[0]] : [],
            };
            renderWithRouter(<ProductItem productItem={productWithBundle} />);

            // Testing against the first bundled product (Turquoise and Gold Bracelet)
            // Check that bundled product name is rendered
            expect(screen.getByText('Turquoise and Gold Bracelet')).toBeInTheDocument();

            // Check that bundled product variation attributes are rendered
            expect(screen.getByText(/Color: Gold/)).toBeInTheDocument();

            // Check that bundled product quantity is rendered
            expect(screen.getByText(/Qty: 1/)).toBeInTheDocument();
        });

        test('renders multiple bundled products', () => {
            // Use all three bundled products from mock (Bracelet, Necklace, Earring)
            const productWithMultipleBundles = mockedBundleProduct;

            renderWithRouter(<ProductItem productItem={productWithMultipleBundles} />);

            // Check that all bundled products are rendered
            expect(screen.getByText('Turquoise and Gold Bracelet')).toBeInTheDocument();
            expect(screen.getByText('Turquoise and Gold Necklace')).toBeInTheDocument();
            expect(screen.getByText('Turquoise and Gold Hoop Earring')).toBeInTheDocument();

            // Check variation attributes for all products (they all have Color: Gold)
            const colorTexts = screen.getAllByText(/Color: Gold/);
            expect(colorTexts).toHaveLength(3);

            // Check quantities (all are Qty: 1)
            const qtyTexts = screen.getAllByText(/Qty: 1/);
            expect(qtyTexts).toHaveLength(3);
        });

        test('renders BundledProductItems in summary variant', () => {
            // Use second bundled product from mock (Turquoise and Gold Necklace)
            const productWithBundle = {
                ...mockedBundleProduct,
                bundledProducts: mockedBundleProduct.bundledProducts ? [mockedBundleProduct.bundledProducts[1]] : [],
            };

            renderWithRouter(<ProductItem productItem={productWithBundle} displayVariant="summary" />);

            // Check that bundled products are rendered in summary variant
            expect(screen.getByText('Turquoise and Gold Necklace')).toBeInTheDocument();
        });

        test('does not render BundledProductItems when the product is not a bundle', () => {
            const productWithoutBundle = {
                ...mockProduct,
                // no bundledProducts property
            };

            expect(productWithoutBundle.bundledProducts).toBeUndefined();
            renderWithRouter(<ProductItem productItem={productWithoutBundle} />);

            expect(screen.queryByTestId('bundledProductItems')).not.toBeInTheDocument();
        });

        test('still render bundled product that does not have variation attributes yet', () => {
            // Create a minimal bundled product without variation attributes
            const bundledProduct: ShopperProducts.schemas['BundledProduct'] = {
                id: 'bundle-simple',
                product: {
                    id: 'bundled-item-1',
                    name: 'Simple Bundled Product',
                    // no variationValues, no variationAttributes
                },
                quantity: 3,
            };

            const productWithBundle = {
                ...mockedBundleProduct,
                bundledProducts: [bundledProduct],
            };

            renderWithRouter(<ProductItem productItem={productWithBundle} />);

            // Check that bundled product is rendered without variation attributes
            expect(screen.getByText('Simple Bundled Product')).toBeInTheDocument();
            expect(screen.getByText(/Qty: 3/)).toBeInTheDocument();
        });
    });
});
