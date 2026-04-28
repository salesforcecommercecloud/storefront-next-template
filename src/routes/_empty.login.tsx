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
import { type ReactElement, useState, useCallback, useMemo, useRef } from 'react';
import { redirect, useActionData, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { Link } from '@/components/link';
import { Card } from '@/components/ui/card';
import { SeoMeta } from '@/components/seo-meta';
import { buildCanonicalUrl } from '@/utils/canonical-url';
import { useTranslation } from 'react-i18next';
import StandardLoginForm from '@/components/login/standard-login-form';
import PasswordlessLoginForm from '@/components/login/passwordless-login-form';
import OtpModal from '@/components/login/otp-modal';
import { SocialLoginButtons } from '@/components/buttons/social-login-buttons';
import { getAppOrigin, isAbsoluteURL } from '@/lib/utils';
import { getConfig, useConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { updateBasketResource } from '@/middlewares/basket.server';
import { buildUrlFromContext } from '@/lib/url.server';
import { TurnstileWidget } from '@/components/security/turnstile-widget';
import { getTurnstileSiteKey, isTurnstileEnabled } from '@/lib/turnstile-utils';

// services
import {
    getAuth,
    authorizePasswordless,
    getPasswordLessAccessToken,
    updateAuth as updateAuthServer,
} from '@/middlewares/auth.server';
import { loginRegisteredUser } from '@/lib/api/auth/standard-login.server';
import { authorizeIDP } from '@/lib/api/auth/social-login.server';
import { mergeBasket } from '@/lib/api/basket.server';
import { getPasswordlessErrorMessageKey, extractErrorMessage } from '@/lib/auth-error-handler';
import { getLogger } from '@/lib/logger.server';
import { enforceTurnstile } from '@/lib/turnstile-enforce.server';

type LoginActionResponse = {
    success: boolean;
    error?: string;
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
    pageUrl: string;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
    const logger = getLogger(context);
    const session = getAuth(context);
    const url = new URL(request.url);
    const pageUrl = buildCanonicalUrl(url.origin, url.pathname, url.search);
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
        logger.debug('Login: already authenticated, redirecting');
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
    const config = getConfig<AppConfig>(context);
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
                logger.error('Login: basket merge failed during passwordless login', { error: basketError });
            }

            logger.info('Login: passwordless verification succeeded');
            return redirect(returnUrl || '/');
        } catch (verifyError) {
            // Auto-verification failed - show error with OTP form
            logger.warn('Login: passwordless auto-verification failed');
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
                pageUrl,
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
        pageUrl,
    };
}

