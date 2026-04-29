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
// Relative paths required here — this file is evaluated by vite-node during
// react-router typegen (via routes.ts), before Vite aliases are resolved.
import { defineConfig } from '@salesforce/storefront-next-runtime/config';
import type { Config } from './src/types/config';
import { TrackingConsent } from './src/types/tracking-consent';

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
 *    - PUBLIC__app__pages__cart__showLineItemDescription → app.pages.cart.showLineItemDescription
 *    - PUBLIC__app__site__features__socialLogin__providers=["Apple","Google"] → app.features.socialLogin.providers
 *
 * The PUBLIC__ prefix indicates these values are SAFE TO EXPOSE to the client.
 * They get bundled into window.__APP_CONFIG__ and are accessible in browser code.
 *
 * Server-only secrets (API keys, passwords, etc.) should NEVER use this config system.
 * Read them directly from process.env in server-side code (loaders, actions, middleware).
 *
 * Documentation:
 *    - Configuration Guide: `docs/README-CONFIG.md`
 *    - Configuration Options Reference: `docs/README-CONFIG-OPTIONS.md`
 */

// DIS hosts:
// - Staging: https://edge.disstg.commercecloud.salesforce.com
// - Production: https://edge.dis.commercecloud.salesforce.com
const DIS_DEFAULT_HOST = 'https://edge.disstg.commercecloud.salesforce.com';

