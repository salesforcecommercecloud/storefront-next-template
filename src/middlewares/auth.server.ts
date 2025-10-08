import { createCookie, createContext, type MiddlewareFunction, type RouterContextProvider } from 'react-router';
import type { ShopperLoginTypes } from 'commerce-sdk-isomorphic';
import type { SessionData as AuthData } from '@/lib/api/types';
import { clearStorage, type StorageErrorData, unpackStorage } from '@/lib/middleware';
import {
    authContext,
    type AuthStorageData,
    createAuthPromise,
    updateAuthStorageData,
    updateStorageAndCache,
} from '@/middlewares/auth.utils';
import { isSlasPrivate } from '@/lib/utils';
import createClient from '@/lib/scapi';
import uiStrings from '@/temp-ui-string';
import { performanceTimerContext, PERFORMANCE_MARKS } from '@/middlewares/performance-metrics';

/**
 * Utility to get the SLAS client secret with proper validation
 * Server-only for security - client secrets should never reach client-side code
 */
const getSlasClientSecret = (): string => {
    const clientSecret = process.env.COMMERCE_API_SLAS_SECRET;
    if (!clientSecret) {
        throw new Error('COMMERCE_API_SLAS_SECRET is required when SLAS is configured as private');
    }
    return clientSecret;
};

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
    context: Readonly<RouterContextProvider>,
    refreshToken: string
): Promise<ShopperLoginTypes.TokenResponse> {
    const { helpers } = await import('commerce-sdk-isomorphic');
    const slasClient = await createClient(context).ShopperLogin.getInstance();
    const performanceTimer = context.get(performanceTimerContext);
    performanceTimer?.mark(PERFORMANCE_MARKS.authRefreshAccessToken, 'start');

    return helpers
        .refreshAccessToken({
            slasClient,
            parameters: {
                refreshToken,
            },
            credentials: {
                ...(isSlasPrivate && {
                    clientSecret: getSlasClientSecret(),
                }),
            },
        })
        .finally(() => {
            performanceTimer?.mark(PERFORMANCE_MARKS.authRefreshAccessToken, 'end');
        });
}

/**
 * Login as guest user
 */
export async function loginGuestUser(
    context: Readonly<RouterContextProvider>,
    options?: { usid?: string }
): Promise<ShopperLoginTypes.TokenResponse> {
    const { helpers } = await import('commerce-sdk-isomorphic');
    const slasClient = await createClient(context).ShopperLogin.getInstance();
    const { redirectURI } = slasClient.clientConfig.parameters;
    const performanceTimer = context.get(performanceTimerContext);
    const performanceName = isSlasPrivate
        ? PERFORMANCE_MARKS.authLoginGuestUserPrivate
        : PERFORMANCE_MARKS.authLoginGuestUser;
    performanceTimer?.mark(performanceName, 'start');

    return isSlasPrivate
        ? helpers
              .loginGuestUserPrivate({
                  slasClient,
                  parameters: {
                      ...(options?.usid && { usid: options.usid }),
                  },
                  credentials: { clientSecret: getSlasClientSecret() },
              })
              .finally(() => {
                  performanceTimer?.mark(performanceName, 'end');
              })
        : helpers
              .loginGuestUser({
                  slasClient,
                  parameters: {
                      redirectURI,
                      ...(options?.usid && { usid: options.usid }),
                  },
              })
              .finally(() => {
                  performanceTimer?.mark(performanceName, 'end');
              });
}

/**
 * Login as registered user with email and password
 */
export async function loginRegisteredUser(
    context: Readonly<RouterContextProvider>,
    email: string,
    password: string,
    options?: { customParameters?: Record<string, unknown> }
): Promise<ShopperLoginTypes.TokenResponse> {
    const { helpers } = await import('commerce-sdk-isomorphic');
    const slasClient = await createClient(context).ShopperLogin.getInstance();
    const { redirectURI } = slasClient.clientConfig.parameters;
    const performanceTimer = context.get(performanceTimerContext);
    performanceTimer?.mark(PERFORMANCE_MARKS.authLoginRegisteredUser, 'start');

    return helpers
        .loginRegisteredUserB2C({
            slasClient,
            credentials: {
                username: email,
                password,
                ...(isSlasPrivate && {
                    clientSecret: getSlasClientSecret(),
                }),
            },
            parameters: {
                redirectURI,
                // Include custom parameters if any
                ...(options?.customParameters &&
                    Object.keys(options.customParameters).length > 0 && {
                        body: options.customParameters,
                    }),
            },
        })
        .finally(() => {
            performanceTimer?.mark(PERFORMANCE_MARKS.authLoginRegisteredUser, 'end');
        });
}

