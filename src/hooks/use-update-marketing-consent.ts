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
import { useFetcher } from 'react-router';
import { useFetcherEffect } from '@/hooks/use-fetcher-effect';

/** Payload for updating a single marketing consent subscription (opt-in/opt-out). */
export interface UpdateMarketingConsentPayload {
    subscriptionId: string;
    channel: 'email' | 'sms' | 'whatsapp';
    contactPointValue: string;
    status: 'opt_in' | 'opt_out';
}

/**
 * Hook that encapsulates the "update marketing consent" API call.
 * Keeps the action URL and submit logic out of UI components.
 *
 * @param onSuccess - Called after a successful update (e.g. refetch or revalidate).
 * @param onError - Called when the action returns success: false with an error message.
 * @returns updateSubscription(payload), isUpdating
 */
export function useUpdateMarketingConsent(
    onSuccess?: () => void,
    onError?: (message: string) => void
): {
    updateSubscription: (payload: UpdateMarketingConsentPayload) => void;
    isUpdating: boolean;
} {
    const fetcher = useFetcher<{ success: boolean; error?: string }>();

    useFetcherEffect(fetcher, {
        onSuccess: () => {
            onSuccess?.();
        },
        onError: (error) => {
            const message = Array.isArray(error) ? error.join(', ') : error;
            // eslint-disable-next-line no-console
            console.error('Marketing consent update failed:', message);
            onError?.(message);
        },
    });

    const updateSubscription = (payload: UpdateMarketingConsentPayload): void => {
        const formData = new FormData();
        formData.set('subscriptionId', payload.subscriptionId);
        formData.set('channel', payload.channel);
        formData.set('contactPointValue', payload.contactPointValue);
        formData.set('status', payload.status);
        void fetcher.submit(formData, {
            method: 'POST',
            action: '/action/update-marketing-consent',
        });
    };

    const isUpdating = fetcher.state === 'submitting' || fetcher.state === 'loading';

    return { updateSubscription, isUpdating };
}
