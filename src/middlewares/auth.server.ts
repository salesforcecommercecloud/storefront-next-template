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
    createContext,
    type MiddlewareFunction,
    type RouterContextProvider,
    type ActionFunctionArgs,
} from 'react-router';
import type { AuthResponse } from '@salesforce/storefront-next-runtime/scapi';
import type { SessionData as AuthData } from '@/lib/api/types';
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
    COOKIE_CODE_VERIFIER,
    COOKIE_TRACKING_CONSENT,
    COOKIE_DWSID,
} from '@/middlewares/auth.utils';
import { getAppOrigin, isAbsoluteURL } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { performanceTimerContext, PERFORMANCE_MARKS } from '@/middlewares/performance-metrics';
import { getConfig } from '@/config';
import { getCookieConfig, getCookieNameWithSiteId } from '@/lib/cookie-utils';
import { createCookie, parseAllCookies } from '@/lib/cookies.server';
import { getTranslation } from '@/lib/i18next';
import { TrackingConsent, trackingConsentToBoolean } from '@/types/tracking-consent';

/**
 * Refresh access token using refresh token.
 * Returns AuthResponse which includes dwsid (automatically extracted from Set-Cookie header by SDK).
 */
export async function refreshAccessToken(
    context: Readonly<RouterContextProvider>,
    refreshToken: string,
    options?: { trackingConsent?: TrackingConsent }
): Promise<AuthResponse> {
    const clients = createApiClients(context);
    const performanceTimer = context.get(performanceTimerContext);
    performanceTimer?.mark(PERFORMANCE_MARKS.authRefreshAccessToken, 'start');

    // Get tracking consent from options if provided, otherwise read from auth context (populated from cookies by middleware)
    // Only process tracking consent if the feature is enabled in config
    let trackingConsent: TrackingConsent | undefined = options?.trackingConsent;
    if (trackingConsent === undefined && isTrackingConsentEnabled(context)) {
        try {
            const authData = getAuth(context);
            trackingConsent = authData.trackingConsent;
        } catch {
            // If getAuth fails (e.g., middleware not initialized), trackingConsent remains undefined
        }
    }

    try {
        return await clients.auth.refreshToken({
            refreshToken,
            // Convert TrackingConsent enum to boolean for SLAS API
            ...(trackingConsent !== undefined && { dnt: trackingConsentToBoolean(trackingConsent) }),
        });
    } finally {
        performanceTimer?.mark(PERFORMANCE_MARKS.authRefreshAccessToken, 'end');
    }
}

/**
 * Login as guest user.
 * Returns AuthResponse which includes dwsid (automatically extracted from Set-Cookie header by SDK).
 */
export async function loginGuestUser(
    context: Readonly<RouterContextProvider>,
    options?: { usid?: string }
): Promise<AuthResponse> {
    const clients = createApiClients(context);
    const performanceTimer = context.get(performanceTimerContext);
    const appConfig = getConfig(context);
    const isSlasPrivate = appConfig.commerce.api.privateKeyEnabled;
    const performanceName = isSlasPrivate
        ? PERFORMANCE_MARKS.authLoginGuestUserPrivate
        : PERFORMANCE_MARKS.authLoginGuestUser;
    performanceTimer?.mark(performanceName, 'start');

    try {
        return await clients.auth.loginAsGuest({ usid: options?.usid });
    } finally {
        performanceTimer?.mark(performanceName, 'end');
    }
}

/**
 * Login as registered user with email and password.
 * Returns AuthResponse which includes dwsid (automatically extracted from Set-Cookie header by SDK).
 */
