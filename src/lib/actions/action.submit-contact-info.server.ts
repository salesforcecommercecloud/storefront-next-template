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
import { ensureBasketId, updateBasketResource } from '@/middlewares/basket.server';
import { extractResponseError } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';
import { createContactInfoSchema, parseContactInfoFromFormData } from '@/lib/checkout-schemas';
import { customerLookup } from '@/lib/api/customer';
import { getTranslation } from '@/lib/i18next';

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

    // Combine country code and phone number
    const fullPhone = countryCode && phone ? `${countryCode}${phone}` : phone;

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

    // Always update basket with customer email and phone (required for order placement)
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
                ...(fullPhone && { phone: fullPhone }),
            },
        });

        updatedBasket = basketData;

        // Update local basket state with API response
        updateBasketResource(context, updatedBasket);
    } catch (error) {
        // Try to extract a more specific error message
        let errorMessage = t('checkout.contactInfo.saveError');

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

    // Return success data as JSON with updated basket for direct context updates
    return Response.json({
        success: true,
        step: 'contactInfo',
        data: {
            email,
            customerLookup: customerLookupResult,
        },
        basket: updatedBasket,
    });
}
