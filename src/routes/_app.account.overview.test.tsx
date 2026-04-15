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

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, Outlet } from 'react-router';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

let capturedOverviewProps: { customer?: any } = {};

vi.mock('@/components/account/account-overview', () => ({
    AccountOverview: (props: { customer?: any }) => {
        capturedOverviewProps = props;
        return <div data-testid="account-overview" />;
    },
    AccountOverviewSkeleton: () => <div data-testid="account-overview-skeleton" />,
}));

vi.mock('@/components/seo-meta', () => ({
    SeoMeta: ({ title, noIndex }: { title: string; noIndex?: boolean }) => (
        <div data-testid="seo-meta" data-title={title} data-no-index={String(noIndex)} />
    ),
}));

const mockCustomer = {
    customerId: 'cust-123',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
};

describe('Account Overview page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedOverviewProps = {};
    });

    async function renderRoute(customerPromise: Promise<any>) {
        const AccountOverviewRoute = (await import('./_app.account.overview')).default;

        const router = createMemoryRouter(
            [
                {
                    path: '/account',
                    element: <Outlet context={{ customer: customerPromise }} />,
                    children: [
                        {
                            index: true,
                            element: <AccountOverviewRoute />,
                        },
                    ],
                },
            ],
            { initialEntries: ['/account'] }
        );

        return render(
            <AllProvidersWrapper>
                <RouterProvider router={router} />
            </AllProvidersWrapper>
        );
    }

    test('shows the account dashboard once customer data loads', async () => {
        await renderRoute(Promise.resolve(mockCustomer));

        await waitFor(() => {
            expect(screen.getByTestId('account-overview')).toBeInTheDocument();
        });

        expect(capturedOverviewProps.customer).toEqual(mockCustomer);
    });

    test('shows the account dashboard for a guest with no customer data', async () => {
        await renderRoute(Promise.resolve(null));

        await waitFor(() => {
            expect(screen.getByTestId('account-overview')).toBeInTheDocument();
        });

        expect(capturedOverviewProps.customer).toBeNull();
    });

    test('shows a loading skeleton while customer data is being fetched', async () => {
        const pendingPromise = new Promise<any>(() => {});
        await renderRoute(pendingPromise);

        expect(screen.getByTestId('account-overview-skeleton')).toBeInTheDocument();
        expect(screen.queryByTestId('account-overview')).not.toBeInTheDocument();
    });

    test('sets the page title to Account Overview and hides from search engines', async () => {
        await renderRoute(Promise.resolve(mockCustomer));

        const seoMeta = screen.getByTestId('seo-meta');
        expect(seoMeta).toHaveAttribute('data-title', 'Account Overview');
        expect(seoMeta).toHaveAttribute('data-no-index', 'true');
    });
});