export async function loginRegisteredUser(
    context: Readonly<RouterContextProvider>,
    email: string,
    password: string,
    _options?: { customParameters?: Record<string, unknown> }
): Promise<AuthResponse> {
    const clients = createApiClients(context);
    const performanceTimer = context.get(performanceTimerContext);
    const { usid } = getAuth(context);

    // Get tracking consent from auth context (populated from cookies by middleware)
    // This ensures existing tracking consent preference from guest session propagates to registered user session
    // Only process tracking consent if the feature is enabled in config
    let trackingConsent: TrackingConsent | undefined;
    if (isTrackingConsentEnabled(context)) {
        try {
            const authData = getAuth(context);
            trackingConsent = authData.trackingConsent;
        } catch {
            // If getAuth fails (e.g., middleware not initialized), trackingConsent remains undefined
        }
    }

    performanceTimer?.mark(PERFORMANCE_MARKS.authLoginRegisteredUser, 'start');

    try {
        return await clients.auth.loginWithCredentials({
            username: email,
            password,
            usid: usid ? String(usid) : undefined,
            // Convert TrackingConsent enum to boolean for SLAS API
            ...(trackingConsent !== undefined && { dnt: trackingConsentToBoolean(trackingConsent) }),
        });
    } finally {
        performanceTimer?.mark(PERFORMANCE_MARKS.authLoginRegisteredUser, 'end');
    }
}

/**
 * Authorize passwordless login - sends magic link via email
 */
export async function authorizePasswordless(
    context: ActionFunctionArgs['context'],
    parameters: {
        userid: string;
        callbackUri?: string;
        redirectPath?: string;
    }
) {
    const performanceTimer = context.get(performanceTimerContext);
    performanceTimer?.mark(PERFORMANCE_MARKS.authAuthorizePasswordless, 'start');

    const clients = createApiClients(context);
    const session = getAuth(context);
    const userId = parameters.userid;

    const appConfig = getConfig(context);
    const passwordlessCallback = appConfig.features.passwordlessLogin.callbackUri;

    const passwordlessLoginCallbackUri = isAbsoluteURL(passwordlessCallback)
        ? passwordlessCallback
        : `${getAppOrigin()}${passwordlessCallback}`;

    const callbackUri = parameters.callbackUri || passwordlessLoginCallbackUri;

    const finalCallbackUri = parameters.redirectPath
        ? `${callbackUri}?redirectUrl=${encodeURIComponent(parameters.redirectPath)}`
        : callbackUri;

    const usid = session.usid;
    const mode = finalCallbackUri ? 'callback' : 'sms';

    return await clients.auth.passwordless
        .authorize({
            userId,
            callbackUri: finalCallbackUri,
            usid: usid ? String(usid) : undefined,
            mode,
        })
        .finally(() => {
            performanceTimer?.mark(PERFORMANCE_MARKS.authAuthorizePasswordless, 'end');
        });
}

/**
 * Request password reset token - sends magic link via email
 */
export async function getPasswordResetToken(
    context: ActionFunctionArgs['context'],
    parameters: {
        email: string;
    }
) {
    const performanceTimer = context.get(performanceTimerContext);
    performanceTimer?.mark(PERFORMANCE_MARKS.authGetPasswordResetToken, 'start');

    const clients = createApiClients(context);
    const appConfig = getConfig(context);
    const resetPasswordCallbackUri = appConfig.features.resetPassword.callbackUri;
    const callbackUri = isAbsoluteURL(resetPasswordCallbackUri)
        ? resetPasswordCallbackUri
        : `${getAppOrigin()}${resetPasswordCallbackUri}`;

    return await clients.auth.password
        .requestReset({
            userId: parameters.email,
            callbackUri,
        })
        .finally(() => {
            performanceTimer?.mark(PERFORMANCE_MARKS.authGetPasswordResetToken, 'end');
        });
}

/**
 * Reset password using token from magic link
 */
export async function resetPasswordWithToken(
    context: ActionFunctionArgs['context'],
    parameters: {
        email: string;
        token: string;
        newPassword: string;
    }
) {
    const performanceTimer = context.get(performanceTimerContext);
    performanceTimer?.mark(PERFORMANCE_MARKS.authResetPasswordWithToken, 'start');

    const clients = createApiClients(context);

    try {
        return await clients.auth.password.reset({
            userId: parameters.email,
            token: parameters.token,
            newPassword: parameters.newPassword,
        });
    } finally {
        performanceTimer?.mark(PERFORMANCE_MARKS.authResetPasswordWithToken, 'end');
    }
}

