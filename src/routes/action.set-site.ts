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
import { redirect, type ActionFunction } from 'react-router';
import { getSiteContextCookies } from '@salesforce/storefront-next-runtime/site-context';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { getLogger } from '@/lib/logger.server';

/**
 * Server action to set the site cookie and redirect to the chosen site's homepage.
 * Sets both site_id and locale cookies, then redirects to the prefixed homepage URL.
 *
 * Note: This MUST be a server action (not clientAction) because we need to set
 * the Set-Cookie HTTP header, which can only be done server-side.
 *
 * Cannot use `buildUrlFromContext` here because the router context still holds the
 * *previous* site (resolved from the request cookie before the action runs).
 * Instead we build the URL directly from the selected site's config values.
 */
export const action: ActionFunction = async ({ request, context }) => {
    const logger = getLogger(context);
    const formData = await request.formData();
    const siteId = formData.get('siteId') as string;

    logger.debug('SetSite: starting', { siteId });

    if (!siteId) {
        logger.warn('SetSite: siteId parameter missing');
        throw new Response('siteId is required', { status: 400 });
    }

    const config = getConfig<AppConfig>(context);
    const site = config.commerce.sites.find((s) => s.id === siteId);
    if (!site) {
        logger.warn('SetSite: site not found', {
            siteId,
            availableSites: config.commerce.sites.map((s) => s.id),
        });
        throw new Response(`Site "${siteId}" not found`, { status: 400 });
    }

    const cookies = getSiteContextCookies(context);
    if (!cookies) {
        logger.error('SetSite: cookies not initialized');
        throw new Response('Site context cookies not initialized', { status: 500 });
    }

    // Set both site and locale cookies
    const [siteCookieHeader, localeCookieHeader] = await Promise.all([
        cookies.siteCookie.serialize(siteId),
        cookies.localeCookie.serialize(site.defaultLocale),
    ]);

    logger.info('SetSite: succeeded', { siteId, defaultLocale: site.defaultLocale });
    return redirect('/', {
        headers: [
            ['Set-Cookie', siteCookieHeader],
            ['Set-Cookie', localeCookieHeader],
        ],
    });
};
