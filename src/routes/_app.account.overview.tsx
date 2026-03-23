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
import { useOutletContext, Await } from 'react-router';
import { AccountOverview, AccountOverviewSkeleton } from '@/components/account/account-overview';
import { SeoMeta } from '@/components/seo-meta';
import { useTranslation } from 'react-i18next';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';

type Customer = ShopperCustomers.schemas['Customer'];

type AccountLayoutContext = {
    customer: Promise<Customer | null>;
};

/**
 * Account Overview Dashboard Route - Main "My Account" landing page
 *
 * This route renders the Account Overview Dashboard which displays:
 * - Welcome back greeting with customer name
 * - Curated product recommendations (using Einstein)
 * - Quick Links to key account sections
 */
export default function AccountOverviewRoute(): ReactElement {
    const { t } = useTranslation('account');
    const { customer: customerPromise } = useOutletContext<AccountLayoutContext>();

    return (
        <>
            <SeoMeta title={t('meta.overviewTitle', { defaultValue: 'Account Overview' })} noIndex />
            <Suspense fallback={<AccountOverviewSkeleton />}>
                <Await resolve={customerPromise}>
                    {(customer: Customer | null) => <AccountOverview customer={customer} />}
                </Await>
            </Suspense>
        </>
    );
}
