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
import { isSlasPrivate, getAppOrigin } from '@/lib/utils';

// services
import { getAuth } from '@/middlewares/auth.server';
import { updateAuth } from '@/middlewares/auth.client';
import { loginRegisteredUser } from '@/lib/api/auth/standard-login';
import { authorizePasswordless } from '@/lib/api/auth/passwordless-login';
import { authorizeIDP } from '@/lib/api/auth/social-login';

type LoginLoaderData = {
    error?: string;
    passwordlessSent?: boolean;
    email?: string;
    mode: string;
};

// eslint-disable-next-line react-refresh/only-export-components,custom/no-universal-loaders
export function loader({ request, context }: LoaderFunctionArgs) {
    const session = getAuth(context);

    // If user is already logged in as registered user, redirect to home
    const { access_token, access_token_expiry, userType, customer_id } = session;
    if (
        access_token &&
        typeof access_token_expiry === 'number' &&
        access_token_expiry >= Date.now() &&
        userType === 'registered' &&
        customer_id
    ) {
        return redirect('/');
    }

    const url = new URL(request.url);
    const passwordlessSent = url.searchParams.get('passwordless') === 'sent';
    const email = url.searchParams.get('email');
    // Default to passwordless mode if SLAS private is enabled, otherwise password mode
    const mode = url.searchParams.get('mode') || (isSlasPrivate ? 'passwordless' : 'password');

    return {
        error: session.error,
        passwordlessSent,
        email,
        mode,
    };
}

/**
 * This server action is required for authentication, because login must be handled server-side for security reasons,
 * and proper integration with session management and Salesforce Commerce Cloud's authentication system. It operates
 * together with the client action to ensure a smooth login process.
 */
// eslint-disable-next-line react-refresh/only-export-components, custom/no-server-actions
export async function action({ request, context }: ActionFunctionArgs): Promise<[string, ReturnType<typeof getAuth>]> {
    const formData = await request.formData();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const loginMode = formData.get('loginMode')?.toString();
    const provider = formData.get('provider')?.toString();
    const resolve = (target: string): [string, ReturnType<typeof getAuth>] => [target, getAuth(context)];

    if (loginMode === 'social') {
        // Social login flow
        if (!provider) {
            return resolve('/login?mode=password');
        }
        const result = await authorizeIDP(context, {
            hint: provider,
            redirectURI: `${getAppOrigin()}/social-callback`,
        });
        if (result.success && result.redirectUrl) {
            // Redirect to social login provider
            return resolve(result.redirectUrl);
        }
    } else if (loginMode === 'passwordless') {
        // Passwordless login flow
        if (!email) {
            return resolve('/login?mode=passwordless');
        }
        const result = await authorizePasswordless(context, { userid: email });
        if (result.success) {
            // Passwordless authorization sent - redirect to success page
            return resolve(`/login?passwordless=sent&email=${encodeURIComponent(email)}`);
        }
    } else {
        // Standard password login flow
        if (!email || !password) {
            return resolve('/login?mode=password');
        }
        const result = await loginRegisteredUser(context, { email, password });
        if (result.success) {
            // Login successful - redirect to home
            return resolve('/');
        }
    }

    // Login failed - redirect back to log in with error, preserving the login mode
    if (loginMode === 'passwordless') {
        return resolve('/login?mode=passwordless');
    }
    return resolve('/login?mode=password');
}

/**
 * This client action operates together with the server action to ensure a smooth login process. It ensures that the
 * session gets updated on both server and client side, and that the user is redirected to the correct route afterward.
 */
// eslint-disable-next-line react-refresh/only-export-components
export async function clientAction({ context, serverAction }: ClientActionFunctionArgs) {
    const [target, session] = await serverAction<[string, ReturnType<typeof getAuth>]>();
    updateAuth(context, () => session);
    return redirect(target);
}

clientAction.hydrate = true as const;

export default function Login({ loaderData }: { loaderData: LoginLoaderData }): ReactElement {
    const { error, passwordlessSent, email, mode } = loaderData;

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
                                <button className="w-full inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-foreground bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring">
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
            return <PasswordlessLoginForm error={error} isPasswordlessEnabled={isSlasPrivate} />;
        }
        return <StandardLoginForm error={error} isPasswordlessEnabled={isSlasPrivate} />;
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
                    <SocialLoginButtons />
                </Card>
            </div>
        </div>
    );
}
