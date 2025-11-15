// Testing libraries
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';

// Commerce SDK
import type { ShopperBasketsV2, ShopperProducts } from '@salesforce/storefront-next-runtime/scapi';

// Components
import ProductItemsList from './index';
import { ConfigProvider } from '@/config/context';
import { mockConfig } from '@/test-utils/config';

// Mock the toast hook
const mockAddToast = vi.fn();
vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: mockAddToast,
    }),
}));

// Mock react-router's useFetcher
const mockFetcher = {
    submit: vi.fn(),
    state: 'idle',
    data: null as { success: boolean; error?: string } | null,
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
        <form {...props}>{children}</form>
    ),
};

vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof importOriginal>();
    return {
        ...actual,
        useFetcher: () => mockFetcher,
    };
});

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

// Test data
const mockProductItem: ShopperBasketsV2.schemas['ProductItem'] = {
    itemId: 'item-1',
    productId: 'product-1',
    productName: 'Test Product',
    price: 39.99,
    priceAfterItemDiscount: 29.99,
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
};

const mockProduct: ShopperProducts.schemas['Product'] = {
    id: 'product-1',
    name: 'Test Product',
    productName: 'Test Product',
    imageGroups: [
        {
            viewType: 'small',
            images: [
                {
                    link: 'https://example.com/image.jpg',
                    alt: 'Product image',
                },
            ],
        },
    ],
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
};

