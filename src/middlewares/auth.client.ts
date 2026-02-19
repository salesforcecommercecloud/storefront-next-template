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
import {
    createContext as createRouterContext,
    type DataStrategyResult,
    type MiddlewareFunction,
    type RouterContextProvider,
} from 'react-router';
import type { ShopperLogin } from '@salesforce/storefront-next-runtime/scapi';
import { getTranslation } from '@/lib/i18next';
import type { SessionData } from '@/lib/api/types';
import { getAllCookies, removeCookie } from '@/lib/cookies.client';
import { getCookieNameWithSiteId } from '@/lib/cookie-utils';
import { clearStorage, type StorageErrorData, unpackStorage } from '@/lib/middleware';
import {
    authContext,
    type AuthStorageData,
    createAuthPromise,
    updateAuthStorageData,
    updateStorageAndCache,
    getSLASAccessTokenClaims,
    isTrackingConsentEnabled,
    COOKIE_REFRESH_TOKEN_GUEST,
    COOKIE_REFRESH_TOKEN_REGISTERED,
    COOKIE_ACCESS_TOKEN,
    COOKIE_USID,
    COOKIE_CUSTOMER_ID,
    COOKIE_ENC_USER_ID,
    COOKIE_IDP_ACCESS_TOKEN,
    COOKIE_TRACKING_CONSENT,
    COOKIE_DWSID,
    // Note: COOKIE_CODE_VERIFIER is NOT imported - it's httpOnly and server-only
} from '@/middlewares/auth.utils';
import { PERFORMANCE_MARKS, performanceTimerContext } from '@/middlewares/performance-metrics';
import { getConfig } from '@/config';
import { TrackingConsent } from '@/types/tracking-consent';

type AuthData = SessionData;

/**
 * Read and parse auth cookies into structured auth data.
 *
 * This function reads all auth cookies once for optimal performance and returns
 * the complete auth data structure with userType determined from which refresh token exists.
 * Access token expiry is extracted from the JWT for fast runtime validation.
 *
 * **Cookie names:**
 * - cc-nx-g: Guest user refresh token
 * - cc-nx: Registered user refresh token
 * - cc-at: Access token
 * - usid: User session ID
 * - customerId: Customer ID
 * - cc-idp-at: IDP access token (for social login)
 *
 * **User type determination:**
 * - cc-nx exists → registered user
 * - cc-nx-g exists → guest user
 * - neither exists → fallback to guest
 *
 * **Use cases:**
 *
 * 1. **During client-side hydration**: When React hydration starts, the client middleware
 *    hasn't executed yet, but we need auth data to match the server-rendered HTML. This
 *    function bridges that timing gap by reading cookies directly, preventing hydration
 *    mismatches between server and client.
 *
 * 2. **In middleware**: To populate auth storage with current cookie values
 *
 * 3. **Anywhere**: You need to read current auth state from cookies
 *
 * **Hydration flow:**
 * 1. Server renders with auth data from middleware
 * 2. Client starts hydration (middleware hasn't run yet)
 * 3. This function reads cookies to get auth data
 * 4. After hydration, middleware takes over
 *
 * @returns Complete auth data structure or undefined if no auth tokens exist
 */
