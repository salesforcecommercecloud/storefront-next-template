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
import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';

vi.mock('@/components/login/otp-modal', () => ({
    default: ({
        isOpen,
        onSuccess,
        onCheckoutAsGuest,
    }: {
        isOpen: boolean;
        onSuccess: () => void;
        onCheckoutAsGuest?: () => void;
    }) =>
        isOpen ? (
            <div data-testid="otp-modal-mock">
                <button type="button" data-testid="otp-verify-success" onClick={() => onSuccess()}>
                    Verify
                </button>
                {onCheckoutAsGuest ? (
                    <button type="button" data-testid="otp-checkout-as-guest" onClick={() => onCheckoutAsGuest()}>
                        Checkout as Guest
                    </button>
                ) : null}
            </div>
        ) : null,
}));

vi.mock('@/components/login/login-modal', () => ({
    default: ({
        isOpen,
        onSuccess,
        onCheckoutAsGuest,
    }: {
        isOpen: boolean;
        onSuccess: () => void;
        onCheckoutAsGuest?: () => void;
    }) =>
        isOpen ? (
            <div data-testid="login-modal-mock">
                <button type="button" data-testid="login-modal-success" onClick={() => onSuccess()}>
                    Log In
                </button>
                {onCheckoutAsGuest ? (
                    <button
                        type="button"
                        data-testid="login-modal-checkout-as-guest"
                        onClick={() => onCheckoutAsGuest()}>
                        Checkout as Guest
                    </button>
                ) : null}
            </div>
        ) : null,
}));

const mockPasswordlessSubmit = vi.fn();
const passwordlessFetcherState = {
    state: 'idle' as const,
    data: { success: true, email: 'shopper@example.com' } as {
        success: boolean;
        email?: string;
        requiresLogin?: boolean;
    } | null,
    submit: mockPasswordlessSubmit,
};

vi.mock('react-router', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router')>();
    return {
        ...actual,
        useFetcher: (opts?: { key?: string }) => {
            if (opts?.key === 'contact-authorize-passwordless-email') {
                return passwordlessFetcherState;
            }
            return {
                state: 'idle' as const,
                data: null,
                submit: vi.fn(),
                Form: actual.Form,
            };
        },
        useRevalidator: () => ({
            revalidate: vi.fn(),
            state: 'idle' as const,
        }),
        useResolvedPath: (to: string) => ({ pathname: to, search: '', hash: '', state: null, key: 'k' }),
    };
});

vi.mock('@/providers/basket', () => ({ useBasket: vi.fn() }));
vi.mock('@/hooks/use-customer-lookup', () => ({
    useCustomerLookup: vi.fn(() => null),
    useLoginSuggestion: vi.fn(() => ({ shouldSuggestLogin: false, isCurrentUser: false })),
}));
vi.mock('@/hooks/checkout/use-customer-profile', () => ({
    useCustomerProfile: vi.fn(() => null),
}));

const mockUseCheckoutContext = vi.fn();
const defaultSteps = {
    CONTACT_INFO: 0,
    PICKUP: 1,
    SHIPPING_ADDRESS: 2,
    SHIPPING_OPTIONS: 3,
    PAYMENT: 4,
    PLACE_ORDER: 5,
} as const;

const buildCheckoutContext = (overrides?: Record<string, unknown>) => ({
    step: 0,
    computedStep: 0,
    editingStep: null,
    STEPS: defaultSteps,
    customerProfile: undefined,
    shippingDefaultSet: Promise.resolve(undefined),
    shipmentDistribution: {
        hasUnaddressedDeliveryItems: false,
        hasEmptyShipments: false,
        deliveryShipments: [],
        hasPickupItems: false,
        hasDeliveryItems: true,
        isDeliveryProductItem: () => true,
        enableMultiAddress: false,
        hasMultipleDeliveryAddresses: false,
    },
    savedAddresses: [],
    setSavedAddresses: vi.fn(),
    goToNextStep: vi.fn(),
    goToStep: vi.fn(),
    exitEditMode: vi.fn(),
    ...(overrides || {}),
});

vi.mock('@/hooks/use-checkout', () => ({
    useCheckoutContext: () => mockUseCheckoutContext(),
}));

vi.mock('@/lib/customer-profile-utils', () => ({
    getContactInfoFromCustomer: () => ({}),
}));

vi.mock('@/lib/country-codes', () => ({
    getCommonPhoneCountryCodes: () => [{ dialingCode: '+1', countryName: 'United States' }],
}));

vi.mock('@salesforce/storefront-next-runtime/config', () => {
    const { createContext } = React;
    return {
        ConfigContext: createContext<{ auth?: { otpLength?: number } } | null>({ auth: { otpLength: 6 } }),
    };
});

import ContactInfo from './contact-info';

const createMockBasket = () => ({
    basketId: 'test-basket-123',
    currency: 'USD',
    customerInfo: { email: 'shopper@example.com', customerId: null },
    shipments: [{ shipmentId: 'shipment-1', shippingAddress: null }],
    paymentInstruments: [],
});

function renderWithRouter(ui: React.ReactElement) {
    const router = createMemoryRouter(
        [
            { path: '/', element: ui },
            {
                path: '/action/authorize-passwordless-email',
                action: () => ({ success: true, email: 'shopper@example.com' }),
            },
        ],
        { initialEntries: ['/'], initialIndex: 0 }
    );
    return render(<RouterProvider router={router} />);
}

