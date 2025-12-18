import type { MiddlewareFunction, DataStrategyResult, RouterContextProvider } from 'react-router';
import { getCookie, setNamespacedCookie } from '@/lib/cookies.client';
import { getConfig } from '@/config';
import { getAuth } from './auth.client';
import { createShopperContext } from '@/lib/api/shopper-context';
import {
    getShopperContextCookieName,
    getSourceCodeCookieName,
    SOURCE_CODE_COOKIE_EXPIRY_SECONDS, // 30 days
    SHOPPER_CONTEXT_COOKIE_EXPIRY_SECONDS, // 6 hours
    isPageDesignerMode,
    extractQualifiersFromUrl,
    computeEffectiveShopperContext,
    buildShopperContextBody,
    safeParseCookie,
} from '@/lib/shopper-context-utils';

/**
 * Process shopper context update with comprehensive error handling
 */
async function processShopperContext(
    context: Readonly<RouterContextProvider>,
    session: { usid: string }
): Promise<void> {
    const url = new URL(window.location.href);
    const { qualifiers: newShopperContext, sourceCodeQualifiers: newSourceCodeContext } = extractQualifiersFromUrl(url);

    // Get cookie names with suffix
    const contextCookieName = getShopperContextCookieName(session.usid);
    const sourceCodeCookieName = getSourceCodeCookieName(context);

    // Read existing cookies and parse JSON with error handling
    const currentSourceCodeContextValue = getCookie(sourceCodeCookieName);
    const currentShopperContextValue = getCookie(contextCookieName);

    const currentShopperContext = safeParseCookie(currentShopperContextValue);
    const currentSourceCodeContext = safeParseCookie(currentSourceCodeContextValue);

    const { effectiveShopperContext, effectiveSourceCodeContext } = computeEffectiveShopperContext(
        newShopperContext,
        newSourceCodeContext,
        currentShopperContext,
        currentSourceCodeContext
    );

    const hasNewContext = Object.keys(newShopperContext).length > 0;
    const hasNewSourceCodeContext = Object.keys(newSourceCodeContext).length > 0;

    // Only call API if there's new context to update
    if (hasNewContext || hasNewSourceCodeContext) {
        const shopperContextBody = buildShopperContextBody(effectiveShopperContext, effectiveSourceCodeContext);
        await createShopperContext(context, session.usid, shopperContextBody);
    }

    // Update cookies even if API call failed (graceful degradation)
    // This ensures context is preserved locally even if API is temporarily unavailable
    try {
        if (hasNewSourceCodeContext) {
            setNamespacedCookie(sourceCodeCookieName, JSON.stringify(effectiveSourceCodeContext), {
                expires: new Date(Date.now() + SOURCE_CODE_COOKIE_EXPIRY_SECONDS * 1000),
            });
        }

        if (hasNewContext) {
            // Store the entire effectiveShopperContext object as JSON string, including customQualifiers
            setNamespacedCookie(contextCookieName, JSON.stringify(effectiveShopperContext), {
                expires: new Date(Date.now() + SHOPPER_CONTEXT_COOKIE_EXPIRY_SECONDS * 1000),
            });
        }
    } catch (cookieError) {
        // Cookie setting failed - log but don't throw
        // eslint-disable-next-line no-console
        console.error(
            'Failed to set shopper context cookie at client side:',
            cookieError instanceof Error ? cookieError.message : String(cookieError)
        );
    }
}

/**
 * Client-side middleware to update shopper context based on URL query parameters and cookies.
 * Runs after auth middleware to ensure USID is available.
 */
const shopperContextMiddleware: MiddlewareFunction<Record<string, DataStrategyResult>> = async ({ context }, next) => {
    const url = new URL(window.location.href);
    const config = getConfig(context);

    // Check feature flag - skip if shopper context is disabled
    if (!config.site.features.shopperContext.enabled) {
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
