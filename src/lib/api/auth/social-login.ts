import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { flashAuth, getAuth, updateAuth } from '@/middlewares/auth.server';
import { isTrackingConsentEnabled } from '@/middlewares/auth.utils';
import { extractResponseError, getAppOrigin } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { getConfig } from '@/config';
import { mergeBasket } from '@/lib/api/basket';
import { getTranslation } from '@/lib/i18next';
import { trackingConsentToBoolean } from '@/types/tracking-consent';

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
        const config = getConfig(context);
        const session = getAuth(context);
        const clients = createApiClients(context);

        // SLAS will redirect to this URL after processing the social login
        const redirectUri = parameters.redirectURI || `${getAppOrigin()}${config.commerce.api.callback}`;
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
        const { responseMessage } = await extractResponseError(error);

        flashAuth(context, responseMessage);

        return {
            success: false,
            error: responseMessage,
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

        const res = await clients.auth.social.exchangeCode({
            code,
            codeVerifier,
            redirectUri: parameters.redirectURI,
            ...(usid && { usid: String(usid) }),
            ...(dnt !== undefined && { dnt }),
        });

        // Update session with user tokens and info (similar to standard login)
        updateAuth(context, res);
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
        const { responseMessage } = await extractResponseError(error);

        flashAuth(context, responseMessage);

        return {
            success: false,
            error: responseMessage,
        };
    }
};

export async function handleSocialLoginLanding({ request, context }: LoaderFunctionArgs): Promise<Response> {
    const { t } = getTranslation(context);

    try {
        const config = getConfig(context);
        const url = new URL(request.url);

        // SLAS may send different parameter names than direct OAuth
        const code = url.searchParams.get('code');
        const error = url.searchParams.get('error');
        const usid = url.searchParams.get('usid');
        const redirectUrl = url.searchParams.get('redirectUrl');

        // Handle error from social provider
        if (error) {
            // eslint-disable-next-line no-console
            console.error('[Social Login] Failed to login:', t('socialCallback:socialError'), error);
            flashAuth(context, t('socialCallback:socialError'));
            return redirect('/login');
        }

        // Handle successful authorization with code
        if (code) {
            const result = await loginIDPUser(context, {
                code,
                usid: usid || undefined,
                redirectURI: `${url.origin}${config.site.features.socialLogin.callbackUri}`,
            });

            if (result.success) {
                // Login successful - merge basket on server before redirecting
                try {
                    await mergeBasket(context);
                } catch (err) {
                    // Log but don't block redirect - user can still access their registered basket
                    // eslint-disable-next-line no-console
                    console.error('[Social Login] Failed to merge basket:', err);
                }

                // Redirect to redirectURL if provided, otherwise redirect to home
                const redirectTo = redirectUrl ? decodeURIComponent(redirectUrl) : '/';
                return redirect(redirectTo);
            }
        }

        // Login failed redirect to login as fallback
        return redirect('/login');
    } catch (error) {
        // Handle any errors during processing
        const { responseMessage } = await extractResponseError(error);

        // Use existing flashAuth pattern for error handling
        flashAuth(context, responseMessage);
        return redirect('/login');
    }
}
