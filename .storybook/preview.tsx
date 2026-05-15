import type { Preview } from '@storybook/react-vite';
import type { ComponentType, ReactNode } from 'react';
import { useMemo } from 'react';
import { createMemoryRouter, Outlet, RouterProvider, type RouteObject } from 'react-router';
import { applyProviders } from '../src/lib/provider-utils';
import { storybookProviders } from './storybook-providers';
import { inBasketProductDetails } from '@/components/__mocks__/basket-with-dress';
import { masterProduct } from '@/components/__mocks__/master-variant-product';
import '../src/theme/index.css'; // Import global CSS
import { UITargetProviders } from '@/targets/ui-target-providers';

// Create HOC that applies all Storybook providers
// This uses the real provider components with mock data injected via wrapper components
const withStorybookProviders = applyProviders(...storybookProviders);

// Create a stable wrapper component that applies providers.
// Note: sonner's `toast()` API queues without a mounted <Toaster /> — calls don't error.
// Stories that need to assert on a rendered toast can mount <ToasterTheme /> in their
// own decorator. Mounting it globally would introduce duplicate-landmark axe failures on
// stories that already render their own <section> landmarks (e.g. checkout, contact).
const StorybookWrapper = withStorybookProviders(({ children }: { children: ReactNode }) => (
    <div className="min-h-screen bg-background text-foreground">{children}</div>
));

// Router wrapper component that ensures React is initialized before rendering RouterProvider
const RouterWrapper = ({
    Story,
    context,
}: {
    Story: ComponentType;
    context: { parameters?: Record<string, unknown> };
}) => {
    // When a story provides `parameters.routeLoaderData`, wrap the story inside ancestor
    // routes that expose their data via useRouteLoaderData(routeId). This lets components
    // like CategoryBanner receive loader data without modifying the component itself.
    const routeLoaderData = context.parameters?.routeLoaderData as Record<string, unknown> | undefined;

    // When a story provides `parameters.scapiMock`, override the default product fixture
    // returned by the `/resource/api/client/:resource` route. Used by components whose
    // play functions assert against story-specific product data (e.g. BonusProductModal)
    const scapiMock = context.parameters?.scapiMock as { data?: unknown } | undefined;

    const WrappedStory = (
        <StorybookWrapper>
            <UITargetProviders>
                <Story />
            </UITargetProviders>
        </StorybookWrapper>
    );

    // Default action for the story root route: absorbs page-level fetcher.submit() calls that
    // omit an explicit `action` (e.g. useCheckoutActions submits contact/shipping/payment forms
    // to the current route). Returns a generic success so the action's `data` is defined and
    // doesn't trigger the component's "blocking error" toast paths.
    const defaultStoryAction = () => ({ success: true });

    // Build the main story route. When routeLoaderData is provided, each entry becomes a
    // pathless ancestor layout route (element: <Outlet />) so useRouteLoaderData(id) resolves.
    // The outermost entry gets path: '/' to anchor the route tree.
    const storyRoute: RouteObject =
        routeLoaderData && Object.keys(routeLoaderData).length > 0
            ? Object.entries(routeLoaderData).reduceRight<RouteObject>(
                  (child, [id, data], i) => ({
                      ...(i === 0 ? { path: '/', action: defaultStoryAction } : {}),
                      id,
                      loader: () => data,
                      element: <Outlet />,
                      children: [child],
                  }),
                  { index: true, element: WrappedStory }
              )
            : { path: '/', element: WrappedStory, action: defaultStoryAction };

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
                    storyRoute,
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
                        path: '/action/verify-passwordless-otp',
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
                        // Mock action route for passwordless email OTP trigger
                        // Used by ContactInfo component via fetcher.submit() on email blur
                        path: '/action/authorize-passwordless-email',
                        action: () => ({ success: false }),
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
                        // Mock action route for site-context updates (currency / locale).
                        // Used by CurrencySwitcher and LocaleSwitcher via fetcher.submit().
                        //
                        // Two consumers, two paths:
                        //   - `type=locale` — LocaleSwitcher follows the await with
                        //     `window.location.href = pathname`. `window.location` is
                        //     `[Unforgeable]` so we can't intercept the redirect; instead we
                        //     hang the fetcher so the iframe stays alive for play assertions.
                        //   - `type=currency` — CurrencySwitcher uses a fire-and-forget
                        //     `void fetcher.submit(...)` and stays on the page. Returning
                        //     success immediately keeps the fetcher's state idle so it doesn't
                        //     leak `submitting` into other stories rendered in the same iframe.
                        path: '/action/set-site-context',
                        action: async ({ request }) => {
                            const formData = await request.formData();
                            if (formData.get('type') === 'locale') {
                                return new Promise(() => {});
                            }
                            return { success: true };
                        },
                    },
                    {
                        // Mock action route for tracking consent updates
                        // Used by useTrackingConsent (TrackingConsentBanner) via fetcher.submit()
                        path: '/action/update-tracking-consent',
                        action: () => ({ success: true }),
                    },
                    {
                        // Mock action route for the checkout place-order step
                        // Used by useCheckoutActions.submitPlaceOrder via fetcher.submit()
                        path: '/action/place-order',
                        action: () => ({ success: true }),
                    },
                    {
                        // Mock loader for SCAPI resource calls (e.g. product fetches inside CartItemModal).
                        // useScapiFetcher calls fetcher.load('/resource/api/client/:resource') — without a
                        // loader here React Router throws a 404 when Quick Add opens the modal.
                        //
                        // Stories can override the returned fixture by setting
                        //   parameters: { scapiMock: { data: myFixture } }
                        // This is required when a play function asserts against story-specific product data
                        // (e.g. BonusProductModal's tie fixture) instead of the default masterProduct.
                        path: '/resource/api/client/:resource',
                        loader: () => ({ success: true, data: scapiMock?.data ?? masterProduct }),
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [WrappedStory, routeLoaderData, scapiMock]
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
        (Story: ComponentType, context: { parameters?: Record<string, unknown> }) => {
            // Use a wrapper component that ensures React is initialized before creating the router
            return <RouterWrapper Story={Story} context={context} />;
        },
    ],
};

export default preview;

