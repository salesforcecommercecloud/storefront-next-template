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
import { render, screen, act, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, Outlet } from 'react-router';
import type { ShopperCustomers } from '@salesforce/storefront-next-runtime/scapi';

type Customer = ShopperCustomers.schemas['Customer'];

// --- Mock setup ---

const mockAddToast = vi.fn();

vi.mock('@/components/toast', () => ({
    useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/providers/auth', () => ({
    useAuth: () => ({ customerId: 'test-customer-id' }),
}));

vi.mock('@/hooks/use-scapi-fetcher', () => ({
    useScapiFetcher: vi.fn(() => ({
        submit: vi.fn(),
        load: vi.fn(),
        data: null,
        state: 'idle',
    })),
}));

vi.mock('@/hooks/use-scapi-fetcher-effect', () => ({
    useScapiFetcherEffect: vi.fn(),
}));

vi.mock('@/hooks/use-fetcher-effect', () => ({
    useFetcherEffect: vi.fn(),
}));

// Capture props passed to CustomerProfileForm so we can invoke its callbacks
let capturedProfileFormProps: {
    initialData: Record<string, string>;
    onSuccess: (data: Record<string, string>) => void;
    onError: (error: string) => void;
    onCancel: () => void;
} | null = null;

vi.mock('@/components/customer-profile-form', () => ({
    CustomerProfileForm: (props: typeof capturedProfileFormProps) => {
        capturedProfileFormProps = props;
        return <div data-testid="customer-profile-form" />;
    },
}));

vi.mock('@/components/password-update-form', () => ({
    PasswordUpdateForm: () => <div data-testid="password-update-form" />,
}));

vi.mock('@/components/account-detail-skeleton', () => ({
    AccountDetailSkeleton: () => <div data-testid="account-detail-skeleton" />,
}));

vi.mock('@/components/account/interests-preferences-section', () => ({
    InterestsPreferencesSection: () => <div data-testid="interests-preferences" />,
}));

vi.mock('@/components/account/marketing-consent', () => ({
    MarketingConsent: () => <div data-testid="marketing-consent" />,
}));

vi.mock('@/providers/customer-preferences', () => ({
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    useConfig: () => ({
        url: { prefix: '/:siteId/:localeId', excludeRoutes: ['/resource/**', '/action/**'] },
    }),
}));

vi.mock('@/hooks/use-current-site-and-locale-ref', () => ({
    useCurrentSiteAndLocaleRef: () => ({ siteRef: 'global', localeRef: 'en-GB' }),
}));

vi.mock('@salesforce/storefront-next-runtime/multi-site', () => ({
    buildUrl: ({ to }: { to: string }) => `/global/en-GB${to}`,
}));

// --- Test data ---

const mockCustomer: Customer = {
    customerId: 'test-customer-id',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    login: 'john@example.com',
    phoneHome: '555-0100',
    gender: 1,
    birthday: '1990-05-15',
};

/**
 * Helper to render AccountDetails inside a router that provides outlet context,
 * similar to how _app.account.tsx provides it via <Outlet context={...}>.
 */
async function renderAccountDetails(customer: Customer | null = mockCustomer) {
    const AccountDetails = (await import('./_app.account._index')).default;

    const router = createMemoryRouter(
        [
            {
                path: '/account',
                element: (
                    <Outlet
                        context={{
                            customer: Promise.resolve(customer),
                            subscriptions: Promise.resolve(null),
                        }}
                    />
                ),
                children: [
                    {
                        index: true,
                        element: <AccountDetails />,
                    },
                ],
            },
        ],
        { initialEntries: ['/account'] }
    );

    const result = render(<RouterProvider router={router} />);

    // Wait for the Await/Suspense boundary to resolve
    await waitFor(() => {
        expect(screen.queryByTestId('account-detail-skeleton')).not.toBeInTheDocument();
    });

    return result;
}

/**
 * Helper: enter edit mode and return captured form props.
 * Clicks the Edit button on the profile toggle card, waits for the
 * CustomerProfileForm stub to render and capture its props.
 */
