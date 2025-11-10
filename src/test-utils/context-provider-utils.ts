/**
 * Test utilities for context providers - utilities and constants
 *
 * This file provides utility functions and mock data for testing components and hooks
 * that depend on various context providers.
 */

import { createElement, type ReactNode } from 'react';
import { createAppConfig, ConfigProvider } from '@/config/context';
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
                socialLogin: { enabled: true, callbackUri: '/social-login-callback', providers: ['Apple', 'Google'] },
                socialShare: { enabled: true, providers: ['Twitter', 'Facebook', 'LinkedIn', 'Email'] },
                guestCheckout: true,
            },
        },
        i18n: {
            fallbackLng: 'en',
            supportedLngs: ['en'],
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
            skeleton: {
                thumbnails: 4,
                colorVariants: 3,
                sizeVariants: 5,
                accordionSections: 3,
                defaultItemCount: 4,
            },
            recommendations: {
                search_limit: {
                    youMightLike: 4,
                    completeLook: 4,
                    recentlyViewed: 4,
                },
                types: {
                    'you-may-also-like': {
                        enabled: true,
                        priority: 1,
                        sort: 'relevance',
                        titleKey: 'youMayAlsoLike',
                    },
                    'complete-the-look': {
                        enabled: true,
                        priority: 2,
                        sort: 'relevance',
                        titleKey: 'completeTheLook',
                    },
                    'recently-viewed': {
                        enabled: true,
                        priority: 3,
                        sort: 'relevance',
                        titleKey: 'recentlyViewed',
                    },
                },
            },
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
 * Deep merge utility for configuration objects
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
    const result = { ...target };

    for (const key in source) {
        if (source[key] !== undefined) {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                result[key] = deepMerge(
                    (target[key] || {}) as Record<string, unknown>,
                    source[key] as Record<string, unknown>
                ) as T[Extract<keyof T, string>];
            } else {
                result[key] = source[key] as T[Extract<keyof T, string>];
            }
        }
    }

    return result;
}

/**
 * Helper to create a custom config wrapper with overrides
 */
export function createConfigWrapper(configOverrides?: Partial<Config>) {
    const customConfig = configOverrides ? createAppConfig(deepMerge(mockBuildConfig, configOverrides)) : mockConfig;

    return function CustomConfigWrapper({ children }: { children: ReactNode }) {
        return createElement(ConfigProvider, { config: customConfig }, children);
    };
}
