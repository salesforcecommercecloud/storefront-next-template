import type { ReactElement } from 'react';
import {
    redirect,
    Link,
    type LoaderFunctionArgs,
    type ActionFunctionArgs,
    type ClientActionFunctionArgs,
} from 'react-router';
import { Card } from '@/components/ui/card';
import uiStrings from '@/temp-ui-string';
import StandardLoginForm from '@/components/login/standard-login-form';
import PasswordlessLoginForm from '@/components/login/passwordless-login-form';
import { SocialLoginButtons } from '@/components/buttons/social-login-buttons';
import { getAppOrigin, extractResponseError, isAbsoluteURL } from '@/lib/utils';
import { getConfig } from '@/config';

// services
import { getAuth, authorizePasswordless, flashAuth } from '@/middlewares/auth.server';
import { updateAuth, getAuth as getClientAuth } from '@/middlewares/auth.client';
import { updateBasket } from '@/middlewares/basket.client';
import { loginRegisteredUser } from '@/lib/api/auth/standard-login';
import { authorizeIDP } from '@/lib/api/auth/social-login';
import { mergeBasket } from '@/lib/api/basket';

type LoginLoaderData = {
    error?: string;
    passwordlessSent?: boolean;
    email?: string;
    mode: string;
    isPasswordlessLoginEnabled: boolean;
    isSocialLoginEnabled: boolean;
    returnUrl?: string | null;
    action?: string | null;
    actionParams?: string | null;
};

// eslint-disable-next-line react-refresh/only-export-components,custom/no-universal-loaders
export function loader({ request, context }: LoaderFunctionArgs) {
    const session = getAuth(context);
    const url = new URL(request.url);
    const returnUrl = url.searchParams.get('returnUrl');

    // If user is already logged in as registered user, redirect to returnUrl or home
    const { access_token, access_token_expiry, userType, customer_id } = session;
    if (
        access_token &&
        typeof access_token_expiry === 'number' &&
        access_token_expiry >= Date.now() &&
        userType === 'registered' &&
        customer_id
    ) {
        return redirect(returnUrl || '/');
    }

    const passwordlessSent = url.searchParams.get('passwordless') === 'sent';
    const email = url.searchParams.get('email');
    const pendingAction = url.searchParams.get('action');
    const actionParams = url.searchParams.get('actionParams');

    // Get runtime config to determine if passwordless login is enabled
    const config = getConfig(context);
    const isSlasPrivate = config.commerce.api.privateKeyEnabled;
    const isPasswordlessLoginEnabled = config.site.features.passwordlessLogin.enabled && isSlasPrivate;
    const isSocialLoginEnabled = Boolean(config.site.features.socialLogin?.enabled);
    const mode = url.searchParams.get('mode') || (isPasswordlessLoginEnabled ? 'passwordless' : 'password');

    return {
        error: session.error,
        passwordlessSent,
        email,
        mode,
        isPasswordlessLoginEnabled,
        isSocialLoginEnabled,
        returnUrl,
        action: pendingAction,
        actionParams,
    };
}

/**
 * This server action is required for authentication, because login must be handled server-side for security reasons,
 * and proper integration with session management and Salesforce Commerce Cloud's authentication system. It operates
 * together with the client action to ensure a smooth login process.
 */