async function enterEditMode() {
    const editButton = screen.getByRole('button', { name: 'Edit' });
    act(() => {
        editButton.click();
    });
    await waitFor(() => {
        expect(capturedProfileFormProps).not.toBeNull();
    });
    // Safe to return non-null after the assertion above
    return capturedProfileFormProps as NonNullable<typeof capturedProfileFormProps>;
}

// --- Tests ---

describe('AccountDetails', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedProfileFormProps = null;
    });

    test('renders customer data in the profile summary', async () => {
        await renderAccountDetails();

        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Doe')).toBeInTheDocument();
        expect(screen.getByText('Male')).toBeInTheDocument();
    });

    test('shows "Not provided" for missing customer fields', async () => {
        const sparseCustomer: Customer = {
            customerId: 'test-customer-id',
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@example.com',
            login: 'jane@example.com',
        };

        await renderAccountDetails(sparseCustomer);

        expect(screen.getByText('Jane')).toBeInTheDocument();
        // Gender and birthday are not set, so "Not provided" should appear
        const notProvidedElements = screen.getAllByText('Not provided');
        expect(notProvidedElements.length).toBeGreaterThanOrEqual(2);
    });

    test('applies optimistic override after profile save success', async () => {
        await renderAccountDetails();

        // Verify initial data
        expect(screen.getByText('John')).toBeInTheDocument();
        expect(screen.getByText('Doe')).toBeInTheDocument();

        const formProps = await enterEditMode();

        // Simulate a successful profile update with new data
        act(() => {
            formProps.onSuccess({
                firstName: 'Jane',
                lastName: 'Updated',
                email: 'jane@updated.com',
                phone: '555-9999',
                gender: '2',
                birthday: '1985-12-25',
            });
        });

        // After success, editing mode closes and summary shows optimistic values
        expect(screen.getByText('Jane')).toBeInTheDocument();
        expect(screen.getByText('Updated')).toBeInTheDocument();
        expect(screen.getByText('Female')).toBeInTheDocument();
    });

    test('shows success toast on profile save', async () => {
        await renderAccountDetails();

        const formProps = await enterEditMode();

        act(() => {
            formProps.onSuccess({
                firstName: 'Jane',
                lastName: 'Updated',
                email: 'jane@updated.com',
            });
        });

        expect(mockAddToast).toHaveBeenCalledWith('Your profile was updated.', 'success');
    });

    test('shows error toast on profile save failure', async () => {
        await renderAccountDetails();

        const formProps = await enterEditMode();

        act(() => {
            formProps.onError('Something went wrong');
        });

        expect(mockAddToast).toHaveBeenCalledWith('Something went wrong', 'error');
    });

    test('passes displayCustomer data to CustomerProfileForm initialData', async () => {
        await renderAccountDetails();

        const formProps = await enterEditMode();

        expect(formProps.initialData).toEqual({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '555-0100',
            gender: '1',
            birthday: '1990-05-15',
        });
    });

    test('renders skeleton while data is loading', async () => {
        const AccountDetails = (await import('./_app.account._index')).default;

        // Use a promise that never resolves to keep the Suspense boundary active
        const pendingPromise = new Promise<Customer | null>(() => {});

        const router = createMemoryRouter(
            [
                {
                    path: '/account',
                    element: (
                        <Outlet
                            context={{
                                customer: pendingPromise,
                                subscriptions: new Promise(() => {}),
                            }}
                        />
                    ),
                    children: [
                        {
                            index: true,
                            element: <AccountDetails />,
                        },
                    ],
                },
            ],
            { initialEntries: ['/account'] }
        );

        render(<RouterProvider router={router} />);

        expect(screen.getByTestId('account-detail-skeleton')).toBeInTheDocument();
    });

    test('handles null customer gracefully', async () => {
        await renderAccountDetails(null);

        // When customer is null, all profile fields should show "Not provided"
        const notProvidedElements = screen.getAllByText('Not provided');
        expect(notProvidedElements.length).toBeGreaterThanOrEqual(4);
    });
});