export function getAuthDataFromCookies(): Partial<AuthStorageData> | undefined {
    // Single document.cookie read + parse for optimal performance
    const allCookies = getAllCookies();

    const refreshTokenGuest = allCookies[getCookieNameWithSiteId(COOKIE_REFRESH_TOKEN_GUEST)] || '';
    const refreshTokenRegistered = allCookies[getCookieNameWithSiteId(COOKIE_REFRESH_TOKEN_REGISTERED)] || '';
    const accessToken = allCookies[getCookieNameWithSiteId(COOKIE_ACCESS_TOKEN)] || '';
    const usid = allCookies[getCookieNameWithSiteId(COOKIE_USID)] || '';
    const customerId = allCookies[getCookieNameWithSiteId(COOKIE_CUSTOMER_ID)] || '';
    const encUserId = allCookies[getCookieNameWithSiteId(COOKIE_ENC_USER_ID)] || '';
    const idpAccessToken = allCookies[getCookieNameWithSiteId(COOKIE_IDP_ACCESS_TOKEN)] || '';
    const dwsid = allCookies[getCookieNameWithSiteId(COOKIE_DWSID)] || '';
    // Read tracking consent cookie directly as TrackingConsent enum (values match)
    const trackingConsentCookieValue = allCookies[getCookieNameWithSiteId(COOKIE_TRACKING_CONSENT)] || null;
    let trackingConsent: TrackingConsent | undefined =
        trackingConsentCookieValue === TrackingConsent.Accepted ||
        trackingConsentCookieValue === TrackingConsent.Declined
            ? trackingConsentCookieValue
            : undefined;

    // Return early if no auth tokens exist
    if (!accessToken && !refreshTokenGuest && !refreshTokenRegistered) {
        return undefined;
    }

    // Determine user type and refresh token from which cookie exists
    // Only one should exist at a time (guest and registered are mutually exclusive)
    //
    // IMPORTANT: userType is derived at runtime from cookie presence, NOT stored in cookies
    let userType: 'guest' | 'registered';
    let refreshToken: string;

    if (refreshTokenRegistered) {
        userType = 'registered';
        refreshToken = refreshTokenRegistered;
    } else if (refreshTokenGuest) {
        userType = 'guest';
        refreshToken = refreshTokenGuest;
    } else {
        userType = 'guest';
        refreshToken = '';
    }

    const authData: Partial<AuthStorageData> = {
        accessToken: accessToken || undefined,
        refreshToken: refreshToken || undefined,
        usid: usid || undefined,
        customerId: customerId || undefined,
        encUserId: encUserId || undefined,
        userType,
        idpAccessToken: idpAccessToken || undefined,
        dwsid: dwsid || undefined,
    };

    // Inject accessTokenExpiry from JWT (source of truth) for fast runtime checks
    if (accessToken) {
        const claims = getSLASAccessTokenClaims(accessToken);
        if (claims.expiry) authData.accessTokenExpiry = claims.expiry;

        // Validate tracking consent value from token matches cookie - if they differ, treat as undefined
        // This matches server-side validation logic to prevent hydration mismatches
        //
        // Why client-side validation is needed (even though server validates too):
        // Request/Response Flow with Cookie Mismatch:
        //   1. Browser → Request with invalid cookie (dw_dnt=0, but token has dnt=1)
        //   2. Server middleware validates → detects mismatch → sets trackingConsent=undefined
        //   3. Server renders HTML with trackingConsent=undefined
        //   4. Server → Response with Set-Cookie: dw_dnt=; Max-Age=0 (deletion)
        //   5. ⚠️  BUT during hydration, client reads cookies BEFORE processing Set-Cookie header
        //   6. Client sees old invalid cookie (dw_dnt=0) in getBootstrapSession
        //   7. Without client validation → Hydration mismatch! Server rendered with undefined, client has '0'
        //
        // The Set-Cookie header only takes effect AFTER the response is fully processed,
        // but hydration happens DURING response processing. Client-side validation ensures
        // getAuthDataFromCookies() returns the same result as server middleware.
        //
        // TODO: When revisiting auth architecture, consider moving getBootstrapSession from module-level
        // constant to a function that reads cookies during render, or explore other strategies
        // to eliminate this timing issue entirely.
        //
        // Only validate if tracking consent feature is enabled and both values exist
        if (isTrackingConsentEnabled() && claims.trackingConsent !== null && trackingConsent !== undefined) {
            if (claims.trackingConsent !== trackingConsent) {
                // Tracking consent values differ - cookie is invalid, treat as undefined
                // Delete the invalid cookie immediately on the client side
                removeCookie(COOKIE_TRACKING_CONSENT);
                trackingConsent = undefined;
            }
        }
    }

    // Always set tracking consent value from cookie (even if undefined) to reflect cookie state
    // Server validates tracking consent cookie against token and updates/deletes cookies accordingly
    // Client uses cookies as source of truth, so changes from server propagate automatically
    // This ensures that when tracking consent cookie is deleted (e.g., after login), authData reflects the deletion
    // and the banner can be shown again if needed
    authData.trackingConsent = trackingConsent;

    return authData;
}

