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

/**
 * Shared test utilities for configuration
 *
 * This file provides reusable mock configuration objects and wrapper components
 * for testing components and hooks that depend on the ConfigProvider context.
 */

import { createElement, type ReactNode } from 'react';
import { ConfigProvider, createAppConfig } from '@/config/context';
import type { Config } from '@/config/schema';
import { TrackingConsent } from '@/types/tracking-consent';

/**
 * Mock build-time configuration for tests
 * Used by both vitest unit tests and Storybook
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
        ssrParameters: { ssrFunctionNodeVersion: '24.x' },
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
                ruleBasedProductLimit: 4,
                confirmDescription: 'Are you sure you want to remove this item from your cart?',
                miniCart: {
                    enableViewCartButton: true,
                },
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
                registeredRefreshTokenExpirySeconds: undefined,
                guestRefreshTokenExpirySeconds: undefined,
            },
            sites: [
                {
                    id: 'RefArchGlobal',
                    defaultLocale: 'en-US',
                    defaultCurrency: 'USD',
                    supportedLocales: [
                        { id: 'en-US', preferredCurrency: 'USD' },
                        { id: 'it-IT', preferredCurrency: 'EUR' },
                    ],
                    supportedCurrencies: ['EUR', 'USD'],
                },
            ],
        },
        defaultSiteId: 'RefArchGlobal',
        features: {
            guestCheckout: true,
            googleCloudAPI: {
                apiKey: '',
            },
            passwordlessLogin: {
                enabled: false,
                callbackUri: '/passwordless-login-callback',
                landingUri: '/passwordless-login-landing',
            },
            resetPassword: {
                callbackUri: '/reset-password-callback',
                landingUri: '/reset-password-landing',
            },
            socialLogin: { enabled: true, callbackUri: '/social-callback', providers: ['Apple', 'Google'] },
            socialShare: { enabled: true, providers: ['Twitter', 'Facebook', 'LinkedIn', 'Email'] },
            shopperContext: {
                enabled: false,
                dwsourcecodeCookieSuffix: 'test-site',
            },
        },
        hybrid: {
            enabled: false,
            legacyRoutes: [],
        },
        i18n: {
            fallbackLng: 'en-US',
            supportedLngs: ['it-IT', 'en-US'], // Fallback language should be last
        },
        global: {
            branding: { name: 'Test Store', logoAlt: 'Home' },
            productListing: {
                productsPerPage: 24,
                enableInfiniteScroll: false,
                sortOptions: ['relevance'],
                enableQuickView: true,
                defaultProductTileImgAspectRatio: 1,
            },
            carousel: { defaultItemCount: 4 },
            paginatedProductCarousel: {
                defaultLimit: 8,
            },
            badges: [
                { propertyName: 'c_isSale', label: 'Sale', color: 'orange', priority: 1 },
                { propertyName: 'c_isNew', label: 'New', color: 'green', priority: 2 },
            ],
            skeleton: {
                thumbnails: 4,
                colorVariants: 4,
                sizeVariants: 3,
                accordionSections: 3,
                defaultItemCount: 4,
            },
            recommendations: {
                search_limit: {
                    youMightLike: 8,
                    completeLook: 12,
                    recentlyViewed: 6,
                },
                types: {
                    'you-may-also-like': {
                        enabled: true,
                        priority: 1,
                        sort: 'best-matches',
                        titleKey: 'product.recommendations.youMightAlsoLike',
                    },
                    'complete-the-look': {
                        enabled: true,
                        priority: 2,
                        sort: 'price-low-to-high',
                        titleKey: 'product.recommendations.completeTheLook',
                    },
                    'recently-viewed': {
                        enabled: false,
                        priority: 3,
                        sort: 'most-popular',
                        titleKey: 'product.recommendations.recentlyViewed',
                    },
                },
            },
        },
        links: {
            preconnect: ['https://edge.disstg.commercecloud.salesforce.com'],
        },
        images: {
            host: 'https://edge.disstg.commercecloud.salesforce.com',
            quality: 70,
            formats: ['webp'],
            fallbackFormat: 'jpg',
        },
        search: {
            products: {
                orderableOnly: true,
            },
        },
        performance: {
            caching: { apiCacheTtl: 300, staticAssetCacheTtl: 31536000 },
            metrics: {
                serverPerformanceMetricsEnabled: true,
                serverTimingHeaderEnabled: false,
                clientPerformanceMetricsEnabled: true,
            },
        },
        engagement: {
            adapters: {
                einstein: {
                    enabled: false,
                    host: '',
                    einsteinId: '',
                    isProduction: false,
                    realm: '',
                    siteId: '',
                    eventToggles: {
                        view_page: true,
                        view_product: true,
                        view_search: true,
                        view_category: true,
                        view_recommender: true,
                        click_product_in_category: true,
                        click_product_in_search: true,
                        click_product_in_recommender: true,
                        cart_item_add: true,
                        checkout_start: true,
                        checkout_step: true,
                        view_search_suggestion: true,
                        click_search_suggestion: true,
                    },
                },
                dataCloud: {
                    enabled: false,
                    appSourceId: '',
                    tenantId: '',
                    siteId: '',
                    eventToggles: {
                        view_page: true,
                        view_product: true,
                        view_search: true,
                        view_category: true,
                        view_recommender: true,
                        click_product_in_category: true,
                        click_product_in_search: true,
                        click_product_in_recommender: true,
                        cart_item_add: true,
                        checkout_start: true,
                        checkout_step: true,
                        view_search_suggestion: true,
                        click_search_suggestion: true,
                    },
                },
                activeData: {
                    enabled: false,
                    host: '',
                    siteId: '',
                    locale: '',
                    siteUUID: '',
                    eventToggles: {
                        view_page: true,
                        view_product: true,
                        view_search: true,
                        view_category: true,
                        view_recommender: false,
                        click_product_in_category: false,
                        click_product_in_search: false,
                        click_product_in_recommender: false,
                        cart_item_add: false,
                        checkout_start: false,
                        checkout_step: false,
                        view_search_suggestion: false,
                        click_search_suggestion: false,
                    },
                },
            },
            analytics: {
                pageViewsBlocklist: [],
                pageViewsResetDuration: 30000,
                trackingConsent: {
                    enabled: true,
                    position: 'bottom-center',
                    defaultTrackingConsent: TrackingConsent.Declined,
                },
            },
        },
        development: {
            enableDevtools: true,
            hotReload: true,
            strictMode: true,
        },
        siteAliasMap: {
            RefArchGlobal: 'global',
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
    return createElement(ConfigProvider, { config: mockConfig, children } as never);
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
        return createElement(ConfigProvider, { config: customConfig, children } as never);
    };
}
