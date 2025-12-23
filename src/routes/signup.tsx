import type { ReactElement } from 'react';
import {
    redirect,
    Link,
    Form,
    useActionData,
    type LoaderFunctionArgs,
    type ActionFunctionArgs,
    type ClientActionFunctionArgs,
} from 'react-router';
import { Card } from '@/components/ui/card';
// services
import { registerCustomer } from '@/lib/api/auth/register';
import { updateAuth } from '@/middlewares/auth.client';

// components
import { SignupForm } from '@/components/signup-form';

// utils
import { isPasswordValid } from '@/lib/utils';
import { getAuth } from '@/middlewares/auth.server';
import { getTranslation } from '@/lib/i18next';
import { useTranslation } from 'react-i18next';

type SignupActionResponse = {
    error?: string;
    redirectUrl?: string;
    auth?: ReturnType<typeof getAuth>;
};

// eslint-disable-next-line react-refresh/only-export-components
export function loader({ context }: LoaderFunctionArgs): null | Response {
    const session = getAuth(context);
    if (session.userType === 'registered') {
        return redirect('/');
    }

    return null;
}

/**
 * This server action is required for authentication, because registration must be handled server-side for security reasons,
 * and proper integration with session management and Salesforce Commerce Cloud's authentication system. It operates
 * together with the client action to ensure a smooth signup process.
 */
// eslint-disable-next-line react-refresh/only-export-components
export async function action({ request, context }: ActionFunctionArgs): Promise<SignupActionResponse> {
    const { t } = getTranslation(context);
    const formData = await request.formData();
    const firstName = formData.get('firstName')?.toString();
    const lastName = formData.get('lastName')?.toString();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const confirmPassword = formData.get('confirmPassword')?.toString();

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return { error: t('signup:allFieldsRequired') };
    }

    if (password !== confirmPassword) {
        return { error: t('signup:passwordsDoNotMatch') };
    }

    if (!isPasswordValid(password)) {
        return { error: t('signup:passwordNotSecure') };
    }

    // Register the customer
    const result = await registerCustomer(context, {
        customer: {
            firstName,
            lastName,
            login: email,
            email,
        },
        password,
    });

    if (!result.success) {
        return { error: result.error || t('errors:genericTryAgain') };
    }

    // Registration and auto-login successful - return redirect URL and auth
    const url = new URL(request.url);
    const returnUrl = url.searchParams.get('returnUrl') || '/';

    return {
        redirectUrl: returnUrl,
        auth: getAuth(context),
    };
}

/**
 * This client action operates together with the server action to ensure a smooth signup process. It ensures that the
 * session gets updated on both server and client side, and that the user is redirected to the correct route afterward.
 */
// eslint-disable-next-line react-refresh/only-export-components,custom/no-client-actions
export async function clientAction({ context, serverAction }: ClientActionFunctionArgs) {
    const result = await serverAction<SignupActionResponse>();

    if (result.error) {
        return result;
    }

    // Success - sync auth from server and redirect
    const { redirectUrl, auth } = result;
    if (redirectUrl && auth) {
        updateAuth(context, () => auth);
        return redirect(redirectUrl);
    }
    // Fallback (shouldn't happen)
    return redirect('/');
}

clientAction.hydrate = true as const;

export default function Signup(): ReactElement {
    const actionData = useActionData<typeof action>();
    const error = actionData?.error;
    const { t } = useTranslation('signup');

    return (
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">{t('title')}</h2>
                    <p className="mt-2 text-center text-sm text-muted-foreground">{t('subtitle')}</p>
                </div>

                <Card className="p-8">
                    <Form method="POST">
                        <SignupForm error={error} />

                        <div className="text-center mt-6">
                            <p className="text-sm text-muted-foreground">
                                {t('haveAccountQuestion')}
                                <Link to="/login" className="font-medium text-primary hover:underline">
                                    {t('signIn')}
                                </Link>
                            </p>
                        </div>
                    </Form>
                </Card>
            </div>
        </div>
    );
}
