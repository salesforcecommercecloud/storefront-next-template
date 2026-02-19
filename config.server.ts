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
import { defineConfig } from '@/config/schema';
import { TrackingConsent } from '@/types/tracking-consent';

/**
 * Application Configuration
 *
 * This file defines the default configuration for the application.
 * All values can be overridden using PUBLIC__ prefixed environment variables.
 * Environment Variable Convention:
 *
 * Use PUBLIC__ prefix with double underscore (__) path separators:
 *    - PUBLIC__app__commerce__api__clientId → app.commerce.api.clientId
 *    - PUBLIC__app__site__locale → app.site.locale
 *    - PUBLIC__app__pages__cart__quantityUpdateDebounce → app.pages.cart.quantityUpdateDebounce
 *    - PUBLIC__app__site__features__socialLogin__providers=["Apple","Google"] → app.features.socialLogin.providers
 *
 * The PUBLIC__ prefix indicates these values are SAFE TO EXPOSE to the client.
 * They get bundled into window.__APP_CONFIG__ and are accessible in browser code.
 *
 * Server-only secrets (API keys, passwords, etc.) should NEVER use this config system.
 * Read them directly from process.env in server-side code (loaders, actions, middleware).
 *
 * Documentation:
 *    - Configuration Guide: `src/config/README.md`
 *    - Configuration Options Reference: `src/config/CONFIG-OPTIONS.md`
 */

// DIS hosts:
// - Staging: https://edge.disstg.commercecloud.salesforce.com
// - Production: https://edge.dis.commercecloud.salesforce.com
const DIS_DEFAULT_HOST = 'https://edge.disstg.commercecloud.salesforce.com';

