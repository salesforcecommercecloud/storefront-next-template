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
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { useDeferredRender } from '@/hooks/use-deferred-render';

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

// Mock the recommender data boundary only — let ProductRecommendations and
// ProductCarousel render for real so we exercise the actual cart wiring.
const mockGetRecommendations = vi.fn();
const mockGetZoneRecommendations = vi.fn();
const mockUseRecommenders = vi.fn();

vi.mock('@/hooks/recommenders/use-recommenders', () => ({
    useRecommenders: () => mockUseRecommenders(),
}));

vi.mock('@/providers/recommenders', () => ({
    useRecommendersAdapter: () => ({
        getRecommenders: vi.fn(),
        getRecommendations: mockGetRecommendations,
        getZoneRecommendations: mockGetZoneRecommendations,
    }),
}));

// @sfdc-extension-block-start SFDC_EXT_RATINGS_REVIEWS
vi.mock('@/extensions/ratings-reviews/providers/product-reviews-context', () => ({
    ProductReviewsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useProductReviews: () => ({
        reviewsSummary: null,
        reviewsSummaryLoading: false,
        reviews: [],
        reviewsLoading: false,
        loadReviewsIfNeeded: () => {},
        aiSummary: '',
        addReviewOptimistic: () => {},
        removeReviewOptimistic: () => {},
        expandReviews: () => {},
        registerExpand: () => {},
        registerOnExpanded: () => {},
        triggerOnExpanded: () => {},
    }),
}));
// @sfdc-extension-block-end SFDC_EXT_RATINGS_REVIEWS

// Mock useDeferredRender so tests can drive pre-/post-idle phases deterministically.
// Default `true` matches the post-idle behavior the existing test suite was written
// against (and what users observe within ~16ms of paint), so legacy assertions remain valid.
// useDeferredRenderSequence is co-located in the same module and is consumed transitively
// by the carousel's image-gallery; stub to `0` to preserve the real hook's "no preloads
// until the first idle frame" contract — passing `n` would silently allow eager preloads
// to slip past tests that ought to fail when that contract regresses.
vi.mock('@/hooks/use-deferred-render', () => ({
    useDeferredRender: vi.fn(() => true),
    useDeferredRenderSequence: () => 0,
}));

// Components
import CartContent from './cart-content';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
import BasketProvider, { useBasket } from '@/providers/basket';

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

// Default useRecommenders state: enabled, no recommendations returned. With
// `recs` empty, ProductRecommendations renders nothing — which is the expected
// path when Einstein returns no results. Individual tests override this state
// when they need the recommendation carousels rendered.
const defaultRecommendersState = {
    isLoading: false,
    isEnabled: true,
    recommendations: { recs: [], recommenderName: undefined as string | undefined },
    error: null,
    getRecommenders: vi.fn(),
    getRecommendations: mockGetRecommendations,
    getZoneRecommendations: mockGetZoneRecommendations,
};

// Minimum-viable enriched recommendations that ProductCarousel + ProductTile can render.
const buildRecs = (productNames: string[]) =>
    productNames.map((productName, idx) => ({
        id: `rec-${idx + 1}`,
        productId: `rec-${idx + 1}`,
        productName,
        price: 19.99 + idx,
        currency: 'USD',
        imageGroups: [
            {
                viewType: 'medium',
                images: [
                    {
                        alt: productName,
                        link: `https://example.com/${idx + 1}.jpg`,
                        disBaseLink: `https://example.com/${idx + 1}.jpg`,
                    },
                ],
            },
        ],
    }));

