import { type ActionFunctionArgs, type LoaderFunctionArgs, redirect, type RouterContextProvider } from 'react-router';
import { getAppOrigin, getErrorMessage } from '@/lib/utils';
import { getConfig } from '@/config';
import { getPasswordLessAccessToken, updateAuth } from '@/middlewares/auth.server';
import { mergeBasket } from '@/lib/api/basket';
import {
    resetMarketingCloudTokenCache,
    sendMarketingCloudEmail,
    validateSlasCallbackToken,
} from '@/lib/marketing-cloud';
import { getTranslation } from '@/lib/i18next';

// Re-export for backwards compatibility with tests
export { resetMarketingCloudTokenCache };

/**
 * Sends a magic link email for passwordless login
 */
async function sendMagicLinkEmail(
    context: Readonly<RouterContextProvider>,
    email_id: string,
    token: string,
    redirectUrl?: string
): Promise<object> {
    const base = getAppOrigin();

    // Get the configured landing path from app config
    const config = getConfig(context);
    const landingPath = config.site.features.passwordlessLogin.landingUri;
    let magicLink = `${base}${landingPath}?token=${encodeURIComponent(token)}`;

    if (redirectUrl) {
        magicLink += `&redirectUrl=${encodeURIComponent(redirectUrl)}`;
    }

    // Get the template ID from environment variable
    const templateId = process.env.MARKETING_CLOUD_PASSWORDLESS_LOGIN_TEMPLATE;
    if (!templateId) {
        throw new Error('MARKETING_CLOUD_PASSWORDLESS_LOGIN_TEMPLATE is not set in the environment variables.');
    }

    return await sendMarketingCloudEmail(email_id, magicLink, templateId);
}

/**
 * Handles passwordless login callback action
 * Processes SLAS callback token and sends magic link email
 */
export async function handlePasswordlessCallback({ request, context }: ActionFunctionArgs) {
    const { t } = getTranslation(context);

    try {
        // Extract SLAS callback token from headers
        const slasCallbackToken = request.headers.get('x-slas-callback-token');

        if (!slasCallbackToken) {
            return {
                success: false,
                error: t('errors:passwordless.missingCallbackToken'),
            };
        }

        const url = new URL(request.url);
        const redirectUrl = url.searchParams.get('redirectUrl') || undefined;

        await validateSlasCallbackToken(context, slasCallbackToken);

        // Parse request body to get email and token
        const { email_id, token } = await request.json();
        if (!email_id || !token) {
            return {
                success: false,
                error: t('errors:passwordless.missingRequiredFields'),
            };
        }

        // Send magic link email
        const result = await sendMagicLinkEmail(context, email_id, token, redirectUrl);

        return {
            success: true,
            data: result,
        };
    } catch (error) {
        return {
            success: false,
            error: getErrorMessage(error),
        };
    }
}

/**
 * Handles passwordless login landing page
 * Processes magic link token and authenticates user
 */
export async function handlePasswordlessLanding({ request, context }: LoaderFunctionArgs) {
    const { t } = getTranslation(context);

    try {
        const url = new URL(request.url);
        const token = url.searchParams.get('token');
        const redirectUrl = url.searchParams.get('redirectUrl');

        if (!token) {
            const errorMessage = t('errors:passwordless.missingToken');
            return redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
        }

        const tokenResponse = await getPasswordLessAccessToken(context, decodeURIComponent(token));

        // Update session with auth data using updateAuth (similar to standard login)
        updateAuth(context, tokenResponse);
        updateAuth(context, (session) => ({
            ...session,
            userType: 'registered',
        }));

        // Merge basket after authentication (server-side for passwordless callback)
        // Note: Unlike standard login which uses clientAction to merge on the client, we do the
        // merge on the server here because this is a callback route designed to authenticate and
        // redirect immediately. Adding clientLoader/clientAction would require returning data
        // instead of redirect(), which complicates the route unnecessarily. Server-side merge
        // keeps this callback route simple and focused on its purpose.
        try {
            await mergeBasket(context);
        } catch (error) {
            // Log but don't block redirect - user can still access their registered basket
            // eslint-disable-next-line no-console
            console.error('[Passwordless Login] Failed to merge basket:', error);
        }

        const redirectTo = redirectUrl ? decodeURIComponent(redirectUrl) : '/account';
        return redirect(redirectTo);
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Passwordless Login] Error during login:', error);
        const errorMessage = t('errors:genericTryAgain');
        return redirect(`/login?error=${encodeURIComponent(errorMessage)}`);
    }
}
