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
import type { ActionFunctionArgs } from 'react-router';
import { authorizePasswordless } from '@/middlewares/auth.server';
import { extractErrorMessage } from '@/lib/auth-error-handler';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { enforceTurnstile } from '@/lib/turnstile-enforce.server';
import { createCookie, getCookieConfig } from '@/lib/cookie-utils.server';
import { COOKIE_TURNSTILE_VERIFIED, TURNSTILE_VERIFIED_MAX_AGE } from '@/lib/turnstile-constants';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';

export type AuthorizePasswordlessEmailResponse = {
    success: boolean;
    error?: { code: string; message: string };
    email?: string;
    requiresLogin?: boolean;
};

/**
 * Server action to send OTP for passwordless login (mode=email).
 * Called when the shopper tabs or clicks out of the email field at checkout contact step.
 * Uses passwordless authorize with mode from config (email); does not register a customer.
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);

    if (request.method !== 'POST') {
        return Response.json(
            {
                success: false,
                error: createActionError({ code: ErrorCode.METHOD_NOT_ALLOWED, message: 'Method not allowed' }),
            },
            { status: 405 }
        );
    }

    const formData = await request.formData();
    const email = formData.get('email')?.toString()?.trim();
    const turnstileToken = formData.get('turnstileToken')?.toString();

    if (!email) {
        return Response.json(
            {
                success: false,
                error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'Email is required' }),
            },
            { status: 400 }
        );
    }

    const appConfig = getConfig<AppConfig>(context);

    const allowed = await enforceTurnstile({
        request,
        config: appConfig,
        turnstileToken,
        logger,
        actionName: 'authorize-passwordless-email',
        email,
    });
    if (!allowed) {
        return Response.json(
            {
                success: false,
                error: createActionError({
                    code: ErrorCode.NOT_AUTHORIZED,
                    message: 'Turnstile verification failed',
                }),
            },
            { status: 403 }
        );
    }

    try {
        await authorizePasswordless(context, { userid: email });

        logger.info('AuthorizePasswordlessEmail: OTP sent');

        const tvCookie = createCookie<string>(
            COOKIE_TURNSTILE_VERIFIED,
            getCookieConfig({ httpOnly: true, maxAge: TURNSTILE_VERIFIED_MAX_AGE }, context),
            context
        );
        const setCookieHeader = await tvCookie.serialize('1');

        return Response.json({ success: true, email }, { headers: { 'Set-Cookie': setCookieHeader } });
    } catch (error) {
        if (error instanceof ApiError && error.status === 400) {
            const errorMessage = extractErrorMessage(error);
            if (/email not verified/i.test(errorMessage)) {
                logger.info('AuthorizePasswordlessEmail: email not verified, requires standard login', { email });
                return Response.json({ success: false, requiresLogin: true, email });
            }

            logger.error('AuthorizePasswordlessEmail: bad request', { email, error: errorMessage });
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.OPERATION_FAILED, message: errorMessage }),
                },
                { status: 400 }
            );
        }

        logger.error('AuthorizePasswordlessEmail: failed', { error });
        const errorMessage = extractErrorMessage(error);
        return Response.json(
            {
                success: false,
                error: createActionError({ code: ErrorCode.OPERATION_FAILED, message: errorMessage }),
            },
            { status: 500 }
        );
    }
}
