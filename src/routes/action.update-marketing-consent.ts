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
import { updateSubscription } from '@/lib/api/consent';
import { getErrorMessage } from '@/lib/utils';
import { ApiError } from '@salesforce/storefront-next-runtime/scapi';

const VALID_CHANNELS = ['email', 'sms', 'whatsapp'] as const;
const VALID_STATUSES = ['opt_in', 'opt_out'] as const;

type UpdateMarketingConsentResponse = { success: true } | { success: false; error: string };

/**
 * Server action to update a single marketing consent subscription (opt-in/opt-out).
 *
 * Expects FormData with: subscriptionId, channel, contactPointValue, status.
 * Validates input then calls lib/api/consent updateSubscription() (Shopper Consents API POST).
 *
 * Components submit via:
 *   fetcher.submit({ subscriptionId, channel, contactPointValue, status }, { method: 'POST', action: '/action/update-marketing-consent' });
 */
export async function action({ request, context }: ActionFunctionArgs): Promise<Response> {
    if (request.method !== 'POST') {
        return Response.json({ success: false, error: 'Method not allowed' } satisfies UpdateMarketingConsentResponse, {
            status: 405,
        });
    }

    try {
        const formData = await request.formData();
        const subscriptionId = formData.get('subscriptionId')?.toString();
        const channel = formData.get('channel')?.toString();
        const contactPointValue = formData.get('contactPointValue')?.toString();
        const status = formData.get('status')?.toString();

        if (!subscriptionId?.trim()) {
            return Response.json(
                { success: false, error: 'subscriptionId is required' } satisfies UpdateMarketingConsentResponse,
                { status: 400 }
            );
        }
        if (!channel || !VALID_CHANNELS.includes(channel as (typeof VALID_CHANNELS)[number])) {
            return Response.json(
                {
                    success: false,
                    error: `channel must be one of: ${VALID_CHANNELS.join(', ')}`,
                } satisfies UpdateMarketingConsentResponse,
                { status: 400 }
            );
        }
        if (!contactPointValue?.trim()) {
            return Response.json(
                { success: false, error: 'contactPointValue is required' } satisfies UpdateMarketingConsentResponse,
                { status: 400 }
            );
        }
        if (!status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
            return Response.json(
                {
                    success: false,
                    error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
                } satisfies UpdateMarketingConsentResponse,
                { status: 400 }
            );
        }

        await updateSubscription(context, {
            subscriptionId: subscriptionId.trim(),
            channel: channel as 'email' | 'sms' | 'whatsapp',
            contactPointValue: contactPointValue.trim(),
            status: status as 'opt_in' | 'opt_out',
        });

        return Response.json({ success: true } satisfies UpdateMarketingConsentResponse);
    } catch (reason) {
        const errorMessage =
            reason instanceof ApiError
                ? getErrorMessage(reason)
                : reason instanceof Error
                  ? reason.message
                  : 'Failed to update marketing consent';
        return Response.json({ success: false, error: errorMessage } satisfies UpdateMarketingConsentResponse, {
            status: reason instanceof ApiError ? reason.status : 500,
        });
    }
}
