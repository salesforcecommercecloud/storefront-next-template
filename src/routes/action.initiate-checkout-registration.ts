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
import { createApiClients } from '@/lib/api-clients.server';
import { getAuth } from '@/middlewares/auth.server';
import { getLocale } from '@salesforce/storefront-next-runtime/i18n';
import { isTrackingConsentEnabled } from '@/middlewares/auth.utils';
import { trackingConsentToBoolean } from '@/types/tracking-consent';
import { getBasket } from '@/middlewares/basket.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { extractErrorMessage } from '@/lib/auth-error-handler';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';
import { getLogger } from '@/lib/logger.server';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import type { AppConfig } from '@/types/config';
import { enforceTurnstile } from '@/lib/turnstile-enforce.server';
import { createCookie, getCookieConfig } from '@/lib/cookie-utils.server';
import { COOKIE_TURNSTILE_VERIFIED, TURNSTILE_VERIFIED_MAX_AGE } from '@/lib/turnstile-constants';

/**
 * Server action to initiate passwordless registration during checkout
 * This triggers the OTP email to be sent for account creation with email verification
 */
export async function action({ request, context }: ActionFunctionArgs) {
    const logger = getLogger(context);
    const locale = getLocale(context);

    logger.debug('InitiateCheckoutRegistration: starting');

    if (request.method !== 'POST') {
        return Response.json(
            {
                success: false,
                error: createActionError({
                    code: ErrorCode.METHOD_NOT_ALLOWED,
                    message: `Expected POST, got ${request.method}`,
                }),
            },
            { status: 405 }
        );
    }

    try {
        const formData = await request.formData();
        const email = formData.get('email')?.toString();
        const turnstileToken = formData.get('turnstileToken')?.toString();

        const appConfig = getConfig<AppConfig>(context);

        const tvCookie = createCookie<string>(
            COOKIE_TURNSTILE_VERIFIED,
            getCookieConfig({ httpOnly: true, maxAge: TURNSTILE_VERIFIED_MAX_AGE }, context),
            context
        );
        const cookieHeader = request.headers.get('Cookie');
        const turnstileVerifiedViaCookie = (await tvCookie.parse(cookieHeader)) === '1';

        let shouldSetCookie = false;
        const turnstileVerificationEnabled =
            appConfig.security?.turnstile?.enabled && appConfig.security?.turnstile?.verification?.enabled;

        if (turnstileVerificationEnabled) {
            if (turnstileToken) {
                const allowed = await enforceTurnstile({
                    request,
                    config: appConfig,
                    turnstileToken,
                    logger,
                    actionName: 'initiate-checkout-registration',
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
                shouldSetCookie = !turnstileVerifiedViaCookie;
            } else if (!turnstileVerifiedViaCookie) {
                logger.warn('InitiateCheckoutRegistration: no turnstile token or verification cookie');
                return Response.json(
                    {
                        success: false,
                        error: createActionError({
                            code: ErrorCode.NOT_AUTHORIZED,
                            message: 'Turnstile verification required',
                        }),
                    },
                    { status: 403 }
                );
            }
        }

        if (!email) {
            logger.debug('InitiateCheckoutRegistration: no email in form, checking basket');
            // Try to get email from basket
            const basketResource = await getBasket(context);
            const basketEmail = basketResource.current?.customerInfo?.email;

            if (!basketEmail) {
                logger.warn('InitiateCheckoutRegistration: email not found in form or basket');
                return Response.json(
                    {
                        success: false,
                        error: createActionError({ code: ErrorCode.REQUIRED_FIELD, message: 'Email is required' }),
                    },
                    { status: 400 }
                );
            }

            // Extract customer info from basket for registration
            // firstName/lastName are stored in shipping address, not customerInfo
            const shippingAddress = basketResource.current?.shipments?.[0]?.shippingAddress;
            const firstName = shippingAddress?.firstName;
            const lastName = shippingAddress?.lastName;

            // Validate required fields before creating API clients or sending OTP
            if (!firstName || !lastName) {
                logger.warn('InitiateCheckoutRegistration: customer name missing', {
                    hasFirstName: !!firstName,
                    hasLastName: !!lastName,
                });
                return Response.json(
                    {
                        success: false,
                        error: createActionError({
                            code: ErrorCode.REQUIRED_FIELD,
                            message: 'First name and last name are required for account creation',
                        }),
                    },
                    { status: 400 }
                );
            }

            const session = getAuth(context);
            const clients = createApiClients(context);

            const requestBody: Record<string, string> = {
                user_id: basketEmail,
                mode: 'otp',
            };

            // Add customer info if available
            if (firstName) requestBody.first_name = firstName;
            if (lastName) requestBody.last_name = lastName;
            if (basketEmail) requestBody.email = basketEmail;

            let dnt: boolean | undefined;
            if (isTrackingConsentEnabled(context) && session.trackingConsent) {
                dnt = trackingConsentToBoolean(session.trackingConsent);
            }

            logger.debug('InitiateCheckoutRegistration: authorizing passwordless with basket email', {
                hasEmail: Boolean(basketEmail),
                hasUsid: !!session.usid,
                dnt,
            });

            await clients.auth.passwordless.authorize({
                userId: basketEmail,
                mode: 'email',
                ...(locale && { locale }),
                usid: session.usid ? String(session.usid) : undefined,
                registerCustomer: true,
                firstName,
                lastName,
                email: basketEmail,
                ...(dnt !== undefined && { dnt }),
            });

            logger.info('InitiateCheckoutRegistration: succeeded with basket email');

            const responseBody = { success: true, email: basketEmail };
            if (shouldSetCookie) {
                const setCookieHeader = await tvCookie.serialize('1');
                return Response.json(responseBody, { headers: { 'Set-Cookie': setCookieHeader } });
            }
            return Response.json(responseBody);
        }

        logger.debug('InitiateCheckoutRegistration: email provided in form');

        // Email was provided in form data - get customer info from basket
        const basketResource = await getBasket(context);

        // firstName/lastName are stored in shipping address, not customerInfo
        const shippingAddress = basketResource.current?.shipments?.[0]?.shippingAddress;
        const firstName = shippingAddress?.firstName;
        const lastName = shippingAddress?.lastName;

        // Validate required fields
        if (!firstName || !lastName) {
            logger.warn('InitiateCheckoutRegistration: customer name missing', {
                hasFirstName: !!firstName,
                hasLastName: !!lastName,
            });
            return Response.json(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.REQUIRED_FIELD,
                        message: 'First name and last name are required for account creation',
                    }),
                },
                { status: 400 }
            );
        }

        const session = getAuth(context);
        const clients = createApiClients(context);

        let dnt: boolean | undefined;
        if (isTrackingConsentEnabled(context) && session.trackingConsent) {
            dnt = trackingConsentToBoolean(session.trackingConsent);
        }

        logger.debug('InitiateCheckoutRegistration: authorizing passwordless with form email', {
            hasEmail: Boolean(email),
            hasUsid: !!session.usid,
            dnt,
        });

        await clients.auth.passwordless.authorize({
            userId: email,
            mode: 'email',
            ...(locale && { locale }),
            usid: session.usid ? String(session.usid) : undefined,
            registerCustomer: true,
            firstName,
            lastName,
            email,
            ...(dnt !== undefined && { dnt }),
        });

        logger.info('InitiateCheckoutRegistration: succeeded with form email');

        const responseBody = { success: true, email };
        if (shouldSetCookie) {
            const setCookieHeader = await tvCookie.serialize('1');
            return Response.json(responseBody, { headers: { 'Set-Cookie': setCookieHeader } });
        }
        return Response.json(responseBody);
    } catch (error) {
        if (error instanceof ApiError && error.status === 400) {
            const errorMessage = extractErrorMessage(error);
            if (/email not verified/i.test(errorMessage)) {
                logger.info('InitiateCheckoutRegistration: email not verified, feature unavailable');
                return Response.json({ success: false, unavailable: true });
            }

            logger.error('InitiateCheckoutRegistration: bad request', { error: errorMessage });
            return Response.json(
                {
                    success: false,
                    error: createActionError({ code: ErrorCode.OPERATION_FAILED, message: errorMessage }),
                },
                { status: 400 }
            );
        }

        logger.error('InitiateCheckoutRegistration: failed', { error });
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
