import { type LoaderFunctionArgs, type ActionFunctionArgs, type RouterContextProvider } from 'react-router';
import { getConfig } from '@/config';
import { handlePasswordlessCallback, handlePasswordlessLanding } from '@/lib/passwordless-login';
import { handleSocialLoginLanding } from '@/lib/api/auth/social-login';
import { handleResetPasswordCallback, handleResetPasswordLanding } from '@/lib/api/auth/reset-password';

type LoaderHandler = (args: LoaderFunctionArgs) => Promise<Response>;
type ActionHandler = (args: ActionFunctionArgs) => Promise<Record<string, unknown>>;

/**
 * Catch-all route that handles configurable authentication routes
 */

/**
 * Get the loader handler for a given pathname
 */
function getLoaderHandler(pathname: string, context: Readonly<RouterContextProvider>): LoaderHandler | null {
    const config = getConfig(context);

    if (pathname === config.site.features.passwordlessLogin.landingUri) {
        return handlePasswordlessLanding;
    }

    if (pathname === config.site.features.resetPassword.landingUri) {
        return handleResetPasswordLanding;
    }

    if (config.site.features.socialLogin.enabled && pathname === config.site.features.socialLogin.callbackUri) {
        return handleSocialLoginLanding;
    }

    return null;
}

/**
 * Get the action handler for a given pathname
 */
function getActionHandler(pathname: string, context: Readonly<RouterContextProvider>): ActionHandler | null {
    const config = getConfig(context);

    if (pathname === config.site.features.passwordlessLogin.callbackUri) {
        return handlePasswordlessCallback;
    }

    if (pathname === config.site.features.resetPassword.callbackUri) {
        return handleResetPasswordCallback;
    }

    return null;
}

// eslint-disable-next-line custom/no-async-page-loader
export async function loader(args: LoaderFunctionArgs) {
    const url = new URL(args.request.url);
    const handler = getLoaderHandler(url.pathname, args.context);

    if (handler) {
        return handler(args);
    }

    // If no match, throw a 404
    throw new Response('Not Found', { status: 404 });
}

export async function action(args: ActionFunctionArgs) {
    const url = new URL(args.request.url);
    const handler = getActionHandler(url.pathname, args.context);

    if (handler) {
        return handler(args);
    }

    // If no match, throw a 405 Method Not Allowed
    throw new Response('Method Not Allowed', { status: 405 });
}
