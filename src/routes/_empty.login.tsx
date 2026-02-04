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
import type { ReactElement } from 'react';
import {
    redirect,
    Link,
    useActionData,
    type LoaderFunctionArgs,
    type ActionFunctionArgs,
    // type ClientActionFunctionArgs,
} from 'react-router';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import StandardLoginForm from '@/components/login/standard-login-form';
import PasswordlessLoginForm from '@/components/login/passwordless-login-form';
import { SocialLoginButtons } from '@/components/buttons/social-login-buttons';
import { getAppOrigin, isAbsoluteURL } from '@/lib/utils';
import { getConfig } from '@/config';
import { getTranslation } from '@/lib/i18next';

// services
import { getAuth, authorizePasswordless } from '@/middlewares/auth.server';
// import { updateAuth, getAuth as getClientAuth } from '@/middlewares/auth.client';
// import { updateBasketResource } from '@/middlewares/basket.server';
import { loginRegisteredUser } from '@/lib/api/auth/standard-login';
import { authorizeIDP } from '@/lib/api/auth/social-login';
// import { mergeBasket } from '@/lib/api/basket';

type LoginActionResponse = {
    error?: string;
    redirectUrl?: string;
    auth?: ReturnType<typeof getAuth>;
};

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

// eslint-disable-next-line react-refresh/only-export-components
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
    const error = url.searchParams.get('error');

    // Get runtime config to determine if passwordless login is enabled
    const config = getConfig(context);
    const isSlasPrivate = config.commerce.api.privateKeyEnabled;
    const isPasswordlessLoginEnabled = config.features.passwordlessLogin.enabled && isSlasPrivate;
    const isSocialLoginEnabled = Boolean(config.features.socialLogin?.enabled);
    const mode = url.searchParams.get('mode') || (isPasswordlessLoginEnabled ? 'passwordless' : 'password');

    return {
        error,
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
// eslint-disable-next-line react-refresh/only-export-components
export async function action({ request, context }: ActionFunctionArgs): Promise<LoginActionResponse> {
    const config = getConfig(context);
    const { t } = getTranslation(context);
    const genericError = t('errors:genericTryAgain');

    try {
        const formData = await request.formData();

        const email = formData.get('email')?.toString();
        const password = formData.get('password')?.toString();
        const loginMode = formData.get('loginMode')?.toString();
        const provider = formData.get('provider')?.toString();
        const redirectPath = formData.get('redirectPath')?.toString();
        const isSocialLoginEnabled = Boolean(config.features.socialLogin?.enabled);

        if (loginMode === 'social') {
            // Social login flow
            if (!provider || !isSocialLoginEnabled) {
                return { error: genericError };
            }
            const socialCallback = config.features.socialLogin.callbackUri;
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
                // Redirect to social login provider (auth happens in callback)
                return { redirectUrl: result.redirectUrl };
            }
            // Social login failed - redirect back with generic error
            return { error: genericError };
        } else if (loginMode === 'passwordless') {
            // Passwordless login flow
            if (!email) {
                return { error: genericError };
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
                return { redirectUrl: `/login?${params.toString()}` };
            } catch {
                return { error: genericError };
            }
        } else {
            // Standard password login flow (default case - handles 'password' mode or undefined/null)
            if (!email || !password) {
                return { error: genericError };
            }
            const result = await loginRegisteredUser(context, { email, password });
            if (!result.success) {
                // Return generic error - don't expose specific login failure reasons
                return { error: genericError };
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
                    return { redirectUrl: returnUrlObj.pathname + returnUrlObj.search, auth: getAuth(context) };
                }
                return { redirectUrl: returnUrl, auth: getAuth(context) };
            }

            // No returnUrl - redirect to home
            return { redirectUrl: '/', auth: getAuth(context) };
        }
    } catch {
        return { error: genericError };
    }
}

export default function Login({ loaderData }: { loaderData: LoginLoaderData }): ReactElement {
    const { t } = useTranslation('login');
    const actionData = useActionData<typeof action>();

    const {
        error: loaderError,
        passwordlessSent,
        email,
        mode,
        isPasswordlessLoginEnabled,
        isSocialLoginEnabled,
        returnUrl,
        action: pendingActionName,
        actionParams,
    } = loaderData;

    // Prefer actionData error (from form submission) over loaderData error (from URL params)
    const error = actionData?.error || loaderError || undefined;

    // Show passwordless success state
    if (passwordlessSent && email) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
                            {t('checkEmailTitle')}
                        </h2>
                        <p className="mt-2 text-center text-sm text-muted-foreground">
                            {t('checkEmailDescription', { email })}
                        </p>
                    </div>

                    <Card className="p-8">
                        <div className="space-y-6 text-center">
                            <Link to="/login">
                                <button className="w-full inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring cursor-pointer">
                                    {t('backToLogin')}
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
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">{t('title')}</h2>
                    <p className="mt-2 text-center text-sm text-muted-foreground">{t('subtitle')}</p>
                </div>

                <Card className="p-8">
                    {renderForm()}
                    {isSocialLoginEnabled ? <SocialLoginButtons /> : null}
                </Card>
            </div>
        </div>
    );
}
