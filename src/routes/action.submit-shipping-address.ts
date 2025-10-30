import type { ActionFunctionArgs } from 'react-router';
import { getBasket, updateBasket } from '@/middlewares/basket.client';
import createClient from '@/lib/scapi';
import { shippingAddressSchema, parseShippingAddressFromFormData } from '@/lib/checkout-schemas';
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
        const client = createClient(context).ShopperBasketsV2;
        const updatedBasket = await client.updateShippingAddressForShipment({
            parameters: {
                basketId: basket.basketId,
                shipmentId: 'me',
                useAsBilling: false,
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
    } catch {
        return Response.json(
            {
                success: false,
                error: 'Failed to save shipping address. Please try again.',
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