export default defineConfig({
    // Project identification and metadata
    // See CONFIG-OPTIONS.md#metadata for detailed documentation
    metadata: {
        projectName: 'Storefront Next Retail App',
        projectSlug: 'storefront-next-retail-app',
    },
    // Runtime deployment settings for Managed Runtime (server-only)
    // See CONFIG-OPTIONS.md#runtime for detailed documentation
    runtime: {
        // MRT deployment settings (server-only, set via MRT_PROJECT and MRT_TARGET env vars)
        defaultMrtProject: '',
        defaultMrtTarget: '',
        ssrOnly: ['loader.js', 'ssr.js', '!static/**/*'],
        ssrShared: [
            'static/**/*',
            '**/*.css',
            '**/*.png',
            '**/*.jpg',
            '**/*.jpeg',
            '**/*.gif',
            '**/*.svg',
            '**/*.ico',
            '**/*.woff',
            '**/*.woff2',
            '**/*.ttf',
            '**/*.eot',
        ],
        ssrParameters: {
            ssrFunctionNodeVersion: '24.x',
        },
    },
    // Main application configuration (public settings)
    // See CONFIG-OPTIONS.md#app for complete reference
    app: {
        // Page-specific configuration
        // See CONFIG-OPTIONS.md#pages for detailed documentation
        pages: {
            home: {
                featuredProductsCount: 12,
            },
            cart: {
                quantityUpdateDebounce: 750,
                enableRemoveConfirmation: true,
                maxQuantityPerItem: 999,
                enableSaveForLater: false,
                removeAction: '/action/cart-item-remove',
                ruleBasedProductLimit: 50,
                miniCart: {
                    enableViewCartButton: true,
                },
            },
            search: {
                placeholder: 'Search',
                enableSearchSuggestions: true,
                maxSuggestions: 8,
                enableRecentSearches: true,
                suggestionsDebounce: 400,
            },
            maintenancePage: {
                sharedMaintenancePage: false,
                cdnUrl: 'http://prd.cmp.cdn.commercecloud.salesforce.com',
                forwardedHost: '',
            },
        },
        // Commerce Cloud API integration
        // See CONFIG-OPTIONS.md#commerce for detailed documentation
        commerce: {
            api: {
                // Commerce Cloud API credentials (required, set via env vars)
                clientId: '',
                organizationId: '',
                siteId: '',
                shortCode: '',
                // Optional API settings
                proxy: '/mobify/proxy/api',
                callback: '/callback',
                privateKeyEnabled: false,
                registeredRefreshTokenExpirySeconds: undefined,
                guestRefreshTokenExpirySeconds: undefined,
            },
            // Multi-site configuration
            // Each site can have its own locale, currency, and detection settings
            sites: [
                {
                    id: 'RefArchGlobal',
                    defaultLocale: 'en-US',
                    defaultCurrency: 'USD',
                    supportedLocales: [
                        {
                            id: 'en-US',
                            preferredCurrency: 'USD',
                        },
                        {
                            id: 'da-DK',
                            preferredCurrency: 'EUR',
                        },
                        {
                            id: 'de-DE',
                            preferredCurrency: 'EUR',
                        },
                        {
                            id: 'en-GB',
                            preferredCurrency: 'GBP',
                        },
                        {
                            id: 'es-MX',
                            // there is not MXN support on BM, so we use USD
                            preferredCurrency: 'USD',
                        },
                        {
                            id: 'fi-FI',
                            preferredCurrency: 'EUR',
                        },
                        {
                            id: 'fr-FR',
                            preferredCurrency: 'EUR',
                        },
                        {
                            id: 'it-IT',
                            preferredCurrency: 'EUR',
                        },
                        {
                            id: 'ja-JP',
                            preferredCurrency: 'JPY',
                        },
                        {
                            id: 'ko-KR',
                            preferredCurrency: 'KRW',
                        },
                        {
                            id: 'nl-NL',
                            preferredCurrency: 'EUR',
                        },
                        {
                            id: 'no-NO',
                            preferredCurrency: 'EUR',
                        },
                        {
                            id: 'pl-PL',
                            preferredCurrency: 'EUR',
                        },
                        {
                            id: 'pt-BR',
                            preferredCurrency: 'BRL',
                        },
                        {
                            id: 'sv-SE',
                            preferredCurrency: 'EUR',
                        },
                        {
                            id: 'zh-CN',
                            preferredCurrency: 'CNY',
                        },
                        {
                            id: 'zh-TW',
                            preferredCurrency: 'TWD',
                        },
                    ],
                    supportedCurrencies: ['EUR', 'USD'],
                },
            ],
        },
        // Default site ID configuration
        // See CONFIG-OPTIONS.md#defaultSiteId for detailed documentation
        defaultSiteId: 'RefArchGlobal',
        siteAliasMap: {
            RefArchGlobal: 'global',
        },
        // Hybrid mode configuration
        // See CONFIG-OPTIONS.md#hybrid for detailed documentation
        hybrid: {
            enabled: false,
            legacyRoutes: [],
        },
        // Feature flags for enabling/disabling functionality
        // See CONFIG-OPTIONS.md#features for detailed documentation
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
            socialLogin: {
                enabled: false,
                callbackUri: '/social-callback',
                providers: ['Apple', 'Google'],
            },
            socialShare: {
                enabled: true,
                providers: ['Twitter', 'Facebook', 'LinkedIn', 'Email'],
            },
            guestCheckout: true,
            shopperContext: {
                enabled: false,
                dwsourcecodeCookieSuffix: undefined,
            },
            googleCloudAPI: {
                apiKey: '',
            },
        },
        // Internationalization configuration
        // See CONFIG-OPTIONS.md#i18n for detailed documentation
        // When updating these i18n properties, please also check that the middleware configurations are in sync
        // See src/middlewares/i18next.ts
        // Also, make sure the supportedLngs are always presented in site.supportedLocale to
        // make sure the app can fully be translated to another language
        i18n: {
            fallbackLng: 'en-US',
            supportedLngs: ['it-IT', 'en-US'], // Your supported languages, the fallback should be LAST
        },
        // Global UI configuration and component settings
        // See CONFIG-OPTIONS.md#global for detailed documentation
        global: {
            // TODO: Allow page specific customization while keeping global defaults, e.g.:
            //   config.pages.search.components?.productListing ?? config.global.productListing
            branding: { name: 'Performer', logoAlt: 'Home' },
            productListing: {
                productsPerPage: 24,
                enableInfiniteScroll: false,
                sortOptions: ['relevance', 'price-asc', 'price-desc', 'name-asc'],
                enableQuickView: true,
                defaultProductTileImgAspectRatio: 1,
            },
            carousel: { defaultItemCount: 4 },
            paginatedProductCarousel: {
                defaultLimit: 8,
            },
            badges: [
                { propertyName: 'c_isNew', label: 'New', color: 'green', priority: 1 },
                { propertyName: 'c_isSale', label: 'Sale', color: 'orange', priority: 2 },
                { propertyName: 'c_isLimited', label: 'Limited', color: 'purple', priority: 3 },
                { propertyName: 'c_isExclusive', label: 'Exclusive', color: 'blue', priority: 4 },
                { propertyName: 'c_isTrending', label: 'Trending', color: 'pink', priority: 5 },
                { propertyName: 'c_isBestSeller', label: 'Best Seller', color: 'yellow', priority: 6 },
                { propertyName: 'c_isOutOfStock', label: 'Out of Stock', color: 'red', priority: 7 },
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
                // Static configuration for recommendation types
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
        // Link hints for browser resource loading
        // See CONFIG-OPTIONS.md#links for detailed documentation
        links: {
            // DIS hosts:
            // - Staging: https://edge.disstg.commercecloud.salesforce.com
            // - Production: https://edge.dis.commercecloud.salesforce.com
            preconnect: [DIS_DEFAULT_HOST],
        },
        // Salesforce Dynamic Imaging Service settings
        // See CONFIG-OPTIONS.md#images for detailed documentation
        // DIS hosts:
        // - Staging: https://edge.disstg.commercecloud.salesforce.com
        // - Production: https://edge.dis.commercecloud.salesforce.com
        images: {
            quality: 70,
            formats: ['webp'],
            fallbackFormat: 'jpg',
            host: DIS_DEFAULT_HOST,
        },
        // Search-specific settings
        // See CONFIG-OPTIONS.md#search for detailed documentation
        search: {
            products: {
                orderableOnly: true,
            },
        },
        // Performance optimization settings
        // See CONFIG-OPTIONS.md#performance for detailed documentation
        performance: {
            caching: { apiCacheTtl: 300, staticAssetCacheTtl: 31536000 },
            metrics: {
                serverPerformanceMetricsEnabled: false,
                serverTimingHeaderEnabled: false,
                clientPerformanceMetricsEnabled: false,
            },
        },
        // Analytics and engagement adapters
        // See CONFIG-OPTIONS.md#engagement for detailed documentation
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
        // Development tools and features
        // See CONFIG-OPTIONS.md#development for detailed documentation
        development: { enableDevtools: true, hotReload: true, strictMode: true },
    },
});
