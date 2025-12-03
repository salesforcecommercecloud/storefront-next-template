import type { ActionFunctionArgs } from 'react-router';
import { getBasket, updateBasket } from '@/middlewares/basket.client';
import { extractResponseError } from '@/lib/utils';
import { createApiClients } from '@/lib/api-clients';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';
import { createContactInfoSchema, parseContactInfoFromFormData } from '@/lib/checkout-schemas';
import { customerLookup } from '@/lib/api/customer';
import { getTranslation } from '@/lib/i18next';

export async function clientAction({ request, context }: ActionFunctionArgs) {
    const { t } = getTranslation();

    const formData = await request.formData();

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
    const basket = getBasket(context);
    if (!basket || !basket.basketId) {
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
    try {
        const clients = createApiClients(context);
        const { data: updatedBasket } = await clients.shopperBasketsV2.updateCustomerForBasket({
            params: {
                path: {
                    basketId: basket.basketId,
                },
            },
            body: {
                email,
                ...(fullPhone && { phone: fullPhone }),
            },
        });

        // Update local basket state with API response
        updateBasket(context, updatedBasket);
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

    // Store email and customer lookup result - step progression computed from basket state
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('checkoutEmail', email);
        sessionStorage.setItem('customerLookupResult', JSON.stringify(customerLookupResult));
    }

    // Return success data as JSON
    return Response.json({
        success: true,
        step: 'contactInfo',
        data: {
            email,
            customerLookup: customerLookupResult,
        },
    });
}
