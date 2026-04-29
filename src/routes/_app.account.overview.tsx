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
import { type ReactElement, Suspense } from 'react';
import { useOutletContext, Await, useLoaderData, type LoaderFunctionArgs } from 'react-router';
import { AccountOverview, AccountOverviewSkeleton } from '@/components/account/account-overview';
import { SeoMeta } from '@/components/seo-meta';
import { useTranslation } from 'react-i18next';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';
import { fetchCustomerOrders, type CustomerOrdersResult } from '@/lib/api/order.server';
import { getAuth } from '@/middlewares/auth.server';

type Customer = ShopperCustomers.schemas['Customer'];

type AccountLayoutContext = {
    customer: Promise<Customer | null>;
};

type OverviewLoaderData = {
    ordersPromise: Promise<CustomerOrdersResult>;
};

const RECENT_ORDERS_LIMIT = 5;

/**
 * Loader fetches the 5 most recent customer orders for the overview dashboard.
 * Returns a deferred promise so the welcome section renders instantly while orders stream in.
 *
 * Auth is already validated by the parent account layout loader — if this loader
 * runs, the user is authenticated. Falls back to an empty result if customerId
 * is somehow missing (defensive).
 */
export function loader({ context }: LoaderFunctionArgs): OverviewLoaderData {
    const session = getAuth(context);
    const customerId = session.customerId ?? '';

    const ordersPromise = fetchCustomerOrders(context, customerId, {
        offset: 0,
        limit: RECENT_ORDERS_LIMIT,
    });

    return { ordersPromise };
}

/**
 * Account Overview Dashboard Route - Main "My Account" landing page
 *
 * This route renders the Account Overview Dashboard which displays:
 * - Welcome back greeting with customer name
 * - Recent orders (last 5)
 * - Curated product recommendations (using Einstein)
 * - Quick Links to key account sections
 */
export default function AccountOverviewRoute(): ReactElement {
    const { t } = useTranslation('account');
    const { customer: customerPromise } = useOutletContext<AccountLayoutContext>();
    const { ordersPromise } = useLoaderData<OverviewLoaderData>();

    return (
        <>
            <SeoMeta title={t('meta.overviewTitle', { defaultValue: 'Account Overview' })} noIndex />
            <Suspense fallback={<AccountOverviewSkeleton />}>
                <Await resolve={customerPromise}>
                    {(customer: Customer | null) => (
                        <AccountOverview customer={customer} ordersPromise={ordersPromise} />
                    )}
                </Await>
            </Suspense>
        </>
    );
}
