import { defineConfig } from '@/config/schema';
import { parseEnvJson } from '@/config/utils';

export default defineConfig({
    metadata: {
        projectName: 'Odyssey Retail App',
        projectSlug: 'odyssey-retail-app',
    },
    runtime: {
        defaultMrtProject: process.env.MRT_PROJECT || '',
        defaultMrtTarget: process.env.MRT_TARGET || '',
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
            home: { featuredProductsCount: 12 },
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
                clientId: process.env.PUBLIC_COMMERCE_API_CLIENT_ID || '',
                organizationId: process.env.PUBLIC_COMMERCE_API_ORG_ID || '',
                siteId: process.env.PUBLIC_COMMERCE_API_SITE_ID || '',
                shortCode: process.env.PUBLIC_COMMERCE_API_SHORT_CODE || '',
                proxy: process.env.PUBLIC_COMMERCE_API_PROXY || '/mobify/proxy/api',
                callback: process.env.PUBLIC_COMMERCE_API_CALLBACK || '/callback',
                privateKeyEnabled: process.env.PUBLIC_COMMERCE_API_SLAS_PRIVATE === 'true',
                registeredRefreshTokenExpirySeconds: process.env
                    .PUBLIC_COMMERCE_API_REGISTERED_REFRESH_TOKEN_EXPIRY_SECONDS
                    ? Number(process.env.PUBLIC_COMMERCE_API_REGISTERED_REFRESH_TOKEN_EXPIRY_SECONDS)
                    : undefined,
                guestRefreshTokenExpirySeconds: process.env.PUBLIC_COMMERCE_API_GUEST_REFRESH_TOKEN_EXPIRY_SECONDS
                    ? Number(process.env.PUBLIC_COMMERCE_API_GUEST_REFRESH_TOKEN_EXPIRY_SECONDS)
                    : undefined,
            },
        },
        site: {
            locale: process.env.PUBLIC_SITE_LOCALE || 'en-US',
            currency: process.env.PUBLIC_SITE_CURRENCY || 'USD',
            cookies: {
                domain: process.env.PUBLIC_COOKIE_DOMAIN,
            },
            features: {
                passwordlessLogin: {
                    enabled: process.env.PUBLIC_SITE_PASSWORDLESS === 'true',
                    callbackUri: process.env.PUBLIC_PASSWORDLESS_CALLBACK_URI || '/passwordless-login-callback',
                    landingUri: process.env.PUBLIC_PASSWORDLESS_LANDING_URI || '/passwordless-login-landing',
                },
                resetPassword: {
                    callbackUri: process.env.PUBLIC_RESET_PASSWORD_CALLBACK_URI || '/reset-password-callback',
                    landingUri: process.env.PUBLIC_RESET_PASSWORD_LANDING_URI || '/reset-password-landing',
                },
                socialLogin: {
                    enabled: process.env.PUBLIC_SITE_SOCIAL_LOGIN === 'true',
                    callbackUri: process.env.PUBLIC_SOCIAL_LOGIN_CALLBACK_URI || '/social-callback',
                    providers: parseEnvJson(process.env.PUBLIC_SOCIAL_IDPS, ['Apple', 'Google']),
                },
                socialShare: {
                    enabled: true,
                    providers: parseEnvJson(process.env.PUBLIC_SOCIAL_SHARE_PROVIDERS, [
                        'Twitter',
                        'Facebook',
                        'LinkedIn',
                        'Email',
                    ]),
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
                    host: process.env.PUBLIC_EINSTEIN_HOST || '',
                    einsteinId: process.env.PUBLIC_EINSTEIN_API_CLIENT_ID || '',
                    isProduction: process.env.PUBLIC_EINSTEIN_IS_PRODUCTION === 'true',
                    siteId:
                        process.env.PUBLIC_EINSTEIN_REALM_AND_SITE_ID || process.env.PUBLIC_COMMERCE_API_SITE_ID || '',
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
                    appSourceId: process.env.PUBLIC_DATACLOUD_APP_SOURCE_ID || '',
                    tenantId: process.env.PUBLIC_DATACLOUD_TENANT_ID || '',
                    siteId: process.env.PUBLIC_COMMERCE_API_SITE_ID || '',
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
                    host: process.env.PUBLIC_ACTIVEDATA_HOST || '',
                    siteId: process.env.PUBLIC_COMMERCE_API_SITE_ID || '',
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