/**
 * Client-side helper for refresh token operations
 * Uses fetch calls to server resource endpoints
 */
export async function handleRefreshToken(
    refreshToken: string,
    trackingConsent?: TrackingConsent
): Promise<ShopperLogin.schemas['TokenResponse']> {
    const response = await fetch('/resource/auth/refresh-token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            refreshToken,
            ...(trackingConsent !== undefined && { trackingConsent }),
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to refresh token');
    }

    return result.data;
}

/**
 * Client-side helper for guest login operations
 * Uses fetch calls to server resource endpoints
 */
async function handleGuestLogin(usid: string | undefined): Promise<ShopperLogin.schemas['TokenResponse']> {
    const response = await fetch('/resource/auth/login-guest', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            usid: typeof usid === 'string' && usid.length ? usid : undefined,
        }),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to login as guest');
    }

    return result.data;
}

/**
 * Client-side utility to retrieve/verify the validity of stored Commerce API auth information.
 * Validates access token expiry using the expiry injected from JWT during middleware initialization.
 */
const retrieveAuthStorageData = async (
    context: Readonly<RouterContextProvider>,
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>,
    cache: { ref: AuthData | undefined }
): Promise<void> => {
    const { t } = getTranslation();

    const accessToken = storage.get('accessToken');
    const accessTokenExpiry = storage.get('accessTokenExpiry');
    const refreshToken = storage.get('refreshToken');
    const performanceTimer = context.get(performanceTimerContext);

    // Check if access token exists and is not expired
    // We use the expiry injected from JWT during middleware initialization for fast comparison
    if (
        accessToken &&
        typeof accessToken === 'string' &&
        accessToken.length &&
        typeof accessTokenExpiry === 'number' &&
        accessTokenExpiry > Date.now()
    ) {
        return;
    }
    // Token missing or expired - proceed to refresh flow below

    // If access token missing but refresh token exists, use it to get new access token
    if (typeof refreshToken === 'string' && refreshToken.length) {
        try {
            const storedUserType = storage.get('userType');
            const userType: 'guest' | 'registered' = storedUserType === 'registered' ? 'registered' : 'guest';

            performanceTimer?.mark(PERFORMANCE_MARKS.authRefreshToken, 'start');
            // Use client helper for refresh token operation and update storage/cache
            const tokenResponse = await handleRefreshToken(refreshToken);
            performanceTimer?.mark(PERFORMANCE_MARKS.authRefreshToken, 'end');
            await updateStorageAndCache(context, storage, cache, tokenResponse, userType);
            return;
        } catch {
            // Invalid/expired refresh token: clear tokens and fall back to guest login
            storage.set('error', t('errors:accessTokenRefreshFailed'));
        }
    }

    // Otherwise, get a new guest token (fallback for users not logged in)
    // Note: Registered users should log in through `/login` action, not here
    try {
        const storedUsid = storage.get('usid');
        const usid = typeof storedUsid === 'string' ? storedUsid : undefined;

        performanceTimer?.mark(PERFORMANCE_MARKS.authGuestLogin, 'start');
        // Use client helper for guest login operation and update storage/cache
        const tokenResponse = await handleGuestLogin(usid);
        performanceTimer?.mark(PERFORMANCE_MARKS.authGuestLogin, 'end');
        await updateStorageAndCache(context, storage, cache, tokenResponse, 'guest');
    } catch {
        storage.set('error', t('errors:guestAccessTokenFailed'));
    }
};

/**
 * As we're on the client, we can define and use a singleton auth store instance here.
 * These are exported so entry.client.tsx can use them for pre-hydration setup.
 */
export const authCache: { ref: AuthData | undefined } = { ref: undefined };
export const authPromiseCache: { ref: Promise<AuthData | undefined> } = { ref: Promise.resolve(undefined) };

