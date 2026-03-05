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
import { type ReactElement } from 'react';
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
import OtpModal from '@/components/login/otp-modal';
import { SocialLoginButtons } from '@/components/buttons/social-login-buttons';
import { getAppOrigin, isAbsoluteURL } from '@/lib/utils';
import { getConfig } from '@/config';
import { getTranslation } from '@/lib/i18next';

// services
import {
    getAuth,
    authorizePasswordless,
    getPasswordLessAccessToken,
    updateAuth as updateAuthServer,
} from '@/middlewares/auth.server';
import { loginRegisteredUser } from '@/lib/api/auth/standard-login';
import { authorizeIDP } from '@/lib/api/auth/social-login';
import { mergeBasket } from '@/lib/api/basket';
import { getPasswordlessErrorMessageKey, extractErrorMessage } from '@/lib/auth-error-handler';

type LoginActionResponse = {
    success: boolean;
    error?: string;
    redirectUrl?: string;
    auth?: ReturnType<typeof getAuth>;
    showOTPForm?: boolean;
    email?: string;
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
    showOTPForm?: boolean;
    otpLength?: number;
};

// eslint-disable-next-line react-refresh/only-export-components
export async function loader({ request, context }: LoaderFunctionArgs) {
    const session = getAuth(context);
    const url = new URL(request.url);
    const returnUrl = url.searchParams.get('returnUrl');

    // If user is already logged in as registered user, redirect to returnUrl or home
    const { accessToken, accessTokenExpiry, userType, customerId } = session;
    if (
        accessToken &&
        typeof accessTokenExpiry === 'number' &&
        accessTokenExpiry >= Date.now() &&
        userType === 'registered' &&
        customerId
    ) {
        return redirect(returnUrl || '/');
    }

    const passwordlessSent = url.searchParams.get('passwordless') === 'sent';
    const showOTPForm = url.searchParams.get('otp') === 'true';
    const email = url.searchParams.get('email');

    const tokenFromUrl = url.searchParams.get('token');
    const legacyOtpCode = url.searchParams.get('otpCode');
    const token = tokenFromUrl ?? legacyOtpCode;
    const pendingAction = url.searchParams.get('action');
    const actionParams = url.searchParams.get('actionParams');
    const error = url.searchParams.get('error');

    // Get runtime config to determine if passwordless login is enabled
    const config = getConfig(context);
    const isSlasPrivate = config.commerce.api.privateKeyEnabled;
    const isPasswordlessLoginEnabled = config.features.passwordlessLogin.enabled && isSlasPrivate;
    const isSocialLoginEnabled = Boolean(config.features.socialLogin?.enabled);
    const mode = url.searchParams.get('mode') || (isPasswordlessLoginEnabled ? 'passwordless' : 'password');

    // Auto-verify OTP token if both email and token are provided in URL
    if (email && token) {
        try {
            const tokenResponse = await getPasswordLessAccessToken(context, token);

            // Update session with auth data
            updateAuthServer(context, tokenResponse);
            updateAuthServer(context, (prevSession) => ({
                ...prevSession,
                userType: 'registered',
            }));

            // Merge guest basket with registered user basket
            try {
                await mergeBasket(context);
            } catch (basketError) {
                // eslint-disable-next-line no-console
                console.error('Failed to merge basket during passwordless login:', basketError);
                // Continue with login even if basket merge fails
            }

            return redirect(returnUrl || '/');
        } catch (verifyError) {
            // Auto-verification failed - show error with OTP form
            const errorMessage = extractErrorMessage(verifyError);
            const errorKey = getPasswordlessErrorMessageKey(errorMessage);
            const { t } = getTranslation(context);

            return {
                error: t(errorKey),
                showOTPForm: true,
                email,
                mode,
                isPasswordlessLoginEnabled,
                isSocialLoginEnabled,
                returnUrl,
                action: pendingAction,
                actionParams,
                otpLength: config.auth.otpLength,
            };
        }
    }

    return {
        error,
        passwordlessSent,
        showOTPForm,
        email,
        mode,
        isPasswordlessLoginEnabled,
        isSocialLoginEnabled,
        returnUrl,
        action: pendingAction,
        actionParams,
        otpLength: config.auth.otpLength,
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
                return { success: false, error: genericError };
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
                return { success: true, redirectUrl: result.redirectUrl };
            }
            // Social login failed - redirect back with generic error
            return { success: false, error: genericError };
        } else if (loginMode === 'passwordless') {
            // Passwordless login flow
            if (!email) {
                return { success: false, error: genericError };
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
                // Passwordless authorization sent - redirect to login page with OTP form
                const params = new URLSearchParams();
                params.set('otp', 'true');
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
                return { success: true, redirectUrl: `/login?${params.toString()}`, showOTPForm: true, email };
            } catch (error) {
                const errorMessage = extractErrorMessage(error);
                const errorKey = getPasswordlessErrorMessageKey(errorMessage);

                return { success: false, error: t(errorKey) };
            }
        } else {
            // Standard password login flow (default case - handles 'password' mode or undefined/null)
            if (!email || !password) {
                return { success: false, error: genericError };
            }
            const result = await loginRegisteredUser(context, { email, password });
            if (!result.success) {
                // Return generic error - don't expose specific login failure reasons
                return { success: false, error: genericError };
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
                    return {
                        success: true,
                        redirectUrl: returnUrlObj.pathname + returnUrlObj.search,
                        auth: getAuth(context),
                    };
                }
                return { success: true, redirectUrl: returnUrl, auth: getAuth(context) };
            }

            // No returnUrl - redirect to home
            return { success: true, redirectUrl: '/', auth: getAuth(context) };
        }
    } catch {
        return { success: false, error: genericError };
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
        showOTPForm,
        otpLength,
    } = loaderData;

    // Prefer actionData error (from form submission) over loaderData error (from URL params)
    const error = actionData?.error || loaderError || undefined;

    // Check if we should show OTP form from actionData (after email submission) or loaderData (from URL)
    const shouldShowOTPForm = actionData?.showOTPForm || showOTPForm;
    const showOTPModal = Boolean(shouldShowOTPForm);
    const otpEmail = actionData?.email || email;

    // Show passwordless success state
    if (passwordlessSent && email) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8">
                    <Card className="p-8">
                        <div className="text-center space-y-4">
                            <h2 className="text-2xl font-semibold">{t('checkEmailTitle')}</h2>
                            <p className="text-sm text-muted-foreground">{t('checkEmailDescription', { email })}</p>
                            <Link
                                to="/login"
                                className="inline-flex items-center text-sm text-primary hover:text-primary/80">
                                {t('backToLogin')}
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
            return (
                <PasswordlessLoginForm
                    error={error}
                    isPasswordlessEnabled={isPasswordlessLoginEnabled}
                    redirectPath={returnUrl || undefined}
                />
            );
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
        <>
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

            {/* OTP Modal - appears over the login page */}
            <OtpModal
                isOpen={showOTPModal}
                otpLength={otpLength}
                initialError={loaderError}
                onClose={() => {
                    // Navigate back to login without OTP modal
                    const url = new URL(window.location.href);
                    url.searchParams.delete('otp');
                    url.searchParams.delete('error');
                    url.searchParams.delete('token');
                    url.searchParams.delete('email');
                    window.history.replaceState({}, '', url.toString());
                    window.location.reload();
                }}
                email={otpEmail || ''}
                onSuccess={() => {
                    // Redirect to return URL or home after successful login
                    window.location.href = returnUrl || '/';
                }}
                onResendCode={async () => {
                    // Resend the OTP code
                    const formData = new FormData();
                    formData.append('email', otpEmail || '');
                    formData.append('loginMode', 'passwordless');
                    if (returnUrl) {
                        formData.append('redirectPath', returnUrl);
                    }
                    await fetch(window.location.pathname, {
                        method: 'POST',
                        body: formData,
                    });
                }}
            />
        </>
    );
}
