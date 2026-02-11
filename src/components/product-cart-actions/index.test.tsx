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

// Testing libraries
import { type ComponentProps } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi, beforeEach } from 'vitest';
// React Router
import { createMemoryRouter, RouterProvider } from 'react-router';
// Components
import ProductCartActions from './index';
import ProductViewProvider from '@/providers/product-view';
import { AllProvidersWrapper } from '@/test-utils/context-provider';
// mock data
import { masterProduct } from '@/components/__mocks__/master-variant-product';
import { standardProd } from '@/components/__mocks__/standard-product-2';
import { bundleProd } from '@/components/__mocks__/bundle-product';
import { mockBuildConfig } from '@/test-utils/config';
import { createAppConfig } from '@/config/context';
import { getTranslation } from '@/lib/i18next';

// Create a default config object for tests
const defaultTestConfig = createAppConfig({
    ...mockBuildConfig,
    app: {
        ...mockBuildConfig.app,
        features: {
            ...mockBuildConfig.app.features,
            passwordlessLogin: {
                enabled: false,
                callbackUri: '/passwordless-login-callback',
                landingUri: '/passwordless-login-landing',
            },
            socialLogin: { enabled: true, callbackUri: '/social-callback', providers: ['Apple', 'Google'] },
            socialShare: { enabled: true, providers: ['Twitter', 'Facebook', 'LinkedIn', 'Email'] },
            guestCheckout: true,
        },
    },
});

// Mock useToast
const mockAddToast = vi.fn();
vi.mock('@/components/toast', () => ({
    useToast: () => ({
        addToast: mockAddToast,
    }),
}));

// Mock navigator.clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
    clipboard: {
        writeText: mockWriteText,
    },
});

// Mock navigator.share
const mockShare = vi.fn();
Object.defineProperty(navigator, 'share', {
    writable: true,
    value: mockShare,
});

// Mock window.open
const mockWindowOpen = vi.fn();
window.open = mockWindowOpen;

// Mock window.location for ShareButton with getter
let mockLocationHref = 'http://localhost:5173/product/test-product-id';
Object.defineProperty(window, 'location', {
    writable: true,
    configurable: true,
    value: {
        get href() {
            return mockLocationHref;
        },
        set href(value: string) {
            mockLocationHref = value;
        },
    },
});

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
                    <AllProvidersWrapper config={defaultTestConfig}>
                        <ProductViewProvider product={props.product} mode={mode}>
                            <ProductCartActions {...props} />
                        </ProductViewProvider>
                    </AllProvidersWrapper>
                ),
            },
        ],
        {
            initialEntries: [initialUrl],
        }
    );
    return {
        ...render(<RouterProvider router={router} />),
        router,
    };
};

