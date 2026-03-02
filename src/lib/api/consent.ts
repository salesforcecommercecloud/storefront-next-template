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
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperConsents } from '@salesforce/storefront-next-runtime/scapi';
import { getConfig } from '@/config';
import { createApiClients } from '@/lib/api-clients';

/** Expand param for getSubscriptions: include consentStatus so responses have per-channel opt-in/opt-out. */
const GET_SUBSCRIPTIONS_EXPAND = ['consentStatus'] as const;

export type UpdateSubscriptionBody = ShopperConsents.schemas['ConsentSubscriptionRequest'];

/**
 * Get shopper consent subscription preferences (server-side).
 *
 * Use in loaders when you need subscriptions as part of page data. For client-side
 * fetching from a component, use useScapiFetcher('shopperConsents', 'getSubscriptions', ...) instead.
 *
 * @param context - React Router context from loader/action
 * @returns Subscription response or null on error (e.g. missing scope, 403)
 * @see https://developer.salesforce.com/docs/commerce/commerce-api/references/consents?meta=getSubscriptions
 */
export async function getSubscriptions(
    context: LoaderFunctionArgs['context']
): Promise<ShopperConsents.schemas['ConsentSubscriptionResponse'] | null> {
    try {
        const config = getConfig(context);
        const clients = createApiClients(context);
        const { data } = await clients.shopperConsents.getSubscriptions({
            params: {
                path: { organizationId: config.commerce.api.organizationId },
                query: { siteId: config.commerce.api.siteId, expand: [...GET_SUBSCRIPTIONS_EXPAND] },
            },
        });
        return data ?? null;
    } catch {
        return null;
    }
}

/**
 * Update a single marketing consent subscription (opt-in/opt-out) (server-side).
 *
 * Use in route actions that handle the HTTP request; parse FormData/body then call this.
 * Throws ApiError on SCAPI failure so the action can map to status/error response.
 *
 * @param context - React Router context from loader/action
 * @param body - subscriptionId, channel, contactPointValue, status
 * @returns Update response from SCAPI
 * @throws ApiError when the API returns an error
 * @see https://developer.salesforce.com/docs/commerce/commerce-api/references/consents?meta=updateSubscription
 */
export async function updateSubscription(
    context: LoaderFunctionArgs['context'],
    body: UpdateSubscriptionBody
): Promise<ShopperConsents.schemas['ConsentSubscriptionUpdateResponse']> {
    const config = getConfig(context);
    const clients = createApiClients(context);
    const { data } = await clients.shopperConsents.updateSubscription({
        params: {
            path: { organizationId: config.commerce.api.organizationId },
            query: { siteId: config.commerce.api.siteId },
        },
        body,
    });
    return data;
}