// Cookie names for split auth storage are imported from auth.utils

export const authStorageContext =
    createRouterContext<Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>>();
export const authCacheContext = createRouterContext<{ ref: AuthData | undefined }>();

/**
 * Populate auth storage Map from auth data object.
 * Extracted as a reusable helper used by both entry.client.tsx and the middleware.
 *
 * @param storage - Auth storage Map to populate
 * @param authData - Auth data object with token and user information
 */
export const populateAuthStorage = (
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>,
    authData: Partial<AuthStorageData>
): void => {
    if (authData.refreshToken) storage.set('refreshToken', authData.refreshToken);
    if (authData.accessToken) storage.set('accessToken', authData.accessToken);
    if (authData.accessTokenExpiry) storage.set('accessTokenExpiry', authData.accessTokenExpiry);
    if (authData.usid) storage.set('usid', authData.usid);
    if (authData.customerId) storage.set('customerId', authData.customerId);
    if (authData.encUserId) storage.set('encUserId', authData.encUserId);
    if (authData.idpAccessToken) storage.set('idpAccessToken', authData.idpAccessToken);
    if (authData.userType) storage.set('userType', authData.userType);
    if (authData.dwsid) storage.set('dwsid', authData.dwsid);
    // Always set tracking consent value (even if undefined) to reflect cookie state
    // This ensures deleted cookies are reflected in storage
    if (authData.trackingConsent !== undefined) {
        storage.set('trackingConsent', authData.trackingConsent);
    } else {
        storage.delete('trackingConsent');
    }
};

/**
 * Read auth cookies from document.cookie and populate the storage Map.
 * Cookies are set by the server via Set-Cookie headers. Client only reads them.
 *
 * User type is determined by which refresh token cookie exists:
 * - cc-nx exists → registered user
 * - cc-nx-g exists → guest user
 * - neither exists → fallback to guest
 *
 * IMPORTANT: userType is NEVER written to cookies. It is ALWAYS derived at runtime
 * from which refresh token cookie exists. userType is stored in authStorage/authCache
 * for easy in-app access.
 *
 * @param storage - Auth storage Map to populate with cookie values
 */
const readClientAuthCookies = (storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>): void => {
    const authData = getAuthDataFromCookies();

    if (!authData) {
        return;
    }

    // Use the shared helper to populate storage
    populateAuthStorage(storage, authData);
};

/**
 * Middleware to retrieve or refresh Commerce API auth information and provide it as part of the router `context`.
 *
 * This middleware is tailored for client-side use only! It reads auth cookies set by the server and maintains
 * an in-memory cache for performance:
 * - `cc-nx-g`: Guest user refresh token (expires after configured period, browser auto-deletes)
 * - `cc-nx`: Registered user refresh token (expires after configured period, browser auto-deletes)
 * - `cc-at`: Access token (expires after 30 min, browser auto-deletes)
 * - `usid`: User session ID (expires with refresh token)
 * - `customerId`: Customer ID (expires with refresh token)
 * - `cc-idp-at`: IDP access token (for social login, expires with SLAS access token)
 *
 * Note: `cc-cv` (code verifier) is httpOnly and server-only, not accessible to client.
 *
 * User type is determined by which refresh token cookie exists (cc-nx-g = guest, cc-nx = registered).
 * Only one refresh token cookie exists at a time - a user cannot be both guest and registered.
 *
 * **Cookie Management:** Server owns all cookie writes via Set-Cookie headers. Client only reads cookies.
 *
 * Token validation flow:
 * - If access token exists and not expired (checked via JWT decode) → use it
 * - If access token missing/expired but refresh token exists → refresh to get new access token (via server API)
 * - If both missing → guest login (via server API)
 *
 * The router context is available in other middlewares, loader and action functions. Use it as root middleware,
 * to ensure the Commerce API context portion becomes available throughout the whole application.
 */
