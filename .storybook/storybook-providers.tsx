/**
 * Storybook Provider Wrappers
 *
 * This file provides wrapper components that use the REAL provider components
 * from the application with mock data injected. This ensures Storybook always
 * stays in sync with the actual provider implementations.
 *
 * When a provider's interface changes, you'll get a TypeScript error here,
 * making it clear what needs to be updated.
 *
 * @see {@link ../../.storybook/README.md} for documentation on maintaining these providers.
 */

import type { PropsWithChildren } from 'react';
import AuthProvider from '../src/providers/auth';
import BasketProvider from '../src/providers/basket';
import CheckoutOneClickProvider from '../src/components/checkout/utils/checkout-context';
import ProductViewProvider from '../src/providers/product-view';
// @sfdc-extension-line SFDC_EXT_STORE_LOCATOR
import StoreLocatorProvider from '../src/extensions/store-locator/providers/store-locator';
import { ConfigProvider } from '../src/config';
import { mockConfig } from '../src/test-utils/config';
import type { SessionData } from '../src/lib/api/types';
import type { ShopperBasketsTypes, ShopperProductsTypes } from 'commerce-sdk-isomorphic';

/**
 * Mock session data for Storybook
 * Update this when SessionData type changes
 */
const mockSessionData: SessionData = {
    userType: 'guest',
    customer_id: undefined,
};

/**
 * Mock basket data for Storybook
 * Update this when ShopperBasketsTypes.Basket type changes
 */
const mockBasket: ShopperBasketsTypes.Basket | undefined = undefined;

/**
 * Mock product data for Storybook (used when ProductViewProvider is needed)
 * Update this when ShopperProductsTypes.Product type changes
 */
const mockProduct: ShopperProductsTypes.Product = {
    id: 'storybook-product',
    name: 'Storybook Product',
    inventory: {
        ats: 10,
    },
} as ShopperProductsTypes.Product;

/**
 * Storybook ConfigProvider wrapper with mock config
 */
export const StorybookConfigProvider = ({ children }: PropsWithChildren) => (
    <ConfigProvider config={mockConfig}>{children}</ConfigProvider>
);

/**
 * Storybook AuthProvider wrapper with mock session data
 */
export const StorybookAuthProvider = ({ children }: PropsWithChildren) => (
    <AuthProvider value={mockSessionData}>{children}</AuthProvider>
);

/**
 * Storybook BasketProvider wrapper with mock basket data
 */
export const StorybookBasketProvider = ({ children }: PropsWithChildren) => (
    <BasketProvider value={mockBasket}>{children}</BasketProvider>
);

/**
 * Storybook CheckoutProvider wrapper with mock customer profile
 */
export const StorybookCheckoutProvider = ({ children }: PropsWithChildren) => (
    <CheckoutOneClickProvider customerProfile={undefined}>{children}</CheckoutOneClickProvider>
);

/**
 * Storybook ProductViewProvider wrapper with mock product data
 * Only use this when testing components that specifically need ProductViewProvider
 */
export const StorybookProductViewProvider = ({ children }: PropsWithChildren) => (
    <ProductViewProvider product={mockProduct} mode="add">
        {children}
    </ProductViewProvider>
);

/**
 * Array of Storybook provider wrappers in the correct order
 * This order matches the application's provider hierarchy in root.tsx
 *
 * To add a new provider:
 * 1. Create a Storybook*Provider wrapper above
 * 2. Add it to this array in the correct position
 * 3. Update the documentation in README.md
 */
export const storybookProviders = [
    StorybookConfigProvider,
    StorybookAuthProvider,
    StorybookBasketProvider,
    StorybookCheckoutProvider,
    // @sfdc-extension-line SFDC_EXT_STORE_LOCATOR
    StoreLocatorProvider,
] as const;
