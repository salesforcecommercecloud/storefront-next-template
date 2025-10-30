import type { ActionFunctionArgs } from 'react-router';
import { getBasket, updateBasket } from '@/middlewares/basket.client';
import { shippingOptionsSchema, parseShippingOptionsFromFormData } from '@/lib/checkout-schemas';
import createClient from '@/lib/scapi';
import uiStrings from '@/temp-ui-string';

export async function clientAction({ request, context }: ActionFunctionArgs) {
    const formData = await request.formData();

    // Parse and validate using shared schema
    // This ensures server-side validation matches client-side validation exactly
    const shippingData = parseShippingOptionsFromFormData(formData);
    const result = shippingOptionsSchema.safeParse(shippingData);

    if (!result.success) {
        return Response.json(
            {
                success: false,
                fieldErrors: result.error.flatten().fieldErrors,
                step: 'shippingOptions',
            },
            { status: 400 }
        );
    }

    // Use validated data
    const { shippingMethodId } = result.data;

    // Update shipping method in Commerce Cloud (like PWA Kit)
    const basket = getBasket(context);
    if (!basket || !basket.basketId) {
        return Response.json(
            {
                success: false,
                error: uiStrings.errors.checkout.noActiveBasket,
                step: 'shippingOptions',
            },
            { status: 400 }
        );
    }

    try {
        const client = createClient(context).ShopperBasketsV2;
        const updatedBasket = await client.updateShippingMethodForShipment({
            parameters: {
                basketId: basket.basketId,
                shipmentId: 'me',
            },
            body: {
                id: shippingMethodId,
            },
        });

        // Update local basket state with API response
        // Check if critical data is preserved in the Commerce API response
        const currentBasket = getBasket(context);

        if (!updatedBasket.customerInfo?.email && currentBasket.customerInfo?.email) {
            // Customer info missing from shipping method API response, merging with current basket
            // Selectively update to preserve existing data
            updateBasket(context, {
                ...currentBasket,
                // Update shipping-related fields from API response
                shipments: updatedBasket.shipments || currentBasket.shipments,
                // Update calculated totals from API response
                orderTotal: updatedBasket.orderTotal || currentBasket.orderTotal,
                productTotal: updatedBasket.productTotal || currentBasket.productTotal,
                shippingTotal: updatedBasket.shippingTotal || currentBasket.shippingTotal,
                merchandizeTotalTax: updatedBasket.merchandizeTotalTax || currentBasket.merchandizeTotalTax,
                taxTotal: updatedBasket.taxTotal || currentBasket.taxTotal,
            });
        } else {
            // API response includes all necessary data, use it directly
            updateBasket(context, updatedBasket);
        }
    } catch {
        return Response.json(
            {
                success: false,
                error: 'Failed to save shipping method. Please try again.',
                step: 'shippingOptions',
            },
            { status: 500 }
        );
    }

    // Store shipping method - step progression computed from basket state
    if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('checkoutShippingMethod', JSON.stringify({ shippingMethodId }));
    }

    // Return success data as JSON
    return Response.json({
        success: true,
        step: 'shippingOptions',
        data: { shippingMethodId },
    });
}
