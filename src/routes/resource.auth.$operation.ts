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
import type { ActionFunctionArgs, RouterContextProvider } from 'react-router';
import { extractResponseError } from '@/lib/utils';
import {
    refreshAccessToken,
    loginGuestUser,
    loginRegisteredUser,
    updateAuth,
    getAuth,
} from '@/middlewares/auth.server';
import { isTrackingConsentEnabled } from '@/middlewares/auth.utils';
import type { TrackingConsent } from '@/types/tracking-consent';

/**
 * HTTP request body for the refresh-token operation.
 *
 * Contains all fields the client sends when requesting a token refresh.
 * The `refreshAccessToken` function takes these as separate arguments:
 * - `refreshToken` is passed directly as the second parameter
 * - `trackingConsent` is extracted via `Pick<RefreshTokenRequest, 'trackingConsent'>` for the options parameter
 */
interface RefreshTokenRequest {
    refreshToken: string;
    trackingConsent?: TrackingConsent;
}

/**
 * HTTP request body for the login-guest operation.
 *
 * Contains optional fields for guest login. The entire body is passed
 * directly to `loginGuestUser` as the options parameter.
 */
interface LoginGuestRequest {
    usid?: string;
}

/**
 * HTTP request body for the login-registered operation.
 *
 * Contains all fields the client sends when logging in a registered user.
 * The `loginRegisteredUser` function takes these as separate arguments:
 * - `email` and `password` are passed directly as individual parameters
 * - `customParameters` is extracted via `Pick<LoginRegisteredRequest, 'customParameters'>` for the options parameter
 */
interface LoginRegisteredRequest {
    email: string;
    password: string;
    customParameters?: Record<string, unknown>;
}

type AuthHandler = (request: Request, context: Readonly<RouterContextProvider>) => Promise<unknown>;

/**
 * Map of auth operations to their handlers
 */
const authHandlers: Record<string, AuthHandler> = {
    'refresh-token': handleRefreshToken,
    'login-guest': handleLoginGuest,
    'login-registered': handleLoginRegistered,
} as const;

/**
 * Server-side auth resource action that handles individual SLAS operations requiring client secret
 * Supports operations via URL parameter: /resource/auth/login-guest, /resource/auth/refresh-token, etc.
 */
export async function action({ request, params, context }: ActionFunctionArgs) {
    const operation = params.operation as string;
    try {
        const handler = authHandlers[operation];

        if (!handler) {
            return Response.json({
                success: false,
                error: `Unknown auth operation: ${operation}`,
            });
        }

        const result = await handler(request, context);
        const responseData = { success: true, data: result };

        return Response.json(responseData);
    } catch (error) {
        const { responseMessage } = await extractResponseError(error);
        return Response.json({
            success: false,
            error: responseMessage,
        });
    }
}

/**
 * Handle refresh token operation using auth functions
 *
 * IMPORTANT: For public SLAS clients, refresh tokens are single-use. Each refresh
 * returns a new refresh token that must be stored. The updateAuth call with TokenResponse
 * ensures the new refresh token is properly saved via updateAuthStorageDataByTokenResponse.
 */
async function handleRefreshToken(request: Request, context: Readonly<RouterContextProvider>) {
    const body: RefreshTokenRequest = await request.json();

    // Build refresh options, conditionally including tracking consent if the feature is enabled.
    // When the user responds to the tracking consent banner, we pass their preference in the request body.
    // If trackingConsent is not provided, refreshAccessToken reads it from the auth context (populated
    // from cookies) to ensure the refreshed access token maintains the correct tracking consent value.
    // Tracking consent must be passed on each refresh request to prevent the API from defaulting to dnt: '0'.
    const refreshOptions: Pick<RefreshTokenRequest, 'trackingConsent'> = {};
    if (isTrackingConsentEnabled(context) && body.trackingConsent !== undefined) {
        refreshOptions.trackingConsent = body.trackingConsent;
    }

    const tokenResponse = await refreshAccessToken(context, body.refreshToken, refreshOptions);

    // Get userType from current auth data before updateAuth clears it
    // userType is required for refresh token cookie to be written (determines which cookie name to use)
    const currentAuth = getAuth(context);
    const userType: 'guest' | 'registered' = currentAuth.userType || 'guest';

    // Update the auth context with the new token response
    // This ensures refresh token is updated (critical for public clients where refresh tokens are single-use)
    updateAuth(context, tokenResponse);

    // Restore userType (required for refresh token cookie to be written)
    // userType is cleared by updateAuthStorageData but must be preserved for cookie writing logic
    // Also update tracking consent if it was provided in the request (reuse refreshOptions to avoid redundant checks)
    updateAuth(context, (session) => ({
        ...session,
        userType,
        ...(refreshOptions.trackingConsent !== undefined && { trackingConsent: refreshOptions.trackingConsent }),
    }));

    return tokenResponse;
}

/**
 * Handle guest login operation using auth functions
 */
async function handleLoginGuest(request: Request, context: Readonly<RouterContextProvider>) {
    const body: LoginGuestRequest = await request.json();

    const tokenResponse = await loginGuestUser(context, {
        usid: body.usid,
    });

    // Update the auth context with the new token response
    updateAuth(context, tokenResponse);
    updateAuth(context, (session) => ({
        ...session,
        userType: 'guest',
    }));

    return tokenResponse;
}

/**
 * Handle registered user login operation using auth functions
 */
async function handleLoginRegistered(request: Request, context: Readonly<RouterContextProvider>) {
    const body: LoginRegisteredRequest = await request.json();

    const tokenResponse = await loginRegisteredUser(context, body.email, body.password, {
        customParameters: body.customParameters,
    });

    // Update the auth context with the new token response
    // updateAuthStorageData automatically preserves DNT from cookie (source of truth)
    updateAuth(context, tokenResponse);

    // Restore userType (required for refresh token cookie to be written)
    // userType is cleared by updateAuthStorageData but must be preserved for cookie writing logic
    // DNT is automatically preserved by updateAuthStorageData from cookie
    updateAuth(context, (session) => ({
        ...session,
        userType: 'registered',
    }));

    return tokenResponse;
}
