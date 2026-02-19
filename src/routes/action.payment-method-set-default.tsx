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
import { setDefaultPaymentInstrument } from '@/lib/api/customer';
import { getAuth } from '@/middlewares/auth.server';

/**
 * Server action for setting a payment method as default in customer profile
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
        const paymentInstrumentId = formData.get('paymentInstrumentId') as string;

        if (!paymentInstrumentId) {
            return Response.json({ success: false, error: 'Payment instrument ID is required' }, { status: 400 });
        }

        const success = await setDefaultPaymentInstrument(context, customerId, paymentInstrumentId);

        if (!success) {
            return Response.json({ success: false, error: 'Failed to set payment method as default' }, { status: 500 });
        }

        return Response.json({ success: true });
    } catch (error) {
        return Response.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
