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
import type { RouterContextProvider } from 'react-router';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import { ensureBasketId, updateBasketResource } from '@/middlewares/basket.server';
import { authorizePasswordless } from '@/middlewares/auth.server';
import { extractResponseError } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';
import { createContactInfoSchema, parseContactInfoFromFormData } from '@/lib/checkout-schemas';
import { customerLookup } from '@/lib/api/customer';
import { updateBillingAddressForBasket } from '@/lib/api/basket';
import { getTranslation } from '@/lib/i18next';
import type { AppConfig } from '@/types/config';

/**
 * Server action for submitting checkout contact information.
 */
export async function action(formData: FormData, context: RouterContextProvider) {
    const { t } = getTranslation();

    // Parse and validate using shared schema
    // This ensures server-side validation matches client-side validation exactly
    const contactData = parseContactInfoFromFormData(formData);
    const contactInfoSchema = createContactInfoSchema(t);
    const result = contactInfoSchema.safeParse(contactData);

    if (!result.success) {
        return Response.json(
            {
                success: false,
                fieldErrors: result.error.flatten().fieldErrors,
                step: 'contactInfo',
            },
            { status: 400 }
        );
    }

    // Use validated data
    const { email, countryCode, phone } = result.data;

    // Combine country code and phone number with space separator
    const fullPhone = countryCode && phone ? `${countryCode} ${phone}` : phone;

    // Perform customer lookup first to determine if user is registered or guest
    let customerLookupResult = null;
    try {
        customerLookupResult = await customerLookup(context, email);
    } catch {
        // Customer lookup failed, continue with guest flow
        // Continue with guest flow if lookup fails
        customerLookupResult = {
            isRegistered: false,
            recommendation: 'guest' as const,
            message: t('checkout.contactInfo.lookupFallbackMessage'),
        };
    }

    // Update customer info in Commerce Cloud only if user should be treated as registered
    const basketId = await ensureBasketId(context);
    if (!basketId) {
        return Response.json(
            {
                success: false,
                error: t('errors:checkout.noActiveBasket'),
                step: 'contactInfo',
            },
            { status: 400 }
        );
    }

    // Always update basket with customer email (required for order placement)
    let updatedBasket;
    try {
        const clients = createApiClients(context);
        const { data: basketData } = await clients.shopperBasketsV2.updateCustomerForBasket({
            params: {
                path: {
                    basketId,
                },
            },
            body: {
                email,
            },
        });

        updatedBasket = basketData;

        // Update local basket state with API response
        updateBasketResource(context, updatedBasket);
    } catch (error) {
        // Try to extract a more specific error message
        let errorMessage: string = t('checkout.contactInfo.saveError');

        if (error instanceof ApiError) {
            try {
                const { responseMessage } = await extractResponseError(error);
                if (responseMessage) {
                    errorMessage = responseMessage;

                    // If the error is about invalid customer, clear the session and retry as guest
                    if (responseMessage.toLowerCase().includes('customer is invalid')) {
                        // TODO: Need to evaluate if we have to clear the auth session here
                        errorMessage = t('checkout.contactInfo.sessionExpired');
                    }
                }
            } catch {
                // Use default error message if extraction fails
            }
        }

        return Response.json(
            {
                success: false,
                error: errorMessage,
                step: 'contactInfo',
            },
            { status: 500 }
        );
    }

    // Save phone to billing address so it persists for order placement
    if (fullPhone && updatedBasket) {
        try {
            const existingBilling = updatedBasket.billingAddress ?? {};
            const billingWithPhone = { ...existingBilling, phone: fullPhone };
            const billingBasket = await updateBillingAddressForBasket(context, basketId, billingWithPhone);
            updatedBasket = { ...updatedBasket, billingAddress: billingBasket.billingAddress };
            updateBasketResource(context, updatedBasket);
        } catch {
            // Non-blocking: phone on billing is supplemental
        }
    }

    // Send OTP for passwordless login when shopper enters email (mode=email). Non-blocking.
    const appConfig = getConfig<AppConfig>(context);
    if (appConfig.features?.passwordlessLogin?.enabled && email?.trim()) {
        try {
            await authorizePasswordless(context, { userid: email.trim() });
        } catch {
            // Do not fail contact step if OTP send fails (e.g. SLAS error, config)
        }
    }
    return Response.json({
        success: true,
        step: 'contactInfo',
        data: {
            email,
            phone: fullPhone,
            customerLookup: customerLookupResult,
        },
        basket: updatedBasket,
    });
}
