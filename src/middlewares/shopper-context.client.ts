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
import type { MiddlewareFunction, DataStrategyResult, RouterContextProvider } from 'react-router';
import { getConfig } from '@/config';
import { getAuth } from './auth.client';
import { isPageDesignerMode, extractQualifiersFromUrl, updateShopperContext } from '@/lib/shopper-context-utils';

/**
 * Process shopper context update with comprehensive error handling
 */
async function processShopperContext(
    context: Readonly<RouterContextProvider>,
    session: { usid: string }
): Promise<void> {
    const url = new URL(window.location.href);
    const { qualifiers: newShopperContext, sourceCodeQualifiers: newSourceCodeContext } = extractQualifiersFromUrl(url);

    // Use shared function to update shopper context
    await updateShopperContext({
        context,
        usid: session.usid,
        newShopperContext,
        newSourceCodeContext,
    });
}

/**
 * Client-side middleware to update shopper context based on URL query parameters and cookies.
 * Runs after auth middleware to ensure USID is available.
 */
const shopperContextMiddleware: MiddlewareFunction<Record<string, DataStrategyResult>> = async ({ context }, next) => {
    const url = new URL(window.location.href);
    const config = getConfig(context);

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

    // Update shopper context - errors are handled internally and won't break the request
    // processShopperContext handles all errors internally for graceful degradation
    await processShopperContext(context, { usid: session.usid }).catch((error) => {
        // Final safety net - log any unhandled errors
        // eslint-disable-next-line no-console
        console.error('Shopper context client middleware error:', {
            error: error instanceof Error ? error.message : String(error),
            usid: session.usid,
            url: window.location.href,
        });
    });

    // Execute handler (loader/action/render)
    await next();
};

export default shopperContextMiddleware;
