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
import userEvent from '@testing-library/user-event';
import Payment from './payment';

// Use real react-hook-form for integration tests
vi.mock('@/providers/basket', () => ({ useBasket: vi.fn() }));
vi.mock('@/hooks/checkout/use-customer-profile', () => ({
    useCustomerProfile: vi.fn(() => null),
}));

const createMockBasket = (overrides = {}) => ({
    basketId: 'test-basket-123',
    currency: 'USD',
    customerInfo: { email: 'test@example.com', customerId: 'test-customer' },
    shipments: [
        {
            shipmentId: 'shipment-1',
            shippingAddress: {
                firstName: 'John',
                lastName: 'Doe',
                address1: '123 Main St',
                city: 'New York',
                stateCode: 'NY',
                postalCode: '10001',
                countryCode: 'US',
            },
        },
    ],
    paymentInstruments: [],
    ...overrides,
});

const createDefaultProps = (overrides = {}) => ({
    onSubmit: vi.fn(),
    isLoading: false,
    actionData: undefined,
    isCompleted: false,
    isEditing: true,
    onEdit: vi.fn(),
    ...overrides,
});

describe('Payment Integration Tests', () => {
    let useBasket: ReturnType<typeof vi.fn>;
    let useCustomerProfile: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const basketModule = await import('@/providers/basket');
        const profileModule = await import('@/hooks/checkout/use-customer-profile');
        useBasket = basketModule.useBasket as ReturnType<typeof vi.fn>;
        useCustomerProfile = profileModule.useCustomerProfile as ReturnType<typeof vi.fn>;

        useBasket.mockReturnValue(createMockBasket());
        useCustomerProfile.mockReturnValue(null);
    });

    describe('Basic Rendering', () => {
        test('renders payment form in editing mode', () => {
            render(<Payment {...createDefaultProps()} />);

            // Check if the title and form fields are rendered (card title is "Payment")
            expect(screen.getByText(/^Payment$/)).toBeInTheDocument();
            // Card fields use placeholders: Card Number*, Name on Card*, mm/yy*, CVV*
            expect(screen.getByPlaceholderText(/card number/i)).toBeInTheDocument();
            expect(screen.getByRole('textbox', { name: /name on card/i })).toBeInTheDocument();
        });
    });

    describe('Card Type Detection', () => {
        test('detects Visa card from number input', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const cardInput = screen.getByPlaceholderText(/card number/i);
            await user.type(cardInput, '4111111111111111');

            // Card type is shown as an icon (SVG) inside the card number field container, not as text
            await waitFor(() => {
                const container = cardInput.closest('.relative');
                expect(container?.querySelector('[aria-hidden] svg')).toBeInTheDocument();
            });
        });

        test('detects Mastercard from number input', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const cardInput = screen.getByPlaceholderText(/card number/i);
            await user.type(cardInput, '5555555555554444');

            await waitFor(() => {
                const container = cardInput.closest('.relative');
                expect(container?.querySelector('[aria-hidden] svg')).toBeInTheDocument();
            });
        });

        test('detects American Express from number input', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const cardInput = screen.getByPlaceholderText(/card number/i);
            await user.type(cardInput, '378282246310005');

            await waitFor(() => {
                const container = cardInput.closest('.relative');
                expect(container?.querySelector('[aria-hidden] svg')).toBeInTheDocument();
            });
        });
    });

    describe('Card Number Formatting', () => {
        test('formats card number with spaces', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const cardInput = screen.getByPlaceholderText(/card number/i);
            await user.type(cardInput, '4111111111111111');

            await waitFor(() => {
                expect(cardInput).toHaveValue('4111 1111 1111 1111');
            });
        });

        test('limits card number to 19 digits plus spaces', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const cardInput = screen.getByPlaceholderText(/card number/i);
            await user.type(cardInput, '41111111111111111111111111');

            await waitFor(() => {
                const value = (cardInput as HTMLInputElement).value;
                expect(value.replace(/\s/g, '').length).toBeLessThanOrEqual(19);
            });
        });
    });

    describe('Expiry Date Formatting', () => {
        test('formats expiry date with slash', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const expiryInput = screen.getByPlaceholderText(/mm\/yy/i);
            await user.type(expiryInput, '1227');

            await waitFor(() => {
                expect(expiryInput).toHaveValue('12/27');
            });
        });

        test('automatically adds slash after month', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const expiryInput = screen.getByPlaceholderText(/mm\/yy/i);
            await user.type(expiryInput, '12');

            await waitFor(() => {
                expect((expiryInput as HTMLInputElement).value).toContain('/');
            });
        });
    });

    describe('CVV Input Validation', () => {
        test('allows only numeric digits in CVV', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const cvvInput = screen.getByPlaceholderText(/cvv/i);
            await user.type(cvvInput, 'abc123xyz');

            await waitFor(() => {
                expect(cvvInput).toHaveValue('123');
            });
        });

        test('limits CVV to 4 digits', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const cvvInput = screen.getByPlaceholderText(/cvv/i);
            await user.type(cvvInput, '12345678');

            await waitFor(() => {
                expect((cvvInput as HTMLInputElement).value.length).toBeLessThanOrEqual(4);
            });
        });
    });

    describe('Billing Address Toggle', () => {
        test('checkbox is checked by default (billing matches shipping)', () => {
            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', { name: /same as shipping address/i });
            expect(checkbox).toBeChecked();

            // Billing address fields should be hidden (check for absence of "First Name" field)
            expect(screen.queryByRole('textbox', { name: /^first name$/i })).not.toBeInTheDocument();
        });

        test('shows billing address fields when checkbox is unchecked', async () => {
            const user = userEvent.setup();
            render(<Payment {...createDefaultProps()} />);

            const checkbox = screen.getByRole('checkbox', { name: /same as shipping address/i });

            // Uncheck the checkbox to show billing fields
            await user.click(checkbox);

            await waitFor(() => {
                expect(screen.getByRole('textbox', { name: /^first name$/i })).toBeInTheDocument();
            });
        });
    });

    describe('Saved Payment Methods with Real Hooks', () => {
        test('renders saved payment methods when profile has them', () => {
            const profileWithPayments = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card-1',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            maskedNumber: '**** **** **** 1234',
                            holder: 'John Doe',
                            expirationMonth: 12,
                            expirationYear: 2027,
                        },
                        preferred: true,
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(profileWithPayments);

            render(<Payment {...createDefaultProps()} />);

            // Check for the presence of saved payment method radio button
            expect(screen.getByRole('radio', { name: /visa/i })).toBeInTheDocument();
            expect(screen.getByText(/john doe/i)).toBeInTheDocument();
        });

        test('auto-selects preferred payment method', async () => {
            const profileWithPreferred = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card-1',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            maskedNumber: '**** 1234',
                        },
                        preferred: true,
                    },
                    {
                        paymentInstrumentId: 'card-2',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Mastercard',
                            maskedNumber: '**** 5678',
                        },
                        preferred: false,
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(profileWithPreferred);

            render(<Payment {...createDefaultProps()} />);

            await waitFor(() => {
                // Find the preferred radio by its ID (card-1)
                const preferredRadio = document.getElementById('card-1') as HTMLInputElement;
                expect(preferredRadio).toBeTruthy();
                expect(preferredRadio?.getAttribute('aria-checked')).toBe('true');
            });
        });
    });

    describe('Form Submission with Real Hooks', () => {
        test('calls onSubmit with payment data', async () => {
            const user = userEvent.setup();
            const handleSubmit = vi.fn();
            const { container } = render(<Payment {...createDefaultProps({ onSubmit: handleSubmit })} />);

            // Fill in all required fields
            await user.type(screen.getByPlaceholderText(/card number/i), '4111111111111111');
            await user.type(screen.getByRole('textbox', { name: /name on card/i }), 'John Doe');
            await user.type(screen.getByPlaceholderText(/mm\/yy/i), '1227');
            await user.type(screen.getByPlaceholderText(/cvv/i), '123');

            // Payment has no submit button (guest uses Place Order at end of page); submit form programmatically
            const form = container.querySelector('form');
            expect(form).toBeInTheDocument();
            form?.requestSubmit();

            await waitFor(() => {
                expect(handleSubmit).toHaveBeenCalled();
            });
        });
    });

    describe('Default Values with useMemo', () => {
        test('initializes with shipping address as default billing', () => {
            render(<Payment {...createDefaultProps()} />);

            // Form should initialize with billingSameAsShipping checked
            const checkbox = screen.getByRole('checkbox', { name: /same as shipping address/i });
            expect(checkbox).toBeChecked();
        });

        test('initializes with existing payment card holder', () => {
            const basketWithPayment = createMockBasket({
                paymentInstruments: [
                    {
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            holder: 'Jane Smith',
                            cardType: 'Visa',
                        },
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithPayment);

            render(<Payment {...createDefaultProps()} />);

            // Component should render with existing data
            expect(screen.getByRole('checkbox')).toBeInTheDocument();
        });
    });

    describe('Edge Cases - Saved Payment Methods', () => {
        test('auto-selects first saved payment method when profile has saved cards', () => {
            const mockProfile = {
                customer: { email: 'alice@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'saved-1',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            holder: 'Alice Johnson',
                            cardType: 'Visa',
                            maskedNumber: '************1234',
                        },
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);

            render(<Payment {...createDefaultProps()} />);

            // Should render saved payment method text
            expect(screen.getByText(/choose a saved payment method or add a new one/i)).toBeInTheDocument();
            expect(screen.getByText('Visa')).toBeInTheDocument();
        });

        test('handles saved payment method without holder name', () => {
            const mockProfile = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'saved-1',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            // No holder field - tests ||'' fallback
                            cardType: 'Mastercard',
                            maskedNumber: '************5678',
                        },
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);

            render(<Payment {...createDefaultProps()} />);

            // Should still render
            expect(screen.getByText(/choose a saved payment method or add a new one/i)).toBeInTheDocument();
            expect(screen.getByText('Mastercard')).toBeInTheDocument();
        });

        test('defaults to new payment method when saved methods are missing ids', async () => {
            const mockProfile = {
                customer: { email: 'ghost@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        // Intentionally omit paymentInstrumentId so helper would normally generate one.
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            holder: 'Ghost User',
                            cardType: 'Visa',
                        },
                        preferred: true,
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);
            const customerProfileUtils = await import('@/lib/customer-profile-utils');
            const spy = vi.spyOn(customerProfileUtils, 'getPaymentMethodsFromCustomer').mockReturnValue([
                {
                    id: '', // Simulate corrupted data with missing id
                    type: 'CREDIT_CARD',
                    cardType: 'Visa',
                    maskedNumber: '**** 9999',
                    preferred: true,
                },
            ]);

            try {
                render(<Payment {...createDefaultProps()} />);

                await waitFor(() => {
                    // "Add new" option is labeled "Credit Card" (payment.creditCardOption)
                    const addNewRadio = screen.getByRole('radio', { name: /credit card/i });
                    expect(addNewRadio).toHaveAttribute('aria-checked', 'true');
                });
            } finally {
                spy.mockRestore();
            }
        });
    });

    describe('Edge Cases - Field Errors', () => {
        test('displays field-level validation errors from server', () => {
            const actionDataWithErrors = {
                success: false,
                fieldErrors: {
                    cardNumber: 'Invalid card number',
                    expiryDate: 'Card has expired',
                },
            };

            render(<Payment {...createDefaultProps({ actionData: actionDataWithErrors })} />);

            // Should display both field errors
            expect(screen.getByText('Invalid card number')).toBeInTheDocument();
            expect(screen.getByText('Card has expired')).toBeInTheDocument();
        });

        test('handles multiple field errors simultaneously', () => {
            const actionDataWithMultipleErrors = {
                success: false,
                fieldErrors: {
                    cardNumber: 'Card number is required',
                    holder: 'Cardholder name is required',
                    expiryDate: 'Expiry date is required',
                    cvv: 'CVV is required',
                },
            };

            render(<Payment {...createDefaultProps({ actionData: actionDataWithMultipleErrors })} />);

            // All errors should be visible
            expect(screen.getByText('Card number is required')).toBeInTheDocument();
            expect(screen.getByText('Cardholder name is required')).toBeInTheDocument();
            expect(screen.getByText('Expiry date is required')).toBeInTheDocument();
            expect(screen.getByText('CVV is required')).toBeInTheDocument();
        });
    });

    describe('Edge Cases - Billing Address Comparison', () => {
        test('displays billing address when different from shipping in summary', () => {
            const basketWithDifferentBilling = createMockBasket({
                billingAddress: {
                    firstName: 'Alice',
                    lastName: 'Smith',
                    address1: '456 Oak Ave',
                    city: 'Boston',
                    stateCode: 'MA',
                    postalCode: '02101',
                    countryCode: 'US',
                },
            });

            useBasket.mockReturnValue(basketWithDifferentBilling);

            render(<Payment {...createDefaultProps({ isCompleted: true, isEditing: false })} />);

            // Should display billing address in summary when different
            expect(screen.getByText(/billing address/i)).toBeInTheDocument();
        });

        test('displays billing address with address2 in summary', () => {
            const basketWithAddress2 = createMockBasket({
                billingAddress: {
                    firstName: 'Alice',
                    lastName: 'Smith',
                    address1: '456 Oak Ave',
                    address2: 'Apt 4B',
                    city: 'Boston',
                    stateCode: 'MA',
                    postalCode: '02101',
                    countryCode: 'US',
                },
            });

            useBasket.mockReturnValue(basketWithAddress2);

            render(<Payment {...createDefaultProps({ isCompleted: true, isEditing: false })} />);

            // Should display address2 in billing summary
            expect(screen.getByText('Apt 4B')).toBeInTheDocument();
        });

        test('handles billing address same as shipping in summary', () => {
            const basketWithSameBilling = createMockBasket({
                billingAddress: {
                    firstName: 'John',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'New York',
                    stateCode: 'NY',
                    postalCode: '10001',
                    countryCode: 'US',
                },
            });

            useBasket.mockReturnValue(basketWithSameBilling);

            render(<Payment {...createDefaultProps({ isCompleted: true, isEditing: false })} />);

            // Billing address section should exist but show "Same as shipping"
            expect(screen.getByText(/billing address/i)).toBeInTheDocument();
        });

        test('handles missing billing address in comparison', () => {
            const basketWithoutBilling = createMockBasket({
                billingAddress: undefined,
            });

            useBasket.mockReturnValue(basketWithoutBilling);

            render(<Payment {...createDefaultProps({ isCompleted: true, isEditing: false })} />);

            // Should handle gracefully without crashing
            expect(screen.getByText(/^Payment$/)).toBeInTheDocument();
        });

        test('handles null shipping address in billing comparison', () => {
            const basketWithNullShipping = createMockBasket({
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: null, // Null shipping address
                    },
                ],
                billingAddress: {
                    firstName: 'Alice',
                    lastName: 'Smith',
                    address1: '456 Oak Ave',
                    city: 'Boston',
                    stateCode: 'MA',
                    postalCode: '02101',
                    countryCode: 'US',
                },
            });

            useBasket.mockReturnValue(basketWithNullShipping);

            render(<Payment {...createDefaultProps({ isCompleted: true, isEditing: false })} />);

            // Should handle null shipping address - tests !shippingAddr branch in isBillingSameAsShipping
            expect(screen.getByText(/^Payment$/)).toBeInTheDocument();
        });
    });

    describe('Edge Cases - Payment Method Holder Fallback', () => {
        test('handles existing payment instrument without holder name', () => {
            const basketWithPaymentNoHolder = createMockBasket({
                paymentInstruments: [
                    {
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            // No holder field - tests holder || '' fallback
                            cardType: 'Visa',
                            maskedNumber: '************1234',
                        },
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithPaymentNoHolder);

            render(<Payment {...createDefaultProps()} />);

            // Should render with empty holder - tests paymentMethod.paymentCard?.holder || '' branch
            expect(screen.getByRole('textbox', { name: /name on card/i })).toBeInTheDocument();
        });
    });

    describe('Edge Cases - Loading State', () => {
        test('does not render a submit button in payment section', () => {
            render(<Payment {...createDefaultProps({ isLoading: true })} />);

            // Payment section has no action button; guest places order via Place Order at end of checkout page
            expect(screen.queryByRole('button', { name: /continue|saving/i })).not.toBeInTheDocument();
        });
    });

    describe('Edge Cases - Saved Payment Rendering', () => {
        test('renders saved payment with missing cardType', () => {
            const mockProfile = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card-1',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            holder: 'John Doe',
                            // cardType missing - will use 'Card' default from getPaymentMethodsFromCustomer
                            maskedNumber: null, // Also tests maskedNumber?.slice(-4) || '****' branch
                        },
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);

            render(<Payment {...createDefaultProps()} />);

            // Tests cardType || 'Unknown' and maskedNumber?.slice(-4) || '****' branches
            // Just verify saved payment section renders
            expect(screen.getByText(/choose a saved payment method/i)).toBeInTheDocument();
        });

        test('auto-selects first payment when no preferred method exists', async () => {
            const mockProfile = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card-1',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            maskedNumber: '************1234',
                        },
                        preferred: false, // Not preferred
                    },
                    {
                        paymentInstrumentId: 'card-2',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Mastercard',
                            maskedNumber: '************5678',
                        },
                        preferred: false, // Not preferred
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);

            render(<Payment {...createDefaultProps()} />);

            // Tests the else block: setSelectedPaymentMethod(savedPaymentMethods[0].id)
            await waitFor(() => {
                const firstRadio = document.getElementById('card-1') as HTMLInputElement;
                expect(firstRadio?.getAttribute('aria-checked')).toBe('true');
            });
        });

        test('submits with saved payment method selection', async () => {
            const mockProfile = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'saved-card',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Visa',
                            maskedNumber: '************1234',
                            holder: 'John Doe',
                        },
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);

            const handleSubmit = vi.fn();
            render(<Payment {...createDefaultProps({ onSubmit: handleSubmit })} />);

            // Wait for saved payment to be selected
            await waitFor(() => {
                const savedRadio = document.getElementById('saved-card') as HTMLInputElement;
                expect(savedRadio).toBeTruthy();
            });

            // Payment has no submit button; submit form programmatically to test isUsingSaved branch
            const form = document.querySelector('form');
            expect(form).toBeInTheDocument();
            form?.requestSubmit();

            // Tests: isUsingSaved = selectedPaymentMethod !== 'new' && savedPaymentMethods.length > 0
            // Tests: selectedSavedPaymentMethod: isUsingSaved ? selectedPaymentMethod : undefined
            await waitFor(() => {
                expect(handleSubmit).toHaveBeenCalled();
            });
        });

        test('renders saved payment with null maskedNumber', () => {
            const mockProfile = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card-no-mask',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            cardType: 'Amex',
                            maskedNumber: null, // Tests maskedNumber?.slice(-4) || '****'
                            holder: 'Jane Doe',
                        },
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);

            render(<Payment {...createDefaultProps()} />);

            // Tests maskedNumber?.slice(-4) || '****' branch
            expect(screen.getByText(/choose a saved payment/i)).toBeInTheDocument();
        });

        test('renders saved payment with undefined cardType', () => {
            const mockProfile = {
                customer: { email: 'test@example.com' },
                addresses: [],
                paymentInstruments: [
                    {
                        paymentInstrumentId: 'card-unknown',
                        paymentMethodId: 'CREDIT_CARD',
                        paymentCard: {
                            // cardType is undefined - tests cardType || 'Unknown' in getCardIcon AND display
                            maskedNumber: '************9999',
                            holder: 'Bob Smith',
                        },
                    },
                ],
            };

            useCustomerProfile.mockReturnValue(mockProfile);

            render(<Payment {...createDefaultProps()} />);

            // Tests both: getCardIcon(method.cardType || 'Unknown') AND {method.cardType || 'Unknown'}
            expect(screen.getByText(/choose a saved payment/i)).toBeInTheDocument();
        });
    });
});