const authMiddleware: MiddlewareFunction<Record<string, DataStrategyResult>> = async ({ context }, next) => {
    // Before calling the handler: Load current Commerce API data from in-memory cache
    const authData = authCache.ref ?? {};
    const authStorage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>(
        Object.entries(authData) as [keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]][]
    );

    // Read auth cookies from document.cookie to sync with server-side state
    // This ensures the client has access to tokens set by the server
    readClientAuthCookies(authStorage);

    // Always sync cache with storage after reading cookies to reflect any cookie changes
    // This ensures that when cookies are updated/deleted by the server (e.g., DNT cookie deleted after login),
    // the cache reflects those changes immediately without requiring a page refresh
    authCache.ref = unpackStorage<AuthData>(authStorage);
    authPromiseCache.ref = Promise.resolve(authCache.ref);

    // Write Commerce API data to request `context` to make it available to other client middlewares, client loaders,
    // or client actions
    context.set(authContext, authPromiseCache);
    context.set(authStorageContext, authStorage);
    context.set(authCacheContext, authCache);

    // Before calling the handler: Verify existing Commerce API auth data or retrieve new information
    await retrieveAuthStorageData(context, authStorage, authCache).catch(() => {
        // Intentionally empty
    });

    // Execute handler (loader/action/render)
    await next();

    // After calling the handler: Update in-memory cache, if required
    // Note: Cookie management is handled server-side via Set-Cookie headers
    if (authStorage.has('isDestroyed') || authStorage.has('error')) {
        // Clean up the storage container. That way the information is immediately updated for eventually
        // running middlewares after this one as well.
        clearStorage(authStorage, false);
        authCache.ref = undefined;
        authPromiseCache.ref = createAuthPromise(context, authCache.ref);
    } else if (authStorage.has('isUpdated')) {
        // Clean up storage container metadata
        authStorage.delete('isUpdated');

        // Update the in-memory cache
        const entry = Object.fromEntries(authStorage);
        authCache.ref = entry;
        authPromiseCache.ref = createAuthPromise(context, entry);
    }
};

export const getAuth = (context: Readonly<RouterContextProvider>): AuthData & StorageErrorData => {
    const storage = context.get(authStorageContext);
    const cache = context.get(authCacheContext);
    if (!storage || !cache) {
        throw new Error('getAuth must be used within the Commerce API middleware');
    }
    return cache.ref ?? unpackStorage<AuthData>(storage);
};

export const updateAuth = (
    context: Readonly<RouterContextProvider>,
    updater:
        | ShopperLogin.schemas['TokenResponse']
        | ((data: AuthData & StorageErrorData) => AuthData & StorageErrorData)
) => {
    const storage = context.get(authStorageContext);
    const cache = context.get(authCacheContext);
    const promiseCache = context.get(authContext);
    const appConfig = getConfig(context);
    if (!storage || !cache || !promiseCache) {
        throw new Error('updateAuth must be used within the Commerce API middleware');
    }

    // Update storage data
    updateAuthStorageData(storage, updater, appConfig);
    cache.ref = storage.has('error') ? undefined : unpackStorage<AuthData>(storage);
    promiseCache.ref = storage.has('error')
        ? createAuthPromise(context, undefined)
        : createAuthPromise(context, cache.ref);
};

export const destroyAuth = (context: Readonly<RouterContextProvider>): void => {
    const storage = context.get(authStorageContext);
    const cache = context.get(authCacheContext);
    const promiseCache = context.get(authContext);
    if (!storage || !cache || !promiseCache) {
        throw new Error('destroyAuth must be used within the Commerce API middleware');
    }

    // Unset storage data
    clearStorage(storage);
    cache.ref = undefined;
    promiseCache.ref = createAuthPromise(context, cache.ref);

    // Mark storage as destroyed
    storage.set('isDestroyed', true);
};

export const flashAuth = (context: Readonly<RouterContextProvider>, message?: string): void => {
    const storage = context.get(authStorageContext);
    const cache = context.get(authCacheContext);
    const promiseCache = context.get(authContext);
    if (!storage || !cache || !promiseCache) {
        throw new Error('flashAuth must be used within the Commerce API middleware');
    }

    // Unset storage data
    clearStorage(storage);
    cache.ref = undefined;
    promiseCache.ref = createAuthPromise(context, cache.ref);

    // Set the error message
    storage.set('error', message ?? '');
};

