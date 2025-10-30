/*
 * Copyright (c) 2025, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Testing libraries
import { type ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';
// Components
import ProductCartActions from './index';
import ProductViewProvider from '@/providers/product-view';
// mock data
import { masterProduct } from '@/components/__mock__/master-variant-product';
import { standardProd } from '@/components/__mock__/standard-product';
import { bundleProd } from '@/components/__mock__/bundle-product';

// see https://vitest.dev/api/vi.html#mock-modules
// Mock the useProductActions hook - use vi.hoisted to ensure proper hoisting
const { mockHandleAddToCart, mockHandleUpdateCart, mockHandleAddToWishlist } = vi.hoisted(() => {
    return {
        mockHandleAddToCart: vi.fn(),
        mockHandleUpdateCart: vi.fn(),
        mockHandleAddToWishlist: vi.fn(),
    };
});

vi.mock('@/hooks/product/use-product-actions', async () => {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    const actual = await vi.importActual<typeof import('@/hooks/product/use-product-actions')>(
        '@/hooks/product/use-product-actions'
    );
    return {
        useProductActions: vi.fn((props) => {
            const result = actual.useProductActions(props);
            return {
                ...result,
                handleAddToCart: mockHandleAddToCart,
                handleUpdateCart: mockHandleUpdateCart,
                handleAddToWishlist: mockHandleAddToWishlist,
            };
        }),
    };
});

const renderProductCartActions = (props: ComponentProps<typeof ProductCartActions>, mode: 'add' | 'edit' = 'add') => {
    const productId = props.product.id;
    const initialUrl = `/product/${productId}`;
    // Using createMemoryRouter in framework mode is fine
    // because both framework and data routers share the same underlying architecture,
    // so it provides a valid navigation context for hooks and <Link>.
    // Even though it's listed under "data routers," it fully supports testing non-route components that rely on router behavior.
    const router = createMemoryRouter(
        [
            {
                path: '/product/:productId',
                element: (
                    <ProductViewProvider product={props.product} mode={mode}>
                        <ProductCartActions {...props} />
                    </ProductViewProvider>
                ),
            },
        ],
        {
            initialEntries: [initialUrl],
        }
    );
    return { ...render(<RouterProvider router={router} />), router };
};

describe('ProductCartActions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('when shopping for a product', () => {
        test('add to cart and wishlist buttons are rendered', () => {
            renderProductCartActions({ product: standardProd });

            // User should see a button to add the product to cart
            expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();

            // User should see a button to add the product to wishlist
            expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument();
        });

        test('add to cart button is disabled on out of stock item', () => {
            const outOfStockProduct = {
                ...standardProd,
                inventory: { ats: 0, orderable: false, id: 'test-inventory' },
            };
            renderProductCartActions({ product: outOfStockProduct });

            // Add to cart button should be disabled when product is out of stock
            expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
        });

        test('select variant options msg is rendered on firs load item when variations are not selected', () => {
            renderProductCartActions({ product: masterProduct });

            // User should see a message prompting them to select all options
            expect(screen.getByText(/please select all your options/i)).toBeInTheDocument();
        });

        test('product bundles do not show parent add to cart button', () => {
            renderProductCartActions({ product: bundleProd });

            // Bundles are added as a complete group, so parent doesn't have individual button
            expect(screen.queryByRole('button', { name: /^add to cart$/i })).not.toBeInTheDocument();
        });
    });

    describe('when editing cart item', () => {
        test('user can  see update cart button', () => {
            renderProductCartActions({ product: standardProd }, 'edit');

            // User should see a button to update the cart item
            expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
        });

        test('wishlist button is not shown when editing', () => {
            renderProductCartActions({ product: standardProd }, 'edit');

            // Wishlist is not relevant when editing existing cart items
            expect(screen.queryByRole('button', { name: /wishlist/i })).not.toBeInTheDocument();
        });
    });

    describe('user interactions', () => {
        test('clicking add to cart button calls handleAddToCart', async () => {
            const user = userEvent.setup();
            renderProductCartActions({ product: standardProd });

            const addToCartButton = screen.getByRole('button', { name: /add to cart/i });

            // Button should be clickable
            expect(addToCartButton).toBeEnabled();
            await user.click(addToCartButton);

            // handleAddToCart should be called
            expect(mockHandleAddToCart).toHaveBeenCalledOnce();
        });

        test('clicking add to wishlist button calls handleAddToWishlist', async () => {
            const user = userEvent.setup();
            renderProductCartActions({ product: standardProd });

            const addToWishlistButton = screen.getByRole('button', { name: /add to wishlist/i });

            // Wishlist button should always be clickable
            expect(addToWishlistButton).toBeEnabled();
            await user.click(addToWishlistButton);

            // handleAddToWishlist should be called
            expect(mockHandleAddToWishlist).toHaveBeenCalledOnce();
        });
    });
});
