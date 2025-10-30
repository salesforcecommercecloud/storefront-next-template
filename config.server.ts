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
                socialLogin: {
                    enabled: true,
                    providers: parseEnvJson(process.env.PUBLIC_SOCIAL_IDPS, ['Apple', 'Google']),
                },
                guestCheckout: true,
            },
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
            },
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
        performance: {
            images: { quality: 80, formats: ['webp', 'jpeg'], lazyLoading: true },
            caching: { apiCacheTtl: 300, staticAssetCacheTtl: 31536000 },
            metrics: {
                serverPerformanceMetricsEnabled: true,
                serverTimingHeaderEnabled: false,
                clientPerformanceMetricsEnabled: true,
            },
        },
        development: { enableDevtools: true, hotReload: true, strictMode: true },
    },
});
