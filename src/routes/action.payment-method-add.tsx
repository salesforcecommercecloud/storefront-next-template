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
import { type ActionFunctionArgs } from 'react-router';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { savePaymentMethodToCustomer } from '@/lib/api/customer';
import { getAuth } from '@/middlewares/auth.server';

/**
 * Server action for adding a payment method to customer profile.
 * Dialog does validation and parsing (expiry, card type); this action only reads FormData and calls the API.
 */
export async function action({ request, context }: ActionFunctionArgs) {
    if (request.method !== 'POST') {
        return Response.json({ success: false, error: 'Method not allowed' }, { status: 405 });
    }

    const auth = getAuth(context);
    const customerId = auth?.customerId;

    if (!customerId) {
        return Response.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const cardNumber = (formData.get('cardNumber') as string) ?? '';
        const cardholderName = (formData.get('cardholderName') as string) ?? '';
        const cardType = (formData.get('cardType') as string) ?? '';
        const expirationMonth = parseInt((formData.get('expirationMonth') as string) ?? '0', 10);
        const expirationYear = parseInt((formData.get('expirationYear') as string) ?? '0', 10);
        const saveAsDefault = formData.get('saveAsDefault') === 'on';

        const paymentInstrument: ShopperCustomers.schemas['CustomerPaymentInstrumentRequest'] = {
            paymentMethodId: 'CREDIT_CARD',
            paymentCard: {
                cardType,
                number: cardNumber,
                expirationMonth,
                expirationYear,
                holder: cardholderName,
            } as ShopperCustomers.schemas['CustomerPaymentInstrumentRequest']['paymentCard'],
            default: saveAsDefault,
        };

        const success = await savePaymentMethodToCustomer(context, customerId, paymentInstrument);

        if (!success) {
            return Response.json({ success: false, error: 'Failed to save payment method' }, { status: 500 });
        }

        return Response.json({ success: true });
    } catch (error) {
        return Response.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
