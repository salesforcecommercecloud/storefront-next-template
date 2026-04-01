import type { Preview } from '@storybook/react-vite';
import type { ComponentType, ReactNode } from 'react';
import { useMemo } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { applyProviders } from '../src/lib/provider-utils';
import { storybookProviders } from './storybook-providers';
import { inBasketProductDetails } from '@/components/__mocks__/basket-with-dress';
import { masterProduct } from '@/components/__mocks__/master-variant-product';
import '../src/app.css'; // Import global CSS
import { TargetProviders } from '@/targets/target-providers';

// Create HOC that applies all Storybook providers
// This uses the real provider components with mock data injected via wrapper components
const withStorybookProviders = applyProviders(...storybookProviders);

// Create a stable wrapper component that applies providers
const StorybookWrapper = withStorybookProviders(({ children }: { children: ReactNode }) => (
    <div className="min-h-screen bg-background text-foreground">{children}</div>
));

// Router wrapper component that ensures React is initialized before rendering RouterProvider
const RouterWrapper = ({ Story }: { Story: ComponentType }) => {
    const WrappedStory = (
        <StorybookWrapper>
            <TargetProviders>
                <Story />
            </TargetProviders>
        </StorybookWrapper>
    );

    // Create a memory router for components that use React Router hooks (e.g., useFetcher)
    // This provides the data router context needed for useFetcher and other React Router hooks
    // Using createMemoryRouter in framework mode is fine because both framework and data routers
    // share the same underlying architecture, so it provides a valid navigation context for hooks and <Link>.
    // IMPORTANT: Create router synchronously (not in useEffect) to ensure it's available during first render
    // This is critical for static Storybook builds where async initialization causes empty div renders
    const router = useMemo(
        () =>
            createMemoryRouter(
                [
                    {
                        path: '/',
                        element: WrappedStory,
                    },
                    {
                        // Resource route for basket product enrichment
                        // Used by useBasketWithProducts hook to fetch full product details
                        path: '/resource/basket-products',
                        loader: () => {
                            // Pre-populate product data from mock
                            // This simulates what would be fetched from the backend
                            const productsById: Record<string, unknown> = {};
                            inBasketProductDetails.data.forEach((product: { id?: string }) => {
                                if (product.id) {
                                    productsById[product.id] = product;
                                }
                            });
                            return productsById;
                        },
                    },
                    {
                        // Resource route for basket product promotions
                        // Used by useBasketWithPromotions hook to fetch product promotion data
                        path: '/resource/basket-products-promotions',
                        loader: () => {
                            // Return products with empty productPromotions array
                            // This prevents bonus product logic from being triggered in stories
                            const productsWithPromotions: Record<string, unknown> = {};
                            inBasketProductDetails.data.forEach((product: { id?: string }) => {
                                if (product.id) {
                                    productsWithPromotions[product.id] = {
                                        ...product,
                                        productPromotions: [],
                                    };
                                }
                            });
                            return productsWithPromotions;
                        },
                    },
                    {
                        // Action route for OTP verification
                        // Used by OTP Modal component's useFetcher hook
                        path: '/action/verify-otp',
                        action: async () => ({ success: false, error: 'Mock OTP verification action' }),
                    },
                    {
                        // Mock action route for cart item quantity updates
                        // Used by useCartQuantityUpdate hook via fetcher.submit()
                        path: '/action/cart-item-update',
                        action: () => ({ success: true }),
                    },
                    {
                        // Mock action route for cart item removal
                        // Used by useCartQuantityUpdate hook for remove operations
                        path: '/action/cart-item-remove',
                        action: () => ({ success: true }),
                    },
                    {
                        // Mock action route for bonus product addition
                        // Used by useBonusProductAdd hook via fetcher.submit()
                        path: '/action/bonus-product-add',
                        action: () => ({ success: true }),
                    },
                    {
                        // Mock action route for checkout registration
                        // Used by RegisterCustomerSelection component via fetcher.submit()
                        path: '/action/initiate-checkout-registration',
                        action: () => ({ success: true, email: 'test@example.com' }),
                    },
                    {
                        // Mock action route for adding items to cart
                        // Used by useProductActions hook via fetcher.submit()
                        path: '/action/cart-item-add',
                        action: () => ({ success: true }),
                    },
                    {
                        // Mock action route for adding product sets to cart
                        // Used by useProductActions hook via fetcher.submit()
                        path: '/action/cart-set-add',
                        action: () => ({ success: true }),
                    },
                    {
                        // Mock action route for adding product bundles to cart
                        // Used by useProductActions hook via fetcher.submit()
                        path: '/action/cart-bundle-add',
                        action: () => ({ success: true }),
                    },
                    {
                        // Mock action route for adding items to wishlist
                        // Used by useWishlist hook via fetcher.submit()
                        path: '/action/wishlist-add',
                        action: () => ({ success: true }),
                    },
                    {
                        // Mock action route for removing items from wishlist
                        // Used by useWishlist hook via fetcher.submit()
                        path: '/action/wishlist-remove',
                        action: () => ({ success: true }),
                    },
                    {
                        // Mock loader for SCAPI resource calls (e.g. product fetches inside CartItemModal).
                        // useScapiFetcher calls fetcher.load('/resource/api/client/:resource') — without a
                        // loader here React Router throws a 404 when Quick Add opens the modal.
                        path: '/resource/api/client/:resource',
                        loader: () => ({ success: true, data: masterProduct }),
                    },
                    {
                        // Catch-all: absorbs navigations triggered by interactive components
                        // (e.g. swatch <Link>, Quick Add "Buy it Now", product tile clicks).
                        // Returns the user to the story root so the 404 error page is never shown.
                        path: '*',
                        element: WrappedStory,
                    },
                ],
                {
                    initialEntries: ['/'],
                }
            ),
        [WrappedStory]
    );

    return <RouterProvider router={router} />;
};

const a11yTestMode: 'off' | 'todo' | 'error' =
    process.env.STORYBOOK_DISABLE_A11Y === 'true'
        ? 'off'
        : process.env.STORYBOOK_A11Y_TEST_MODE === 'error'
            ? 'error'
            : 'todo';

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },

        a11y: {
            // 'error' - fail CI on a11y violations when explicitly enabled (e.g. a11y test command)
            // 'todo' - show a11y violations in the test UI only (default)
            // 'off' - skip a11y checks entirely for interaction-focused runs
            test: a11yTestMode,
        },
    },
    decorators: [
        (Story: ComponentType) => {
            // Use a wrapper component that ensures React is initialized before creating the router
            return <RouterWrapper Story={Story} />;
        },
    ],
};

export default preview;