describe('ProductItemsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Default variant', () => {
        test('renders product items with default variant', () => {
            const productItems = [mockProductItem];
            const productsByItemId = { 'item-1': mockProduct };

            renderWithRouter(
                <ProductItemsList productItems={productItems} productsByItemId={productsByItemId} variant="default" />
            );

            // Check that the product item is rendered with the correct test ID
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();

            // Check that product name is rendered
            expect(screen.getByText('Test Product')).toBeInTheDocument();
        });

        test('renders multiple product items', () => {
            const productItems = [mockProductItem, { ...mockProductItem, itemId: 'item-2', productId: 'product-2' }];
            const productsByItemId = {
                'item-1': mockProduct,
                'item-2': { ...mockProduct, id: 'product-2' },
            };

            renderWithRouter(<ProductItemsList productItems={productItems} productsByItemId={productsByItemId} />);

            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();

            // Should have 2 product items
            expect(screen.getAllByTestId(/sf-product-item-/)).toHaveLength(2);
        });

        test('handles empty product items array', () => {
            renderWithRouter(<ProductItemsList productItems={[]} productsByItemId={{}} />);

            // Should render the container but no product items
            expect(screen.queryByTestId(/sf-product-item-/)).not.toBeInTheDocument();
        });

        test('handles null/undefined product items', () => {
            renderWithRouter(
                <ProductItemsList
                    productItems={null as unknown as ShopperBasketsV2.schemas['ProductItem'][]}
                    productsByItemId={{}}
                />
            );

            expect(screen.queryByTestId(/sf-product-item-/)).not.toBeInTheDocument();
        });
    });

    describe('Summary variant', () => {
        test('renders product items with summary variant', () => {
            const productItems = [mockProductItem];
            const productsByItemId = { 'item-1': mockProduct };

            renderWithRouter(
                <ProductItemsList productItems={productItems} productsByItemId={productsByItemId} variant="summary" />
            );

            // Summary variant should use different test ID
            expect(screen.getByTestId('sf-product-item-summary-product-1')).toBeInTheDocument();

            // Product name should still be rendered
            expect(screen.getByText('Test Product')).toBeInTheDocument();
        });
    });

    describe('Product data integration', () => {
        test('combines basket item with product data when available', () => {
            const productItems = [mockProductItem];
            const productsByItemId = { 'item-1': mockProduct };

            renderWithRouter(<ProductItemsList productItems={productItems} productsByItemId={productsByItemId} />);

            // The ProductItem component should receive the combined data
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            expect(screen.getByText('Test Product')).toBeInTheDocument();
        });

        test('handles product item without itemId', () => {
            const productItemWithoutId = { ...mockProductItem, itemId: undefined };
            const productItems = [productItemWithoutId];

            renderWithRouter(<ProductItemsList productItems={productItems} productsByItemId={{}} />);

            // Should still render but without specific itemId
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
        });
    });

    describe('Primary actions integration', () => {
        test('renders primary action when primaryAction function is provided', () => {
            const productItems = [mockProductItem];
            const mockPrimaryAction = vi.fn((product) => (
                <button data-testid={`primary-action-${product.itemId}`}>
                    Primary Action for {product.productName}
                </button>
            ));

            renderWithRouter(
                <ProductItemsList productItems={productItems} productsByItemId={{}} primaryAction={mockPrimaryAction} />
            );

            // Should have primary action button
            expect(screen.getByTestId('primary-action-item-1')).toBeInTheDocument();
            expect(screen.getByText('Primary Action for Test Product')).toBeInTheDocument();

            // Should call the function with the combined product
            expect(mockPrimaryAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    itemId: 'item-1',
                    productName: 'Test Product',
                    price: 39.99,
                    priceAfterItemDiscount: 29.99,
                    productId: 'product-1',
                    quantity: 2,
                    variationAttributes: [
                        {
                            id: 'color',
                            name: 'Color',
                            values: [
                                {
                                    name: 'Red',
                                    value: 'red',
                                },
                            ],
                        },
                        {
                            id: 'size',
                            name: 'Size',
                            values: [
                                {
                                    name: 'Medium',
                                    value: 'medium',
                                },
                            ],
                        },
                    ],
                    variationValues: {
                        color: 'red',
                        size: 'medium',
                    },
                    isProductUnavailable: true,
                })
            );
        });

        test('does not render primary action when primaryAction is not provided', () => {
            const productItems = [mockProductItem];

            renderWithRouter(<ProductItemsList productItems={productItems} productsByItemId={{}} />);

            expect(screen.queryByTestId('primary-action-item-1')).not.toBeInTheDocument();
        });

        test('primary action function receives combined product data', () => {
            const productItems = [mockProductItem];
            const productsByItemId = { 'item-1': mockProduct };
            const mockPrimaryAction = vi.fn((_product) => <button>Test Action</button>);

            renderWithRouter(
                <ProductItemsList
                    productItems={productItems}
                    productsByItemId={productsByItemId}
                    primaryAction={mockPrimaryAction}
                />
            );

            // Should call the function with the combined product data
            expect(mockPrimaryAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'product-1',
                    imageGroups: [
                        {
                            images: [
                                {
                                    alt: 'Product image',
                                    link: 'https://example.com/image.jpg',
                                },
                            ],
                            viewType: 'small',
                        },
                    ],
                    isProductUnavailable: false,
                    itemId: 'item-1',
                    name: 'Test Product',
                    price: 39.99,
                    priceAfterItemDiscount: 29.99,
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 2,
                    variationAttributes: [
                        {
                            id: 'color',
                            name: 'Color',
                            values: [
                                {
                                    name: 'Red',
                                    value: 'red',
                                },
                            ],
                        },
                        {
                            id: 'size',
                            name: 'Size',
                            values: [
                                {
                                    name: 'Medium',
                                    value: 'medium',
                                },
                            ],
                        },
                    ],
                    variationValues: {
                        color: 'red',
                        size: 'medium',
                    },
                })
            );
        });

        test('primary action function handles missing product data', () => {
            const productItems = [mockProductItem];
            const mockPrimaryAction = vi.fn((_product) => <button>Test Action</button>);

            renderWithRouter(
                <ProductItemsList productItems={productItems} productsByItemId={{}} primaryAction={mockPrimaryAction} />
            );

            // Should call the function with isProductUnavailable: true
            expect(mockPrimaryAction).toHaveBeenCalledWith(
                expect.objectContaining({
                    isProductUnavailable: true,
                    itemId: 'item-1',
                    price: 39.99,
                    priceAfterItemDiscount: 29.99,
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 2,
                    variationAttributes: [
                        {
                            id: 'color',
                            name: 'Color',
                            values: [
                                {
                                    name: 'Red',
                                    value: 'red',
                                },
                            ],
                        },
                        {
                            id: 'size',
                            name: 'Size',
                            values: [
                                {
                                    name: 'Medium',
                                    value: 'medium',
                                },
                            ],
                        },
                    ],
                    variationValues: {
                        color: 'red',
                        size: 'medium',
                    },
                })
            );
        });

        test('primary action works with multiple product items', () => {
            const productItems = [mockProductItem, { ...mockProductItem, itemId: 'item-2', productId: 'product-2' }];
            const mockPrimaryAction = vi.fn((product) => (
                <button data-testid={`primary-action-${product.itemId}`}>Action for {product.productId}</button>
            ));

            renderWithRouter(
                <ProductItemsList productItems={productItems} productsByItemId={{}} primaryAction={mockPrimaryAction} />
            );

            expect(screen.getByTestId('primary-action-item-1')).toBeInTheDocument();
            expect(screen.getByTestId('primary-action-item-2')).toBeInTheDocument();
            expect(screen.getByText('Action for product-1')).toBeInTheDocument();
            expect(screen.getByText('Action for product-2')).toBeInTheDocument();

            expect(mockPrimaryAction).toHaveBeenCalledTimes(2);
        });
    });

    describe('Secondary actions integration', () => {
        test('renders secondary actions when secondaryActions function is provided', () => {
            const productItems = [mockProductItem];
            const mockSecondaryActions = vi.fn((product) => (
                <button data-testid={`secondary-action-${product.itemId}`}>
                    Secondary Action for {product.productName}
                </button>
            ));

            renderWithRouter(
                <ProductItemsList
                    productItems={productItems}
                    productsByItemId={{}}
                    secondaryActions={mockSecondaryActions}
                />
            );

            expect(screen.getByTestId('secondary-action-item-1')).toBeInTheDocument();
            expect(screen.getByText('Secondary Action for Test Product')).toBeInTheDocument();

            expect(mockSecondaryActions).toHaveBeenCalledTimes(1);

            // Should call the function with the combined product
            expect(mockSecondaryActions).toHaveBeenCalledWith(
                expect.objectContaining({
                    isProductUnavailable: true,
                    itemId: 'item-1',
                    price: 39.99,
                    priceAfterItemDiscount: 29.99,
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 2,
                    variationAttributes: [
                        {
                            id: 'color',
                            name: 'Color',
                            values: [
                                {
                                    name: 'Red',
                                    value: 'red',
                                },
                            ],
                        },
                        {
                            id: 'size',
                            name: 'Size',
                            values: [
                                {
                                    name: 'Medium',
                                    value: 'medium',
                                },
                            ],
                        },
                    ],
                    variationValues: {
                        color: 'red',
                        size: 'medium',
                    },
                })
            );
        });

        test('does not render secondary actions when secondaryActions is not provided', () => {
            const productItems = [mockProductItem];

            renderWithRouter(<ProductItemsList productItems={productItems} productsByItemId={{}} />);

            expect(screen.queryByTestId('secondary-action-item-1')).not.toBeInTheDocument();
        });

        test('secondary actions function receives combined product data', () => {
            const productItems = [mockProductItem];
            const productsByItemId = { 'item-1': mockProduct };
            const mockSecondaryActions = vi.fn((_product) => <button>Test Action</button>);

            renderWithRouter(
                <ProductItemsList
                    productItems={productItems}
                    productsByItemId={productsByItemId}
                    secondaryActions={mockSecondaryActions}
                />
            );

            // Should call the function with the combined product data
            expect(mockSecondaryActions).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'product-1',
                    imageGroups: [
                        {
                            images: [
                                {
                                    alt: 'Product image',
                                    link: 'https://example.com/image.jpg',
                                },
                            ],
                            viewType: 'small',
                        },
                    ],
                    isProductUnavailable: false,
                    itemId: 'item-1',
                    name: 'Test Product',
                    price: 39.99,
                    priceAfterItemDiscount: 29.99,
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 2,
                    variationAttributes: [
                        {
                            id: 'color',
                            name: 'Color',
                            values: [
                                {
                                    name: 'Red',
                                    value: 'red',
                                },
                            ],
                        },
                        {
                            id: 'size',
                            name: 'Size',
                            values: [
                                {
                                    name: 'Medium',
                                    value: 'medium',
                                },
                            ],
                        },
                    ],
                    variationValues: {
                        color: 'red',
                        size: 'medium',
                    },
                })
            );
        });

        test('secondary actions function handles missing product data', () => {
            const productItems = [mockProductItem];
            const mockSecondaryActions = vi.fn((_product) => <button>Test Action</button>);

            renderWithRouter(
                <ProductItemsList
                    productItems={productItems}
                    productsByItemId={{}}
                    secondaryActions={mockSecondaryActions}
                />
            );

            // Should call the function with isProductUnavailable: true
            expect(mockSecondaryActions).toHaveBeenCalledWith(
                expect.objectContaining({
                    isProductUnavailable: true,
                    itemId: 'item-1',
                    price: 39.99,
                    priceAfterItemDiscount: 29.99,
                    productId: 'product-1',
                    productName: 'Test Product',
                    quantity: 2,
                    variationAttributes: [
                        {
                            id: 'color',
                            name: 'Color',
                            values: [
                                {
                                    name: 'Red',
                                    value: 'red',
                                },
                            ],
                        },
                        {
                            id: 'size',
                            name: 'Size',
                            values: [
                                {
                                    name: 'Medium',
                                    value: 'medium',
                                },
                            ],
                        },
                    ],
                    variationValues: {
                        color: 'red',
                        size: 'medium',
                    },
                })
            );
        });

        test('secondary actions work with multiple product items', () => {
            const productItems = [mockProductItem, { ...mockProductItem, itemId: 'item-2', productId: 'product-2' }];
            const mockSecondaryActions = vi.fn((product) => (
                <button data-testid={`secondary-action-${product.itemId}`}>Action for {product.productId}</button>
            ));

            renderWithRouter(
                <ProductItemsList
                    productItems={productItems}
                    productsByItemId={{}}
                    secondaryActions={mockSecondaryActions}
                />
            );

            // Should have secondary actions for both items
            expect(screen.getByTestId('secondary-action-item-1')).toBeInTheDocument();
            expect(screen.getByTestId('secondary-action-item-2')).toBeInTheDocument();
            expect(screen.getByText('Action for product-1')).toBeInTheDocument();
            expect(screen.getByText('Action for product-2')).toBeInTheDocument();

            // Should call the function twice (once per item)
            expect(mockSecondaryActions).toHaveBeenCalledTimes(2);
        });

        test('secondary actions returns null when itemId is missing', () => {
            const productItemWithoutId = { ...mockProductItem, itemId: undefined };
            const { container } = renderWithRouter(
                <ProductItemsList
                    productItems={[productItemWithoutId]}
                    productsByItemId={{}}
                    secondaryActions={(product) => {
                        if (!product.itemId) return undefined;
                        return <button>Remove</button>;
                    }}
                />
            );
            expect(container.querySelector('button[data-testid*="remove-item"]')).not.toBeInTheDocument();
        });
    });

    describe('Data transformation', () => {
        test('creates combined product object with correct properties', () => {
            const productItems = [mockProductItem];
            const productsByItemId = { 'item-1': mockProduct };

            renderWithRouter(<ProductItemsList productItems={productItems} productsByItemId={productsByItemId} />);

            // Verify that the ProductItem component receives the expected data
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            expect(screen.getByText('Test Product')).toBeInTheDocument();

            // Check that price is formatted correctly
            expect(screen.getAllByText('$29.99')).toHaveLength(2);
        });

        test('handles missing product data gracefully', () => {
            const productItems = [mockProductItem];

            renderWithRouter(<ProductItemsList productItems={productItems} productsByItemId={{}} />);

            // The component should still render but with missing product data
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            expect(screen.getByText('Test Product')).toBeInTheDocument();
        });

        test('preserves basket item price and quantity', () => {
            const productItems = [mockProductItem];
            const productsByItemId = { 'item-1': mockProduct };

            renderWithRouter(<ProductItemsList productItems={productItems} productsByItemId={productsByItemId} />);

            // Check that price is displayed (should use basket priceAfterItemDiscount price)
            expect(screen.getAllByText('$29.99')).toHaveLength(2);

            // Check that quantity is displayed in the quantity picker
            expect(screen.getByDisplayValue('2')).toBeInTheDocument();
        });
    });

    describe('Edge cases', () => {
        test('handles product items with minimal data', () => {
            const minimalProductItem = {
                itemId: 'minimal-item',
                productId: 'minimal-product',
            } as ShopperBasketsV2.schemas['ProductItem'];

            renderWithRouter(<ProductItemsList productItems={[minimalProductItem]} productsByItemId={{}} />);

            expect(screen.getByTestId('sf-product-item-minimal-product')).toBeInTheDocument();
        });

        test('handles productsByItemId with missing keys', () => {
            const productItems = [mockProductItem];
            const productsByItemId = { 'different-item': mockProduct };

            renderWithRouter(<ProductItemsList productItems={productItems} productsByItemId={productsByItemId} />);

            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
        });

        test('handles mixed product items with and without product data', () => {
            const productItems = [mockProductItem, { ...mockProductItem, itemId: 'item-2', productId: 'product-2' }];
            const productsByItemId = { 'item-1': mockProduct }; // Only first item has product data

            renderWithRouter(<ProductItemsList productItems={productItems} productsByItemId={productsByItemId} />);

            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
        });
    });
});
