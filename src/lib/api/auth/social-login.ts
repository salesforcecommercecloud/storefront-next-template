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
import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { getAuth, updateAuth } from '@/middlewares/auth.server';
import { isTrackingConsentEnabled } from '@/middlewares/auth.utils';
import { getAppOrigin, getErrorMessage, isAbsoluteURL } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { mergeBasket } from '@/lib/api/basket';
import { getTranslation } from '@/lib/i18next';
import { trackingConsentToBoolean } from '@/types/tracking-consent';
import { getLogger } from '@/lib/logger';

export interface AuthorizeIDPParams {
    hint: string;
    redirectURI?: string;
    usid?: string;
    redirectPath?: string;
}

export interface LoginIDPUserParams {
    code: string;
    redirectURI: string;
    usid?: string;
}

export const authorizeIDP = async (
    context: ActionFunctionArgs['context'],
    parameters: AuthorizeIDPParams
): Promise<{
    success: boolean;
    error?: string;
    redirectUrl?: string;
}> => {
    try {
        const config = getConfig<AppConfig>(context);
        const session = getAuth(context);
        const clients = createApiClients(context);

        // SLAS will redirect to this URL after processing the social login
        // Use absolute URL if provided, otherwise construct from app origin
        const callbackUri = config.commerce.api.callback;
        const redirectUri =
            parameters.redirectURI ||
            (callbackUri && isAbsoluteURL(callbackUri) ? callbackUri : `${getAppOrigin()}${callbackUri || ''}`);
        const usid = parameters.usid || session.usid;

        const { url, codeVerifier } = await clients.auth.social.getAuthorizationUrl({
            hint: parameters.hint || '',
            redirectUri,
            ...(usid && { usid }),
        });

        // Store the code verifier in the session for later use
        updateAuth(context, (current) => ({
            ...current,
            codeVerifier,
        }));

        return {
            success: true,
            redirectUrl: url,
        };
    } catch (error) {
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
};

export const loginIDPUser = async (
    context: ActionFunctionArgs['context'],
    parameters: LoginIDPUserParams
): Promise<{
    success: boolean;
    error?: string;
}> => {
    const { t } = getTranslation(context);

    try {
        const session = getAuth(context);
        const clients = createApiClients(context);
        const codeVerifier = session.codeVerifier;
        const code = parameters.code;
        const usid = parameters.usid || session.usid;

        if (!codeVerifier) {
            throw new Error(t('errors:codeVerifierMissing'));
        }

        // Get tracking consent from auth context (populated from cookies by middleware)
        // This ensures existing tracking preference from guest session propagates to registered user session
        // Only process tracking consent if the feature is enabled in config
        // SessionData.trackingConsent uses the TrackingConsent enum, convert to boolean for SLAS API
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

        // SDK automatically extracts dwsid from Set-Cookie header
        const result = await clients.auth.social.exchangeCode({
            code,
            codeVerifier,
            redirectUri: parameters.redirectURI,
            ...(usid && { usid: String(usid) }),
            ...(dnt !== undefined && { dnt }),
        });

        // Update session with user tokens and info (similar to standard login)
        // result already includes dwsid extracted from response headers by SDK
        updateAuth(context, result);
        updateAuth(context, (current) => {
            // Delete the code verifier once the user has logged in
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { codeVerifier: _, ...rest } = current;
            return {
                ...rest,
                userType: 'registered',
            };
        });

        return {
            success: true,
        };
    } catch (error) {
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
};

export async function handleSocialLoginLanding({ request, context }: LoaderFunctionArgs): Promise<Response> {
    const logger = getLogger(context);
    const { t } = getTranslation(context);

    try {
        const config = getConfig<AppConfig>(context);
        const url = new URL(request.url);

        // SLAS may send different parameter names than direct OAuth
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const usid = url.searchParams.get('usid');
        const redirectUrl = url.searchParams.get('redirectUrl');

        // Handle error from social provider
        if (error) {
            logger.error('Failed to login', { reason: t('socialCallback:socialError'), error });
            const errorMessage = t('socialCallback:socialError');
            return redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
        }

        // Handle successful authorization with code
        if (code) {
            // Construct redirect URI - use absolute URL if provided, otherwise build from app origin
            const callbackUri = config.features.socialLogin.callbackUri;
            const redirectURI = isAbsoluteURL(callbackUri) ? callbackUri : `${getAppOrigin()}${callbackUri}`;

            const result = await loginIDPUser(context, {
                code,
                usid: usid || undefined,
                redirectURI,
            });

            if (result.success) {
                // Login successful - merge basket on server before redirecting
                try {
                    await mergeBasket(context);
                } catch (err) {
                    logger.error('Failed to merge basket', { error: err });
                }

                // Redirect to redirectURL if provided, otherwise redirect to home
                const redirectTo = redirectUrl ? decodeURIComponent(redirectUrl) : '/';
                return redirect(redirectTo);
            } else {
                logger.error('Error during login', { error: result.error });
                const errorMessage = t('errors:genericTryAgain');
                return redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
            }
        } else {
            logger.error('Error during login', { error: 'Missing Auth code.' });
            const errorMessage = t('errors:genericTryAgain');
            return redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
        }
    } catch (error) {
        logger.error('Error during login', { error });
        const errorMessage = t('errors:genericTryAgain');
        return redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
    }
}
