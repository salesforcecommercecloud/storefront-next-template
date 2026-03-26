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
import type { MiddlewareFunction } from 'react-router';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { getAuth } from './auth.server';
import { isPageDesignerMode, extractQualifiersFromUrl, updateShopperContext } from '@/lib/shopper-context-utils';
import { getLogger } from '@/lib/logger.server';

/**
 * Server-side middleware to update shopper context based on URL query parameters and cookies.
 * Runs after auth middleware to ensure USID is available.
 * Reuses updateShopperContext for API update and cookie serialization.
 */
const shopperContextMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
    const logger = getLogger(context);
    const url = new URL(request.url);
    const config = getConfig<AppConfig>(context);
    let response: Response | undefined;

    // Check feature flag - skip if shopper context is disabled
    if (!config.features.shopperContext.enabled) {
        return await next();
    }

    // Skip if Page Designer edit/preview mode
    if (isPageDesignerMode(url)) {
        return await next();
    }

    const session = getAuth(context);
    if (!session.usid) {
        return await next();
    }

    try {
        const { qualifiers: newShopperContext, sourceCodeQualifiers: newSourceCodeContext } =
            extractQualifiersFromUrl(url);

        const { setCookieHeaders } = await updateShopperContext({
            context,
            usid: session.usid,
            newShopperContext,
            newSourceCodeContext,
            cookieHeader: request.headers.get('Cookie'),
        });

        response = await next();

        for (const header of setCookieHeaders) {
            response.headers.append('Set-Cookie', header);
        }

        return response;
    } catch (error) {
        logger.error('Shopper context server middleware error', {
            error: error instanceof Error ? error.message : String(error),
            usid: session.usid,
            url: request.url,
        });
        return response ?? (await next());
    }
};

export default shopperContextMiddleware;
