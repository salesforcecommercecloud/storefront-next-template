import { deepMerge, mergeEnvConfig } from './utils';
import type { EngagementAdapterConfig } from '@/lib/adapters';

// Badge configuration
export type BadgeDetail = {
    propertyName: string;
    label: string;
    color: 'green' | 'yellow' | 'orange' | 'purple' | 'red' | 'blue' | 'pink';
    priority?: number;
};

// Main configuration type for config.server.ts
export type Config = {
    metadata: {
        projectName: string;
        projectSlug: string;
    };
    runtime?: {
        defaultMrtProject?: string;
        defaultMrtTarget?: string;
        ssrOnly?: string[];
        ssrShared?: string[];
        ssrParameters?: Record<string, string | number | boolean>;
    };
    app: {
        pages: {
            home: {
                featuredProductsCount: number;
            };
            cart: {
                quantityUpdateDebounce: number;
                enableRemoveConfirmation: boolean;
                maxQuantityPerItem: number;
                enableSaveForLater: boolean;
                removeAction: string;
                confirmDescription?: string;
            };
            search: {
                placeholder: string;
                enableSearchSuggestions: boolean;
                maxSuggestions: number;
                enableRecentSearches: boolean;
                suggestionsDebounce: number;
            };
        };
        commerce: {
            api: {
                clientId: string;
                organizationId: string;
                siteId: string;
                shortCode: string;
                proxy?: string;
                callback?: string;
                privateKeyEnabled?: boolean;
                registeredRefreshTokenExpirySeconds?: number;
                guestRefreshTokenExpirySeconds?: number;
            };
        };
        site: {
            locale: string;
            currency: string;
            domain?: string;
            cookies?: {
                domain?: string;
            };
            features: {
                passwordlessLogin: {
                    enabled: boolean;
                    callbackUri: string;
                    landingUri: string;
                };
                resetPassword: {
                    callbackUri: string;
                    landingUri: string;
                };
                socialLogin: {
                    enabled: boolean;
                    callbackUri: string;
                    providers: Array<'Apple' | 'Google' | 'Facebook' | 'Twitter'>;
                };
                socialShare: {
                    enabled: boolean;
                    providers: Array<'Twitter' | 'Facebook' | 'LinkedIn' | 'Email'>;
                };
                guestCheckout: boolean;
            };
        };
        i18n: {
            fallbackLng: string;
            supportedLngs: string[];
        };
        global: {
            branding: {
                name: string;
                logoAlt: string;
            };
            productListing: {
                productsPerPage: number;
                enableInfiniteScroll: boolean;
                sortOptions: Array<'relevance' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest'>;
                enableQuickView: boolean;
                defaultProductTileImgAspectRatio: number;
            };
            carousel: {
                defaultItemCount: number;
            };
            paginatedProductCarousel: {
                defaultLimit: number;
            };
            badges: BadgeDetail[];
            skeleton: {
                thumbnails: number;
                colorVariants: number;
                sizeVariants: number;
                accordionSections: number;
                defaultItemCount: number;
            };
            recommendations: {
                search_limit: {
                    youMightLike: number;
                    completeLook: number;
                    recentlyViewed: number;
                };
                types: {
                    'you-may-also-like': {
                        enabled: boolean;
                        priority: number;
                        sort: string;
                        titleKey: string;
                    };
                    'complete-the-look': {
                        enabled: boolean;
                        priority: number;
                        sort: string;
                        titleKey: string;
                    };
                    'recently-viewed': {
                        enabled: boolean;
                        priority: number;
                        sort: string;
                        titleKey: string;
                    };
                };
            };
        };
        performance: {
            images: {
                quality: number;
                formats: Array<'webp' | 'avif' | 'jpeg' | 'png'>;
                lazyLoading: boolean;
            };
            caching: {
                apiCacheTtl: number;
                staticAssetCacheTtl: number;
            };
            metrics?: {
                serverPerformanceMetricsEnabled?: boolean;
                serverTimingHeaderEnabled?: boolean;
                clientPerformanceMetricsEnabled?: boolean;
            };
        };
        engagement: {
            adapters: Record<string, EngagementAdapterConfig>;
            analytics: {
                doNotTrackPaths: string[];
            };
        };
        development: {
            enableDevtools: boolean;
            hotReload: boolean;
            strictMode: boolean;
        };
    };
};

// Badge variant mapping
export const BADGE_VARIANTS = {
    green: 'success',
    orange: 'warning',
    yellow: 'warning',
    purple: 'secondary',
    red: 'destructive',
    blue: 'info',
    pink: 'default',
} as const;

export type BadgeVariant = (typeof BADGE_VARIANTS)[keyof typeof BADGE_VARIANTS];

// Helper function to get badge variant from color
export const getBadgeVariant = (color: BadgeDetail['color']): BadgeVariant => {
    return BADGE_VARIANTS[color];
};

// Helper for type-safe configuration with IDE autocomplete
// Automatically merges PUBLIC__ prefixed environment variables into config
// Validates env vars against base config (strict mode - only allows overriding existing paths)
// Example: PUBLIC__app__pages__cart__quantityUpdateDebounce=1000
// Example: PUBLIC__app__site__features__socialLogin__providers=["Apple","Facebook"]
export function defineConfig(config: Config): Config {
    const envOverrides = mergeEnvConfig(process.env, config);
    return deepMerge(config, envOverrides);
}
