import type { Preview } from '@storybook/react-vite';
import type { ComponentType, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { applyProviders } from '../src/lib/provider-utils';
import { storybookProviders } from './storybook-providers';
import { inBasketProductDetails } from '../src/components/__mocks__/basket-with-dress';
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
    const [router, setRouter] = useState<ReturnType<typeof createMemoryRouter> | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Wrap Story with providers
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
        const newRouter = createMemoryRouter(
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
            ],
            {
                initialEntries: ['/'],
            }
        );

        setRouter(newRouter);
        // Use a microtask to ensure the router is fully initialized before marking as ready
        // This helps prevent race conditions in static builds where components might unmount
        Promise.resolve().then(() => {
            setIsReady(true);
        });
    }, [Story]);

    if (!router || !isReady) {
        // Return a minimal placeholder instead of null to prevent unmounting issues
        // This ensures the DOM structure is stable for interaction tests
        return <div data-storybook-loading="true" style={{ minHeight: '1px' }} />;
    }

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

