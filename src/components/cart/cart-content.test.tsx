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
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';

const { t } = getTranslation();

// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';

vi.mock('@/hooks/use-scapi-fetcher', () => ({
    useScapiFetcher: vi.fn(() => ({
        load: vi.fn(),
        submit: vi.fn(),
        data: null,
        errors: undefined,
        success: false,
        state: 'idle' as const,
    })),
}));

// Components
import CartContent from './cart-content';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

// Utils
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

    const mockPromotionMap = {
        'promo-1': { id: 'promo-1', name: 'Promotion 1' },
    };

    const mockBonusProductsById: Record<
        string,
        import('@salesforce/storefront-next-runtime/scapi').ShopperProducts.schemas['Product']
    > = {};

    test('renders empty cart for 0 product items', () => {
        // Test empty product items array
        const emptyBasket = { ...mockBasket, productItems: [] };
        renderCartContent({
            basket: emptyBasket,
            productsByItemId: mockProductMap,
            bonusProductsById: mockBonusProductsById,
        });

        expect(screen.getByTestId('sf-cart-empty')).toBeInTheDocument();
        expect(screen.getByText(t('cart:empty.title'))).toBeInTheDocument();
        expect(screen.getByText(t('cart:empty.guestMessage'))).toBeInTheDocument();
        expect(screen.getByText(t('cart:empty.continueShopping'))).toBeInTheDocument();
        expect(screen.queryByTestId('sf-cart-container')).not.toBeInTheDocument();
    });

    test('renders empty cart when basket is undefined', () => {
        renderCartContent({
            basket: undefined,
            productsByItemId: mockProductMap,
            bonusProductsById: mockBonusProductsById,
        });

        expect(screen.getByTestId('sf-cart-empty')).toBeInTheDocument();
        expect(screen.getByText(t('cart:empty.title'))).toBeInTheDocument();
    });

    test('renders cart content with proper structure when basket has items', () => {
        renderCartContent({
            basket: mockBasket,
            productsByItemId: mockProductMap,
            bonusProductsById: mockBonusProductsById,
            promotions: mockPromotionMap,
        });

        // Verify main container
        expect(screen.getByTestId('sf-cart-container')).toBeInTheDocument();
        expect(screen.queryByTestId('sf-cart-empty')).not.toBeInTheDocument();

        // Verify page heading with item count is rendered (h1)
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent(t('cart:itemCount', { count: 3 }));

        // Verify product items are rendered (they have individual test IDs)
        expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
        expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
    });

    test('handles missing promotionMap prop gracefully', () => {
        renderCartContent({
            basket: mockBasket,
            productsByItemId: mockProductMap,
            bonusProductsById: mockBonusProductsById,
        });

        // Verify that the cart container is still rendered even without promotionMap
        expect(screen.getByTestId('sf-cart-container')).toBeInTheDocument();

        // Verify product items are still rendered
        expect(screen.getByTestId('sf-product-item-product-1')).toBeInTheDocument();
        expect(screen.getByTestId('sf-product-item-product-2')).toBeInTheDocument();
    });

    test('handles basket with missing productItems (undefined) as empty state', () => {
        // productItems is omitted entirely
        const basketWithoutProductItems = { basketId: 'b-no-items' } as any;
        renderCartContent({
            basket: basketWithoutProductItems,
            productsByItemId: {} as any,
            bonusProductsById: mockBonusProductsById,
        });

        // Should render empty state
        expect(screen.getByTestId('sf-cart-empty')).toBeInTheDocument();
    });

    test('renders singular cart heading when total item count is one', () => {
        const oneItemBasket = {
            ...mockBasket,
            productItems: [{ itemId: 'item-1', quantity: 1, productId: 'product-1' }],
        };

        renderCartContent({
            basket: oneItemBasket,
            productsByItemId: mockProductMap,
            bonusProductsById: mockBonusProductsById,
        });

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('cart:itemCount', { count: 1 }));
    });

    describe('Line item secondary actions', () => {
        test('renders remove, edit, and wishlist controls for each cart item with itemId', async () => {
            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            expect(screen.getByTestId('remove-item-item-1')).toBeInTheDocument();
            expect(screen.getByTestId('remove-item-item-2')).toBeInTheDocument();
            expect(screen.getByTestId('edit-item-item-1')).toBeInTheDocument();
            expect(screen.getByTestId('edit-item-item-2')).toBeInTheDocument();
            expect(await screen.findByTestId('cart-add-wishlist-item-1')).toBeInTheDocument();
            expect(await screen.findByTestId('cart-add-wishlist-item-2')).toBeInTheDocument();
        });

        test('does not render secondary actions when product has no itemId', async () => {
            const basketWithoutItemIds = {
                ...mockBasket,
                productItems: [
                    { quantity: 2, productId: 'product-1' },
                    { itemId: 'item-2', quantity: 1, productId: 'product-2' },
                ],
            };

            renderCartContent({
                basket: basketWithoutItemIds,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            expect(screen.queryByTestId('remove-item-item-1')).not.toBeInTheDocument();
            expect(screen.queryByTestId('edit-item-item-1')).not.toBeInTheDocument();
            expect(screen.queryByTestId('cart-add-wishlist-item-1')).not.toBeInTheDocument();
            expect(screen.getByTestId('remove-item-item-2')).toBeInTheDocument();
            expect(screen.getByTestId('edit-item-item-2')).toBeInTheDocument();
            expect(await screen.findByTestId('cart-add-wishlist-item-2')).toBeInTheDocument();
        });

        test('choice-based bonus product hides wishlist and shows remove only', async () => {
            const basket = {
                basketId: 'b1',
                productItems: [
                    {
                        itemId: 'item-1',
                        quantity: 1,
                        productId: 'p1',
                        bonusProductLineItem: true,
                        bonusDiscountLineItemId: 'bonus-discount-choice-1',
                    },
                ],
                bonusDiscountLineItems: [
                    {
                        id: 'bonus-discount-choice-1',
                        promotionId: 'promo-choice-1',
                        maxBonusItems: 3,
                        bonusProducts: [{ productId: 'p1', productName: 'Choice Bonus Product 1' }],
                    },
                ],
            };

            renderCartContent({
                basket: basket as any,
                productsByItemId: { 'item-1': { id: 'p1', variants: [{} as any] } } as any,
                bonusProductsById: { p1: { id: 'p1', name: 'Choice Bonus Product 1' } } as any,
            });

            expect(screen.queryByTestId('edit-item-item-1')).not.toBeInTheDocument();
            expect(screen.getByTestId('remove-item-item-1')).toBeInTheDocument();
            await waitFor(() => {
                expect(screen.queryByTestId('cart-add-wishlist-item-1')).not.toBeInTheDocument();
            });
        });

        test('auto bonus product hides wishlist and does not show edit', () => {
            const basket = {
                basketId: 'b1',
                productItems: [
                    {
                        itemId: 'item-1',
                        quantity: 1,
                        productId: 'p1',
                        bonusProductLineItem: true,
                        bonusDiscountLineItemId: 'bonus-discount-auto-1',
                    },
                ],
                bonusDiscountLineItems: [
                    {
                        id: 'bonus-discount-auto-1',
                        promotionId: 'promo-auto-1',
                        maxBonusItems: 1,
                        // No bonusProducts array = auto bonus
                    },
                ],
            };

            renderCartContent({
                basket: basket as any,
                productsByItemId: { 'item-1': { id: 'p1', variants: [{} as any] } } as any,
                bonusProductsById: mockBonusProductsById,
            });

            expect(screen.queryByTestId('edit-item-item-1')).not.toBeInTheDocument();
            expect(screen.queryByTestId('cart-add-wishlist-item-1')).not.toBeInTheDocument();
        });
    });

    describe('CartItemEditButton Integration', () => {
        test('renders edit buttons for each cart item', () => {
            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            expect(screen.getByTestId('edit-item-item-1')).toBeInTheDocument();
            expect(screen.getByTestId('edit-item-item-2')).toBeInTheDocument();

            const editButtons = screen.getAllByText(t('actionCard:edit'));
            expect(editButtons).toHaveLength(2);
        });

        test('applies correct className to edit buttons', () => {
            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            const editButton1 = screen.getByTestId('edit-item-item-1');
            const editButton2 = screen.getByTestId('edit-item-item-2');

            expect(editButton1).toHaveClass('pl-0');
            expect(editButton2).toHaveClass('pl-0');
        });

        test('opens product modal when edit button is clicked', () => {
            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

            const editButton = screen.getByTestId('edit-item-item-1');
            fireEvent.click(editButton);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText(t('editItem:title'))).toBeInTheDocument();
        });

        test('can close modal using close button', () => {
            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            const editButton = screen.getByTestId('edit-item-item-1');
            fireEvent.click(editButton);

            expect(screen.getByRole('dialog')).toBeInTheDocument();

            const closeButton = screen.getByRole('button', { name: /close/i });
            fireEvent.click(closeButton);

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        test('does not render edit buttons when product has no itemId', () => {
            const basketWithoutItemIds = {
                ...mockBasket,
                productItems: [
                    { quantity: 2, productId: 'product-1' },
                    { itemId: 'item-2', quantity: 1, productId: 'product-2' },
                ],
            };

            renderCartContent({
                basket: basketWithoutItemIds,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

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
            return renderCartContent({ basket, productsByItemId, bonusProductsById: mockBonusProductsById });
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
            renderCartContent({
                basket,
                productsByItemId: {} as any,
                bonusProductsById: mockBonusProductsById,
            });
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

        test('choice-based bonus product does not show CartItemEditButton', () => {
            const basket = {
                basketId: 'b1',
                productItems: [
                    {
                        itemId: 'item-1',
                        quantity: 1,
                        productId: 'p1',
                        bonusProductLineItem: true,
                        bonusDiscountLineItemId: 'bonus-discount-choice-1',
                    },
                ],
                bonusDiscountLineItems: [
                    {
                        id: 'bonus-discount-choice-1',
                        promotionId: 'promo-choice-1',
                        maxBonusItems: 3,
                        bonusProducts: [{ productId: 'p1', productName: 'Choice Bonus Product 1' }],
                    },
                ],
            };

            renderCartContent({
                basket: basket as any,
                productsByItemId: { 'item-1': { id: 'p1', variants: [{} as any] } } as any,
                bonusProductsById: { p1: { id: 'p1', name: 'Choice Bonus Product 1' } } as any,
            });

            expect(editBtn()).not.toBeInTheDocument();
            expect(screen.getByTestId('remove-item-item-1')).toBeInTheDocument();
        });

        test('auto bonus product does not show CartItemEditButton', () => {
            const basket = {
                basketId: 'b1',
                productItems: [
                    {
                        itemId: 'item-1',
                        quantity: 1,
                        productId: 'p1',
                        bonusProductLineItem: true,
                        bonusDiscountLineItemId: 'bonus-discount-auto-1',
                    },
                ],
                bonusDiscountLineItems: [
                    {
                        id: 'bonus-discount-auto-1',
                        promotionId: 'promo-auto-1',
                        maxBonusItems: 1,
                    },
                ],
            };

            renderCartContent({
                basket: basket as any,
                productsByItemId: { 'item-1': { id: 'p1', variants: [{} as any] } } as any,
                bonusProductsById: mockBonusProductsById,
            });

            expect(editBtn()).not.toBeInTheDocument();
        });
    });
});
