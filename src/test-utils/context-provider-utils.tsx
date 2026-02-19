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

import type { ReactNode } from 'react';
import { createAppConfig, ConfigProvider } from '@/config/context';
import type { Config } from '@/config/schema';
import { TrackingConsent } from '@/types';

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
            defaultSiteId: 'RefArchGlobal',

            sites: [
                {
                    id: 'RefArchGlobal',
                    defaultLocale: 'en-US',
                    defaultCurrency: 'USD',
                    supportedLocales: [
                        { id: 'en-US', preferredCurrency: 'USD' },
                        { id: 'it-IT', preferredCurrency: 'EUR' },
                    ],
                    supportedCurrencies: ['USD', 'EUR'],
                },
            ],
        },
        siteAliasMap: {
            RefArchGlobal: 'global',
        },
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
            shopperContext: { enabled: false },
            googleCloudAPI: { apiKey: '' },
        },
        hybrid: {
            enabled: false,
            legacyRoutes: [],
        },
        i18n: {
            fallbackLng: 'en-US',
            supportedLngs: ['en-US'],
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
            paginatedProductCarousel: { defaultLimit: 4 },
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
        links: {
            preconnect: ['https://edge.disstg.commercecloud.salesforce.com'],
        },
        images: {
            host: 'https://edge.disstg.commercecloud.salesforce.com',
            quality: 80,
            formats: ['webp'],
            fallbackFormat: 'jpg',
        },
        performance: {
            caching: { apiCacheTtl: 300, staticAssetCacheTtl: 31536000 },
            metrics: {
                serverPerformanceMetricsEnabled: false,
                serverTimingHeaderEnabled: false,
                clientPerformanceMetricsEnabled: false,
            },
        },
        development: {
            enableDevtools: true,
            hotReload: true,
            strictMode: true,
        },
        engagement: {
            adapters: {
                einstein: {
                    enabled: true,
                    host: 'https://api.cquotient.com',
                    einsteinId: '1ea06c6e-c936-4324-bcf0-fada93f83bb1',
                    isProduction: false,
                    realm: 'aaij',
                    siteId: 'MobileFirst',
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
                    appSourceId: '7ae070a6-f4ec-4def-a383-d9cacc3f20a1',
                    tenantId: 'g82wgnrvm-ywk9dggrrw8mtggy.pc-rnd',
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
                    enabled: true,
                    host: 'https://zzrf-001.dx.commercecloud.salesforce.com',
                    siteId: 'RefArchGlobal',
                    locale: 'en_US',
                    siteUUID: '8bb1ea1b04ac3454d36b83a888',
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
                trackingConsent: {
                    enabled: true,
                    defaultTrackingConsent: TrackingConsent.Declined,
                    position: 'bottom-right',
                },
                // Do not send viewPage events for the following paths
                // We omit /action because we don't want to trigger viewPage events for actions
                // like modifying the quanity of an item in the cart
                // We omit /callback, /oauth2, and /resource because these do not correspond to pages
                // We omit /search, /category, /product, and /checkout because they are tracked with
                // different events (viewSearch, viewCategory, viewProduct, and beginCheckout) triggered
                // on the search, category, product, and checkout pages respectively
                pageViewsBlocklist: [
                    '/action',
                    '/callback',
                    '/oauth2',
                    '/resource',
                    '/search',
                    '/category',
                    '/product',
                    '/checkout',
                ],
                // Time in milliseconds before a ViewPage tracked path can be tracked again
                pageViewsResetDuration: 1500, // 1.5 seconds
            },
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
        return <ConfigProvider config={customConfig}>{children}</ConfigProvider>;
    };
}