/**
 * Get passwordless access token using the token from magic link.
 * Returns AuthResponse which includes dwsid (automatically extracted from Set-Cookie header by SDK).
 */
export async function getPasswordLessAccessToken(
    context: Readonly<RouterContextProvider>,
    pwdlessLoginToken: string
): Promise<AuthResponse> {
    const clients = createApiClients(context);
    const performanceTimer = context.get(performanceTimerContext);
    const session = getAuth(context);
    const usid = session.usid;
    performanceTimer?.mark(PERFORMANCE_MARKS.authGetPasswordLessAccessToken, 'start');

    // Get tracking consent from auth context (populated from cookies by middleware)
    // This ensures existing tracking consent preference from guest session propagates to registered user session
    // Only process tracking consent if the feature is enabled in config
    let dnt: boolean | undefined;
    if (isTrackingConsentEnabled(context)) {
        try {
            const authData = getAuth(context);
            if (authData.trackingConsent) {
                dnt = trackingConsentToBoolean(authData.trackingConsent);
            }
        } catch {
            // If getAuth fails (e.g., middleware not initialized), dnt remains undefined
        }
    }

    try {
        return await clients.auth.passwordless.exchangeToken({
            pwdlessLoginToken,
            usid: usid ? String(usid) : undefined,
            ...(dnt !== undefined && { dnt }),
        });
    } finally {
        performanceTimer?.mark(PERFORMANCE_MARKS.authGetPasswordLessAccessToken, 'end');
    }
}

/**
 * Server-side utility to retrieve/verify the validity of stored Commerce API auth information.
 * Validates access token expiry using the expiry injected from JWT during middleware initialization.
 */
const retrieveAuthStorageData = async (
    context: Readonly<RouterContextProvider>,
    storage: Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>,
    cache: { ref: AuthData | undefined }
): Promise<void> => {
    const { t } = getTranslation(context);

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

            // Use refresh token operation and update storage/cache
            performanceTimer?.mark(PERFORMANCE_MARKS.authRefreshToken, 'start');
            const tokenResponse = await refreshAccessToken(context, refreshToken);
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

        // Use guest login operation and update storage/cache
        performanceTimer?.mark(PERFORMANCE_MARKS.authGuestLogin, 'start');
        const tokenResponse = await loginGuestUser(context, {
            usid: typeof usid === 'string' && usid.length ? usid : undefined,
        });
        performanceTimer?.mark(PERFORMANCE_MARKS.authGuestLogin, 'end');
        await updateStorageAndCache(context, storage, cache, tokenResponse, 'guest');
    } catch {
        storage.set('error', t('errors:guestAccessTokenFailed'));
    }
};

// Cookie names for split auth storage are imported from auth.utils
// IMPORTANT: Only ONE refresh token cookie should exist at a time
// - cc-nx-g: Guest users (cookie name encodes user type)
// - cc-nx: Registered users (cookie name encodes user type)

const authStorageContext = createContext<Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>>();
const authCacheContext = createContext<{ ref: AuthData | undefined }>();

