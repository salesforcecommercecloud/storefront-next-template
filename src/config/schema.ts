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
import { deepMerge, mergeEnvConfig } from './utils';
import type { EngagementAdapterConfig } from '@/lib/adapters';
import type { TrackingConsent } from '@/types/tracking-consent';

// Badge configuration
export type BadgeDetail = {
    propertyName: string;
    label: string;
    color: 'green' | 'yellow' | 'orange' | 'purple' | 'red' | 'blue' | 'pink';
    priority?: number;
};

export type Locale = {
    id: string;
    preferredCurrency: string;
};

// Site configuration type
export type Site = {
    cookies?: {
        domain?: string;
    };
    defaultCurrency: string;
    defaultLocale: string;
    domain?: string;
    id: string;
    supportedCurrencies: string[];
    supportedLocales: Array<Locale>;
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
                ruleBasedProductLimit: number;
                confirmDescription?: string;
                miniCart?: {
                    enableViewCartButton: boolean;
                };
            };
            search: {
                placeholder: string;
                enableSearchSuggestions: boolean;
                maxSuggestions: number;
                enableRecentSearches: boolean;
                suggestionsDebounce: number;
            };
            maintenancePage: {
                sharedMaintenancePage: boolean;
                cdnUrl: string;
                forwardedHost: string;
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
            sites: Array<Site>;
        };
        defaultSiteId: string;
        siteAliasMap?: Record<string, string>;
        hybrid: {
            enabled: boolean;
            legacyRoutes?: string[];
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
            shopperContext: {
                enabled: boolean;
                dwsourcecodeCookieSuffix?: string;
            };
            googleCloudAPI: {
                apiKey: string;
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
        links?: {
            preconnect?: string[];
            prefetch?: string[];
            prefetchDns?: string[];
        };
        /**
         * Supported target formats of Salesforce's Dynamic Imaging Service are: avif, gif, jp2, jpg, jpeg, jxr, png, and webp.
         * @see {@link https://help.salesforce.com/s/articleView?id=cc.b2c_image_transformation_service.htm&type=5}
         * @see {@link https://help.salesforce.com/s/articleView?id=cc.b2c_creating_image_transformation_urls.htm&type=5}
         */
        images?: {
            quality?: number;
            formats?: Array<'avif' | 'gif' | 'jp2' | 'jpg' | 'jpeg' | 'jxr' | 'png' | 'webp'>;
            fallbackFormat?: 'avif' | 'gif' | 'jp2' | 'jpg' | 'jpeg' | 'jxr' | 'png' | 'webp';
            host?: string;
        };
        search?: {
            products?: {
                orderableOnly?: boolean;
            };
        };
        performance: {
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
                trackingConsent?: {
                    enabled: boolean;
                    defaultTrackingConsent: TrackingConsent;
                    position?: 'bottom-left' | 'bottom-right' | 'bottom-center';
                };
                pageViewsBlocklist: string[];
                pageViewsResetDuration: number;
            };
        };
        development: {
            enableDevtools: boolean;
            hotReload: boolean;
            strictMode: boolean;
        };
        url?: {
            prefix: string;
            search: string;
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