describe('ContactInfo passwordless OTP modal actions', () => {
    let useBasket: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        passwordlessFetcherState.state = 'idle';
        passwordlessFetcherState.data = { success: true, email: 'shopper@example.com' };
        mockUseCheckoutContext.mockReturnValue(buildCheckoutContext());

        const basketModule = await import('@/providers/basket');
        useBasket = basketModule.useBasket as ReturnType<typeof vi.fn>;
        useBasket.mockReturnValue(createMockBasket());
    });

    test('calls onRegisteredUserChoseGuest when Checkout as guest is clicked (checkout wiring)', async () => {
        const user = userEvent.setup();
        const onRegisteredUserChoseGuest = vi.fn();
        const onPasswordlessOtpVerified = vi.fn();

        renderWithRouter(
            <ContactInfo
                onSubmit={vi.fn()}
                isLoading={false}
                isCompleted={false}
                isEditing={true}
                onEdit={vi.fn()}
                onRegisteredUserChoseGuest={onRegisteredUserChoseGuest}
                onPasswordlessOtpVerified={onPasswordlessOtpVerified}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('otp-modal-mock')).toBeInTheDocument();
        });

        await user.click(screen.getByTestId('otp-checkout-as-guest'));

        expect(onRegisteredUserChoseGuest).toHaveBeenCalledWith(true);
        expect(onPasswordlessOtpVerified).not.toHaveBeenCalled();
    });

    test('calls onPasswordlessOtpVerified when OTP verification succeeds', async () => {
        const user = userEvent.setup();
        const onRegisteredUserChoseGuest = vi.fn();
        const onPasswordlessOtpVerified = vi.fn();

        renderWithRouter(
            <ContactInfo
                onSubmit={vi.fn()}
                isLoading={false}
                isCompleted={false}
                isEditing={true}
                onEdit={vi.fn()}
                onRegisteredUserChoseGuest={onRegisteredUserChoseGuest}
                onPasswordlessOtpVerified={onPasswordlessOtpVerified}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('otp-modal-mock')).toBeInTheDocument();
        });

        await user.click(screen.getByTestId('otp-verify-success'));

        expect(onPasswordlessOtpVerified).toHaveBeenCalledTimes(1);
        expect(onRegisteredUserChoseGuest).not.toHaveBeenCalled();
    });

    test('does not pass onCheckoutAsGuest to OtpModal when onRegisteredUserChoseGuest is omitted', async () => {
        renderWithRouter(
            <ContactInfo onSubmit={vi.fn()} isLoading={false} isCompleted={false} isEditing={true} onEdit={vi.fn()} />
        );

        await waitFor(() => {
            expect(screen.getByTestId('otp-modal-mock')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('otp-checkout-as-guest')).not.toBeInTheDocument();
    });

    test('opens LoginModal when passwordless authorize returns requiresLogin', async () => {
        passwordlessFetcherState.data = { success: false, requiresLogin: true, email: 'shopper@example.com' };

        renderWithRouter(
            <ContactInfo
                onSubmit={vi.fn()}
                isLoading={false}
                isCompleted={false}
                isEditing={true}
                onEdit={vi.fn()}
                onPasswordlessOtpVerified={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('login-modal-mock')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('otp-modal-mock')).not.toBeInTheDocument();
    });

    test('calls onPasswordlessOtpVerified when login modal succeeds', async () => {
        const user = userEvent.setup();
        const onPasswordlessOtpVerified = vi.fn();
        passwordlessFetcherState.data = { success: false, requiresLogin: true, email: 'shopper@example.com' };

        renderWithRouter(
            <ContactInfo
                onSubmit={vi.fn()}
                isLoading={false}
                isCompleted={false}
                isEditing={true}
                onEdit={vi.fn()}
                onPasswordlessOtpVerified={onPasswordlessOtpVerified}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('login-modal-mock')).toBeInTheDocument();
        });

        await user.click(screen.getByTestId('login-modal-success'));

        expect(onPasswordlessOtpVerified).toHaveBeenCalledTimes(1);
    });

    test('calls onRegisteredUserChoseGuest when Checkout as Guest is clicked in login modal', async () => {
        const user = userEvent.setup();
        const onRegisteredUserChoseGuest = vi.fn();
        passwordlessFetcherState.data = { success: false, requiresLogin: true, email: 'shopper@example.com' };

        renderWithRouter(
            <ContactInfo
                onSubmit={vi.fn()}
                isLoading={false}
                isCompleted={false}
                isEditing={true}
                onEdit={vi.fn()}
                onRegisteredUserChoseGuest={onRegisteredUserChoseGuest}
                onPasswordlessOtpVerified={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('login-modal-mock')).toBeInTheDocument();
        });

        await user.click(screen.getByTestId('login-modal-checkout-as-guest'));

        expect(onRegisteredUserChoseGuest).toHaveBeenCalledWith(true);
    });

    test('does not show Checkout as Guest in login modal when onRegisteredUserChoseGuest is omitted', async () => {
        passwordlessFetcherState.data = { success: false, requiresLogin: true, email: 'shopper@example.com' };

        renderWithRouter(
            <ContactInfo
                onSubmit={vi.fn()}
                isLoading={false}
                isCompleted={false}
                isEditing={true}
                onEdit={vi.fn()}
                onPasswordlessOtpVerified={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByTestId('login-modal-mock')).toBeInTheDocument();
        });

        expect(screen.queryByTestId('login-modal-checkout-as-guest')).not.toBeInTheDocument();
    });
});
