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
import { createApiClients } from '@/lib/api-clients';
import { getAuth } from '@/middlewares/auth.server';
import { getTranslation } from '@/lib/i18next';
import { isTrackingConsentEnabled } from '@/middlewares/auth.utils';
import { trackingConsentToBoolean } from '@/types/tracking-consent';
import { getBasket } from '@/middlewares/basket.server';
import { getLogger } from '@/lib/logger.server';

type InitiateRegistrationResponse = {
    success: boolean;
    error?: string;
    email?: string;
};

/**
 * Server action to initiate passwordless registration during checkout
 * This triggers the OTP email to be sent for account creation with email verification
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<InitiateRegistrationResponse> {
    const logger = getLogger(context);
    const { t } = getTranslation();

    logger.debug('InitiateCheckoutRegistration: starting');

    try {
        const formData = await request.formData();
        const email = formData.get('email')?.toString();

        if (!email) {
            logger.debug('InitiateCheckoutRegistration: no email in form, checking basket');
            // Try to get email from basket
            const basketResource = await getBasket(context);
            const basketEmail = basketResource.current?.customerInfo?.email;

            if (!basketEmail) {
                logger.warn('InitiateCheckoutRegistration: email not found in form or basket');
                return {
                    success: false,
                    error: t('errors:customer.emailRequired'),
                };
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
                return {
                    success: false,
                    error:
                        t('errors:customer.nameRequired') ||
                        'First name and last name are required for account creation',
                };
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
                locale: 'en-US',
                usid: session.usid ? String(session.usid) : undefined,
                registerCustomer: true,
                firstName,
                lastName,
                email: basketEmail,
                ...(dnt !== undefined && { dnt }),
            });

            logger.info('InitiateCheckoutRegistration: succeeded with basket email');

            return {
                success: true,
                email: basketEmail,
            };
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
            return {
                success: false,
                error:
                    t('errors:customer.nameRequired') || 'First name and last name are required for account creation',
            };
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
            locale: 'en-US',
            usid: session.usid ? String(session.usid) : undefined,
            registerCustomer: true,
            firstName,
            lastName,
            email,
            ...(dnt !== undefined && { dnt }),
        });

        logger.info('InitiateCheckoutRegistration: succeeded with form email');

        return {
            success: true,
            email,
        };
    } catch (error) {
        logger.error('InitiateCheckoutRegistration: failed', { error });
        let errorMessage: string = String(t('checkout:registration.initiationFailed'));

        // Try to extract the actual error message from the API response
        if (error && typeof error === 'object') {
            if ('rawBody' in error && typeof error.rawBody === 'string') {
                try {
                    const parsed = JSON.parse(error.rawBody);
                    if (parsed.message && typeof parsed.message === 'string') {
                        errorMessage = parsed.message;
                    }
                } catch {
                    // Failed to parse rawBody
                }
            } else if ('message' in error && typeof error.message === 'string') {
                const msg = error.message;
                try {
                    const parsed = JSON.parse(msg);
                    if (parsed.message && typeof parsed.message === 'string') {
                        errorMessage = parsed.message;
                    }
                } catch {
                    // Not JSON, use the message as-is
                    errorMessage = msg;
                }
            }
        }

        return {
            success: false,
            error: errorMessage,
        };
    }
}