describe('ProductCartActions', () => {
    const { t } = getTranslation();

    beforeEach(() => {
        vi.clearAllMocks();
        mockWriteText.mockResolvedValue(undefined);
        mockShare.mockResolvedValue(undefined);
        mockWindowOpen.mockClear();
    });

    describe('when shopping for a product', () => {
        test('add to cart and wishlist buttons are rendered', () => {
            renderProductCartActions({ product: standardProd });

            // User should see a button to add the product to cart
            expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();

            // User should see a button to add the product to wishlist
            expect(screen.getByRole('button', { name: /add to wishlist/i })).toBeInTheDocument();

            // User should see a share button
            expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
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
            expect(screen.getByText(t('product:selectAllOptions'))).toBeInTheDocument();
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

        test('share button is not shown when editing', () => {
            renderProductCartActions({ product: standardProd }, 'edit');

            // Share button is not shown when editing existing cart items
            expect(screen.queryByRole('button', { name: /share/i })).not.toBeInTheDocument();
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

    describe('Share Button Integration', () => {
        test('share button is rendered alongside wishlist button', () => {
            renderProductCartActions({ product: standardProd });

            const wishlistButton = screen.getByRole('button', { name: /add to wishlist/i });
            const shareButton = screen.getByRole('button', { name: /share/i });

            expect(wishlistButton).toBeInTheDocument();
            expect(shareButton).toBeInTheDocument();

            // Both buttons should be in the same grid container
            const buttonsContainer = wishlistButton.closest('div.grid');
            expect(buttonsContainer).toContainElement(shareButton);
        });

        test('share button opens dropdown menu when clicked', async () => {
            const user = userEvent.setup();
            renderProductCartActions({ product: standardProd });

            const shareButton = screen.getByRole('button', { name: /share/i });
            await user.click(shareButton);

            await waitFor(() => {
                expect(screen.getByText('Copy link')).toBeInTheDocument();
            });
        });

        test('share button shows configured social providers', async () => {
            const user = userEvent.setup();
            renderProductCartActions({ product: standardProd });

            const shareButton = screen.getByRole('button', { name: /share/i });
            await user.click(shareButton);

            await waitFor(() => {
                expect(screen.getByText('Copy link')).toBeInTheDocument();
            });

            // Check for configured social providers
            expect(screen.getByText('Email')).toBeInTheDocument();
            expect(screen.getByText('Twitter/X')).toBeInTheDocument();
        });

        test('share button respects disabled socialShare config', async () => {
            const customConfig = createAppConfig({
                ...mockBuildConfig,
                app: {
                    ...mockBuildConfig.app,
                    features: {
                        ...mockBuildConfig.app.features,
                        passwordlessLogin: {
                            enabled: false,
                            callbackUri: '/passwordless-login-callback',
                            landingUri: '/passwordless-login-landing',
                        },
                        socialLogin: { enabled: true, callbackUri: '/social-callback', providers: ['Apple', 'Google'] },
                        socialShare: { enabled: false, providers: ['Twitter', 'Facebook', 'LinkedIn', 'Email'] },
                        guestCheckout: true,
                    },
                },
            });

            const user = userEvent.setup();
            const productId = standardProd.id;
            const initialUrl = `/product/${productId}`;
            const router = createMemoryRouter(
                [
                    {
                        path: '/product/:productId',
                        element: (
                            <AllProvidersWrapper config={customConfig}>
                                <ProductViewProvider product={standardProd} mode="add">
                                    <ProductCartActions product={standardProd} />
                                </ProductViewProvider>
                            </AllProvidersWrapper>
                        ),
                    },
                ],
                {
                    initialEntries: [initialUrl],
                }
            );
            render(<RouterProvider router={router} />);

            const shareButton = screen.getByRole('button', { name: /share/i });
            await user.click(shareButton);

            await waitFor(() => {
                expect(screen.getByText('Copy link')).toBeInTheDocument();
            });

            // Social providers should not be shown when disabled
            expect(screen.queryByText('Email')).not.toBeInTheDocument();
            expect(screen.queryByText('Twitter/X')).not.toBeInTheDocument();
        });

        test('share button shows copy link option', async () => {
            const user = userEvent.setup();
            renderProductCartActions({ product: standardProd });

            const shareButton = screen.getByRole('button', { name: /share/i });
            await user.click(shareButton);

            await waitFor(() => {
                expect(screen.getByText('Copy link')).toBeInTheDocument();
            });

            // Verify copy link option is present and clickable
            const copyLinkOption = screen.getByText('Copy link');
            expect(copyLinkOption).toBeInTheDocument();
            await user.click(copyLinkOption);

            // Verify toast is shown (clipboard functionality is tested in ShareButton tests)
            await waitFor(() => {
                expect(mockAddToast).toHaveBeenCalled();
            });
        });
    });

    describe('pending action execution', () => {
        test('executes pending wishlist action when URL has matching params', async () => {
            const mockOnBeforeAddToWishlist = vi.fn();
            const mockOnAddToWishlistSuccess = vi.fn();
            const productId = (standardProd.productId as string) || standardProd.id;

            const router = createMemoryRouter(
                [
                    {
                        path: '/product/:productId',
                        element: (
                            <AllProvidersWrapper config={defaultTestConfig}>
                                <ProductViewProvider product={standardProd}>
                                    <ProductCartActions
                                        product={standardProd}
                                        onBeforeAddToWishlist={mockOnBeforeAddToWishlist}
                                        onAddToWishlistSuccess={mockOnAddToWishlistSuccess}
                                    />
                                </ProductViewProvider>
                            </AllProvidersWrapper>
                        ),
                    },
                ],
                {
                    initialEntries: [
                        `/product/${productId}?action=addToWishlist&actionParams=${encodeURIComponent(JSON.stringify({ productId }))}`,
                    ],
                }
            );

            render(<RouterProvider router={router} />);

            await waitFor(
                () => {
                    expect(mockOnBeforeAddToWishlist).toHaveBeenCalled();
                    expect(mockHandleAddToWishlist).toHaveBeenCalled();
                },
                { timeout: 3000 }
            );
        });

        test('does not execute pending action when productId does not match', async () => {
            const mockOnBeforeAddToWishlist = vi.fn();
            const productId = (standardProd.productId as string) || standardProd.id;
            const differentProductId = 'different-product-id';

            const router = createMemoryRouter(
                [
                    {
                        path: '/product/:productId',
                        element: (
                            <AllProvidersWrapper config={defaultTestConfig}>
                                <ProductViewProvider product={standardProd}>
                                    <ProductCartActions
                                        product={standardProd}
                                        onBeforeAddToWishlist={mockOnBeforeAddToWishlist}
                                    />
                                </ProductViewProvider>
                            </AllProvidersWrapper>
                        ),
                    },
                ],
                {
                    initialEntries: [
                        `/product/${productId}?action=addToWishlist&actionParams=${encodeURIComponent(JSON.stringify({ productId: differentProductId }))}`,
                    ],
                }
            );

            render(<RouterProvider router={router} />);

            // Wait a bit to ensure action doesn't execute
            await new Promise((resolve) => setTimeout(resolve, 500));

            expect(mockOnBeforeAddToWishlist).not.toHaveBeenCalled();
            expect(mockHandleAddToWishlist).not.toHaveBeenCalled();
        });

        test('shows loading state when pending action is executing', async () => {
            const productId = (standardProd.productId as string) || standardProd.id;

            // Mock handleAddToWishlist to be async and take some time
            mockHandleAddToWishlist.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

            const router = createMemoryRouter(
                [
                    {
                        path: '/product/:productId',
                        element: (
                            <AllProvidersWrapper config={defaultTestConfig}>
                                <ProductViewProvider product={standardProd}>
                                    <ProductCartActions product={standardProd} />
                                </ProductViewProvider>
                            </AllProvidersWrapper>
                        ),
                    },
                ],
                {
                    initialEntries: [
                        `/product/${productId}?action=addToWishlist&actionParams=${encodeURIComponent(JSON.stringify({ productId }))}`,
                    ],
                }
            );

            render(<RouterProvider router={router} />);

            // Check if loading state is shown (button should show "Adding To Wishlist..." text or be disabled)
            await waitFor(
                () => {
                    const wishlistButton = screen.getByRole('button', { name: /adding to wishlist/i });
                    expect(wishlistButton).toBeInTheDocument();
                },
                { timeout: 2000 }
            );
        });
    });
});