/**
 * Utility function to refresh the auth middleware's state from the cookies.
 * This is useful in edge cases where cookies have been updated outside the normal middleware flow
 * (e.g., after a password change that triggers a re-login via server action).
 *
 * @param context - Router context
 * @returns true if auth was refreshed, false otherwise
 */
// TODO: This method was only added to force the auth middlewares reference to the current token to be valid
// after a password change that triggers a re-login via server action. This should not be needed in the future.
export const refreshAuthFromCookie = (context: Readonly<RouterContextProvider>): boolean => {
    const storage = context.get(authStorageContext);
    const cache = context.get(authCacheContext);
    if (!storage || !cache) {
        throw new Error('refreshAuthFromCookie must be used within the Commerce API middleware');
    }

    // Create temporary storage to read cookies
    const tempStorage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>();
    readClientAuthCookies(tempStorage);

    const cookieSession = unpackStorage<AuthData>(tempStorage);
    const cookieAccessToken = cookieSession.accessToken;
    const currentAccessToken = storage.get('accessToken') || cache.ref?.accessToken;

    // If the cookie has a different access token AND we have a current token, update the auth middleware
    // We only refresh if we have a current token to compare against. If there's no current token,
    // the normal middleware flow will handle the initial token loading.
    if (cookieAccessToken && currentAccessToken && cookieAccessToken !== currentAccessToken) {
        // Use updateAuth to handle all storage, cache, and promise cache updates
        updateAuth(context, () => cookieSession);
        return true;
    }

    return false;
};

/**
 * Clear invalid auth session and set up a new guest session.
 *
 * This function is called when we detect an invalid customerId in auth cookies
 * (e.g., customer account deleted, cookies from different environment, token/customer sync issues).
 *
 * Steps:
 * 1. Clear all auth-related cookies from the browser
 * 2. Clear auth storage and cache
 * 3. Request a new guest token from the server
 * 4. Update auth context with new guest session
 *
 * @param context - Router context
 * @returns Promise that resolves when cleanup and guest session setup is complete
 */
export const clearInvalidSessionAndRestoreGuest = async (context: Readonly<RouterContextProvider>): Promise<void> => {
    const { t } = getTranslation();
    const storage = context.get(authStorageContext);
    const cache = context.get(authCacheContext);
    const promiseCache = context.get(authContext);

    if (!storage || !cache || !promiseCache) {
        throw new Error('clearInvalidSessionAndRestoreGuest must be used within the Commerce API middleware');
    }

    const cookiesToRemove = [
        COOKIE_REFRESH_TOKEN_GUEST,
        COOKIE_REFRESH_TOKEN_REGISTERED,
        COOKIE_ACCESS_TOKEN,
        COOKIE_USID,
        COOKIE_CUSTOMER_ID,
        COOKIE_ENC_USER_ID,
        COOKIE_IDP_ACCESS_TOKEN,
        COOKIE_TRACKING_CONSENT,
        COOKIE_DWSID,
    ];

    cookiesToRemove.forEach((cookie) => {
        removeCookie(cookie);
    });

    // Clear react-router auth storage context and cache
    clearStorage(storage);
    cache.ref = undefined;

    // The server will set new auth cookies via Set-Cookie headers
    try {
        const tokenResponse = await handleGuestLogin(undefined); // Start fresh with new session
        await updateStorageAndCache(context, storage, cache, tokenResponse, 'guest');
        promiseCache.ref = createAuthPromise(context, cache.ref);
    } catch (error) {
        // If guest session setup fails, set error in storage
        // The auth middleware will attempt to get a guest token on the next request
        storage.set('error', t('errors:guestAccessTokenFailed'));
        promiseCache.ref = createAuthPromise(context, cache.ref);
        throw error;
    }
};

export default authMiddleware;