/**
 * Middleware to retrieve or refresh the Commerce API token and provide it as part of the router `context`.
 *
 * This middleware is tailored for server-side use only! It uses separate cookies to store different parts of the
 * authentication information:
 * - `cc-nx-g`: Guest user refresh token (expires after configured period, browser auto-deletes)
 * - `cc-nx`: Registered user refresh token (expires after configured period, browser auto-deletes)
 * - `cc-at`: Access token (expires after 30 min, browser auto-deletes)
 * - `usid`: User session ID (expires with refresh token)
 * - `customerId`: Customer ID (expires with refresh token)
 * - `cc-idp-at`: IDP access token (for social login, expires with SLAS access token)
 * - `cc-cv`: OAuth2 PKCE code verifier (server-only httpOnly cookie, short-lived, 5 min expiry)
 *
 * User type is determined by which refresh token cookie exists (cc-nx-g = guest, cc-nx = registered).
 * Only one refresh token cookie exists at a time - a user cannot be both guest and registered.
 *
 * All cookies use httpOnly: false to allow ECOM to access cookies in hybrid storefronts, except:
 * - `cc-cv` uses httpOnly: true for security (OAuth2 PKCE flow, server-only)
 *
 * Cookie configuration can be overridden via getCookieConfig using environment variables.
 *
 * Token validation flow:
 * - If access token exists and not expired (checked via JWT decode) → use it
 * - If access token missing/expired but refresh token exists → refresh to get new access token
 * - If both missing → guest login
 *
 * The router context is available in other middlewares, loader and action functions. Use it as root middleware,
 * to ensure the Commerce API context portion becomes available throughout the whole application.
 */
