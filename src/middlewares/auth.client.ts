import { createContext, type MiddlewareFunction, type RouterContextProvider } from 'react-router';
import type { ShopperLoginTypes } from 'commerce-sdk-isomorphic';
import type { SessionData as AuthData } from '@/lib/api/types';
import { getCookie, removeCookie, setCookie } from '@/lib/cookies';
import { clearStorage, type StorageErrorData, unpackStorage } from '@/lib/middleware';
import {
    authContext,
    type AuthStorageData,
    createAuthPromise,
    updateAuthStorageData,
    updateStorageAndCache,
} from '@/middlewares/auth.utils';
import uiStrings from '@/temp-ui-string';
import { performanceTimerContext, PERFORMANCE_MARKS } from '@/middlewares/performance-metrics';

/**
 * Client-side helper for refresh token operations
 * Uses fetch calls to server resource endpoints
 */
async function handleRefreshToken(refreshToken: string): Promise<ShopperLoginTypes.TokenResponse> {
    const response = await fetch('/resource/auth/refresh-token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
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
async function handleGuestLogin(usid: string | undefined): Promise<ShopperLoginTypes.TokenResponse> {
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
 */
const retrieveAuthStorageData = async (
    context: Readonly<RouterContextProvider>,
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>,
    cache: { ref: AuthData | undefined }
): Promise<void> => {
    // Verify Commerce API token validity
    const now = Date.now();
    const accessToken = storage.get('access_token');
    const accessTokenExpiry = storage.get('access_token_expiry');

    if (accessToken && typeof accessTokenExpiry === 'number' && accessTokenExpiry >= now) {
        return;
    }

    const refreshToken = storage.get('refresh_token');
    const refreshTokenExpiry = storage.get('refresh_token_expiry');
    const performanceTimer = context.get(performanceTimerContext);

    if (
        typeof refreshToken === 'string' &&
        refreshToken.length &&
        typeof refreshTokenExpiry === 'number' &&
        refreshTokenExpiry >= now
    ) {
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
            storage.set('error', uiStrings.errors.accessTokenRefreshFailed);
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
        storage.set('error', uiStrings.errors.guestAccessTokenFailed);
    }
};

/**
 * As we're on the client, we can define and use a singleton auth store instance here.
 */
const authCache: { ref: AuthData | undefined } = { ref: undefined };
const authPromiseCache: { ref: Promise<AuthData | undefined> } = { ref: Promise.resolve(undefined) };
const authCookieName = '__sfdc_auth';
const authStorageContext = createContext<Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>>();
const authCacheContext = createContext<{ ref: AuthData | undefined }>();

/**
 * Middleware to retrieve or refresh Commerce API auth information and provide it as part of the router `context`.
 *
 * This middleware is tailored for client-side use only! It uses a `document.cookie`-based approach to store the
 * current client's authentication information.
 *
 * **Note:** Right now we're using the `access_token_expiry` property of the `AuthStorageData` type to set the cookie's
 * expiration date. This might be subject to change in the future.
 *
 * The router context is available in other middlewares, loader and action functions. Use it as root middleware,
 * to ensure the Commerce API context portion becomes available throughout the whole application.
 */
const authMiddleware: MiddlewareFunction<void> = async ({ context }, next) => {
    // Before calling the handler: Load current Commerce API data from `authStore` or incoming cookies, if applicable
    const authData = authCache.ref ?? getCookie<AuthStorageData>(authCookieName);
    const authStorage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>(
        Object.entries(authData) as [keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]][]
    );

    // Ensure auth contexts are created before calling the session/auth retrieval. This is important for the `fetch`
    // client to work correctly, as the fetch client may start loading and streaming data before the middleware is
    // actually finished.
    if (!authCache.ref) {
        authCache.ref = authData;
        authPromiseCache.ref = Promise.resolve(authCache.ref);
    }

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

    // After calling the handler: Write back storage data, if required
    if (authStorage.has('isDestroyed') || authStorage.has('error')) {
        // Clean up the storage container. That way the information is immediately updated for eventually
        // running middlewares after this one as well.
        clearStorage(authStorage, false);
        authCache.ref = undefined;
        authPromiseCache.ref = createAuthPromise(context, authCache.ref);

        // Destroy cookie/session
        removeCookie(authCookieName);
    } else if (authStorage.has('isUpdated')) {
        // Clean up storage container metadata
        authStorage.delete('isUpdated');

        // Update the stored data in the cookie/session
        const entry = Object.fromEntries(authStorage);
        authCache.ref = entry;
        authPromiseCache.ref = createAuthPromise(context, entry);
        setCookie(authCookieName, entry, {
            path: '/',
            sameSite: 'lax',
            secure: true,
            // TODO: Decide on the correct expiration date/strategy. The expiration also needs to depend
            //  on the login/auth/flow type.
            expires: new Date(authStorage.get('access_token_expiry') as number),
        });
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
    updater: ShopperLoginTypes.TokenResponse | ((data: AuthData & StorageErrorData) => AuthData & StorageErrorData)
) => {
    const storage = context.get(authStorageContext);
    const cache = context.get(authCacheContext);
    const promiseCache = context.get(authContext);
    if (!storage || !cache || !promiseCache) {
        throw new Error('updateAuth must be used within the Commerce API middleware');
    }

    // Update storage data
    updateAuthStorageData(storage, updater);
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

export default authMiddleware;
