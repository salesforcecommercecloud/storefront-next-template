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
import { redirect, Form, useActionData, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { Link } from '@/components/link';
import { Card } from '@/components/ui/card';
// services
import { registerCustomer } from '@/lib/api/auth/register.server';

// components
import { SignupForm } from '@/components/signup-form';
import { UITarget } from '@/targets/ui-target';
import { SeoMeta } from '@/components/seo-meta';

// utils
import { isPasswordValid } from '@/lib/utils';
import { getAuth } from '@/middlewares/auth.server';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { useTranslation } from 'react-i18next';
import { getLogger } from '@/lib/logger.server';

type SignupActionResponse = {
    error?: string;
};

export function loader({ context }: LoaderFunctionArgs): null | Response {
    const session = getAuth(context);
    if (session.userType === 'registered') {
        return redirect('/');
    }

    return null;
}

/**
 * This server action is required for authentication, because registration must be handled server-side for security reasons,
 * and proper integration with session management and Salesforce Commerce Cloud's authentication system.
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<SignupActionResponse | Response> {
    const logger = getLogger(context);
    const { t } = getTranslation(context);
    const formData = await request.formData();
    const firstName = formData.get('firstName')?.toString();
    const lastName = formData.get('lastName')?.toString();
    const email = formData.get('email')?.toString();
    const password = formData.get('password')?.toString();
    const confirmPassword = formData.get('confirmPassword')?.toString();

    logger.debug('Signup: starting');

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        logger.warn('Signup: missing required fields');
        return { error: t('signup:allFieldsRequired') };
    }

    if (password !== confirmPassword) {
        logger.warn('Signup: passwords do not match');
        return { error: t('signup:passwordsDoNotMatch') };
    }

    if (!isPasswordValid(password)) {
        logger.warn('Signup: password not secure');
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
        logger.warn('Signup: registration failed');
        return { error: result.error || t('errors:genericTryAgain') };
    }

    logger.info('Signup: registration succeeded');
    // Registration and auto-login successful - redirect to return URL
    const url = new URL(request.url);
    const returnUrl = url.searchParams.get('returnUrl') || '/';

    return redirect(returnUrl);
}

export default function Signup(): ReactElement {
    const actionData = useActionData<typeof action>();
    const error = actionData?.error;
    const { t } = useTranslation('signup');

    return (
        <>
            <div className="min-h-screen flex items-center justify-center bg-background py-12 section-container">
                <SeoMeta
                    title={t('meta.title', { defaultValue: 'Sign Up' })}
                    description={t('meta.description', {
                        defaultValue: 'Create an account to save your preferences and track your orders.',
                    })}
                    openGraph={{ type: 'website' }}
                />
                <div className="max-w-md w-full space-y-8">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-bold text-foreground">{t('title')}</h2>
                        <p className="mt-2 text-center text-sm text-muted-foreground">{t('subtitle')}</p>
                    </div>

                    <Card className="p-8 rounded-none shadow-none">
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
                    <UITarget targetId="sfcc.userRegistration.address.validation" />
                </div>
            </div>
        </>
    );
}
