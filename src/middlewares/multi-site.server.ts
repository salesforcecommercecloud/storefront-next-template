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
import { type MiddlewareFunction } from 'react-router';
import { createMultiSiteMiddleware, type MultiSiteConfig } from '@salesforce/storefront-next-runtime/multi-site';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { getLogger } from '@/lib/logger.server';

/**
 * Creates and returns the multi-site middleware configured with the app's site and locale settings.
 * This middleware resolves the current site and locale from the request and stores them in context.
 *
 * Must run BEFORE i18next and currency middlewares.
 */
export const multiSiteMiddleware: MiddlewareFunction<Response> = async (args, next) => {
    const logger = getLogger(args.context);
    const config = getConfig<AppConfig>(args.context);
    const sites = config.commerce.sites;

    logger.debug('MultiSite: middleware starting', {
        siteCount: sites.length,
        defaultSiteId: config.defaultSiteId,
    });

    if (!sites.length) {
        logger.error('MultiSite: no sites configured');
        throw new Error('No sites found.');
    }
    const defaultSiteId = config.defaultSiteId;
    const siteAliasMap = config.siteAliasMap;
    const localeAliasMap = config.localeAliasMap;
    const defaultSite = sites.find((site) => site.id === defaultSiteId);
    if (!defaultSite?.defaultLocale) {
        logger.error('MultiSite: default site missing defaultLocale', { defaultSiteId });
        throw new Error(`Site "${config.defaultSiteId}" must have a defaultLocale configured. `);
    }

    // Transform app config into multi-site config format
    const multiSiteConfig: MultiSiteConfig = {
        sites: sites.map((site) => ({
            ...site,
            alias: siteAliasMap?.[site.id],
            name: site.id,
            supportedLocales: site.supportedLocales.map((locale) => ({
                ...locale,
                alias: localeAliasMap?.[locale.id],
            })),
        })),
        defaultSiteId,
        defaultLocale: defaultSite.defaultLocale,
        siteDetectionConfig: config.siteDetectionConfig,
        localeDetectionConfig: config.localeDetectionConfig,
    };

    // Create and invoke the multi-site middleware.
    // Wrap next() so we can intercept after site/locale resolution but BEFORE downstream
    // loaders/rendering execute — this avoids wasted rendering when we redirect.
    const middleware = createMultiSiteMiddleware(multiSiteConfig);
    return middleware(args, next);
};
