import type { AppConfig } from '@/config';

/**
 * Cookie configuration attributes.
 * Compatible with both client (js-cookie) and server (React Router createCookie) environments.
 *
 * Note: `expires` is typed as `Date` for React Router compatibility.
 * js-cookie also accepts `number` (days), but use `Date` for universal compatibility.
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
 * Get cookie configuration with proper precedence order.
 *
 * Precedence (highest to lowest):
 * 1. Environment variables (from .env via Odyssey config) - highest priority
 * 2. Provided cookie options (passed to this function)
 * 3. Default values (path, sameSite, secure)
 *
 * @param cookieOptions - Optional cookie options to merge with defaults and environment config
 * @param appConfig - Optional app config (pass from context on server-side, undefined on client-side)
 * @returns Final cookie attributes with proper precedence applied
 *
 * @example
 * // Get base configuration with defaults (client-side)
 * const cookieConfig = getCookieConfig();
 * // Result: { path: '/', sameSite: 'lax', secure: true }
 *
 * @example
 * // Server-side with config from context
 * const appConfig = getConfig(context);
 * const cookieConfig = getCookieConfig({ httpOnly: false }, appConfig);
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
 * const appConfig = getConfig(context);
 * const authCookie = createCookie('auth', getCookieConfig({ httpOnly: false }, appConfig));
 *
 * @example
 * // Use with js-cookie (client-side, no config needed)
 * import Cookies from 'js-cookie';
 * Cookies.set('auth', value, getCookieConfig());
 */
export const getCookieConfig = <T extends object = CookieConfig>(
    cookieOptions?: T,
    appConfig?: AppConfig
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

    // 1. Apply app config cookie overrides (highest priority, server-side only)
    const cookieConfigOverrides: CookieConfig = {};
    if (appConfig) {
        const cookieDomain = appConfig.site?.cookies?.domain;
        if (cookieDomain) {
            cookieConfigOverrides.domain = cookieDomain;
        }
    }

    return {
        ...merged,
        ...cookieConfigOverrides,
    } as T & CookieConfig;
};
