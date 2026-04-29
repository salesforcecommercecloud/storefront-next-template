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
 * Template-specific configuration types.
 *
 * `AppConfig` defines the full `app` shape for this template — SCAPI credentials,
 * pages, features, engagement, etc. `Config` wraps it in `BaseConfig<AppConfig>`
 * which adds `metadata` and `runtime` sections.
 */
import type { BaseConfig, Site, Url } from '@salesforce/storefront-next-runtime/config';
import type { ConsentCategory } from '@salesforce/storefront-next-runtime/events';
import type { EngagementAdapterConfig } from '@/lib/adapters';
import type { TrackingConsent } from '@/types/tracking-consent';

import type { DetectionConfig, SiteConfig } from '@salesforce/storefront-next-runtime/site-context';

export type BadgeDetail = {
    propertyName: string;
    label: string;
    color: 'green' | 'yellow' | 'orange' | 'purple' | 'red' | 'blue' | 'pink';
    priority?: number;
};

export type AppConfig = {
    auth: {
        otpLength: 6 | 8;
    };
    commerce: {
        api: {
            clientId: string;
            organizationId: string;
            shortCode: string;
            proxy?: string;
            callback?: string;
            privateKeyEnabled?: boolean;
            registeredRefreshTokenExpirySeconds?: number;
            guestRefreshTokenExpirySeconds?: number;
        };
        sites: Array<Site>;
    };
    commerceAgent?: {
        enabled: string | boolean;
        embeddedServiceName: string;
        embeddedServiceEndpoint: string;
        scriptSourceUrl: string;
        scrt2Url: string;
        salesforceOrgId: string;
        siteId: string;
        enableConversationContext?: string;
        conversationContext?: string[];
    };
    defaultSiteId: string;
    development: {
        enableDevtools: boolean;
        hotReload: boolean;
        strictMode: boolean;
    };
    engagement: {
        adapters: Record<string, EngagementAdapterConfig>;
        analytics: {
            trackingConsent?: {
                enabled: boolean;
                defaultTrackingConsent: TrackingConsent;
                consentCategories?: ConsentCategory[];
                position?: 'bottom-left' | 'bottom-right' | 'bottom-center';
            };
            pageViewsBlocklist: string[];
            pageViewsResetDuration: number;
        };
    };
    features: {
        passwordlessLogin: {
            enabled: boolean;
            callbackUri?: string;
            landingUri?: string;
            mode: 'callback' | 'email' | 'sms';
        };
        resetPassword: {
            callbackUri?: string;
            landingUri?: string;
            mode: 'callback' | 'email' | 'sms';
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
        };
        googleCloudAPI: {
            apiKey: string;
        };
        mrtBasedPageDesignerResolution: boolean;
    };
    global: {
        branding: {
            name: string;
            logoAlt: string;
        };
        productListing: {
            defaultProductTileImgAspectRatio: number;
        };
        inventory: {
            lowStockThreshold: number;
            maxStockDisplay: number;
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
    hybrid: {
        enabled: boolean;
        legacyRoutes?: string[];
    };
    i18n: {
        fallbackLng: string;
        supportedLngs: string[];
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
        enableDis?: boolean;
    };
    links?: {
        preconnect?: string[];
        prefetch?: string[];
        prefetchDns?: string[];
    };
    localeAliasMap?: Record<string, string>;
    localeDetectionConfig?: DetectionConfig;
    pages: {
        navigation: {
            rootCategoryId: string;
            maxDepth: number;
        };
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
            /** When true, cart line items show product short/long description (default false). */
            showLineItemDescription?: boolean;
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
    search: {
        products: {
            refine?: {
                orderableOnly?: boolean;
            };
            hits: {
                limit: number;
                critical?: number;
            };
        };
    };
    siteAliasMap?: Record<string, string>;
    /** Configuration for site-context cookies (site, locale, currency). */
    siteContext?: {
        /** Cookie name for persisting the selected currency. Defaults to 'currency'. */
        currencyCookieName?: string;
        /** Cookie attributes (httpOnly, maxAge, secure, sameSite, etc.) applied to all site-context cookies. */
        cookieOptions?: SiteConfig['cookieOptions'];
    };
    siteDetectionConfig?: DetectionConfig;
    url?: Url;
    security?: {
        turnstile?: {
            sites: Record<string, Array<{ siteKey: string; domains: string[] }>>;
            enabled?: boolean;
            mode?: 'managed' | 'non-interactive' | 'invisible';
            verification?: {
                enabled: boolean;
            };
        };
    };
};

export type Config = BaseConfig<AppConfig>;