/**
 * Server action for authentication. Login is handled server-side for security (httpOnly cookies,
 * PKCE code verifier storage) and integration with SLAS.
 *
 * Returns `LoginActionResponse | Response` because the action has two distinct outcomes:
 * - `Response` (redirect) — successful login or social IDP authorization. React Router intercepts
 *   the redirect before it reaches the component, so `useActionData()` never sees it.
 * - `LoginActionResponse` — errors or intermediate states (e.g., OTP form). This data is
 *   serialized and delivered to the component via `useActionData()` for rendering.
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<LoginActionResponse | Response> {
    const logger = getLogger(context);
    const config = getConfig<AppConfig>(context);
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
                : `${getAppOrigin()}${buildUrlFromContext(socialCallback, context)}`;
            const finalRedirectURI = redirectPath
                ? `${socialLoginRedirectURI}?redirectUrl=${redirectPath}`
                : socialLoginRedirectURI;
            const result = await authorizeIDP(context, {
                hint: provider,
                redirectURI: finalRedirectURI,
            });
            if (result.success && result.redirectUrl) {
                logger.info('Login: social redirect initiated', { provider });
                return redirect(result.redirectUrl);
            }
            logger.warn('Login: social authorization failed', { provider });
            return { success: false, error: genericError };
        } else if (loginMode === 'passwordless') {
            // Passwordless login flow
            if (!email) {
                return { success: false, error: genericError };
            }

            const turnstileToken = formData.get('turnstileToken')?.toString();
            const allowed = await enforceTurnstile({
                request,
                config,
                turnstileToken,
                logger,
                actionName: 'login-passwordless',
                email,
            });
            if (!allowed) {
                return { success: false, error: t('errors:api.forbidden') };
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
                logger.info('Login: passwordless code sent');
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
                return { success: true, showOTPForm: true, email };
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
                logger.warn('Login: standard login failed');
                return { success: false, error: genericError };
            }

            logger.info('Login: standard login succeeded');
            // Login successful - merge basket on server before redirecting
            try {
                const mergedBasket = await mergeBasket(context);
                if (mergedBasket) {
                    updateBasketResource(context, mergedBasket);
                }
            } catch (error) {
                logger.error('Login: basket merge failed', { error });
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

            // Redirect to returnUrl (with preserved action params) or home
            if (returnUrl) {
                if (pendingAction || actionParams) {
                    const returnUrlObj = new URL(returnUrl, getAppOrigin());
                    if (pendingAction) {
                        returnUrlObj.searchParams.set('action', pendingAction);
                    }
                    if (actionParams) {
                        returnUrlObj.searchParams.set('actionParams', actionParams);
                    }
                    return redirect(returnUrlObj.pathname + returnUrlObj.search);
                }
                return redirect(returnUrl);
            }

            return redirect('/');
        }
    } catch {
        return { success: false, error: genericError };
    }
}

export default function Login({ loaderData }: { loaderData: LoginLoaderData }): ReactElement {
    const { t } = useTranslation('login');
    const actionData = useActionData<typeof action>();
    const config = useConfig<AppConfig>();

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
        pageUrl,
    } = loaderData;

    // Turnstile for OTP resend — the PasswordlessLoginForm has its own widget for the
    // initial submit, but once the OTP modal opens the resend needs a fresh token.
    const [resendTurnstileToken, setResendTurnstileToken] = useState<string | null>(null);
    const resendTurnstileResetRef = useRef<(() => void) | null>(null);
    const turnstileEnabled = config ? isTurnstileEnabled(config) : false;
    const turnstileSiteKey = useMemo(() => {
        if (!config || !turnstileEnabled) return null;
        if (typeof window !== 'undefined') {
            const baseUrl = `${window.location.protocol}//${window.location.host}`;
            return getTurnstileSiteKey(config, baseUrl);
        }
        return null;
    }, [config, turnstileEnabled]);

    const handleResendTurnstileSuccess = useCallback((token: string) => {
        setResendTurnstileToken(token);
    }, []);
    const handleResendTurnstileError = useCallback(() => {
        setResendTurnstileToken(null);
    }, []);
    const handleResendTurnstileExpire = useCallback(() => {
        setResendTurnstileToken(null);
    }, []);

    // Prefer actionData error (from form submission) over loaderData error (from URL params)
    const error = actionData?.error || loaderError || undefined;

    // Check if we should show OTP form from actionData (after email submission) or loaderData (from URL)
    const shouldShowOTPForm = actionData?.showOTPForm || showOTPForm;
    const showOTPModal = Boolean(shouldShowOTPForm);
    const otpEmail = actionData?.email || email;

    // Show passwordless success state
    if (passwordlessSent && email) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background py-12 section-container">
                <div className="max-w-md w-full space-y-8">
                    <Card className="p-8 rounded-none shadow-none">
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
            <SeoMeta
                title={t('meta.title', { defaultValue: 'Sign In' })}
                description={t('meta.description', {
                    defaultValue: 'Sign in to your account to view orders, manage your wishlist, and more.',
                })}
                openGraph={{ type: 'website', url: pageUrl }}
            />
            <div className="min-h-screen flex items-center justify-center bg-background py-12 section-container">
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-bold text-foreground">{t('title')}</h2>
                        <p className="mt-2 text-center text-sm text-muted-foreground">{t('subtitle')}</p>
                    </div>

                    <Card className="p-8 rounded-none shadow-none">
                        {renderForm()}
                        {isSocialLoginEnabled ? <SocialLoginButtons /> : null}
                    </Card>
                </div>
            </div>

            {/* Turnstile widget for OTP resend — hidden, generates tokens for the resend fetch */}
            {showOTPModal && turnstileEnabled && turnstileSiteKey && (
                <TurnstileWidget
                    siteKey={turnstileSiteKey}
                    onSuccess={handleResendTurnstileSuccess}
                    onError={handleResendTurnstileError}
                    onExpire={handleResendTurnstileExpire}
                    enabled={turnstileEnabled}
                    resetRef={resendTurnstileResetRef}
                />
            )}

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
                    if (resendTurnstileToken) {
                        formData.append('turnstileToken', resendTurnstileToken);
                    }
                    await fetch(window.location.pathname, {
                        method: 'POST',
                        body: formData,
                    });
                    // Token is single-use — reset for the next resend
                    if (turnstileEnabled) {
                        setResendTurnstileToken(null);
                        resendTurnstileResetRef.current?.();
                    }
                }}
            />
        </>
    );
}
