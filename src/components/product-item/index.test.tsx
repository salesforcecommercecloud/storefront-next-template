// Testing libraries
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// React Router
import { createRoutesStub, useFetchers } from 'react-router';

// Commerce SDK
import type { ShopperBasketsTypes, ShopperProductsTypes, ShopperPromotionsTypes } from 'commerce-sdk-isomorphic';

// Components
import ProductItem from './index';

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
    const Stub = createRoutesStub([
        {
            path: '/cart',
            Component: () => component,
        },
    ]);

    return render(<Stub initialEntries={['/cart']} />);
};

describe('ProductItem', () => {
    const mockProduct: ShopperBasketsTypes.ProductItem & Partial<ShopperProductsTypes.Product> = {
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

    const mockPrimaryAction = (_product: ShopperBasketsTypes.ProductItem & Partial<ShopperProductsTypes.Product>) => (
        <button data-testid="primary-action">Update Quantity</button>
    );
    const mockSecondaryActions = (product: ShopperBasketsTypes.ProductItem & Partial<ShopperProductsTypes.Product>) => (
        <button data-testid={`remove-item-${product.itemId}`}>Remove Item</button>
    );

    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock: no active fetchers
        mockUseFetchers.mockReturnValue([]);
    });

    describe('Default variant', () => {
        test('renders product image', () => {
            renderWithRouter(<ProductItem product={mockProduct} />);

            const image = screen.getByRole('img');
            expect(image).toBeInTheDocument();
            expect(image).toHaveAttribute('src', 'https://example.com/image.jpg?sw=80&q=60');
            expect(image).toHaveAttribute('alt', 'Product image');
        });

        test('renders product name as link', () => {
            renderWithRouter(<ProductItem product={mockProduct} />);

            const link = screen.getByRole('link');
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', `/product/${mockProduct.productId}`);
            expect(link).toHaveTextContent('Test Product');
        });

        test('renders variation attributes', () => {
            renderWithRouter(<ProductItem product={mockProduct} />);

            expect(screen.getByText('Color: Red')).toBeInTheDocument();
            expect(screen.getByText('Size: Medium')).toBeInTheDocument();
        });

        test('does not render quantity text in default variant', () => {
            renderWithRouter(<ProductItem product={mockProduct} />);

            // In default variant, quantity is not displayed as text, only in the quantity picker
            expect(screen.queryByText('Qty: 2')).not.toBeInTheDocument();
        });

        test('renders CartQuantityPicker in default variant', () => {
            renderWithRouter(<ProductItem product={mockProduct} />);

            // Should render the quantity picker component
            const quantityPicker = screen.getByDisplayValue('2');
            expect(quantityPicker).toBeInTheDocument();
        });

        test('renders price information', () => {
            renderWithRouter(<ProductItem product={mockProduct} />);

            // Price appears in both mobile and desktop views
            const priceElements = screen.getAllByText('$29.99');
            expect(priceElements).toHaveLength(2); // Mobile and desktop
        });

        test('renders price per unit when different from total price', () => {
            const productWithPricePerUnit = {
                ...mockProduct,
                price: 59.98,
                priceAfterItemDiscount: 59.98, // Set the actual price to use
                pricePerUnit: 29.99,
            };

            renderWithRouter(<ProductItem product={productWithPricePerUnit} />);

            // Main price should be $59.98 (priceAfterItemDiscount)
            const mainPriceElements = screen.getAllByText('$59.98');
            expect(mainPriceElements).toHaveLength(2); // Mobile and desktop

            // Price per unit should be $29.99 each
            const pricePerUnitElements = screen.getAllByText('$29.99 each');
            expect(pricePerUnitElements).toHaveLength(2); // Mobile and desktop
        });

        test('renders inventory message when showInventoryMessage is true', () => {
            const productWithInventoryMessage = {
                ...mockProduct,
                showInventoryMessage: true,
                inventoryMessage: 'Low stock warning',
            };

            renderWithRouter(<ProductItem product={productWithInventoryMessage} />);

            expect(screen.getByText('Low stock warning')).toBeInTheDocument();
        });

        test('renders primary action and secondary actions', () => {
            renderWithRouter(
                <ProductItem
                    product={mockProduct}
                    primaryAction={mockPrimaryAction}
                    secondaryActions={mockSecondaryActions}
                />
            );

            expect(screen.getByTestId('desktop-primary-action')).toBeInTheDocument();
            expect(screen.getByTestId('mobile-primary-action')).toBeInTheDocument();
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
                    product={mockProduct}
                    primaryAction={mockPrimaryActionSpy}
                    secondaryActions={mockSecondaryActionsSpy}
                />
            );

            // Verify that render prop functions were called with correct parameters
            expect(mockPrimaryActionSpy).toHaveBeenCalledWith(expect.objectContaining(mockProduct));
            expect(mockSecondaryActionsSpy).toHaveBeenCalledWith(expect.objectContaining(mockProduct));
        });

        test('renders without primary action and secondary actions', () => {
            renderWithRouter(<ProductItem product={mockProduct} />);

            expect(screen.queryByTestId('desktop-primary-action')).not.toBeInTheDocument();
            expect(screen.queryByTestId('mobile-primary-action')).not.toBeInTheDocument();
            expect(screen.queryByTestId('remove-item-item-1')).not.toBeInTheDocument();
        });

        test('does not show loading spinner when no fetchers are active', () => {
            renderWithRouter(<ProductItem product={mockProduct} />);

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

            renderWithRouter(<ProductItem product={mockProduct} />);

            // Verify that loading spinner is shown
            expect(screen.getByTestId(`sf-product-item-loading-${mockProduct.productId}`)).toBeInTheDocument();
        });

        test('does not show loading spinner when fetcher for different item is submitting', () => {
            // Mock fetchers with one active fetcher for a different item
            mockUseFetchers.mockReturnValue([
                createMockFetcher('different-item-id-cart-quantity-picker', 'submitting'),
            ]);

            renderWithRouter(<ProductItem product={mockProduct} />);

            // Verify that loading spinner is not shown for this item
            expect(screen.queryByTestId(`sf-product-item-loading-${mockProduct.productId}`)).not.toBeInTheDocument();
        });

        test('shows loading spinner when any fetcher for this item is submitting', () => {
            // Mock fetchers with multiple active fetchers for this item
            mockUseFetchers.mockReturnValue([
                createMockFetcher(`${mockProduct.itemId}-cart-quantity-picker`, 'idle'),
                createMockFetcher(`${mockProduct.itemId}-remove-item-button`, 'submitting'),
            ]);

            renderWithRouter(<ProductItem product={mockProduct} />);

            // Verify that loading spinner is shown when any fetcher is submitting
            expect(screen.getByTestId(`sf-product-item-loading-${mockProduct.productId}`)).toBeInTheDocument();
        });

        test('does not show loading spinner when fetcher for this item is idle', () => {
            // Mock fetchers with one idle fetcher for this item
            mockUseFetchers.mockReturnValue([createMockFetcher(`${mockProduct.itemId}-cart-quantity-picker`, 'idle')]);

            renderWithRouter(<ProductItem product={mockProduct} />);

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

            renderWithRouter(<ProductItem product={productWithoutItemId} />);

            // Verify that loading spinner is not shown when itemId is missing
            expect(screen.queryByTestId(`sf-product-item-loading-${mockProduct.productId}`)).not.toBeInTheDocument();
        });
    });

    describe('Summary variant', () => {
        test('renders summary variant with row layout for price', () => {
            renderWithRouter(<ProductItem product={mockProduct} displayVariant="summary" />);

            // In summary variant, price shows "price quantity" and "total price" format
            expect(screen.getByText('$29.99 2')).toBeInTheDocument();
        });

        test('renders summary variant with quantity included', () => {
            renderWithRouter(<ProductItem product={mockProduct} displayVariant="summary" />);

            // In summary variant, quantity is shown as "Qty: 2" text
            expect(screen.getByText('Qty: 2')).toBeInTheDocument();
        });

        test('renders summary variant with smaller image width', () => {
            renderWithRouter(<ProductItem product={mockProduct} displayVariant="summary" />);

            const imageContainer = screen.getByRole('img').parentElement;
            expect(imageContainer).toHaveClass('w-[80px]');
        });
    });

    describe('Edge cases', () => {
        test('handles missing product data gracefully', () => {
            const emptyProduct = {} as ShopperBasketsTypes.ProductItem & Partial<ShopperProductsTypes.Product>;

            renderWithRouter(<ProductItem product={emptyProduct} />);

            expect(screen.getByTestId('sf-product-item-undefined')).toBeInTheDocument();
            expect(screen.getByText('Product Name')).toBeInTheDocument(); // Default name
            const priceElements = screen.getAllByText('$0.00');
            expect(priceElements).toHaveLength(2); // Mobile and desktop
        });

        test('handles product with only productId', () => {
            const minimalProduct = {
                productId: 'minimal-product-id',
            } as ShopperBasketsTypes.ProductItem & Partial<ShopperProductsTypes.Product>;

            renderWithRouter(<ProductItem product={minimalProduct} />);

            expect(screen.getByTestId('sf-product-item-minimal-product-id')).toBeInTheDocument();
            expect(screen.getByText('Product Name')).toBeInTheDocument();
        });

        test('handles product with only id (no productId)', () => {
            const productWithIdOnly = {
                id: 'product-with-id-only',
            } as ShopperBasketsTypes.ProductItem & Partial<ShopperProductsTypes.Product>;

            renderWithRouter(<ProductItem product={productWithIdOnly} />);

            expect(screen.getByTestId('sf-product-item-product-with-id-only')).toBeInTheDocument();
        });

        test('handles missing image groups', () => {
            const productWithoutImages = {
                ...mockProduct,
                imageGroups: undefined,
            };

            renderWithRouter(<ProductItem product={productWithoutImages} />);

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

            renderWithRouter(<ProductItem product={productWithoutVariations} />);

            // Should not render variation attributes
            expect(screen.queryByText('Color: Red')).not.toBeInTheDocument();
            expect(screen.queryByText('Size: Medium')).not.toBeInTheDocument();
        });

        test('handles zero quantity (defaults to 1)', () => {
            const productWithZeroQuantity = {
                ...mockProduct,
                quantity: 0,
            };

            renderWithRouter(<ProductItem product={productWithZeroQuantity} displayVariant="summary" />);

            // Component defaults to 1 when quantity is 0 (falsy)
            expect(screen.getByText('Qty: 1')).toBeInTheDocument();
        });

        test('handles undefined quantity (defaults to 1)', () => {
            const productWithoutQuantity = {
                ...mockProduct,
                quantity: undefined,
            };

            renderWithRouter(<ProductItem product={productWithoutQuantity} displayVariant="summary" />);

            expect(screen.getByText('Qty: 1')).toBeInTheDocument();
        });

        test('handles zero price', () => {
            const productWithZeroPrice = {
                ...mockProduct,
                price: 0,
                priceAfterItemDiscount: 0,
            };

            renderWithRouter(<ProductItem product={productWithZeroPrice} />);

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

            renderWithRouter(<ProductItem product={productWithoutPrice} />);

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

            renderWithRouter(<ProductItem product={productWithProductName} />);

            const link = screen.getByRole('link');
            expect(link).toHaveTextContent('Product Name');
        });

        test('falls back to name when productName is not available', () => {
            const productWithNameOnly = {
                ...mockProduct,
                productName: undefined,
                name: 'Fallback Name',
            };

            renderWithRouter(<ProductItem product={productWithNameOnly} />);

            const link = screen.getByRole('link');
            expect(link).toHaveTextContent('Fallback Name');
        });

        test('falls back to default name when neither productName nor name is available', () => {
            const productWithoutNames = {
                ...mockProduct,
                productName: undefined,
                name: undefined,
            };

            renderWithRouter(<ProductItem product={productWithoutNames} />);

            const link = screen.getByRole('link');
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

            renderWithRouter(<ProductItem product={productWithMaster} />);

            const link = screen.getByRole('link');
            expect(link).toHaveAttribute('href', '/product/master-product-id');
        });

        test('falls back to id when master.masterId is not available', () => {
            const productWithId = {
                ...mockProduct,
                master: undefined,
                id: 'fallback-id',
                productId: undefined,
            };

            renderWithRouter(<ProductItem product={productWithId} />);

            const link = screen.getByRole('link');
            expect(link).toHaveAttribute('href', '/product/fallback-id');
        });
    });

    describe('Price calculation', () => {
        test('uses priceAfterItemDiscount when available', () => {
            const productWithDiscountPrice = {
                ...mockProduct,
                price: 39.99,
                priceAfterItemDiscount: 29.99,
            };

            renderWithRouter(<ProductItem product={productWithDiscountPrice} />);

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

            renderWithRouter(<ProductItem product={productWithoutDiscountPrice} />);

            // Component should handle undefined priceAfterItemDiscount gracefully
            // This might show $0.00 or handle it in some other way
            const priceElements = screen.getAllByText('$0.00');
            expect(priceElements).toHaveLength(2); // Mobile and desktop price elements
        });
    });

    describe('Responsive behavior', () => {
        test('hides mobile price on desktop (sm:hidden)', () => {
            renderWithRouter(<ProductItem product={mockProduct} />);

            // Find the mobile price container by looking for the sm:hidden class
            const mobilePriceContainer = document.querySelector('.sm\\:hidden .text-sm.font-medium');
            expect(mobilePriceContainer).toBeInTheDocument();
        });

        test('hides desktop price on mobile (hidden sm:block)', () => {
            renderWithRouter(<ProductItem product={mockProduct} />);

            // Find the desktop price container by looking for the hidden sm:block classes
            const desktopPriceContainer = document.querySelector('.hidden.sm\\:block .text-sm.font-medium');
            expect(desktopPriceContainer).toBeInTheDocument();
        });

        test('shows mobile actions only on mobile (sm:hidden)', () => {
            renderWithRouter(
                <ProductItem
                    product={mockProduct}
                    primaryAction={mockPrimaryAction}
                    secondaryActions={mockSecondaryActions}
                />
            );

            const mobileActionsContainer = screen.getByTestId('mobile-primary-action').closest('.sm\\:hidden');
            expect(mobileActionsContainer).toBeInTheDocument();
        });
    });

    describe('PromoPopover and promotion info', () => {
        const mockPromotions: Record<string, ShopperPromotionsTypes.Promotion> = {
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

            renderWithRouter(<ProductItem product={productWithPromotions} promotionMap={mockPromotions} />);

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

            renderWithRouter(<ProductItem product={productWithPromotions} promotionMap={mockPromotions} />);

            // Check that the info button is present for users to interact with
            const infoButton = screen.getByRole('button', { name: 'Info' });
            expect(infoButton).toBeInTheDocument();
            expect(infoButton).toBeVisible();

            // Hover over the info button to trigger tooltip
            await user.hover(infoButton);

            // Wait for tooltip to appear and check for promotion content
            await waitFor(() => {
                // one for visiable and one for hidden for a11y
                // Check that tooltip header appears (may be multiple due to tooltip implementation)
                const promotionHeaders = screen.getAllByText('Promotions applied:');
                expect(promotionHeaders.length).toBe(2);

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

            renderWithRouter(<ProductItem product={productWithoutPromotions} />);

            // PromoPopover should not be rendered
            expect(screen.queryByRole('button', { name: 'Info' })).not.toBeInTheDocument();
            expect(screen.queryByText('Promotions:')).not.toBeInTheDocument();
        });

        test('handles missing promotionMap gracefully', () => {
            const productWithPromotions = {
                ...mockProduct,
                priceAdjustments: [{ promotionId: 'promo-1', itemText: '20% discount applied' }],
            };

            renderWithRouter(<ProductItem product={productWithPromotions} />);

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

            renderWithRouter(<ProductItem product={productWithEmptyAdjustments} />);

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

            renderWithRouter(<ProductItem product={productWithLargeDiscount} />);

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

            renderWithRouter(<ProductItem product={productWithZeroPrice} />);

            // Should show $0.00 discount in both mobile and desktop views
            const priceElements = screen.getAllByText('$0.00');
            expect(priceElements).toHaveLength(2); // Mobile and desktop price elements
        });
    });
});