export default defineConfig<Config>(
    {
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
            ssrOnly: [],
            ssrShared: [],
            ssrParameters: {
                ssrFunctionNodeVersion: '24.x',
                // envBasePath can be used to configure Managed Runtime environment to add basepath
                // See BASE-PATH.md for more details
                envBasePath: '',
            },
        },
        // Main application configuration (public settings)
        // See CONFIG-OPTIONS.md#app for complete reference
        app: {
            // Page-specific configuration
            // See CONFIG-OPTIONS.md#pages for detailed documentation
            pages: {
                navigation: {
                    rootCategoryId: 'root',
                    maxDepth: 2,
                },
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
                    showLineItemDescription: false,
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
                    sharedMaintenancePage: true,
                    cdnUrl: 'https://prd.cmp.cdn.commercecloud.salesforce.com',
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
                    shortCode: '',
                    // Optional API settings
                    proxy: '/mobify/proxy/api',
                    // OAuth2 redirect_uri sent to SLAS — must match what's registered in SLAS Admin.
                    // Not a storefront route; token exchange happens server-side with redirect: 'manual'.
                    callback: '/callback',
                    privateKeyEnabled: false,
                    registeredRefreshTokenExpirySeconds: undefined,
                    guestRefreshTokenExpirySeconds: undefined,
                },
                // Site context configuration
                // Each site can have its own locale, currency, and detection settings
                sites: [
                    {
                        id: 'RefArchGlobal',
                        defaultLocale: 'en-GB',
                        defaultCurrency: 'GBP',
                        supportedLocales: [
                            {
                                id: 'en-GB',
                                preferredCurrency: 'GBP',
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
                                id: 'zh-CN',
                                preferredCurrency: 'CNY',
                            },
                        ],
                        supportedCurrencies: ['EUR', 'GBP'],
                    },
                    {
                        id: 'RefArch',
                        defaultLocale: 'en-US',
                        defaultCurrency: 'USD',
                        supportedLocales: [
                            {
                                id: 'en-US',
                                preferredCurrency: 'USD',
                            },
                        ],
                        supportedCurrencies: ['USD'],
                    },
                ],
            },
            // Default site ID configuration
            // See CONFIG-OPTIONS.md#defaultSiteId for detailed documentation
            defaultSiteId: 'RefArchGlobal',
            siteAliasMap: {
                RefArch: 'us',
                RefArchGlobal: 'global',
            },
            // Hybrid mode configuration
            // See CONFIG-OPTIONS.md#hybrid for detailed documentation
            hybrid: {
                enabled: false,
                legacyRoutes: [],
            },
            // Authentication configuration shared across all auth features
            // See CONFIG-OPTIONS.md#auth for detailed documentation
            auth: {
                otpLength: 8,
            },
            // Feature flags for enabling/disabling functionality
            // See CONFIG-OPTIONS.md#features for detailed documentation
            features: {
                passwordlessLogin: {
                    enabled: true, // Enabled for Turnstile testing
                    mode: 'email',
                    callbackUri: '/passwordless-login-callback',
                    landingUri: '/login',
                },
                resetPassword: {
                    mode: 'email',
                    callbackUri: '/reset-password-callback',
                    landingUri: '/reset-password',
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
                },
                googleCloudAPI: {
                    apiKey: '',
                },
                mrtBasedPageDesignerResolution: false,
            },
            // Internationalization configuration
            // See CONFIG-OPTIONS.md#i18n for detailed documentation
            // When updating these i18n properties, please also check that the middleware configurations are in sync
            // See src/middlewares/i18next.ts
            // Also, make sure the supportedLngs are always presented in site.supportedLocale to
            // make sure the app can fully be translated to another language
            i18n: {
                fallbackLng: 'en-GB',
                supportedLngs: ['it-IT', 'en-US', 'en-GB'], // Your supported languages, the fallback should be LAST
            },
            // Global UI configuration and component settings
            // See CONFIG-OPTIONS.md#global for detailed documentation
            global: {
                // TODO: Allow page specific customization while keeping global defaults, e.g.:
                //   config.pages.search.components?.productListing ?? config.global.productListing
                branding: { name: 'Performer', logoAlt: 'Home' },
                productListing: {
                    defaultProductTileImgAspectRatio: 1,
                },
                inventory: { lowStockThreshold: 5, maxStockDisplay: 99 },
                carousel: { defaultItemCount: 4 },
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
                enableDis: true,
            },
            // Search-specific settings
            // See CONFIG-OPTIONS.md#search for detailed documentation
            search: {
                products: {
                    refine: {
                        orderableOnly: true,
                    },
                    hits: {
                        limit: 24,
                        critical: 4,
                    },
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
                            commerce_agent_engagement: true,
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
                            commerce_agent_engagement: true,
                        },
                    },
                    activeData: {
                        enabled: true,
                        host: 'https://zzrf-001.dx.commercecloud.salesforce.com',
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
                            commerce_agent_engagement: true,
                        },
                    },
                },
                analytics: {
                    trackingConsent: {
                        enabled: true,
                        defaultTrackingConsent: TrackingConsent.Declined,
                        consentCategories: ['necessary', 'analytics', 'marketing', 'personalization'],
                        position: 'bottom-right',
                    },
                    // Do not send viewPage events for the following paths
                    // We omit /action because we don't want to trigger viewPage events for actions
                    // like modifying the quanity of an item in the cart
                    // We omit /oauth2 and /resource because these do not correspond to pages
                    // We omit /search, /category, /product, and /checkout because they are tracked with
                    // different events (viewSearch, viewCategory, viewProduct, and beginCheckout) triggered
                    // on the search, category, product, and checkout pages respectively
                    pageViewsBlocklist: [
                        '/action',
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
            // Commerce Agent (Embedded Service / Agentforce)
            // Override via PUBLIC__app__commerceAgent (single JSON string; see src/components/shopper-agent/README.md).
            commerceAgent: {
                enabled: '',
                embeddedServiceName: '',
                embeddedServiceEndpoint: '',
                scriptSourceUrl: '',
                scrt2Url: '',
                salesforceOrgId: '',
                siteId: '',
                enableConversationContext: '',
                conversationContext: [],
            },
            url: {
                prefix: '/:siteId/:localeId',
                excludeRoutes: ['/resource/**', '/action/**'],
            },
            security: {
                turnstile: {
                    sites: (() => {
                        if (!process.env.PUBLIC__security__turnstile__sites) return {};
                        try {
                            return JSON.parse(process.env.PUBLIC__security__turnstile__sites);
                        } catch {
                            // eslint-disable-next-line no-console
                            console.error(
                                '[Turnstile] Failed to parse PUBLIC__security__turnstile__sites — no sites configured (fail-closed)'
                            );
                            return {};
                        }
                    })(),
                    enabled: process.env.PUBLIC__security__turnstile__enabled === 'true',
                    mode:
                        (process.env.PUBLIC__security__turnstile__mode as
                            | 'managed'
                            | 'non-interactive'
                            | 'invisible') || 'managed',
                    verification: {
                        enabled: process.env.TURNSTILE_VERIFICATION_ENABLED === 'true',
                    },
                },
            },
        },
    },
    {
        protectedPaths: [
            'app__engagement__adapters__einstein',
            'app__engagement__adapters__dataCloud',
            // intentionally lock these property at runtime override and allow the rest of config
            'app__engagement__adapters__activeData__enabled',
            'app__engagement__adapters__activeData__eventToggles',
            'app__url__prefix',
            'app__url__excludeRoutes',
        ],
    }
);
