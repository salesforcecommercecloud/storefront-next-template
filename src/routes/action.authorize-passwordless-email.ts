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
import type { Route } from './+types/action.authorize-passwordless-email';
import { data } from 'react-router';
import { authorizePasswordless } from '@/middlewares/auth.server';
import { extractErrorMessage } from '@/lib/auth/error-handler';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode, type ActionError } from '@/lib/error-codes';
import { getLogger } from '@/lib/logger.server';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { enforceTurnstile } from '@/lib/turnstile/enforce.server';
import { createCookie, getCookieConfig } from '@/lib/cookie-utils.server';
import { COOKIE_TURNSTILE_VERIFIED, TURNSTILE_VERIFIED_MAX_AGE } from '@/lib/turnstile/constants';
import { ApiError } from '@/scapi';

export type AuthorizePasswordlessEmailResponse = {
    success: boolean;
    error?: ActionError;
    email?: string;
    requiresLogin?: boolean;
};

/**
 * Server action to send OTP for passwordless login (mode=email).
 * Called when the shopper tabs or clicks out of the email field at checkout contact step.
 * Uses passwordless authorize with mode from config (email); does not register a customer.
 */
export async function action({
    request,
    context,
}: Route.ActionArgs): Promise<ReturnType<typeof data<AuthorizePasswordlessEmailResponse>>> {
    const logger = getLogger(context);

    if (request.method !== 'POST') {
        return data(
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
        return data(
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
        return data(
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

    // The cc-tv cookie attests that this client cleared the Turnstile gate. We set it
    // here, immediately after enforceTurnstile returned true, so every response path
    // below carries it — success, 400, 404, 5xx, generic 500. The cookie's job is to
    // record "Turnstile passed" so other Turnstile-protected endpoints (e.g.
    // /initiate-checkout-registration) can skip a fresh challenge within the 30-minute
    // window. SCAPI's later verdict is about the email/account, not about whether the
    // client is a bot — conditioning the cookie on SCAPI success would force a fresh
    // challenge on legitimate shoppers for events (typed unrecognized email, transient
    // SLAS blip) that have nothing to do with bot detection.
    const tvCookie = createCookie<string>(
        COOKIE_TURNSTILE_VERIFIED,
        getCookieConfig({ httpOnly: true, maxAge: TURNSTILE_VERIFIED_MAX_AGE }, context),
        context
    );
    const setCookieHeader = await tvCookie.serialize('1');
    const headers = { 'Set-Cookie': setCookieHeader };

    try {
        await authorizePasswordless(context, { userid: email });

        logger.info('AuthorizePasswordlessEmail: OTP sent');

        return data({ success: true, email }, { headers });
    } catch (error) {
        if (error instanceof ApiError && error.status === 400) {
            const errorMessage = extractErrorMessage(error);
            if (/email not verified/i.test(errorMessage)) {
                logger.info('AuthorizePasswordlessEmail: email not verified, requires standard login', { email });
                return data({ success: false, requiresLogin: true, email }, { headers });
            }

            logger.error('AuthorizePasswordlessEmail: bad request', { email, error: errorMessage });
            return data(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.OPERATION_FAILED, message: errorMessage }),
                },
                { status: 400, headers }
            );
        }

        // Unknown user — SLAS returns 404 when the email is not registered. For checkout
        // this is a normal guest path, not a server failure: skip the OTP modal and let
        // the shopper proceed. Returning HTTP 200 with falsy success matches pre-error-
        // standardization behavior and prevents the MRT edge from surfacing this as 502.
        if (error instanceof ApiError && error.status === 404) {
            logger.debug('AuthorizePasswordlessEmail: unknown user, proceed as guest');
            return data({ success: false, email }, { headers });
        }

        // SLAS upstream is unavailable (5xx — most commonly 502/503/504, which the
        // SLAS controller emits when the ECOM /loginId callback times out or the
        // upstream is otherwise unreachable). We can't tell whether the shopper has
        // an account, so falling back to standard password login is safer than
        // dropping them into guest checkout — if they're registered, they can sign
        // in normally; if not, the login modal lets them choose guest from there.
        if (error instanceof ApiError && error.status >= 500) {
            const errorMessage = extractErrorMessage(error);
            logger.warn('AuthorizePasswordlessEmail: SLAS upstream unavailable, falling back to standard login', {
                status: error.status,
                message: errorMessage,
            });
            return data({ success: false, requiresLogin: true, email }, { headers });
        }

        logger.error('AuthorizePasswordlessEmail: failed', { error });
        const errorMessage = extractErrorMessage(error);
        return data(
            {
                success: false,
                error: createActionError({ code: ErrorCode.OPERATION_FAILED, message: errorMessage }),
            },
            { status: 500, headers }
        );
    }
}
