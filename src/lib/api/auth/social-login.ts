import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import {
    authorizeIDP as authorizeIDPHelper,
    loginIDPUser as loginIDPUserHelper,
} from 'commerce-sdk-isomorphic/helpers';
import { flashAuth, getAuth, updateAuth } from '@/middlewares/auth.server';
import { extractResponseError } from '@/lib/utils';
import uiStrings from '@/temp-ui-string';
import createClient from '@/lib/scapi';
import { getConfig } from '@/config';
import { mergeBasket } from '@/lib/api/basket';

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
        const slasClient = await createClient(context).ShopperLogin.getInstance();
        // SLAS will redirect to this URL after processing the social login
        const redirectURI = parameters.redirectURI || slasClient.clientConfig.parameters.redirectURI;
        const usid = parameters.usid || session.usid;

        const { url, codeVerifier } = await authorizeIDPHelper({
            slasClient,
            parameters: {
                redirectURI,
                hint: parameters.hint || '',
                ...(usid && { usid }),
            },
            privateClient: config.commerce.api.privateKeyEnabled,
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
    try {
        const session = getAuth(context);
        const slasClient = await createClient(context).ShopperLogin.getInstance();
        const codeVerifier = session.codeVerifier;
        const code = parameters.code;
        const usid = parameters.usid || session.usid;
        const config = getConfig(context);
        const isSlasPrivate = config.commerce.api.privateKeyEnabled;

        if (!codeVerifier) {
            throw new Error(uiStrings.errors.codeVerifierMissing);
        }

        const res = await loginIDPUserHelper({
            slasClient,
            credentials: {
                codeVerifier,
                ...(isSlasPrivate && {
                    clientSecret: process.env.COMMERCE_API_SLAS_SECRET,
                }),
            },
            parameters: {
                redirectURI: parameters.redirectURI,
                code,
                ...(usid && { usid: String(usid) }),
            },
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
            console.error('[Social Login] Failed to login:', uiStrings.socialCallback.socialError, error);
            flashAuth(context, uiStrings.socialCallback.socialError);
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
