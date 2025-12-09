import { createCookie, type MiddlewareFunction } from 'react-router';
import { getCookieConfig } from '@/lib/cookie-utils';
import { getConfig } from '@/config';
import { getAuth } from './auth.server';
import { createShopperContext } from '@/lib/api/shopper-context';
import {
    getShopperContextCookieName,
    getSourceCodeCookieName,
    SHOPPER_CONTEXT_COOKIE_EXPIRY_SECONDS,
    SOURCE_CODE_COOKIE_EXPIRY_SECONDS,
    isPageDesignerMode,
    extractQualifiersFromUrl,
    computeEffectiveShopperContext,
    buildShopperContextBody,
} from '@/lib/shopper-context-utils';

/**
 * Set a cookie on the server response
 */
async function setCookie(
    response: Response,
    cookieName: string,
    cookieValue: Record<string, string>,
    maxAge: number
): Promise<void> {
    const cookieConfig = getCookieConfig({
        httpOnly: false,
        maxAge,
    });
    const cookieHandler = createCookie(cookieName, cookieConfig);
    const cookieValueSerialized = await cookieHandler.serialize(cookieValue);
    response.headers.append('Set-Cookie', cookieValueSerialized);
}

/**
 * Server-side middleware to update shopper context based on URL query parameters and cookies.
 * Runs after auth middleware to ensure USID is available.
 */
const shopperContextMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
    const url = new URL(request.url);
    const config = getConfig(context);
    let response: Response | undefined;

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

    // Extract, compute, and update shopper context - errors won't break the request
    try {
        const { qualifiers: newShopperContext, sourceCodeQualifiers: newSourceCodeContext } =
            extractQualifiersFromUrl(url);
        const contextCookieName = getShopperContextCookieName(session.usid);
        const sourceCodeCookieName = getSourceCodeCookieName(context);
        const cookieConfig = getCookieConfig({ httpOnly: false });
        const contextCookieHandler = createCookie(contextCookieName, cookieConfig);
        const sourceCodeCookieHandler = createCookie(sourceCodeCookieName, cookieConfig);
        const cookieHeader = request.headers.get('Cookie') || '';
        const currentShopperContext = cookieHeader ? (await contextCookieHandler.parse(cookieHeader)) || {} : {};
        const currentSourceCodeContext = cookieHeader ? (await sourceCodeCookieHandler.parse(cookieHeader)) || {} : {};

        const { effectiveShopperContext, effectiveSourceCodeContext } = computeEffectiveShopperContext(
            newShopperContext,
            newSourceCodeContext,
            currentShopperContext,
            currentSourceCodeContext
        );

        const hasNewContext = Object.keys(newShopperContext).length > 0;
        const hasNewSourceCodeContext = Object.keys(newSourceCodeContext).length > 0;

        // Update shopper context API before handler runs
        if (hasNewContext || hasNewSourceCodeContext) {
            const shopperContextBody = buildShopperContextBody(effectiveShopperContext, effectiveSourceCodeContext);
            await createShopperContext(context, session.usid, shopperContextBody);
        }

        // Execute handler (loader/action/render)
        response = await next();

        // Set cookies on response after handler
        if (hasNewSourceCodeContext) {
            await setCookie(
                response,
                sourceCodeCookieName,
                effectiveSourceCodeContext,
                SOURCE_CODE_COOKIE_EXPIRY_SECONDS
            );
        }
        if (hasNewContext) {
            await setCookie(
                response,
                contextCookieName,
                effectiveShopperContext,
                SHOPPER_CONTEXT_COOKIE_EXPIRY_SECONDS
            );
        }

        return response;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Shopper context middleware error:', error);
        return response ?? (await next());
    }
};

export default shopperContextMiddleware;
