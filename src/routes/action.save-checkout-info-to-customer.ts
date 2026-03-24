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
import { getAuth } from '@/middlewares/auth.server';
import { getBasket } from '@/middlewares/basket.server';
import type { ActionFunctionArgs } from 'react-router';
import {
    savePaymentMethodToCustomer,
    type PaymentInstrumentForSave,
    saveShippingAddressToCustomer,
    saveBillingAddressToCustomer,
} from '@/lib/api/customer';

/**
 * Action route: /action/save-checkout-info-to-customer
 *
 * Saves checkout information (shipping address, billing address, payment method, contact info)
 * to the customer's account immediately after they register via OTP during checkout.
 *
 * This allows the newly registered customer to have their information pre-filled on future visits.
 */
export async function action({ request, context }: { request: Request; context: ActionFunctionArgs['context'] }) {
    try {
        const auth = getAuth(context);

        if (!auth.customerId || auth.userType !== 'registered') {
            return Response.json(
                {
                    success: false,
                    error: 'User is not a registered customer',
                },
                { status: 401 }
            );
        }

        // Get current basket
        const basketResource = await getBasket(context);
        const basket = basketResource.current;
        if (!basket) {
            return Response.json(
                {
                    success: false,
                    error: 'No basket found',
                },
                { status: 400 }
            );
        }

        const customerId = auth.customerId;
        const savePromises: Promise<unknown>[] = [];

        // 1. Save payment method if available and user opted to save
        const formData = await request.formData();
        const savePayment = formData.get('savePayment') === 'true';

        if (savePayment && basket.paymentInstruments?.[0]) {
            const paymentInstrument = basket.paymentInstruments[0];
            savePromises.push(
                savePaymentMethodToCustomer(context, customerId, paymentInstrument as PaymentInstrumentForSave).catch(
                    (error) => {
                        // eslint-disable-next-line no-console
                        console.error('Failed to save payment method:', error);
                    }
                )
            );
        }

        // 2. Save shipping address
        const shippingAddress = basket.shipments?.[0]?.shippingAddress;
        if (shippingAddress) {
            savePromises.push(
                saveShippingAddressToCustomer(context, customerId, shippingAddress).catch((error) => {
                    // eslint-disable-next-line no-console
                    console.error('Failed to save shipping address:', error);
                })
            );
        }

        // 3. Save billing address
        if (basket.billingAddress) {
            savePromises.push(
                saveBillingAddressToCustomer(context, customerId, basket.billingAddress).catch((error) => {
                    // eslint-disable-next-line no-console
                    console.error('Failed to save billing address:', error);
                })
            );
        }

        // Wait for all save operations to complete
        if (savePromises.length > 0) {
            await Promise.all(savePromises);
            // eslint-disable-next-line no-console
            console.log(`Successfully saved ${savePromises.length} items to customer profile`);
        } else {
            // eslint-disable-next-line no-console
            console.log('No items to save to customer profile');
        }

        return Response.json({
            success: true,
        });
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error saving checkout info to customer:', error);
        return Response.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred',
            },
            { status: 500 }
        );
    }
}
