/**
 * Shared test utilities for configuration
 *
 * This file provides reusable mock configuration objects and wrapper components
 * for testing components and hooks that depend on the ConfigProvider context.
 *
 */

import { createElement, type ReactNode } from 'react';
import { ConfigProvider, createAppConfig } from '@/config/context';
import type { Config } from '@/config/schema';

/**
 * Mock build-time configuration for tests
 */
export const mockBuildConfig: Config = {
    metadata: {
        projectName: 'Test Project',
        projectSlug: 'test-project',
    },
    runtime: {
        defaultMrtProject: '',
        defaultMrtTarget: '',
        ssrOnly: ['loader.js'],
        ssrShared: ['static/**/*'],
        ssrParameters: { ssrFunctionNodeVersion: '22.x' },
    },
    app: {
        pages: {
            home: { featuredProductsCount: 12 },
            cart: {
                quantityUpdateDebounce: 750,
                enableRemoveConfirmation: true,
                maxQuantityPerItem: 999,
                enableSaveForLater: false,
                removeAction: '/action/cart-item-remove',
                confirmDescription: 'Are you sure you want to remove this item from your cart?',
            },
            search: {
                placeholder: 'Search',
                enableSearchSuggestions: true,
                maxSuggestions: 8,
                enableRecentSearches: true,
                suggestionsDebounce: 100,
            },
        },
        commerce: {
            api: {
                clientId: 'test-client',
                organizationId: 'test-org',
                siteId: 'test-site',
                shortCode: 'test123',
                proxy: '/mobify/proxy/api',
                callback: '/callback',
                privateKeyEnabled: false,
            },
        },
        site: {
            locale: 'en-US',
            currency: 'USD',
            features: {
                passwordlessLogin: {
                    enabled: false,
                    callbackUri: '/passwordless-login-callback',
                    landingUri: '/passwordless-login-landing',
                },
                resetPassword: {
                    callbackUri: '/reset-password-callback',
                    landingUri: '/reset-password-landing',
                },
                socialLogin: { enabled: true, providers: ['Apple', 'Google'] },
                socialShare: { enabled: true, providers: ['Twitter', 'Facebook', 'LinkedIn', 'Email'] },
                guestCheckout: true,
            },
        },
        global: {
            branding: { name: 'Test Store', logoAlt: 'Home' },
            productListing: {
                productsPerPage: 24,
                enableInfiniteScroll: false,
                sortOptions: ['relevance'],
                enableQuickView: true,
            },
            carousel: { defaultItemCount: 4 },
            badges: [
                { propertyName: 'c_isSale', label: 'Sale', color: 'orange', priority: 1 },
                { propertyName: 'c_isNew', label: 'New', color: 'green', priority: 2 },
            ],
        },
        performance: {
            images: { quality: 80, formats: ['webp', 'jpeg'], lazyLoading: true },
            caching: { apiCacheTtl: 300, staticAssetCacheTtl: 31536000 },
        },
        development: {
            enableDevtools: true,
            hotReload: true,
            strictMode: true,
        },
    },
};

/**
 * Pre-created mock config for convenience
 */
export const mockConfig = createAppConfig(mockBuildConfig);

/**
 * React Testing Library wrapper component that provides ConfigProvider context
 *
 * @example
 * ```typescript
 * import { ConfigWrapper } from '@/test-utils/config';
 *
 * renderHook(() => useConfig(), { wrapper: ConfigWrapper });
 * ```
 */
export function ConfigWrapper({ children }: { children: ReactNode }) {
    return createElement(ConfigProvider, { config: mockConfig }, children);
}

/**
 * Helper to create a custom config wrapper with overrides
 *
 * @example
 * ```typescript
 * const CustomWrapper = createConfigWrapper({
 *   app: {
 *     pages: {
 *       cart: { quantityUpdateDebounce: 1000 }
 *     }
 *   }
 * });
 *
 * renderHook(() => useConfig(), { wrapper: CustomWrapper });
 * ```
 */
export function createConfigWrapper(configOverrides?: Partial<Config>) {
    const customConfig = configOverrides ? createAppConfig({ ...mockBuildConfig, ...configOverrides }) : mockConfig;

    return function CustomConfigWrapper({ children }: { children: ReactNode }) {
        return createElement(ConfigProvider, { config: customConfig }, children);
    };
}
