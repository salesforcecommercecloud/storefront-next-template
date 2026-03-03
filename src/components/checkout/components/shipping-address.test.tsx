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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShippingAddress from './shipping-address';

// Use real react-hook-form for integration tests
vi.mock('@/providers/basket', () => ({ useBasket: vi.fn() }));
vi.mock('@/hooks/checkout/use-customer-profile', () => ({
    useCustomerProfile: vi.fn(() => null),
}));

const createMockBasket = (overrides = {}) => ({
    basketId: 'test-basket-123',
    currency: 'USD',
    customerInfo: { email: 'test@example.com', phone: '5551234567' },
    shipments: [
        {
            shipmentId: 'shipment-1',
            shippingAddress: null,
        },
    ],
    ...overrides,
});

const createDefaultProps = (overrides = {}) => ({
    onSubmit: vi.fn(),
    isLoading: false,
    actionData: undefined,
    isCompleted: false,
    isEditing: true,
    onEdit: vi.fn(),
    enableMultiAddress: false,
    handleToggleShippingAddressMode: vi.fn(),
    ...overrides,
});

describe('ShippingAddress Integration Tests', () => {
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
        test('renders shipping address form in editing mode', () => {
            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps()}
                />
            );

            expect(screen.getByText('Shipping Address')).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
        });

        test('displays summary when not editing', () => {
            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps({ isEditing: false, isCompleted: true })}
                />
            );

            expect(screen.queryByPlaceholderText(/first name/i)).not.toBeInTheDocument();
        });
    });

    describe('Form Fields', () => {
        test('renders all required address fields', () => {
            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps()}
                />
            );

            expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/street address/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/city/i)).toBeInTheDocument();
            // State is a dropdown (combobox) when country is US
            expect(screen.getByRole('combobox', { name: /state/i })).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/postal code/i)).toBeInTheDocument();
        });

        test('allows entering address data', async () => {
            const user = userEvent.setup();
            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps()}
                />
            );

            const firstNameInput = screen.getByPlaceholderText(/first name/i);
            await user.type(firstNameInput, 'John');

            expect(firstNameInput).toHaveValue('John');
        });
    });

    describe('Auto-population', () => {
        test('auto-populates phone from contact info', () => {
            useBasket.mockReturnValue(
                createMockBasket({
                    customerInfo: { email: 'test@example.com', phone: '5551234567' },
                })
            );

            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps()}
                />
            );

            const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
            expect(phoneInput).toHaveValue('5551234567');
        });

        test('falls back to customer profile phone when basket has none', () => {
            useBasket.mockReturnValue(
                createMockBasket({
                    customerInfo: { email: 'test@example.com', phone: '' },
                    shipments: [
                        {
                            shipmentId: 'shipment-1',
                            shippingAddress: {
                                firstName: 'Jane',
                                lastName: 'Doe',
                                address1: '123 Main St',
                                city: 'New York',
                                stateCode: 'NY',
                                postalCode: '10001',
                                phone: '',
                            },
                        },
                    ],
                })
            );

            useCustomerProfile.mockReturnValue({
                customer: { email: 'test@example.com' },
                addresses: [
                    {
                        addressId: 'addr-1',
                        firstName: 'Jane',
                        lastName: 'Doe',
                        address1: '123 Main St',
                        city: 'New York',
                        stateCode: 'NY',
                        postalCode: '10001',
                        phone: '9998887777',
                    },
                ],
                preferredShippingAddress: {
                    addressId: 'addr-1',
                    firstName: 'Jane',
                    lastName: 'Doe',
                    address1: '123 Main St',
                    city: 'New York',
                    stateCode: 'NY',
                    postalCode: '10001',
                    phone: '9998887777',
                },
            });

            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps()}
                />
            );

            // With saved addresses we show SavedAddressesList (no form), so assert list is shown
            expect(screen.getByRole('radiogroup', { name: /select a saved address/i })).toBeInTheDocument();
            expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        });

        test('pre-fills address from saved basket shipping address', () => {
            useBasket.mockReturnValue(
                createMockBasket({
                    shipments: [
                        {
                            shipmentId: 'shipment-1',
                            shippingAddress: {
                                firstName: 'Jane',
                                lastName: 'Doe',
                                address1: '123 Main St',
                                city: 'New York',
                                stateCode: 'NY',
                                postalCode: '10001',
                            },
                        },
                    ],
                })
            );

            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps()}
                />
            );

            expect(screen.getByPlaceholderText(/first name/i)).toHaveValue('Jane');
            expect(screen.getByPlaceholderText(/last name/i)).toHaveValue('Doe');
            expect(screen.getByPlaceholderText(/street address/i)).toHaveValue('123 Main St');
        });

        test('renders form for customer with profile', () => {
            useCustomerProfile.mockReturnValue({
                customerId: 'customer-123',
                firstName: 'Alice',
                lastName: 'Smith',
                email: 'alice@example.com',
            });

            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps()}
                />
            );

            // Component renders successfully with customer profile
            expect(screen.getByPlaceholderText(/first name/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/last name/i)).toBeInTheDocument();
        });
    });

    describe('Summary Display', () => {
        test('shows address summary when completed', () => {
            useBasket.mockReturnValue(
                createMockBasket({
                    shipments: [
                        {
                            shipmentId: 'shipment-1',
                            shippingAddress: {
                                firstName: 'John',
                                lastName: 'Doe',
                                address1: '123 Main St',
                                city: 'Boston',
                                stateCode: 'MA',
                                postalCode: '02101',
                            },
                        },
                    ],
                })
            );

            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps({ isEditing: false, isCompleted: true })}
                />
            );

            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText(/123 Main St/)).toBeInTheDocument();
            expect(screen.getByText(/Boston/)).toBeInTheDocument();
        });

        test('shows empty summary when no address', () => {
            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps({ isEditing: false })}
                />
            );

            // ShippingAddressDisplay renders nothing when address is empty
            expect(screen.queryByText(/not provided yet/i)).not.toBeInTheDocument();
        });
    });

    describe('Form Interaction', () => {
        test('renders submit button', () => {
            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps()}
                />
            );

            expect(screen.getByRole('button', { name: /continue to shipping options/i })).toBeInTheDocument();
        });

        test('shows loading state when submitting', () => {
            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps({ isLoading: true })}
                />
            );

            const submitButton = screen.getByRole('button', { name: /submitting/i });
            expect(submitButton).toBeDisabled();
        });

        test('calls onEdit when edit button clicked', async () => {
            const user = userEvent.setup();
            const handleEdit = vi.fn();

            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps({ isEditing: false, onEdit: handleEdit })}
                />
            );

            const editButton = screen.getByRole('button', { name: /edit/i });
            await user.click(editButton);

            expect(handleEdit).toHaveBeenCalled();
        });
    });

    describe('Error Display', () => {
        test('displays field errors from action data', () => {
            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps({
                        actionData: {
                            success: false,
                            fieldErrors: {
                                firstName: 'First name is required',
                                postalCode: 'Invalid postal code',
                            },
                        },
                    })}
                />
            );

            expect(screen.getByText('First name is required')).toBeInTheDocument();
            expect(screen.getByText('Invalid postal code')).toBeInTheDocument();
        });
    });

    describe('Edge Cases - Phone Fallback Chain', () => {
        test('uses contactInfoPhone fallback when no shipping address phone', () => {
            // Mock state with contactInfo phone but no shipping address phone
            const defaultProps = createDefaultProps();
            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...defaultProps}
                />
            );

            expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
        });

        test('falls back through entire phone chain when all preceding values are falsy', () => {
            // Set up basket with no shipping address phone
            const basketWithNoPhone = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'New York',
                            stateCode: 'NY',
                            postalCode: '10001',
                            phone: '', // Empty phone - will fall back
                        },
                    },
                ],
            };
            useBasket.mockReturnValue(basketWithNoPhone);

            // Mock customer profile with no phone
            useCustomerProfile.mockReturnValue(null);

            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps()}
                />
            );

            expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
        });
    });

    describe('Edge Cases - Summary Display', () => {
        test('displays address2 in summary when present', () => {
            const basketWithAddress2 = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            address2: 'Apt 5B',
                            city: 'New York',
                            stateCode: 'NY',
                            postalCode: '10001',
                            phone: '5551234567',
                        },
                    },
                ],
            };
            useBasket.mockReturnValue(basketWithAddress2);

            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps({ isEditing: false, isCompleted: true })}
                />
            );

            expect(screen.getByText(/apt 5b/i)).toBeInTheDocument();
        });

        test('does not display phone in summary', () => {
            const basketWithPhone = {
                basketId: 'test-basket',
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'New York',
                            stateCode: 'NY',
                            postalCode: '10001',
                            phone: '5551234567',
                        },
                    },
                ],
            };
            useBasket.mockReturnValue(basketWithPhone);

            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps({ isEditing: false, isCompleted: true })}
                />
            );

            expect(screen.queryByText(/555/)).not.toBeInTheDocument();
        });

        test('summary does not show contact info phone when shipping address phone missing', () => {
            const basketWithoutPhone = {
                basketId: 'test-basket',
                customerInfo: { email: 'test@example.com', phone: '3332221111' },
                shipments: [
                    {
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                            address1: '123 Main St',
                            city: 'New York',
                            stateCode: 'NY',
                            postalCode: '10001',
                            phone: '',
                        },
                    },
                ],
            };
            useBasket.mockReturnValue(basketWithoutPhone);

            render(
                <ShippingAddress
                    enableMultiAddress={false}
                    handleToggleShippingAddressMode={function (): void {
                        throw new Error('Function not implemented.');
                    }}
                    {...createDefaultProps({ isEditing: false, isCompleted: true })}
                />
            );

            expect(screen.queryByText(/3332221111/)).not.toBeInTheDocument();
        });
    });
});