/**
 * Server-side utility to retrieve/verify the validity of stored Commerce API auth information.
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

            // Use refresh token operation and update storage/cache
            performanceTimer?.mark(PERFORMANCE_MARKS.authRefreshToken, 'start');
            const tokenResponse = await refreshAccessToken(context, refreshToken);
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

        // Use guest login operation and update storage/cache
        performanceTimer?.mark(PERFORMANCE_MARKS.authGuestLogin, 'start');
        const tokenResponse = await loginGuestUser(context, {
            usid: typeof usid === 'string' && usid.length ? usid : undefined,
        });
        performanceTimer?.mark(PERFORMANCE_MARKS.authGuestLogin, 'end');
        await updateStorageAndCache(context, storage, cache, tokenResponse, 'guest');
    } catch {
        storage.set('error', uiStrings.errors.guestAccessTokenFailed);
    }
};

const authCookieName = '__sfdc_auth';
const authStorageContext = createContext<Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>>();
const authCacheContext = createContext<{ ref: AuthData | undefined }>();

/**
 * Middleware to retrieve or refresh the Commerce API token and provide it as part of the router `context`.
 *
 * This middleware is tailored for server-side use only! It uses React Router's built-in cookie handling to store the
 * current client's authentication information. Those utilities are only available inside the router's server runtime.
 *
 * **Note:** Right now we're using the `access_token_expiry` property of the `AuthStorageData` type to set the cookie's
 * expiration date. This might be subject to change in the future.
 *
 * The router context is available in other middlewares, loader and action functions. Use it as root middleware,
 * to ensure the Commerce API context portion becomes available throughout the whole application.
 */
const authMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
    // Before calling the handler: Load current Commerce API data from incoming cookies, if applicable
    const authCookie = createCookie(authCookieName, {
        httpOnly: false,
        path: '/',
        sameSite: 'lax',
        secure: true,
    });
    const authData = ((await authCookie.parse(request.headers.get('Cookie'))) || {}) satisfies AuthStorageData;
    const authStorage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>(
        Object.entries(authData) as [keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]][]
    );

    // Create auth cache instance per request. On the server it's crucial to not create a singleton cache instance!
    const authCache: { ref: AuthData | undefined } = { ref: authData };
    const authPromiseCache: { ref: Promise<AuthData | undefined> } = { ref: Promise.resolve(authData) };

    // Write Commerce API data to request `context` to make it available to other middleware, loaders, or actions
    context.set(authContext, authPromiseCache);
    context.set(authStorageContext, authStorage);
    context.set(authCacheContext, authCache);

    // Before calling the handler: Verify existing Commerce API auth data or retrieve new information
    await retrieveAuthStorageData(context, authStorage, authCache).catch(() => {
        // Intentionally empty
    });

    // Execute handler (loader/action/render)
    const response = await next();

    // After calling the handler: Write back storage data and cookie, if required
    if (authStorage.has('isDestroyed') || authStorage.has('error')) {
        // Clean up the storage container. That way the information is immediately updated for eventually
        // running middlewares after this one as well.
        clearStorage(authStorage, false);
        authCache.ref = undefined;
        authPromiseCache.ref = createAuthPromise(context, authCache.ref);

        // Destroy cookie/session
        response.headers.append(
            'Set-Cookie',
            await authCookie.serialize('', {
                maxAge: undefined,
                expires: new Date(0),
            })
        );
    } else if (authStorage.has('isUpdated')) {
        // Clean up storage container metadata
        authStorage.delete('isUpdated');

        // Update the stored data in the cookie/session
        const entry = Object.fromEntries(authStorage);
        authCache.ref = entry;
        authPromiseCache.ref = createAuthPromise(context, entry);
        response.headers.append(
            'Set-Cookie',
            await authCookie.serialize(entry, {
                // TODO: Decide on the correct expiration date/strategy. The expiration also needs to depend
                //  on the login/auth/flow type.
                expires: new Date(authStorage.get('access_token_expiry') as number),
            })
        );
    }

    return response;
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
