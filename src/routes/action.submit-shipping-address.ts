import type { ActionFunctionArgs } from 'react-router';
import { getBasket, updateBasket } from '@/middlewares/basket.client';
import { createApiClients } from '@/lib/api-clients';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';
import { shippingAddressSchema, parseShippingAddressFromFormData } from '@/lib/checkout-schemas';
import { getConfig } from '@/config';
import uiStrings from '@/temp-ui-string';

export async function clientAction({ request, context }: ActionFunctionArgs) {
    const formData = await request.formData();

    // Parse and validate using shared schema
    // This ensures server-side validation matches client-side validation exactly
    const addressData = parseShippingAddressFromFormData(formData);
    const result = shippingAddressSchema.safeParse(addressData);

    if (!result.success) {
        return Response.json(
            {
                success: false,
                fieldErrors: result.error.flatten().fieldErrors,
                step: 'shippingAddress',
            },
            { status: 400 }
        );
    }

    // Use validated data and add additional fields not in validation schema
    const validatedAddress = result.data;
    const addressDataWithExtras = {
        ...validatedAddress,
        countryCode: formData.get('countryCode')?.toString() || 'US',
    };

    // Update shipping address in Commerce Cloud (like PWA Kit)
    const basket = getBasket(context);
    if (!basket || !basket.basketId) {
        return Response.json(
            {
                success: false,
                error: uiStrings.errors.checkout.noActiveBasket,
                step: 'shippingAddress',
            },
            { status: 400 }
        );
    }

    try {
        const config = getConfig(context);
        const clients = createApiClients(context);
        const { data: updatedBasket } = await clients.shopperBasketsV2.updateShippingAddressForShipment({
            params: {
                path: {
                    organizationId: config.commerce.api.organizationId,
                    basketId: basket.basketId,
                    shipmentId: 'me',
                },
                query: {
                    siteId: config.commerce.api.siteId,
                    useAsBilling: false,
                },
            },
            body: {
                address1: addressDataWithExtras.address1,
                address2: addressDataWithExtras.address2,
                city: addressDataWithExtras.city,
                countryCode: addressDataWithExtras.countryCode,
                firstName: addressDataWithExtras.firstName,
                lastName: addressDataWithExtras.lastName,
                phone: addressDataWithExtras.phone,
                postalCode: addressDataWithExtras.postalCode,
                stateCode: addressDataWithExtras.stateCode,
            },
        });

        // Update local basket state with API response
        // For shipping address updates, the API should preserve existing basket data
        updateBasket(context, updatedBasket);
    } catch (error) {
        return Response.json(
            {
                success: false,
                error:
                    error instanceof ApiError
                        ? `Failed to save shipping address: ${error.statusText}`
                        : 'Failed to save shipping address. Please try again.',
                step: 'shippingAddress',
            },
            { status: 500 }
        );
    }

    // Store address - step progression computed from basket state
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('checkoutAddress', JSON.stringify(addressDataWithExtras));
    }

    // Return success data as JSON
    return Response.json({
        success: true,
        step: 'shippingAddress',
        data: { address: addressDataWithExtras },
    });
}
