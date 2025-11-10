// Testing libraries
import { describe, test, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';

// Components
import CartContent from './cart-content';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

// Utils
import uiStrings from '@/temp-ui-string';

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

    const mockPromotionMap = {
        'promo-1': { id: 'promo-1', name: 'Promotion 1' },
    };

    test('renders empty cart for 0 product items', () => {
        // Test empty product items array
        const emptyBasket = { ...mockBasket, productItems: [] };
        renderCartContent({ basket: emptyBasket, productsByItemId: mockProductMap });

        expect(screen.getByTestId('sf-cart-empty')).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.empty.title)).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.empty.guestMessage)).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.empty.continueShopping)).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.empty.signIn)).toBeInTheDocument();
        expect(screen.queryByTestId('sf-cart-container')).not.toBeInTheDocument();
    });

    test('renders empty cart when basket is undefined', () => {
        renderCartContent({ basket: undefined, productsByItemId: mockProductMap });

        expect(screen.getByTestId('sf-cart-empty')).toBeInTheDocument();
        expect(screen.getByText(uiStrings.cart.empty.title)).toBeInTheDocument();
    });

    test('renders cart content with proper structure when basket has items', () => {
        renderCartContent({ basket: mockBasket, productsByItemId: mockProductMap, promotions: mockPromotionMap });

        // Verify main container
        expect(screen.getByTestId('sf-cart-container')).toBeInTheDocument();
        expect(screen.queryByTestId('sf-cart-empty')).not.toBeInTheDocument();

        // Verify cart title is rendered (it's an h1 with "Cart (3 items)" text)
        expect(screen.getByText('Cart (3 items)')).toBeInTheDocument();

        // Verify product items are rendered (they have individual test IDs)
        expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
        expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
    });

    test('handles missing promotionMap prop gracefully', () => {
        renderCartContent({ basket: mockBasket, productsByItemId: mockProductMap });

        // Verify that the cart container is still rendered even without promotionMap
        expect(screen.getByTestId('sf-cart-container')).toBeInTheDocument();

        // Verify product items are still rendered
        expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
        expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
    });

    test('handles basket with missing productItems (undefined) as empty state', () => {
        // productItems is omitted entirely
        const basketWithoutProductItems = { basketId: 'b-no-items' } as any;
        renderCartContent({ basket: basketWithoutProductItems, productsByItemId: {} as any });

        // Should render empty state
        expect(screen.getByTestId('sf-cart-empty')).toBeInTheDocument();
    });

    describe('CartItemEditButton Integration', () => {
        test('renders edit buttons for each cart item', () => {
            renderCartContent({ basket: mockBasket, productsByItemId: mockProductMap });

            // Verify edit buttons are rendered for each item (1 per item)
            expect(screen.getByTestId('edit-item-item-1')).toBeInTheDocument();
            expect(screen.getByTestId('edit-item-item-2')).toBeInTheDocument();

            // Verify edit buttons have correct text (2 items × 1 render each = 2 total)
            const editButtons = screen.getAllByText(uiStrings.actionCard.edit);
            expect(editButtons).toHaveLength(2);
        });

        test('applies correct className to edit buttons', () => {
            renderCartContent({ basket: mockBasket, productsByItemId: mockProductMap });

            const editButton1 = screen.getByTestId('edit-item-item-1');
            const editButton2 = screen.getByTestId('edit-item-item-2');

            // Verify all edit buttons have the "pl-0" className
            expect(editButton1).toHaveClass('pl-0');
            expect(editButton2).toHaveClass('pl-0');
        });

        test('opens product modal when edit button is clicked', () => {
            renderCartContent({ basket: mockBasket, productsByItemId: mockProductMap });

            // Initially, modal should not be visible
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

            // Click the edit button
            const editButton = screen.getByTestId('edit-item-item-1');
            fireEvent.click(editButton);

            // Modal should be visible after clicking edit button
            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText(uiStrings.editItem.title)).toBeInTheDocument();
        });

        test('can close modal using close button', () => {
            renderCartContent({ basket: mockBasket, productsByItemId: mockProductMap });

            // Open modal first
            const editButton = screen.getByTestId('edit-item-item-1');
            fireEvent.click(editButton);

            // Verify modal is open
            expect(screen.getByRole('dialog')).toBeInTheDocument();

            // Close modal using the close button
            const closeButton = screen.getByRole('button', { name: /close/i });
            fireEvent.click(closeButton);

            // Modal should be closed
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        test('does not render edit buttons when product has no itemId', () => {
            const basketWithoutItemIds = {
                ...mockBasket,
                productItems: [
                    { quantity: 2, productId: 'product-1' }, // No itemId
                    { itemId: 'item-2', quantity: 1, productId: 'product-2' }, // Has itemId
                ],
            };

            renderCartContent({ basket: basketWithoutItemIds, productsByItemId: mockProductMap });

            // Only the item with itemId should have an edit button (1 instance)
            expect(screen.queryByTestId('edit-item-item-1')).not.toBeInTheDocument();
            expect(screen.getByTestId('edit-item-item-2')).toBeInTheDocument();
        });
    });

    describe('Edit button visibility (CartItemEditButton presence)', () => {
        function renderWith(productsByItemId: Record<string, any>) {
            const basket = {
                basketId: 'b1',
                productItems: [{ itemId: 'item-1', quantity: 1, productId: 'p1' }],
            };
            return renderCartContent({ basket, productsByItemId });
        }

        const editBtn = () => screen.queryByTestId('edit-item-item-1');

        test('standard product does not show CartItemEditButton', () => {
            renderWith({ 'item-1': { id: 'p1', type: { item: true } } } as any);
            expect(editBtn()).not.toBeInTheDocument();
        });

        test('product with variants shows CartItemEditButton', () => {
            renderWith({ 'item-1': { id: 'p1', variants: [{} as any] } } as any);
            expect(editBtn()).toBeInTheDocument();
        });

        test('missing product details mapping shows CartItemEditButton', () => {
            const basket = { basketId: 'b1', productItems: [{ itemId: 'item-1', quantity: 1, productId: 'p1' }] };
            renderCartContent({ basket, productsByItemId: {} as any });
            expect(editBtn()).toBeInTheDocument();
        });

        test('bundle product shows CartItemEditButton', () => {
            renderWith({ 'item-1': { id: 'p1', type: { bundle: true } } } as any);
            expect(editBtn()).toBeInTheDocument();
        });

        test('parent product shows CartItemEditButton', () => {
            renderWith({ 'item-1': { id: 'p1', type: { master: true } } } as any);
            expect(editBtn()).toBeInTheDocument();
        });
    });
});
