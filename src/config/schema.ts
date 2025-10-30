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
                socialLogin: {
                    enabled: boolean;
                    providers: Array<'Apple' | 'Google' | 'Facebook' | 'Twitter'>;
                };
                guestCheckout: boolean;
            };
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
            };
            carousel: {
                defaultItemCount: number;
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
export function defineConfig(config: Config): Config {
    return config;
}
