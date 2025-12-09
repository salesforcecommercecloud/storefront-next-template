// Testing libraries
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';

// Components
import CartContent from '@/components/cart/cart-content';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

// Utils
import type { ShopperStores } from '@salesforce/storefront-next-runtime/scapi';

import { usePickup } from '@/extensions/bopis/context/pickup-context';

// Mock the pickup context
vi.mock('@/extensions/bopis/context/pickup-context', () => ({
    usePickup: vi.fn(() => null),
}));

const renderCartContent = (props: React.ComponentProps<typeof CartContent>) => {
    // Using createMemoryRouter in framework mode is fine
    // because both framework and data routers share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
    // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
    const router = createMemoryRouter(
        [
            {
                path: '/cart',
                element: (
                    <AllProvidersWrapper>
                        <CartContent {...props} />
                    </AllProvidersWrapper>
                ),
            },
        ],
        { initialEntries: ['/cart'] }
    );

    return render(<RouterProvider router={router} />);
};

describe('CartContent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset pickup mock to return null by default
        vi.mocked(usePickup).mockReturnValue(null);
    });

    const mockBasket = {
        basketId: 'test-basket-id',
        productItems: [
            { itemId: 'item-1', quantity: 2, productId: 'product-1' },
            { itemId: 'item-2', quantity: 1, productId: 'product-2' },
        ],
    };

    const mockProductMap = {
        'item-1': { id: 'product-1', name: 'Product 1', variants: [{} as any] },
        'item-2': { id: 'product-2', name: 'Product 2', variants: [{} as any] },
    } as any;

    describe('BOPIS (Buy Online Pickup In Store) functionality', () => {
        const mockStore: ShopperStores.schemas['Store'] = {
            id: 'store-1',
            name: 'Test Store',
            inventoryId: 'inventory-1',
            address: {
                address1: '123 Test St',
                city: 'Test City',
                stateCode: 'CA',
                postalCode: '12345',
                countryCode: 'US',
            },
        };

        const createPickupContext = (productIds: string[], store?: ShopperStores.schemas['Store']) => {
            const pickupBasketItems = new Map();
            productIds.forEach((productId) => {
                pickupBasketItems.set(productId, {
                    inventoryId: 'inventory-1',
                    storeId: 'store-1',
                });
            });

            const pickupStores = new Map();
            if (store) {
                pickupStores.set(store.id, store);
            }

            return {
                pickupBasketItems,
                pickupStores,
                addItem: vi.fn(),
                removeItem: vi.fn(),
                clearItems: vi.fn(),
            };
        };

        test('renders delivery items when no pickup items exist', () => {
            vi.mocked(usePickup).mockReturnValue(null);

            renderCartContent({ basket: mockBasket, productsByItemId: mockProductMap });

            // All items should be rendered as delivery items
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
            // Pickup store info should not be rendered
            expect(screen.queryByTestId('pickup-store-info-card')).not.toBeInTheDocument();
        });

        test('renders pickup items grouped with store info when pickup items exist', () => {
            const pickupContext = createPickupContext(['product-1'], mockStore);
            vi.mocked(usePickup).mockReturnValue(pickupContext);

            const basketWithPickupShipment = {
                ...mockBasket,
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        c_fromStoreId: 'store-1',
                    },
                ],
                productItems: [
                    { itemId: 'item-1', quantity: 2, productId: 'product-1', shipmentId: 'shipment-1' },
                    { itemId: 'item-2', quantity: 1, productId: 'product-2' },
                ],
            };

            renderCartContent({ basket: basketWithPickupShipment, productsByItemId: mockProductMap });

            // Pickup store info should be rendered
            expect(screen.getByTestId('pickup-store-info-card')).toBeInTheDocument();
            expect(screen.getByText(/Pick up in/i)).toBeInTheDocument();
            expect(screen.getByText('Test Store')).toBeInTheDocument();

            // Pickup item should be rendered
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            // Delivery item should be rendered separately
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
        });

        test('filters pickup items from delivery items', () => {
            const pickupContext = createPickupContext(['product-1'], mockStore);
            vi.mocked(usePickup).mockReturnValue(pickupContext);

            const basketWithThreeItems = {
                ...mockBasket,
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        c_fromStoreId: 'store-1',
                    },
                ],
                productItems: [
                    { itemId: 'item-1', quantity: 2, productId: 'product-1', shipmentId: 'shipment-1' },
                    { itemId: 'item-2', quantity: 1, productId: 'product-2' },
                    { itemId: 'item-3', quantity: 1, productId: 'product-3' },
                ],
            };

            const productMapWithThree = {
                ...mockProductMap,
                'item-3': { id: 'product-3', name: 'Product 3', variants: [{} as any] },
            };

            renderCartContent({ basket: basketWithThreeItems, productsByItemId: productMapWithThree });

            // Pickup item (product-1) should be in pickup section
            expect(screen.getByTestId('pickup-store-info-card')).toBeInTheDocument();
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();

            // Delivery items (product-2, product-3) should be in delivery section
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
            expect(screen.getByTestId('sf-product-item-product-3')).toBeInTheDocument();
        });

        test('renders only delivery items when all items are for pickup but no store info', () => {
            const pickupContext = createPickupContext(['product-1', 'product-2'], undefined);
            vi.mocked(usePickup).mockReturnValue(pickupContext);

            renderCartContent({ basket: mockBasket, productsByItemId: mockProductMap });

            // No pickup store info should be rendered (no store available)
            expect(screen.queryByTestId('pickup-store-info-card')).not.toBeInTheDocument();
            // Items should still be rendered as delivery items
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
        });

        test('handles items without productId in pickup context', () => {
            const pickupContext = createPickupContext(['product-1'], mockStore);
            vi.mocked(usePickup).mockReturnValue(pickupContext);

            const basketWithMissingProductId = {
                ...mockBasket,
                productItems: [
                    { itemId: 'item-1', quantity: 2, productId: 'product-1' },
                    { itemId: 'item-2', quantity: 1 }, // No productId
                ],
            };

            renderCartContent({ basket: basketWithMissingProductId, productsByItemId: mockProductMap });

            // Pickup item should be rendered
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            // Item without productId should be rendered as delivery (not filtered out)
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
        });

        test('renders all items as delivery when pickup context returns empty map', () => {
            const pickupContext = {
                pickupBasketItems: new Map(),
                pickupStores: new Map(),
                addItem: vi.fn(),
                removeItem: vi.fn(),
                clearItems: vi.fn(),
            };
            vi.mocked(usePickup).mockReturnValue(pickupContext);

            renderCartContent({ basket: mockBasket, productsByItemId: mockProductMap });

            // All items should be rendered as delivery items
            expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
            expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
            // No pickup store info should be rendered
            expect(screen.queryByTestId('pickup-store-info-card')).not.toBeInTheDocument();
        });
    });
});
