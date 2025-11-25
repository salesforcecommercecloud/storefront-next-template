import { defineConfig } from '@/config/schema';

/**
 * Application Configuration
 *
 * This file defines the default configuration for the application.
 * All values can be overridden using PUBLIC__ prefixed environment variables.
 *
 * Environment Variable Convention:
 *
 * Use PUBLIC__ prefix with double underscore (__) path separators:
 *    - PUBLIC__app__commerce__api__clientId → app.commerce.api.clientId
 *    - PUBLIC__app__site__locale → app.site.locale
 *    - PUBLIC__app__pages__cart__quantityUpdateDebounce → app.pages.cart.quantityUpdateDebounce
 *    - PUBLIC__app__site__features__socialLogin__providers=["Apple","Google"] → app.site.features.socialLogin.providers
 *
 * The PUBLIC__ prefix indicates these values are SAFE TO EXPOSE to the client.
 * They get bundled into window.__APP_CONFIG__ and are accessible in browser code.
 *
 * Server-only secrets (API keys, passwords, etc.) should NEVER use this config system.
 * Read them directly from process.env in server-side code (loaders, actions, middleware).
 *
 * See src/config/README.md for complete documentation.
 */
export default defineConfig({
    metadata: {
        projectName: 'Odyssey Retail App',
        projectSlug: 'odyssey-retail-app',
    },
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
            ssrFunctionNodeVersion: '22.x',
        },
    },
    app: {
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
        },
        site: {
            locale: 'en-US',
            currency: 'USD',
            cookies: {
                domain: undefined,
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
            },
        },
        i18n: {
            fallbackLng: 'en',
            supportedLngs: ['es', 'en'], // Your supported languages, the fallback should be last
        },
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
        performance: {
            images: { quality: 80, formats: ['webp', 'jpeg'], lazyLoading: true },
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
                    enabled: true,
                    host: '',
                    einsteinId: '',
                    isProduction: false,
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
                    },
                },
                activeData: {
                    enabled: false,
                    host: '',
                    siteId: '',
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
                    },
                },
            },
            analytics: {
                doNotTrackPaths: ['/action', '/callback', '/oauth2', '/resource'],
            },
        },
        development: { enableDevtools: true, hotReload: true, strictMode: true },
    },
});