// eslint-disable-next-line react-refresh/only-export-components, custom/no-server-actions
export async function action({ request, context }: ActionFunctionArgs): Promise<[string, ReturnType<typeof getAuth>]> {
    const config = getConfig(context);
    const resolve = (target: string): [string, ReturnType<typeof getAuth>] => [target, getAuth(context)];

    // Helper function to build login redirect with preserved params
    // IMPORTANT: On POST requests, query params are not in request.url, so we need to read from formData
    // Defined outside try block so it's accessible in catch block
    const buildLoginRedirect = (mode: string, formData?: FormData, additionalParams?: Record<string, string>) => {
        const url = new URL(request.url);

        // Try to get params from formData first (POST request), then fall back to URL query params (GET request)
        const returnUrl = formData?.get('returnUrl')?.toString() || url.searchParams.get('returnUrl');
        const pendingAction = formData?.get('action')?.toString() || url.searchParams.get('action');
        const actionParams = formData?.get('actionParams')?.toString() || url.searchParams.get('actionParams');

        const params = new URLSearchParams();
        params.set('mode', mode);
        if (returnUrl) {
            params.set('returnUrl', returnUrl);
        }
        if (pendingAction) {
            params.set('action', pendingAction);
        }
        if (actionParams) {
            params.set('actionParams', actionParams);
        }
        if (additionalParams) {
            Object.entries(additionalParams).forEach(([key, value]) => {
                params.set(key, value);
            });
        }

        return `/login?${params.toString()}`;
    };

    // Store formData outside try block so it's accessible in catch block
    // Request body can only be read once, so we need to store it
    let formData: FormData | null = null;
    try {
        formData = await request.formData();

        const email = formData.get('email')?.toString();
        const password = formData.get('password')?.toString();
        const loginMode = formData.get('loginMode')?.toString();
        const provider = formData.get('provider')?.toString();
        const redirectPath = formData.get('redirectPath')?.toString();
        const isSocialLoginEnabled = Boolean(config.site.features.socialLogin?.enabled);

        if (loginMode === 'social') {
            // Social login flow
            if (!provider || !isSocialLoginEnabled) {
                return resolve(buildLoginRedirect('password', formData));
            }
            const socialCallback = config.site.features.socialLogin.callbackUri;
            const socialLoginRedirectURI = isAbsoluteURL(socialCallback)
                ? socialCallback
                : `${getAppOrigin()}${socialCallback}`;
            const finalRedirectURI = redirectPath
                ? `${socialLoginRedirectURI}?redirectUrl=${redirectPath}`
                : socialLoginRedirectURI;
            const result = await authorizeIDP(context, {
                hint: provider,
                redirectURI: finalRedirectURI,
            });
            if (result.success && result.redirectUrl) {
                // Redirect to social login provider
                return resolve(result.redirectUrl);
            }
            // Social login failed - redirect back with error, preserving params
            return resolve(buildLoginRedirect('password', formData));
        } else if (loginMode === 'passwordless') {
            // Passwordless login flow
            if (!email) {
                return resolve(buildLoginRedirect('passwordless', formData));
            }

            // Build redirectPath from returnUrl, action, and actionParams for passwordless flow
            const url = new URL(request.url);
            const returnUrl = url.searchParams.get('returnUrl');
            const pendingAction = url.searchParams.get('action');
            const actionParams = url.searchParams.get('actionParams');

            // Construct redirectPath with all params encoded
            let finalRedirectPath = redirectPath || returnUrl || '/';
            if (returnUrl && (pendingAction || actionParams)) {
                const redirectParams = new URLSearchParams();
                if (pendingAction) {
                    redirectParams.set('action', pendingAction);
                }
                if (actionParams) {
                    redirectParams.set('actionParams', actionParams);
                }
                const queryString = redirectParams.toString();
                finalRedirectPath = queryString ? `${returnUrl}?${queryString}` : returnUrl;
            }

            try {
                await authorizePasswordless(context, { userid: email, redirectPath: finalRedirectPath });
                // Passwordless authorization sent - redirect to success page, preserving returnUrl/action
                const params = new URLSearchParams();
                params.set('passwordless', 'sent');
                params.set('email', email);
                if (returnUrl) {
                    params.set('returnUrl', returnUrl);
                }
                if (pendingAction) {
                    params.set('action', pendingAction);
                }
                if (actionParams) {
                    params.set('actionParams', actionParams);
                }
                return resolve(`/login?${params.toString()}`);
            } catch (error) {
                const { responseMessage } = await extractResponseError(error);
                flashAuth(context, responseMessage);
                return resolve(buildLoginRedirect('passwordless', formData));
            }
        } else {
            // Standard password login flow (default case - handles 'password' mode or undefined/null)
            if (!email || !password) {
                return resolve(buildLoginRedirect('password', formData));
            }
            const result = await loginRegisteredUser(context, { email, password });
            if (!result.success) {
                // Return error redirect immediately, preserving all params
                return resolve(buildLoginRedirect('password', formData));
            }

            // Login successful - redirect to returnUrl if provided, otherwise home
            // Try to get returnUrl from formData first (in case it was submitted as hidden input)
            // Otherwise fall back to URL query params
            const returnUrlFromForm = formData.get('returnUrl')?.toString()?.trim();
            const returnUrlFromUrl = new URL(request.url).searchParams.get('returnUrl');
            const returnUrl = returnUrlFromForm || returnUrlFromUrl;

            // Get action and actionParams to preserve in redirect URL
            const actionFromForm = formData.get('action')?.toString();
            const actionParamsFromForm = formData.get('actionParams')?.toString();
            const actionFromUrl = new URL(request.url).searchParams.get('action');
            const actionParamsFromUrl = new URL(request.url).searchParams.get('actionParams');
            const pendingAction = actionFromForm || actionFromUrl;
            const actionParams = actionParamsFromForm || actionParamsFromUrl;

            // Build final redirect URL with returnUrl and preserved action params
            if (returnUrl) {
                // If we have action/actionParams, append them to returnUrl
                if (pendingAction || actionParams) {
                    const returnUrlObj = new URL(returnUrl, getAppOrigin());
                    if (pendingAction) {
                        returnUrlObj.searchParams.set('action', pendingAction);
                    }
                    if (actionParams) {
                        returnUrlObj.searchParams.set('actionParams', actionParams);
                    }
                    // Return relative path with query params
                    return resolve(returnUrlObj.pathname + returnUrlObj.search);
                }
                return resolve(returnUrl);
            }

            // No returnUrl - redirect to home
            return resolve('/');
        }
    } catch {
        // Unexpected error - redirect back to login, preserving params if possible
        // Use formData from outer scope if available, otherwise fall back to URL params only
        return resolve(buildLoginRedirect('password', formData || undefined));
    }
}

