import {
    createContext,
    type MiddlewareFunction,
    type RouterContextProvider,
    type ActionFunctionArgs,
} from 'react-router';
import type { ShopperLoginTypes } from 'commerce-sdk-isomorphic';
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
    COOKIE_IDP_ACCESS_TOKEN,
    COOKIE_CODE_VERIFIER,
    COOKIE_TRACKING_CONSENT,
} from '@/middlewares/auth.utils';
import { getAppOrigin, isAbsoluteURL, stringToBase64 } from '@/lib/utils';
import createClient from '@/lib/scapi';
import { performanceTimerContext, PERFORMANCE_MARKS } from '@/middlewares/performance-metrics';
import { getConfig } from '@/config';
import { getCookieConfig, getCookieNameWithSiteId } from '@/lib/cookie-utils';
import { createCookie, parseAllCookies } from '@/lib/cookies.server';
import { getTranslation } from '@/lib/i18next';
import { TrackingConsent, trackingConsentToBoolean } from '@/types/tracking-consent';

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
    refreshToken: string,
    options?: { trackingConsent?: TrackingConsent }
): Promise<ShopperLoginTypes.TokenResponse> {
    const { refreshAccessToken: refreshAccessTokenHelper } = await import('commerce-sdk-isomorphic/helpers');
    const slasClient = await createClient(context).ShopperLogin.getInstance();
    const performanceTimer = context.get(performanceTimerContext);
    const appConfig = getConfig(context);
    const isSlasPrivate = appConfig.commerce.api.privateKeyEnabled;
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

    return refreshAccessTokenHelper({
        slasClient,
        parameters: {
            refreshToken,
            // Convert TrackingConsent enum to boolean for SLAS API
            ...(trackingConsent !== undefined && { dnt: trackingConsentToBoolean(trackingConsent) }),
        },
        credentials: {
            ...(isSlasPrivate && {
                clientSecret: getSlasClientSecret(),
            }),
        },
    }).finally(() => {
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
    const { loginGuestUserPrivate: loginGuestUserPrivateHelper, loginGuestUser: loginGuestUserHelper } = await import(
        'commerce-sdk-isomorphic/helpers'
    );
    const slasClient = await createClient(context).ShopperLogin.getInstance();
    const { redirectURI } = slasClient.clientConfig.parameters;
    const performanceTimer = context.get(performanceTimerContext);
    const appConfig = getConfig(context);
    const isSlasPrivate = appConfig.commerce.api.privateKeyEnabled;
    const performanceName = isSlasPrivate
        ? PERFORMANCE_MARKS.authLoginGuestUserPrivate
        : PERFORMANCE_MARKS.authLoginGuestUser;
    performanceTimer?.mark(performanceName, 'start');

    return isSlasPrivate
        ? loginGuestUserPrivateHelper({
              slasClient,
              parameters: {
                  ...(options?.usid && { usid: options.usid }),
              },
              credentials: { clientSecret: getSlasClientSecret() },
          }).finally(() => {
              performanceTimer?.mark(performanceName, 'end');
          })
        : loginGuestUserHelper({
              slasClient,
              parameters: {
                  redirectURI,
                  ...(options?.usid && { usid: options.usid }),
              },
          }).finally(() => {
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
    const { loginRegisteredUserB2C } = await import('commerce-sdk-isomorphic/helpers');
    const slasClient = await createClient(context).ShopperLogin.getInstance();
    const { redirectURI } = slasClient.clientConfig.parameters;
    const performanceTimer = context.get(performanceTimerContext);
    const appConfig = getConfig(context);
    const isSlasPrivate = appConfig.commerce.api.privateKeyEnabled;
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

    return loginRegisteredUserB2C({
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
            ...(usid && { usid: String(usid) }),
            // Convert TrackingConsent enum to boolean for SLAS API
            ...(trackingConsent !== undefined && { dnt: trackingConsentToBoolean(trackingConsent) }),
            // Include custom parameters if any
            ...(options?.customParameters &&
                Object.keys(options.customParameters).length > 0 && {
                    body: options.customParameters,
                }),
        },
    }).finally(() => {
        performanceTimer?.mark(PERFORMANCE_MARKS.authLoginRegisteredUser, 'end');
    });
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
): Promise<Response> {
    const performanceTimer = context.get(performanceTimerContext);
    performanceTimer?.mark(PERFORMANCE_MARKS.authAuthorizePasswordless, 'start');

    const session = getAuth(context);
    const slasClient = await createClient(context).ShopperLogin.getInstance();
    const userid = parameters.userid;

    const appConfig = getConfig(context);
    const passwordlessCallback = appConfig.site.features.passwordlessLogin.callbackUri;

    const passwordlessLoginCallbackUri = isAbsoluteURL(passwordlessCallback)
        ? passwordlessCallback
        : `${getAppOrigin()}${passwordlessCallback}`;

    const callbackUri = parameters.callbackUri || passwordlessLoginCallbackUri;

    const finalCallbackUri = parameters.redirectPath
        ? `${callbackUri}?redirectUrl=${parameters.redirectPath}`
        : callbackUri;

    const usid = session.usid;
    const mode = finalCallbackUri ? 'callback' : 'sms';

    const { authorizePasswordless: authorizePasswordlessHelper } = await import('commerce-sdk-isomorphic/helpers');
    return authorizePasswordlessHelper({
        slasClient,
        credentials: {
            clientSecret: getSlasClientSecret(),
        },
        parameters: {
            ...(finalCallbackUri && { callbackURI: finalCallbackUri }),
            ...(usid && { usid }),
            userid,
            mode,
        },
    }).finally(() => {
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
): Promise<void> {
    const performanceTimer = context.get(performanceTimerContext);
    performanceTimer?.mark(PERFORMANCE_MARKS.authGetPasswordResetToken, 'start');

    const slasClient = await createClient(context).ShopperLogin.getInstance();
    const appConfig = getConfig(context);
    const resetPasswordCallbackUri = appConfig.site.features.resetPassword.callbackUri;
    const callbackUri = isAbsoluteURL(resetPasswordCallbackUri)
        ? resetPasswordCallbackUri
        : `${getAppOrigin()}${resetPasswordCallbackUri}`;

    const options = {
        headers: {
            Authorization: '',
        },
        body: {
            user_id: parameters.email,
            mode: 'callback',
            channel_id: slasClient.clientConfig.parameters.siteId,
            client_id: slasClient.clientConfig.parameters.clientId,
            callback_uri: callbackUri,
            hint: 'cross_device',
        },
    };

    // Only set authorization header if using private client
    const isSlasPrivate = appConfig.commerce.api.privateKeyEnabled;
    if (isSlasPrivate) {
        const clientId = slasClient.clientConfig.parameters.clientId;
        const clientSecret = getSlasClientSecret();
        const basicAuth = stringToBase64(`${clientId}:${clientSecret}`);
        options.headers.Authorization = `Basic ${basicAuth}`;
    }

    return slasClient.getPasswordResetToken(options).finally(() => {
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
): Promise<void> {
    const performanceTimer = context.get(performanceTimerContext);
    performanceTimer?.mark(PERFORMANCE_MARKS.authResetPasswordWithToken, 'start');

    const slasClient = await createClient(context).ShopperLogin.getInstance();
    const appConfig = getConfig(context);

    const options = {
        headers: {
            Authorization: '',
        },
        body: {
            user_id: parameters.email,
            new_password: parameters.newPassword,
            pwd_action_token: parameters.token,
            channel_id: slasClient.clientConfig.parameters.siteId,
            client_id: slasClient.clientConfig.parameters.clientId,
        },
    };

    // Only set authorization header if using private client
    const isSlasPrivate = appConfig.commerce.api.privateKeyEnabled;
    if (isSlasPrivate) {
        const clientId = slasClient.clientConfig.parameters.clientId;
        const clientSecret = getSlasClientSecret();
        const basicAuth = stringToBase64(`${clientId}:${clientSecret}`);
        options.headers.Authorization = `Basic ${basicAuth}`;
    }

    // Use type assertion to bypass SDK's code_verifier requirement since we're using cross_device hint
    // The SDK type requires code_verifier, but SLAS doesn't need it when using hint: 'cross_device'
    return slasClient
        .resetPassword(options as unknown as Parameters<typeof slasClient.resetPassword>[0])
        .finally(() => {
            performanceTimer?.mark(PERFORMANCE_MARKS.authResetPasswordWithToken, 'end');
        });
}

/**
 * Get passwordless access token using the token from magic link
 * Takes context and creates SLAS client internally, following auth.server.ts patterns
 */
export async function getPasswordLessAccessToken(
    context: Readonly<RouterContextProvider>,
    pwdlessLoginToken: string
): Promise<ShopperLoginTypes.TokenResponse> {
    const { getPasswordLessAccessToken: getPasswordLessAccessTokenHelper } = await import(
        'commerce-sdk-isomorphic/helpers'
    );
    const slasClient = await createClient(context).ShopperLogin.getInstance();
    const performanceTimer = context.get(performanceTimerContext);
    const session = getAuth(context);
    const usid = session.usid;
    performanceTimer?.mark(PERFORMANCE_MARKS.authGetPasswordLessAccessToken, 'start');

    // Get tracking consent from auth context (populated from cookies by middleware)
    // This ensures existing tracking consent preference from guest session propagates to registered user session
    // Only process tracking consent if the feature is enabled in config
    // Note: This helper expects a string dnt parameter (SDK inconsistency)
    let dntString: string | undefined;
    if (isTrackingConsentEnabled(context)) {
        try {
            const authData = getAuth(context);
            // Convert TrackingConsent enum directly to string for this helper
            // TrackingConsent.Accepted = '0', TrackingConsent.Declined = '1'
            dntString = authData.trackingConsent;
        } catch {
            // If getAuth fails (e.g., middleware not initialized), dntString remains undefined
        }
    }

    return getPasswordLessAccessTokenHelper({
        slasClient,
        credentials: {
            clientSecret: getSlasClientSecret(),
        },
        parameters: {
            pwdlessLoginToken,
            ...(usid && { usid: String(usid) }),
            ...(dntString !== undefined && { dnt: dntString }),
        },
    }).finally(() => {
        performanceTimer?.mark(PERFORMANCE_MARKS.authGetPasswordLessAccessToken, 'end');
    });
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

    const accessToken = storage.get('access_token');
    const accessTokenExpiry = storage.get('access_token_expiry');
    const refreshToken = storage.get('refresh_token');
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
    const idpAccessToken = getAuthCookie(COOKIE_IDP_ACCESS_TOKEN);
    const codeVerifier = getAuthCookie(COOKIE_CODE_VERIFIER);
    // Read tracking consent cookie directly as TrackingConsent enum (values match)
    const trackingConsentCookieValue = allCookies[COOKIE_TRACKING_CONSENT] || null;
    let trackingConsent: TrackingConsent | undefined =
        trackingConsentCookieValue === TrackingConsent.Accepted ||
        trackingConsentCookieValue === TrackingConsent.Declined
            ? trackingConsentCookieValue
            : undefined;

    // Create cookie instances for serialization (Set-Cookie headers)
    const refreshTokenGuestCookie = createCookie<string>(COOKIE_REFRESH_TOKEN_GUEST, cookieConfig, context);
    const refreshTokenRegisteredCookie = createCookie<string>(COOKIE_REFRESH_TOKEN_REGISTERED, cookieConfig, context);
    const accessTokenCookie = createCookie<string>(COOKIE_ACCESS_TOKEN, cookieConfig, context);
    const usidCookie = createCookie<string>(COOKIE_USID, cookieConfig, context);
    const customerIdCookie = createCookie<string>(COOKIE_CUSTOMER_ID, cookieConfig, context);
    const idpAccessTokenCookie = createCookie<string>(COOKIE_IDP_ACCESS_TOKEN, cookieConfig, context);
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
    if (refreshToken) authData.refresh_token = refreshToken;
    if (accessToken) {
        authData.access_token = accessToken;
        // Extract claims from JWT (source of truth) - decode once for efficiency
        const claims = getSLASAccessTokenClaims(accessToken);
        if (claims.expiry) authData.access_token_expiry = claims.expiry;

        // Validate tracking consent value from token matches cookie - if they differ, mark cookie for deletion
        // Only validate if tracking consent feature is enabled
        if (isTrackingConsentEnabled(context) && claims.trackingConsent !== null && trackingConsent !== undefined) {
            if (claims.trackingConsent !== trackingConsent) {
                // Tracking consent values differ - mark for deletion by not including trackingConsent in authData
                // This will cause the cookie to be deleted in the response section
                trackingConsent = undefined;
            }
        }
    }
    if (usid) authData.usid = usid;
    if (customerId) authData.customer_id = customerId;
    // Add IDP access token for social login (if present)
    if (idpAccessToken) authData.idp_access_token = idpAccessToken;
    // Add code verifier for OAuth2 PKCE flow (if present)
    if (codeVerifier) authData.codeVerifier = codeVerifier;
    // Add tracking consent value from cookie (if present and valid)
    // Note: trackingConsent may be undefined if it doesn't match token, which will cause cookie deletion
    if (trackingConsent !== undefined) authData.trackingConsent = trackingConsent;
    // Add userType to in-memory storage (NOT written to cookies)
    authData.userType = userType;

    const authStorage = new Map<keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]>(
        Object.entries(authData) as [keyof AuthStorageData, AuthStorageData[keyof AuthStorageData]][]
    );

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
        response.headers.append('Set-Cookie', await idpAccessTokenCookie.serialize('', deleteCookieConfig));
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
        const accessTokenExpiryValue = authStorage.get('access_token_expiry') as number | undefined;
        const refreshTokenExpiryValue = authStorage.get('refresh_token_expiry') as number | undefined;
        const userTypeValue = authStorage.get('userType') as 'guest' | 'registered' | undefined;

        // Set refresh token cookie with refresh token expiry
        // Use correct cookie name based on user type (cc-nx-g for guest, cc-nx for registered)
        //
        // NOTE: userType itself is NOT written to cookies - only the refresh token is written
        // to the appropriate cookie name (cc-nx-g or cc-nx). On next request, userType will
        // be derived from which cookie exists.
        const refreshTokenValue = authStorage.get('refresh_token');
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
        const accessTokenValue = authStorage.get('access_token');
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
        const customerIdValue = authStorage.get('customer_id');
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

        // Set IDP access token cookie with access token expiry (for social login)
        const idpAccessTokenValue = authStorage.get('idp_access_token');
        const idpAccessTokenExpiryValue = authStorage.get('idp_access_token_expiry') as number | undefined;
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
                const requestTrackingConsent = allCookies[COOKIE_TRACKING_CONSENT];
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
    updater: ShopperLoginTypes.TokenResponse | ((data: AuthData & StorageErrorData) => AuthData & StorageErrorData)
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

export default authMiddleware;
