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
} from '@/lib/shopper-context-utils';

/**
 * Process shopper context update
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
    // Read existing cookies and parse JSON
    const currentSourceCodeContextValue = getCookie(sourceCodeCookieName);
    const currentShopperContextValue = getCookie(contextCookieName);

    const currentShopperContext: Record<string, string> = currentShopperContextValue
        ? JSON.parse(currentShopperContextValue)
        : {};

    const currentSourceCodeContext: Record<string, string> = currentSourceCodeContextValue
        ? JSON.parse(currentSourceCodeContextValue)
        : {};

    const { effectiveShopperContext, effectiveSourceCodeContext } = computeEffectiveShopperContext(
        newShopperContext,
        newSourceCodeContext,
        currentShopperContext,
        currentSourceCodeContext
    );

    const hasNewContext = Object.keys(newShopperContext).length > 0;
    const hasNewSourceCodeContext = Object.keys(newSourceCodeContext).length > 0;

    if (hasNewContext || hasNewSourceCodeContext) {
        const shopperContextBody = buildShopperContextBody(effectiveShopperContext, effectiveSourceCodeContext);
        await createShopperContext(context, session.usid, shopperContextBody);
    }

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

    // Update shopper context - errors won't break the request
    try {
        await processShopperContext(context, { usid: session.usid });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Shopper context middleware error:', error);
    }

    // Execute handler (loader/action/render)
    await next();
};

export default shopperContextMiddleware;