const authMiddleware: MiddlewareFunction<Response> = async ({ request, context }, next) => {
    // Before calling the handler: Load current Commerce API data from incoming cookies, if applicable
    const cookieConfig = getCookieConfig({ httpOnly: false }, context);
    const cookieHeader = request.headers.get('Cookie');

    // Parse cookie header once (not 5 times) for optimal performance
    const allCookies = parseAllCookies(cookieHeader);

    // Extract auth cookies from parsed map (no decoding/JSON parsing)
    const getAuthCookie = (name: string): string | null => {
        const namespacedName = getCookieNameWithSiteId(name, context);
        return allCookies[namespacedName] || null;
    };

    const refreshTokenGuest = getAuthCookie(COOKIE_REFRESH_TOKEN_GUEST);
    const refreshTokenRegistered = getAuthCookie(COOKIE_REFRESH_TOKEN_REGISTERED);
    const accessToken = getAuthCookie(COOKIE_ACCESS_TOKEN);
    const usid = getAuthCookie(COOKIE_USID);
    const customerId = getAuthCookie(COOKIE_CUSTOMER_ID);
    const encUserId = getAuthCookie(COOKIE_ENC_USER_ID);
    const idpAccessToken = getAuthCookie(COOKIE_IDP_ACCESS_TOKEN);
    const codeVerifier = getAuthCookie(COOKIE_CODE_VERIFIER);
    const dwsid = getAuthCookie(COOKIE_DWSID);
    // Read tracking consent cookie directly as TrackingConsent enum (values match)
    const trackingConsentCookieValue = getAuthCookie(COOKIE_TRACKING_CONSENT);
    let trackingConsent: TrackingConsent | undefined =
        trackingConsentCookieValue === TrackingConsent.Accepted ||
        trackingConsentCookieValue === TrackingConsent.Declined
            ? trackingConsentCookieValue
            : undefined;

    // Track if we need to delete the tracking consent cookie due to mismatch
    let hasTrackingConsentMismatch = false;

    // Create cookie instances for serialization (Set-Cookie headers)
    const refreshTokenGuestCookie = createCookie<string>(COOKIE_REFRESH_TOKEN_GUEST, cookieConfig, context);
    const refreshTokenRegisteredCookie = createCookie<string>(COOKIE_REFRESH_TOKEN_REGISTERED, cookieConfig, context);
    const accessTokenCookie = createCookie<string>(COOKIE_ACCESS_TOKEN, cookieConfig, context);
    const usidCookie = createCookie<string>(COOKIE_USID, cookieConfig, context);
    const customerIdCookie = createCookie<string>(COOKIE_CUSTOMER_ID, cookieConfig, context);
    const encUserIdCookie = createCookie<string>(COOKIE_ENC_USER_ID, cookieConfig, context);
    const idpAccessTokenCookie = createCookie<string>(COOKIE_IDP_ACCESS_TOKEN, cookieConfig, context);
    const dwsidCookie = createCookie<string>(COOKIE_DWSID, cookieConfig, context);
    // Code verifier cookie is httpOnly for security (OAuth2 PKCE flow, server-only)
    const codeVerifierCookie = createCookie<string>(
        COOKIE_CODE_VERIFIER,
        getCookieConfig({ httpOnly: true }, context),
        context
    );
    const trackingConsentCookie = createCookie<string>(COOKIE_TRACKING_CONSENT, cookieConfig, context);

    // Determine user type and refresh token from which cookie exists
    // Only one should exist at a time (guest and registered are mutually exclusive)
    //
    // IMPORTANT: userType is NEVER written to cookies. It is ALWAYS derived at runtime
    // from which refresh token cookie exists:
    // - cc-nx exists → registered user
    // - cc-nx-g exists → guest user
    // - neither exists → fallback to guest
    //
    // userType is stored in authStorage/authCache for easy in-app access,
    // and is set explicitly during login flows for in-memory state management.
    let userType: 'guest' | 'registered';
    let refreshToken: string | null;

    if (refreshTokenRegistered) {
        // cc-nx exists → user is registered
        userType = 'registered';
        refreshToken = refreshTokenRegistered;
    } else if (refreshTokenGuest) {
        // cc-nx-g exists → user is guest
        userType = 'guest';
        refreshToken = refreshTokenGuest;
    } else {
        // No refresh token exists - will fallback to guest login
        userType = 'guest';
        refreshToken = null;
    }

    // Reconstruct authData from individual cookies
    // Note: expiry times are NOT persisted in cookies - they're derived from JWT tokens at runtime
    // This decodes once during middleware initialization for fast numeric comparison later
    const authData: Partial<AuthStorageData> = {};
    if (refreshToken) authData.refreshToken = refreshToken;
    if (accessToken) {
        authData.accessToken = accessToken;
        // Extract claims from JWT (source of truth) - decode once for efficiency
        const claims = getSLASAccessTokenClaims(accessToken);
        if (claims.expiry) authData.accessTokenExpiry = claims.expiry;

        // Validate tracking consent value from token matches cookie - if they differ, mark cookie for deletion
        // Only validate if tracking consent feature is enabled
        if (isTrackingConsentEnabled(context) && claims.trackingConsent !== null && trackingConsent !== undefined) {
            if (claims.trackingConsent !== trackingConsent) {
                // Tracking consent values differ - mark for deletion by not including trackingConsent in authData
                // This will cause the cookie to be deleted in the response section
                trackingConsent = undefined;
                hasTrackingConsentMismatch = true;
            }
        }
    }
    if (usid) authData.usid = usid;
    if (customerId) authData.customerId = customerId;
    if (encUserId) authData.encUserId = encUserId;
    // Add IDP access token for social login (if present)
    if (idpAccessToken) authData.idpAccessToken = idpAccessToken;
    // Add code verifier for OAuth2 PKCE flow (if present)
    if (codeVerifier) authData.codeVerifier = codeVerifier;
    // Add dwsid for hybrid storefronts (if present)
    if (dwsid) authData.dwsid = dwsid;
    // Add tracking consent value from cookie (if present and valid)
    // Note: trackingConsent may be undefined if it doesn't match token, which will cause cookie deletion
    if (trackingConsent !== undefined) authData.trackingConsent = trackingConsent;
    // Add userType to in-memory storage (NOT written to cookies)
    authData.userType = userType;

    const authStorage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>(
        Object.entries(authData) as [keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]][]
    );

    // Mark storage as updated if tracking consent mismatch was detected
    // This ensures the response section runs and deletes the invalid cookie
    if (hasTrackingConsentMismatch) {
        authStorage.set('isUpdated', true);
    }

    // Create auth cache instance per request. On the server it's crucial to not create a singleton cache instance!
    const authCache: { ref: AuthData | undefined } = { ref: authData as AuthData };
    const authPromiseCache: { ref: Promise<AuthData | undefined> } = { ref: Promise.resolve(authData as AuthData) };

    // Write Commerce API data to request `context` to make it available to other middleware, loaders, or actions
    context.set(authContext, authPromiseCache);
    context.set(authStorageContext, authStorage);
    context.set(authCacheContext, authCache);

    // Skip auth retrieval for resource auth routes as they handle their own auth operations
    const url = new URL(request.url);
    const isAuthResourceRoute = url.pathname.startsWith('/resource/auth/');

    // Before calling the handler: Verify existing Commerce API auth data or retrieve new information
    if (!isAuthResourceRoute) {
        await retrieveAuthStorageData(context, authStorage, authCache).catch(() => {
            // Intentionally empty
        });
    }

    // Execute handler (loader/action/render)
    const response = await next();

    // After calling the handler: Write back storage data and cookies, if required
    if (authStorage.has('isDestroyed') || authStorage.has('error')) {
        // Clean up the storage container. That way the information is immediately updated for eventually
        // running middlewares after this one as well.
        clearStorage(authStorage, false);
        authCache.ref = undefined;
        authPromiseCache.ref = createAuthPromise(context, authCache.ref);

        // Destroy all auth cookies (both refresh token cookies to ensure clean state)
        const deleteCookieConfig = getCookieConfig(
            {
                maxAge: undefined,
                expires: new Date(0),
            },
            context
        );
        const deleteHttpOnlyCookieConfig = getCookieConfig(
            {
                httpOnly: true,
                maxAge: undefined,
                expires: new Date(0),
            },
            context
        );

        response.headers.append('Set-Cookie', await refreshTokenGuestCookie.serialize('', deleteCookieConfig));
        response.headers.append('Set-Cookie', await refreshTokenRegisteredCookie.serialize('', deleteCookieConfig));
        response.headers.append('Set-Cookie', await accessTokenCookie.serialize('', deleteCookieConfig));
        response.headers.append('Set-Cookie', await usidCookie.serialize('', deleteCookieConfig));
        response.headers.append('Set-Cookie', await customerIdCookie.serialize('', deleteCookieConfig));
        response.headers.append('Set-Cookie', await encUserIdCookie.serialize('', deleteCookieConfig));
        response.headers.append('Set-Cookie', await idpAccessTokenCookie.serialize('', deleteCookieConfig));
        response.headers.append('Set-Cookie', await dwsidCookie.serialize('', deleteCookieConfig));
        response.headers.append('Set-Cookie', await codeVerifierCookie.serialize('', deleteHttpOnlyCookieConfig));
        response.headers.append('Set-Cookie', await trackingConsentCookie.serialize('', deleteCookieConfig));
    } else if (authStorage.has('isUpdated')) {
        // Clean up storage container metadata
        authStorage.delete('isUpdated');

        // Update the stored data in separate cookies
        const entry = Object.fromEntries(authStorage);
        authCache.ref = entry;
        authPromiseCache.ref = createAuthPromise(context, entry);

        // Get expiry times (calculated from token response) and user type
        const accessTokenExpiryValue = authStorage.get('accessTokenExpiry') as number | undefined;
        const refreshTokenExpiryValue = authStorage.get('refreshTokenExpiry') as number | undefined;
        const userTypeValue = authStorage.get('userType') as 'guest' | 'registered' | undefined;

        // Set refresh token cookie with refresh token expiry
        // Use correct cookie name based on user type (cc-nx-g for guest, cc-nx for registered)
        //
        // NOTE: userType itself is NOT written to cookies - only the refresh token is written
        // to the appropriate cookie name (cc-nx-g or cc-nx). On next request, userType will
        // be derived from which cookie exists.
        const refreshTokenValue = authStorage.get('refreshToken');
        if (refreshTokenValue && typeof refreshTokenValue === 'string' && refreshTokenExpiryValue && userTypeValue) {
            const refreshTokenCookie =
                userTypeValue === 'guest' ? refreshTokenGuestCookie : refreshTokenRegisteredCookie;

            // Delete the other refresh token cookie to ensure only one exists
            const otherRefreshTokenCookie =
                userTypeValue === 'guest' ? refreshTokenRegisteredCookie : refreshTokenGuestCookie;

            const deleteCookieConfig = getCookieConfig(
                {
                    maxAge: undefined,
                    expires: new Date(0),
                },
                context
            );

            response.headers.append('Set-Cookie', await otherRefreshTokenCookie.serialize('', deleteCookieConfig));

            // Set the correct refresh token cookie
            response.headers.append(
                'Set-Cookie',
                await refreshTokenCookie.serialize(
                    refreshTokenValue,
                    getCookieConfig(
                        {
                            expires: new Date(refreshTokenExpiryValue),
                        },
                        context
                    )
                )
            );
        }

        // Set access token cookie with access token expiry
        const accessTokenValue = authStorage.get('accessToken');
        if (accessTokenValue && typeof accessTokenValue === 'string' && accessTokenExpiryValue) {
            response.headers.append(
                'Set-Cookie',
                await accessTokenCookie.serialize(
                    accessTokenValue,
                    getCookieConfig(
                        {
                            expires: new Date(accessTokenExpiryValue),
                        },
                        context
                    )
                )
            );
        }

        // Set usid cookie with refresh token expiry (same as refresh token)
        const usidValue = authStorage.get('usid');
        if (usidValue && typeof usidValue === 'string' && refreshTokenExpiryValue) {
            response.headers.append(
                'Set-Cookie',
                await usidCookie.serialize(
                    usidValue,
                    getCookieConfig(
                        {
                            expires: new Date(refreshTokenExpiryValue),
                        },
                        context
                    )
                )
            );
        }

        // Set customerId cookie with refresh token expiry (same as refresh token)
        const customerIdValue = authStorage.get('customerId');
        if (customerIdValue && typeof customerIdValue === 'string' && refreshTokenExpiryValue) {
            response.headers.append(
                'Set-Cookie',
                await customerIdCookie.serialize(
                    customerIdValue,
                    getCookieConfig(
                        {
                            expires: new Date(refreshTokenExpiryValue),
                        },
                        context
                    )
                )
            );
        }

        // Set encUserId cookie with refresh token expiry (same as refresh token)
        const encUserIdValue = authStorage.get('encUserId');
        if (encUserIdValue && typeof encUserIdValue === 'string' && refreshTokenExpiryValue) {
            response.headers.append(
                'Set-Cookie',
                await encUserIdCookie.serialize(
                    encUserIdValue,
                    getCookieConfig(
                        {
                            expires: new Date(refreshTokenExpiryValue),
                        },
                        context
                    )
                )
            );
        }

        // Set IDP access token cookie with access token expiry (for social login)
        const idpAccessTokenValue = authStorage.get('idpAccessToken');
        const idpAccessTokenExpiryValue = authStorage.get('idpAccessTokenExpiry') as number | undefined;
        if (idpAccessTokenValue && typeof idpAccessTokenValue === 'string' && idpAccessTokenExpiryValue) {
            response.headers.append(
                'Set-Cookie',
                await idpAccessTokenCookie.serialize(
                    idpAccessTokenValue,
                    getCookieConfig(
                        {
                            expires: new Date(idpAccessTokenExpiryValue),
                        },
                        context
                    )
                )
            );
        }

        // Set dwsid cookie as session cookie (for hybrid storefronts)
        // No explicit expiry - cookie is deleted when browser closes
        const dwsidValue = authStorage.get('dwsid');
        if (dwsidValue && typeof dwsidValue === 'string') {
            response.headers.append(
                'Set-Cookie',
                await dwsidCookie.serialize(dwsidValue, getCookieConfig({}, context))
            );
        }

        // Set code verifier cookie with short expiry (OAuth2 PKCE flow, ephemeral)
        // This cookie is httpOnly for security and has a 5-minute expiry
        const codeVerifierValue = authStorage.get('codeVerifier');
        if (codeVerifierValue && typeof codeVerifierValue === 'string') {
            const codeVerifierExpiry = Date.now() + 5 * 60 * 1_000; // 5 minutes from now
            response.headers.append(
                'Set-Cookie',
                await codeVerifierCookie.serialize(
                    codeVerifierValue,
                    getCookieConfig(
                        {
                            httpOnly: true,
                            expires: new Date(codeVerifierExpiry),
                        },
                        context
                    )
                )
            );
        } else {
            // If codeVerifier was removed from storage (e.g., after successful social login),
            // explicitly delete the cookie immediately rather than waiting for expiry
            response.headers.append(
                'Set-Cookie',
                await codeVerifierCookie.serialize(
                    '',
                    getCookieConfig(
                        {
                            httpOnly: true,
                            maxAge: undefined,
                            expires: new Date(0),
                        },
                        context
                    )
                )
            );
        }

        // Set or delete tracking consent cookie (only if tracking consent feature is enabled)
        // TrackingConsent enum values match cookie format directly ('0' or '1')
        if (isTrackingConsentEnabled(context)) {
            const trackingConsentValue = authStorage.get('trackingConsent');
            if (
                trackingConsentValue === TrackingConsent.Accepted ||
                trackingConsentValue === TrackingConsent.Declined
            ) {
                // Set tracking consent cookie as session cookie (no expiry)
                // Enum value is already in correct format ('0' or '1')
                response.headers.append(
                    'Set-Cookie',
                    await trackingConsentCookie.serialize(trackingConsentValue, getCookieConfig({}, context))
                );
            } else {
                // Delete tracking consent cookie if it was invalidated (e.g., didn't match token)
                // Check if cookie exists in request to avoid unnecessary deletion
                const requestTrackingConsent = getAuthCookie(COOKIE_TRACKING_CONSENT);
                if (requestTrackingConsent) {
                    response.headers.append(
                        'Set-Cookie',
                        await trackingConsentCookie.serialize(
                            '',
                            getCookieConfig(
                                {
                                    maxAge: undefined,
                                    expires: new Date(0),
                                },
                                context
                            )
                        )
                    );
                }
            }
        }
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
    updater: AuthResponse | ((data: AuthData & StorageErrorData) => AuthData & StorageErrorData)
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
 * Clear invalid session and restore a fresh guest session.
 * This is useful when a customer is deleted or session is corrupted.
 * Cookies are deleted via the 'isDestroyed' flag, which triggers
 * the middleware's response section to send Set-Cookie deletion headers.
 */
export const clearInvalidSessionAndRestoreGuest = async (context: Readonly<RouterContextProvider>): Promise<void> => {
    const { t } = getTranslation();
    const storage = context.get(authStorageContext);
    const cache = context.get(authCacheContext);
    const promiseCache = context.get(authContext);

    if (!storage || !cache || !promiseCache) {
        throw new Error('clearInvalidSessionAndRestoreGuest must be used within auth middleware');
    }

    // Clear in-memory storage and cache
    clearStorage(storage);
    cache.ref = undefined;

    try {
        // Get new guest session (no usid - start completely fresh)
        const tokenResponse = await loginGuestUser(context, { usid: undefined });
        await updateStorageAndCache(context, storage, cache, tokenResponse, 'guest');
        promiseCache.ref = createAuthPromise(context, cache.ref);

        // Mark for destruction - triggers cookie deletion in response section
        storage.set('isDestroyed', true);
    } catch (error) {
        // If guest login fails, still mark for destruction and set error
        storage.set('isDestroyed', true);
        storage.set('error', t('errors:guestAccessTokenFailed'));
        throw error;
    }
};

export default authMiddleware;
