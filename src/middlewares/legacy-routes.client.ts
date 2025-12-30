import type { DataStrategyResult, MiddlewareFunction } from 'react-router';
import { appConfigContext } from '@/config';

/**
 * Client-side middleware that intercepts navigation to legacy routes and forces a full page navigation.
 *
 * This middleware runs before any loaders or components render, checking if the current
 * navigation target is a configured legacy route. If so, it triggers a full page navigation
 * to let the CDN/server handle routing to the legacy backend (e.g., SFRA, SiteGenesis).
 *
 * Configuration:
 * Set `site.hybrid.legacyRoutes` in your config to define which routes should trigger redirects.
 * Supports both exact paths and parameterized routes using React Router syntax.
 *
 * Example:
 * ```
 * site: {
 *   hybrid: {
 *     enabled: true,
 *     legacyRoutes: [
 *       '/checkout',              // Exact match
 *       '/account/orders',        // Exact match
 *       '/product/:id',           // Matches /product/123, /product/abc, etc.
 *       '/category/:categoryId/item/:itemId' // Matches /category/shoes/item/123, etc.
 *     ]
 *   }
 * }
 * ```
 *
 * Flow:
 * 1. User clicks <Link to="/checkout">
 * 2. React Router begins client-side navigation
 * 3. This middleware checks if /checkout matches any pattern in legacyRoutes
 * 4. If yes → adds ?redirected=1 and navigates → server/CDN handles routing
 * 5. If no → continue normal client-side navigation
 */

// Cache compiled regex patterns to avoid recreating them on every navigation
const regexCache = new Map<string, RegExp>();

/**
 * Converts a route pattern with parameters (e.g., '/product/:id') into a RegExp.
 * Supports React Router style parameterized routes.
 *
 * @param pattern - Route pattern like '/product/:id' or '/category/:cat/item/:id'
 * @returns RegExp that matches the pattern
 */
function routePatternToRegex(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+*?^${}()|[\]\\]/g, '\\$&');

    const regexPattern = escaped.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '([^/]+)');

    return new RegExp(`^${regexPattern}$`);
}

/**
 * Checks if a pathname matches a route pattern.
 * Supports both exact matches and parameterized routes.
 *
 * @param pathname - The pathname to check (e.g., '/product/123')
 * @param pattern - The route pattern (e.g., '/product/:id' or '/checkout')
 * @returns true if the pathname matches the pattern
 */
export function matchesRoutePattern(pathname: string, pattern: string): boolean {
    // If pattern has no parameters, do exact match
    if (!pattern.includes(':')) {
        return pathname === pattern;
    }

    // Check the regex cache first to avoid recreating RegExp objects
    let regex = regexCache.get(pattern);
    if (!regex) {
        regex = routePatternToRegex(pattern);
        regexCache.set(pattern, regex);
    }

    return regex.test(pathname);
}

const legacyRoutesMiddleware: MiddlewareFunction<Record<string, DataStrategyResult>> = async (
    { request, context },
    next
) => {
    // Only run on client-side
    if (typeof window === 'undefined') {
        return next();
    }
    const config = context.get(appConfigContext);
    const enabled = config?.site?.hybrid?.enabled ?? false;
    const legacyRoutes = config?.site?.hybrid?.legacyRoutes;

    // If hybrid mode is disabled or no legacy routes configured, skip
    if (!enabled || !legacyRoutes || legacyRoutes.length === 0) {
        return next();
    }

    const url = new URL(request.url);
    const pathname = url.pathname;
    const hasRedirected = url.searchParams.get('redirected') === '1';

    // If already redirected once, let React Router handle it (will show 404 or error boundary)
    if (hasRedirected) {
        return next();
    }

    const isLegacyRoute = legacyRoutes.some((legacyRoute) => matchesRoutePattern(pathname, legacyRoute));

    if (isLegacyRoute) {
        // Add redirected=1 to prevent infinite loops
        url.searchParams.set('redirected', '1');

        // Force a full page navigation to hit the server/CDN
        // The CDN routing rules or server middleware will handle routing to the legacy backend
        window.location.href = url.toString();

        // Return empty result to prevent further processing
        // (though navigation will interrupt execution anyway)
        return {};
    }

    // Not a legacy route, continue with normal client-side navigation
    return next();
};

export default legacyRoutesMiddleware;
