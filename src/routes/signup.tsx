import type { ReactElement } from 'react';
import {
    redirect,
    Link,
    Form,
    type LoaderFunctionArgs,
    type ActionFunctionArgs,
    type ClientActionFunctionArgs,
} from 'react-router';
import { Card } from '@/components/ui/card';
import uiStrings from '@/temp-ui-string';

// services
import { registerCustomer } from '@/lib/api/auth/register';
import { updateAuth } from '@/middlewares/auth.client';

// components
import { SignupForm } from '@/components/signup/password-requirements';

// utils
import { isPasswordValid } from '@/lib/utils';
import { flashAuth, getAuth } from '@/middlewares/auth.server';

type SignupLoaderData = {
    error?: string;
};

// eslint-disable-next-line react-refresh/only-export-components,custom/no-universal-loaders
export function loader({ context }: LoaderFunctionArgs) {
    const session = getAuth(context);
    if (session.userType === 'registered') {
        return redirect('/');
    }
    return {
        error: session.error,
    };
}

/**
 * This server action is required for authentication, because registration must be handled server-side for security reasons,
 * and proper integration with session management and Salesforce Commerce Cloud's authentication system. It operates
 * together with the client action to ensure a smooth signup process.
 */
// eslint-disable-next-line react-refresh/only-export-components, custom/no-server-actions
export async function action({ request, context }: ActionFunctionArgs): Promise<[string, ReturnType<typeof getAuth>]> {
    const formData = await request.formData();
    const firstName = formData.get('firstName')?.toString();
    const lastName = formData.get('lastName')?.toString();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const confirmPassword = formData.get('confirmPassword')?.toString();
    const resolve = (target: string): [string, ReturnType<typeof getAuth>] => [target, getAuth(context)];

    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        flashAuth(context, uiStrings.signup.allFieldsRequired);
        return resolve('/signup');
    }

    if (password !== confirmPassword) {
        flashAuth(context, uiStrings.signup.passwordsDoNotMatch);
        return resolve('/signup');
    }

    if (!isPasswordValid(password)) {
        flashAuth(context, uiStrings.signup.passwordNotSecure);
        return resolve('/signup');
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

    if (result.success) {
        // Registration and auto-login successful - redirect to home
        return resolve('/');
    }

    // Registration failed - redirect back to signup with error
    return resolve('/signup');
}

/**
 * This client action operates together with the server action to ensure a smooth signup process. It ensures that the
 * session gets updated on both server and client side, and that the user is redirected to the correct route afterward.
 */
// eslint-disable-next-line react-refresh/only-export-components
export async function clientAction({ context, serverAction }: ClientActionFunctionArgs) {
    const [target, session] = await serverAction<[string, ReturnType<typeof getAuth>]>();
    updateAuth(context, () => session);
    return redirect(target);
}

clientAction.hydrate = true as const;

export default function Signup({ loaderData }: { loaderData: SignupLoaderData }): ReactElement {
    const { error } = loaderData;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
                        {uiStrings.signup.title}
                    </h2>
                    <p className="mt-2 text-center text-sm text-muted-foreground">{uiStrings.signup.subtitle}</p>
                </div>

                <Card className="p-8">
                    <Form method="POST">
                        <SignupForm error={error} />

                        <div className="text-center mt-6">
                            <p className="text-sm text-muted-foreground">
                                {uiStrings.signup.haveAccountQuestion}
                                <Link to="/login" className="font-medium text-primary hover:underline">
                                    {uiStrings.signup.signIn}
                                </Link>
                            </p>
                        </div>
                    </Form>
                </Card>
            </div>
        </div>
    );
}
