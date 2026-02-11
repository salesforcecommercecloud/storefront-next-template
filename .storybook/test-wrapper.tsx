/**
 * Global test wrapper component that provides necessary context providers
 * for story tests. This ensures all stories have access to Router, StoreLocatorProvider,
 * and CheckoutProvider without needing to add decorators to every story.
 */
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRouter, RouterProvider, useInRouterContext } from 'react-router';
import StoreLocatorProvider from '../src/extensions/store-locator/providers/store-locator';
import CheckoutOneClickProvider from '../src/components/checkout/utils/checkout-context';
import BasketProvider from '../src/providers/basket';
import AuthProvider from '../src/providers/auth';
import { ConfigProvider } from '../src/config';
import { mockConfig } from '../src/test-utils/config';
import { inBasketProductDetails } from '../src/components/__mocks__/basket-with-dress';

// Transform array of products into Record<productId, product> format
// expected by useBasketWithProducts hook
const mockProductsData = inBasketProductDetails.data.reduce(
    (acc: Record<string, (typeof inBasketProductDetails.data)[0]>, product: (typeof inBasketProductDetails.data)[0]) => {
        acc[product.id] = product;
        return acc;
    },
    {} as Record<string, (typeof inBasketProductDetails.data)[0]>
);

export function StoryTestWrapper({ children }: { children: ReactNode }): ReactElement {
    const inRouter = useInRouterContext();
    
    // Wrap with providers in the correct order (matching root.tsx)
    // CheckoutProvider needs BasketProvider, which needs AuthProvider
    const content = (
        <ConfigProvider config={mockConfig}>
            <AuthProvider value={{ userType: 'guest', customerId: undefined }}>
                <BasketProvider basket={undefined}>
                    <StoreLocatorProvider>
                        <CheckoutOneClickProvider customerProfile={undefined} shippingDefaultSet={Promise.resolve(undefined)}>
                            {children}
                        </CheckoutOneClickProvider>
                    </StoreLocatorProvider>
                </BasketProvider>
            </AuthProvider>
        </ConfigProvider>
    );
    
    // Only create router if one doesn't already exist (to avoid nested router errors)
    // Stories with decorators that create routers will handle it themselves
    if (inRouter) {
        return <>{content}</>;
    }
    
    // Create a memory router for components that need React Router context
    // Includes resource routes needed by hooks like useBasketWithProducts
    const router = createMemoryRouter(
        [
            {
                path: '/resource/basket-products',
                loader: () => mockProductsData,
            },
            {
                path: '*',
                element: content,
            },
        ],
        {
            initialEntries: ['/'],
        }
    );
    
    return <RouterProvider router={router} />;
}