/**
 * This client action operates together with the server action to ensure a smooth login process. It ensures that the
 * session gets updated on both server and client side, and that the user is redirected to the correct route afterward.
 * Also handles basket merge when transitioning from guest to registered user.
 */
// eslint-disable-next-line react-refresh/only-export-components
export async function clientAction({ context, serverAction }: ClientActionFunctionArgs) {
    const prevAuth = getClientAuth(context);

    const [target, session] = await serverAction<[string, ReturnType<typeof getAuth>]>();

    updateAuth(context, () => session);

    // Merge basket if transitioning from guest to registered user
    if (prevAuth.userType === 'guest' && session.userType === 'registered') {
        try {
            const mergedBasket = await mergeBasket(context);
            updateBasket(context, mergedBasket);
        } catch (error) {
            // Log but don't block redirect - user can still access their registered basket
            // eslint-disable-next-line no-console
            console.error('[Standard Login] Failed to merge basket:', error);
        }
    }

    // If target is an absolute URL (e.g., OAuth authorize endpoint), use full-page navigation
    // This is necessary for external redirects like social login flows
    if (typeof window !== 'undefined' && /^https?:\/\//.test(target)) {
        window.location.assign(target);
        return null;
    }

    // Otherwise, use React Router redirect for internal paths
    return redirect(target);
}

clientAction.hydrate = true as const;

export default function Login({ loaderData }: { loaderData: LoginLoaderData }): ReactElement {
    const {
        error,
        passwordlessSent,
        email,
        mode,
        isPasswordlessLoginEnabled,
        isSocialLoginEnabled,
        returnUrl,
        action: pendingActionName,
        actionParams,
    } = loaderData;

    // Show passwordless success state
    if (passwordlessSent && email) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
                            {uiStrings.login.checkEmailTitle}
                        </h2>
                        <p className="mt-2 text-center text-sm text-muted-foreground">
                            {uiStrings.login.checkEmailDescription.replace('{email}', email)}
                        </p>
                    </div>

                    <Card className="p-8">
                        <div className="space-y-6 text-center">
                            <Link to="/login">
                                <button className="w-full inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring cursor-pointer">
                                    {uiStrings.login.backToLogin}
                                </button>
                            </Link>
                        </div>
                    </Card>
                </div>
            </div>
        );
    }

    // Decide which form to render based on mode
    const renderForm = () => {
        if (mode === 'passwordless') {
            return <PasswordlessLoginForm error={error} isPasswordlessEnabled={isPasswordlessLoginEnabled} />;
        }
        return (
            <StandardLoginForm
                error={error}
                isPasswordlessEnabled={isPasswordlessLoginEnabled}
                returnUrl={returnUrl}
                action={pendingActionName}
                actionParams={actionParams}
            />
        );
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
                        {uiStrings.login.title}
                    </h2>
                    <p className="mt-2 text-center text-sm text-muted-foreground">{uiStrings.login.subtitle}</p>
                </div>

                <Card className="p-8">
                    {renderForm()}
                    {isSocialLoginEnabled ? <SocialLoginButtons /> : null}
                </Card>
            </div>
        </div>
    );
}
