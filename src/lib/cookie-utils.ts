import { getConfig } from '@/config/get-config';
import type { RouterContextProvider } from 'react-router';

/**
 * List of cookie names that should NOT be namespaced.
 * These cookies will be used as-is without siteId suffix.
 *
 * Add cookie names here that need to be shared across sites or
 * that are used by external systems that don't support namespacing.
 *
 * @example
 * const COOKIE_NAMESPACE_EXCLUSIONS = ['dwsid', 'external-analytics-id'];
 */
export const COOKIE_NAMESPACE_EXCLUSIONS: readonly string[] = [
    // Add cookie names that should not be namespaced here
    'dwsid',
];

/**
 * Cookie configuration attributes.
 * Compatible with both client and server environments.
 *
 */
export interface CookieConfig {
    domain?: string;
    path?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    expires?: Date;
    maxAge?: number;
    httpOnly?: boolean;
}

/**
 * Get the namespaced cookie name by appending siteId.
 *
 * If the cookie name is in COOKIE_NAMESPACE_EXCLUSIONS, returns the name as-is.
 *
 * @param name - Base cookie name
 * @param context - Optional router context (server loaders/actions only, omit for client-side)
 * @returns Namespaced cookie name in format: `${name}_${siteId}`, or original name if excluded
 *
 * @example
 * // Server-side with context
 * getCookieNameWithSiteId('cc-nx-g', context); // Returns "cc-nx-g_RefArch"
 *
 * @example
 * // Client-side without context
 * getCookieNameWithSiteId('cc-nx-g'); // Returns "cc-nx-g_RefArch"
 *
 * @example
 * // Returns "dwsid" (if in exclusions array)
 * getCookieNameWithSiteId('dwsid');
 */
export const getCookieNameWithSiteId = (name: string, context?: Readonly<RouterContextProvider>): string => {
    // Check if this cookie should be excluded from namespacing
    if (COOKIE_NAMESPACE_EXCLUSIONS.includes(name)) {
        return name;
    }

    // Get config using getConfig() - handles both server (with context) and client (without)
    const config = getConfig(context);
    const siteId = config.commerce.api.siteId;

    if (!siteId) {
        throw new Error(
            'siteId not available for cookie namespacing. ' + 'Ensure configuration is properly initialized.'
        );
    }

    return `${name}_${siteId}`;
};

/**
 * Get cookie configuration with proper precedence order.
 *
 * Precedence (highest to lowest):
 * 1. Environment variables (from .env via Odyssey config) - highest priority
 * 2. Provided cookie options (passed to this function)
 * 3. Default values (path, sameSite, secure)
 *
 * @param cookieOptions - Optional cookie options to merge with defaults and environment config
 * @param context - Optional router context (server loaders/actions only, omit for client-side)
 * @returns Final cookie attributes with proper precedence applied
 *
 * @example
 * // Client-side - uses getConfig() automatically
 * const cookieConfig = getCookieConfig();
 * // Result: { path: '/', sameSite: 'lax', secure: true, domain: '<from env>' }
 *
 * @example
 * // Server-side - pass context
 * const cookieConfig = getCookieConfig({ httpOnly: false }, context);
 * // Result includes domain from config if set
 *
 * @example
 * // Provided options override defaults, but .env takes precedence over both
 * const cookieConfig = getCookieConfig({ path: '/custom', domain: '.code.com' });
 * // If PUBLIC_COOKIE_DOMAIN=.env.com is set:
 * // Result: { path: '/custom', sameSite: 'lax', secure: true, domain: '.env.com' }
 *
 * @example
 * // Use with React Router's createCookie (server-side)
 * const authCookie = createCookie('auth', getCookieConfig({ httpOnly: false }, context));
 *
 * @example
 * // Use with js-cookie (client-side)
 * import Cookies from 'js-cookie';
 * Cookies.set('auth', value, getCookieConfig());
 */
export const getCookieConfig = <T extends object = CookieConfig>(
    cookieOptions?: T,
    context?: Readonly<RouterContextProvider>
): T & CookieConfig => {
    // 3. Start with defaults (lowest priority)
    const defaults: CookieConfig = {
        path: '/',
        sameSite: 'lax',
        secure: true,
    };

    // 2. Apply provided options (middle priority)
    const merged = {
        ...defaults,
        ...cookieOptions,
    };

    // 1. Apply app config cookie overrides (highest priority)
    const cookieConfigOverrides: CookieConfig = {};

    // Get config using getConfig() - handles both server (with context) and client (without)
    const config = getConfig(context);

    const cookieDomain = config.site?.cookies?.domain;
    if (cookieDomain) {
        cookieConfigOverrides.domain = cookieDomain;
    }

    return {
        ...merged,
        ...cookieConfigOverrides,
    } as T & CookieConfig;
};