describe('CartContent', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseRecommenders.mockReturnValue(defaultRecommendersState);
        // Default to post-idle so existing assertions about lazy ProductRecommendations
        // mounting / fetching keep passing. The `Defer cart recommendations until idle`
        // block below opts in to the pre-idle phase explicitly.
        vi.mocked(useDeferredRender).mockReturnValue(true);
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

    const mockBonusProductsById: Record<string, import('@/scapi').ShopperProducts.schemas['Product']> = {};

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

    describe('Inventory validation and checkout blocking', () => {
        test('disables checkout button when items exceed inventory', () => {
            const basketWithExcessQuantity = {
                basketId: 'test-basket',
                productItems: [
                    {
                        itemId: 'item-1',
                        quantity: 100,
                        productId: 'product-1',
                        shipmentId: 'ship-1',
                        productName: 'Product 1',
                    },
                ],
            };

            const productMapWithLowStock = {
                'item-1': {
                    id: 'product-1',
                    name: 'Product 1',
                    inventory: { id: 'inv-1', ats: 5, orderable: true },
                    variants: [{} as any],
                },
            } as any;

            renderCartContent({
                basket: basketWithExcessQuantity as any,
                productsByItemId: productMapWithLowStock,
                bonusProductsById: {},
            });

            const checkoutButtons = screen.getAllByText(t('cart:checkout.continueToCheckout'));
            // Both mobile and desktop buttons should be disabled
            checkoutButtons.forEach((button) => {
                expect(button.closest('button')).toBeDisabled();
            });
        });

        test('shows inventory error banner when items exceed stock', () => {
            const basketWithExcessQuantity = {
                basketId: 'test-basket',
                productItems: [
                    {
                        itemId: 'item-1',
                        quantity: 100,
                        productId: 'product-1',
                        shipmentId: 'ship-1',
                        productName: 'Product 1',
                    },
                ],
            };

            const productMapWithLowStock = {
                'item-1': {
                    id: 'product-1',
                    name: 'Product 1',
                    inventory: { id: 'inv-1', ats: 5, orderable: true },
                    variants: [{} as any],
                },
            } as any;

            renderCartContent({
                basket: basketWithExcessQuantity as any,
                productsByItemId: productMapWithLowStock,
                bonusProductsById: {},
            });

            const banners = screen.getAllByText(t('cart:inventory.blockMessage'));
            // Should have banners for both mobile and desktop
            expect(banners.length).toBeGreaterThan(0);
            banners.forEach((banner) => {
                expect(banner).toBeInTheDocument();
            });
        });

        test('enables checkout when all items are in stock', () => {
            const basketWithValidQuantity = {
                basketId: 'test-basket',
                productItems: [
                    {
                        itemId: 'item-1',
                        quantity: 3,
                        productId: 'product-1',
                        shipmentId: 'ship-1',
                        productName: 'Product 1',
                    },
                ],
            };

            const productMapWithStock = {
                'item-1': {
                    id: 'product-1',
                    name: 'Product 1',
                    inventory: { id: 'inv-1', ats: 10, orderable: true },
                    variants: [{} as any],
                },
            } as any;

            renderCartContent({
                basket: basketWithValidQuantity as any,
                productsByItemId: productMapWithStock,
                bonusProductsById: {},
            });

            const checkoutLinks = screen.getAllByText(t('cart:checkout.continueToCheckout'));
            // Both mobile and desktop buttons should be enabled links
            checkoutLinks.forEach((link) => {
                expect(link.closest('a')).toHaveAttribute('href', expect.stringContaining('/checkout'));
            });
        });

        test('does not show error banner when all items are in stock', () => {
            const basketWithValidQuantity = {
                basketId: 'test-basket',
                productItems: [
                    {
                        itemId: 'item-1',
                        quantity: 3,
                        productId: 'product-1',
                        shipmentId: 'ship-1',
                        productName: 'Product 1',
                    },
                ],
            };

            const productMapWithStock = {
                'item-1': {
                    id: 'product-1',
                    name: 'Product 1',
                    inventory: { id: 'inv-1', ats: 10, orderable: true },
                    variants: [{} as any],
                },
            } as any;

            renderCartContent({
                basket: basketWithValidQuantity as any,
                productsByItemId: productMapWithStock,
                bonusProductsById: {},
            });

            expect(screen.queryByText(t('cart:inventory.blockMessage'))).not.toBeInTheDocument();
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

    describe('Cart recommendations section', () => {
        // ProductRecommendations is lazy-loaded on the cart route to keep it out
        // of the initial bundle, so the carousel mounts asynchronously after the
        // cart shell renders. Tests use findBy*/waitFor to await that hydration.
        test('requests both cart Einstein recommenders, passing basket products to "may also like" only', async () => {
            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            // Wait for the lazy ProductRecommendations chunks to mount and fire effects
            await waitFor(() => {
                const requestedRecommenderNames = mockGetRecommendations.mock.calls.map(([name]) => name);
                expect(requestedRecommenderNames).toEqual(
                    expect.arrayContaining(['product-to-product-einstein', 'viewed-recently-einstein'])
                );
            });

            // "May also like" should receive the basket products as context
            const mayAlsoLikeCall = mockGetRecommendations.mock.calls.find(
                ([name]) => name === 'product-to-product-einstein'
            );
            const mayAlsoLikeProducts = mayAlsoLikeCall?.[1] as { id: string }[] | undefined;
            expect(mayAlsoLikeProducts?.map((p) => p.id)).toEqual(['product-1', 'product-2']);

            // "Recently viewed" should not receive any product context
            const recentlyViewedCall = mockGetRecommendations.mock.calls.find(
                ([name]) => name === 'viewed-recently-einstein'
            );
            expect(recentlyViewedCall?.[1]).toBeUndefined();
        });

        test('renders the "you might also like" carousel with translated title and recommended products', async () => {
            mockUseRecommenders.mockReturnValue({
                ...defaultRecommendersState,
                recommendations: {
                    recommenderName: 'product-to-product-einstein',
                    recs: buildRecs(['Recommended Shirt', 'Recommended Pants']),
                },
            });

            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            // Translated section title is shown to the shopper after lazy mount
            expect(await screen.findByText(t('product:recommendations.youMightAlsoLike'))).toBeInTheDocument();
            // Both recommended product names render via the real ProductCarousel/ProductTile
            expect(screen.getByText('Recommended Shirt')).toBeInTheDocument();
            expect(screen.getByText('Recommended Pants')).toBeInTheDocument();
        });

        test('renders the "recently viewed" carousel with its translated title and product', async () => {
            mockUseRecommenders.mockReturnValue({
                ...defaultRecommendersState,
                recommendations: {
                    recommenderName: 'viewed-recently-einstein',
                    recs: buildRecs(['Previously Viewed Hat']),
                },
            });

            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            expect(await screen.findByText(t('product:recommendations.recentlyViewed'))).toBeInTheDocument();
            expect(screen.getByText('Previously Viewed Hat')).toBeInTheDocument();
        });

        test('renders nothing for either recommender when Einstein returns no results', async () => {
            // defaultRecommendersState already returns recs: []
            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            // Wait until the lazy chunks have had a chance to mount and request data,
            // so the absence of titles reflects the empty-recs branch rather than
            // pre-mount state.
            await waitFor(() => {
                expect(mockGetRecommendations).toHaveBeenCalled();
            });
            expect(screen.queryByText(t('product:recommendations.youMightAlsoLike'))).not.toBeInTheDocument();
            expect(screen.queryByText(t('product:recommendations.recentlyViewed'))).not.toBeInTheDocument();
        });

        test('does not request recommendations when the cart is empty', async () => {
            renderCartContent({
                basket: { ...mockBasket, productItems: [] },
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            // Empty cart short-circuits to <CartEmpty/>; lazy recommendations never mount.
            // Wait a microtask flush to give any pending lazy import a chance to resolve.
            await waitFor(() => {
                expect(screen.getByTestId('sf-cart-empty')).toBeInTheDocument();
            });
            expect(mockGetRecommendations).not.toHaveBeenCalled();
            expect(screen.queryByText(t('product:recommendations.youMightAlsoLike'))).not.toBeInTheDocument();
            expect(screen.queryByText(t('product:recommendations.recentlyViewed'))).not.toBeInTheDocument();
        });
    });

    describe('Defer cart recommendations until idle', () => {
        // Pre-idle phase: useDeferredRender returns false, so DeferredCartRecommendations
        // returns null. This must keep the lazy ProductRecommendations chunk request, the
        // Einstein fetch, and the Suspense reconciliation off the cart's critical render path.
        // Post-idle phase: useDeferredRender returns true and the carousels mount as before.
        test('pre-idle: renders no carousel and does not request Einstein recommendations', async () => {
            vi.mocked(useDeferredRender).mockReturnValue(false);
            mockUseRecommenders.mockReturnValue({
                ...defaultRecommendersState,
                recommendations: {
                    recommenderName: 'product-to-product-einstein',
                    recs: buildRecs(['Recommended Shirt']),
                },
            });

            renderCartContent({
                basket: mockBasket,
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            // Cart shell still renders normally
            expect(screen.getByTestId('sf-cart-container')).toBeInTheDocument();

            // No carousel titles visible — the wrapper short-circuits before mounting
            // ProductRecommendations, so even non-empty recs do not surface.
            expect(screen.queryByText(t('product:recommendations.youMightAlsoLike'))).not.toBeInTheDocument();
            expect(screen.queryByText(t('product:recommendations.recentlyViewed'))).not.toBeInTheDocument();

            // Critical: no Einstein fetch fires while we're still in the pre-idle phase.
            // Use a microtask flush so any (unintended) lazy mount would have a chance to fire.
            await Promise.resolve();
            expect(mockGetRecommendations).not.toHaveBeenCalled();
            expect(mockGetZoneRecommendations).not.toHaveBeenCalled();
        });

        test('pre-idle then post-idle: same CartContent instance flips and mounts the carousels', async () => {
            // Drive the hook from a stateful closure so a parent state change re-renders the
            // SAME tree (not a remount via fresh router) while the hook's return value flips.
            // This is what catches a hook regression that hard-codes `true`: a remount-based
            // test would silently pass even if useDeferredRender were removed.
            let idleReady = false;
            let triggerRerender: (() => void) | undefined;
            vi.mocked(useDeferredRender).mockImplementation(() => idleReady);

            mockUseRecommenders.mockReturnValue({
                ...defaultRecommendersState,
                recommendations: {
                    recommenderName: 'product-to-product-einstein',
                    recs: buildRecs(['Post Idle Shirt']),
                },
            });

            function IdleHarness(): ReactElement {
                const [, setTick] = useState(0);
                triggerRerender = () => setTick((n) => n + 1);
                return (
                    <CartContent
                        basket={mockBasket}
                        productsByItemId={mockProductMap}
                        bonusProductsById={mockBonusProductsById}
                    />
                );
            }

            const router = createMemoryRouter(
                [
                    {
                        path: '/cart',
                        element: (
                            <AllProvidersWrapper>
                                <IdleHarness />
                            </AllProvidersWrapper>
                        ),
                    },
                ],
                { initialEntries: ['/cart'] }
            );
            render(<RouterProvider router={router} />);

            // Pre-idle: no fetch, no carousel.
            expect(mockGetRecommendations).not.toHaveBeenCalled();
            expect(screen.queryByText(t('product:recommendations.youMightAlsoLike'))).not.toBeInTheDocument();

            // Flip the hook and force a re-render of the SAME IdleHarness instance.
            act(() => {
                idleReady = true;
                triggerRerender?.();
            });

            await waitFor(() => {
                const requestedNames = mockGetRecommendations.mock.calls.map(([name]) => name);
                expect(requestedNames).toEqual(
                    expect.arrayContaining(['product-to-product-einstein', 'viewed-recently-einstein'])
                );
            });
            expect(await screen.findByText(t('product:recommendations.youMightAlsoLike'))).toBeInTheDocument();
            expect(screen.getByText('Post Idle Shirt')).toBeInTheDocument();
        });

        test('pre-idle: empty cart short-circuits before the deferred wrapper is reached', async () => {
            // The deferred wrapper guards against unnecessary lazy chunk mounts on a populated
            // cart; the empty-cart branch must still render <CartEmpty /> regardless of the
            // hook's state and must not fetch recommendations.
            vi.mocked(useDeferredRender).mockReturnValue(false);

            renderCartContent({
                basket: { ...mockBasket, productItems: [] },
                productsByItemId: mockProductMap,
                bonusProductsById: mockBonusProductsById,
            });

            await waitFor(() => {
                expect(screen.getByTestId('sf-cart-empty')).toBeInTheDocument();
            });
            expect(mockGetRecommendations).not.toHaveBeenCalled();
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

    describe('basket sync into BasketProvider', () => {
        // Read-only consumer: useBasket() does not fall back to a SCAPI fetch. If CartContent's
        // pre-paint sync is broken, the probe renders "no-basket" on first commit and never recovers.
        function BasketProbe() {
            const basket = useBasket();
            return <div data-testid="basket-probe">{basket?.basketId ?? 'no-basket'}</div>;
        }

        const renderWithBasketProvider = (
            basket: typeof mockBasket,
            ProbeComponent: React.ComponentType = BasketProbe
        ) => {
            const router = createMemoryRouter(
                [
                    {
                        path: '/cart',
                        element: (
                            <AllProvidersWrapper>
                                <BasketProvider snapshot={null}>
                                    <ProbeComponent />
                                    <CartContent
                                        basket={basket}
                                        productsByItemId={mockProductMap}
                                        bonusProductsById={mockBonusProductsById}
                                    />
                                </BasketProvider>
                            </AllProvidersWrapper>
                        ),
                    },
                ],
                { initialEntries: ['/cart'] }
            );
            return render(<RouterProvider router={router} />);
        };

        test('makes the loader basket observable to descendants on first commit', async () => {
            renderWithBasketProvider(mockBasket);

            await waitFor(() => {
                expect(screen.getByTestId('basket-probe')).toHaveTextContent('test-basket-id');
            });
        });

        test('sibling consumer observes undefined on first commit even with the pre-paint sync', async () => {
            // Load-bearing reason useBasket() defaults to autoLoad:false: CartContent's
            // useLayoutEffect-based sync runs *after* the first commit of any consumer that
            // mounts in the same render. Sibling and descendant useBasket() consumers
            // therefore observe `current === undefined` on their first committed render and
            // re-render once the sync writes to context. Auto-load on this site would issue
            // a redundant `GET /baskets/{id}` and flicker the UI before the pre-paint sync
            // takes effect.
            const renders: (string | undefined)[] = [];
            function DefaultProbe() {
                const basket = useBasket();
                renders.push(basket?.basketId);
                return <div data-testid="default-probe">{basket?.basketId ?? 'no-basket'}</div>;
            }

            renderWithBasketProvider(mockBasket, DefaultProbe);

            await waitFor(() => {
                expect(screen.getByTestId('default-probe')).toHaveTextContent('test-basket-id');
            });

            // First committed render does NOT see the basket — the autoLoad:false default is
            // required at every read-only consumer that mounts inside or alongside CartContent.
            expect(renders[0]).toBeUndefined();
        });
    });
});
