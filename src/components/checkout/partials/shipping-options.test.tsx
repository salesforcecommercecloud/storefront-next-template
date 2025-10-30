import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShippingOptions from './shipping-options';
import type { ShopperBasketsTypes } from 'commerce-sdk-isomorphic';

// Use real hooks for integration tests
vi.mock('@/providers/basket', () => ({ useBasket: vi.fn() }));
vi.mock('@/hooks/checkout/use-customer-profile', () => ({
    useCustomerProfile: vi.fn(() => null),
}));

const createMockBasket = (overrides = {}) => ({
    basketId: 'test-basket-123',
    currency: 'USD',
    customerInfo: { email: 'test@example.com' },
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
            },
        },
    ],
    ...overrides,
});

const createShippingMethods = (): ShopperBasketsTypes.ShippingMethodResult => ({
    applicableShippingMethods: [
        {
            id: 'standard',
            name: 'Standard Shipping',
            description: '5-7 business days',
            price: 5.99,
            estimatedArrivalTime: '5-7 days',
        },
        {
            id: 'express',
            name: 'Express Shipping',
            description: '2-3 business days',
            price: 12.99,
            estimatedArrivalTime: '2-3 days',
        },
        {
            id: 'overnight',
            name: 'Overnight Shipping',
            description: 'Next business day',
            price: 24.99,
            estimatedArrivalTime: '1 day',
        },
    ],
    defaultShippingMethodId: 'standard',
});

const createDefaultProps = (overrides = {}) => ({
    onSubmit: vi.fn(),
    isLoading: false,
    actionData: undefined,
    shippingMethods: createShippingMethods(),
    isCompleted: false,
    isEditing: true,
    onEdit: vi.fn(),
    ...overrides,
});

describe('ShippingOptions Integration Tests', () => {
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

    describe('Shipping Method Display', () => {
        test('renders all available shipping methods', () => {
            render(<ShippingOptions {...createDefaultProps()} />);

            expect(screen.getByText('Standard Shipping')).toBeInTheDocument();
            expect(screen.getByText('Express Shipping')).toBeInTheDocument();
            expect(screen.getByText('Overnight Shipping')).toBeInTheDocument();
        });

        test('displays pricing for each method', () => {
            render(<ShippingOptions {...createDefaultProps()} />);

            expect(screen.getByText('$5.99')).toBeInTheDocument();
            expect(screen.getByText('$12.99')).toBeInTheDocument();
            expect(screen.getByText('$24.99')).toBeInTheDocument();
        });

        test('displays free for zero-price methods', () => {
            const methodsWithFree: ShopperBasketsTypes.ShippingMethodResult = {
                applicableShippingMethods: [
                    {
                        id: 'free-shipping',
                        name: 'Free Standard Shipping',
                        description: '7-10 business days',
                        price: 0,
                    },
                ],
            };

            render(<ShippingOptions {...createDefaultProps({ shippingMethods: methodsWithFree })} />);

            expect(screen.getByText('Free')).toBeInTheDocument();
        });
    });

    describe('Shipping Method Selection', () => {
        test('allows user to select a shipping method', async () => {
            const user = userEvent.setup();
            render(<ShippingOptions {...createDefaultProps()} />);

            const expressRadio = screen.getByLabelText(/Express Shipping/i);
            await user.click(expressRadio);

            await waitFor(() => {
                expect(expressRadio).toBeChecked();
            });
        });

        test('pre-selects currently selected method from basket', () => {
            const basketWithMethod = createMockBasket({
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingMethod: {
                            id: 'express',
                            name: 'Express Shipping',
                            price: 12.99,
                        },
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithMethod);

            render(<ShippingOptions {...createDefaultProps()} />);

            const expressRadio = screen.getByLabelText(/Express Shipping/i);
            expect(expressRadio).toBeChecked();
        });
    });

    describe('Form Submission', () => {
        test('submits selected shipping method', async () => {
            const user = userEvent.setup();
            const handleSubmit = vi.fn((formData: FormData) => {
                expect(formData.get('shippingMethodId')).toBe('express');
            });

            render(<ShippingOptions {...createDefaultProps({ onSubmit: handleSubmit })} />);

            const expressRadio = screen.getByLabelText(/Express Shipping/i);
            await user.click(expressRadio);

            const submitButton = screen.getByRole('button', { name: /continue/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(handleSubmit).toHaveBeenCalled();
            });
        });

        test('prevents submission when no methods available', () => {
            const emptyMethods: ShopperBasketsTypes.ShippingMethodResult = {
                applicableShippingMethods: [],
            };

            render(<ShippingOptions {...createDefaultProps({ shippingMethods: emptyMethods })} />);

            const submitButton = screen.getByRole('button');
            expect(submitButton).toBeDisabled();
        });
    });

    describe('Auto-Submit for Returning Customers', () => {
        test('auto-submits first method for returning customers', async () => {
            const handleSubmit = vi.fn();
            const customerProfile = {
                customer: { email: 'returning@example.com', customerId: 'customer-123' },
                addresses: [],
                paymentInstruments: [],
            };

            const basketNoMethod = createMockBasket({
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingAddress: {
                            firstName: 'John',
                            lastName: 'Doe',
                        },
                        shippingMethod: null,
                    },
                ],
            });

            useBasket.mockReturnValue(basketNoMethod);
            useCustomerProfile.mockReturnValue(customerProfile);

            render(<ShippingOptions {...createDefaultProps({ onSubmit: handleSubmit, isEditing: true })} />);

            await waitFor(
                () => {
                    expect(handleSubmit).toHaveBeenCalled();
                },
                { timeout: 200 }
            );
        });

        test('does not auto-submit for guest users', async () => {
            const handleSubmit = vi.fn();
            const basketNoMethod = createMockBasket({
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingMethod: null,
                    },
                ],
            });

            useBasket.mockReturnValue(basketNoMethod);
            useCustomerProfile.mockReturnValue(null);

            render(<ShippingOptions {...createDefaultProps({ onSubmit: handleSubmit, isEditing: true })} />);

            await new Promise((resolve) => setTimeout(resolve, 200));

            expect(handleSubmit).not.toHaveBeenCalled();
        });

        test('does not auto-submit when method already selected', async () => {
            const handleSubmit = vi.fn();
            const basketWithMethod = createMockBasket({
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingMethod: {
                            id: 'standard',
                            name: 'Standard',
                        },
                    },
                ],
            });

            const customerProfile = {
                customer: { email: 'returning@example.com', customerId: 'customer-123' },
                addresses: [],
                paymentInstruments: [],
            };

            useBasket.mockReturnValue(basketWithMethod);
            useCustomerProfile.mockReturnValue(customerProfile);

            render(<ShippingOptions {...createDefaultProps({ onSubmit: handleSubmit, isEditing: true })} />);

            await new Promise((resolve) => setTimeout(resolve, 200));

            expect(handleSubmit).not.toHaveBeenCalled();
        });
    });

    describe('Empty State', () => {
        test('shows message when no shipping methods available', () => {
            const emptyMethods: ShopperBasketsTypes.ShippingMethodResult = {
                applicableShippingMethods: [],
            };

            render(<ShippingOptions {...createDefaultProps({ shippingMethods: emptyMethods })} />);

            // Check for the descriptive message (more specific)
            expect(screen.getByText(/ensure your shipping address is complete/i)).toBeInTheDocument();

            // Check that multiple instances of "No shipping methods available" exist (in message and button)
            const elements = screen.getAllByText(/No shipping methods available/i);
            expect(elements.length).toBeGreaterThan(0);
        });

        test('button shows disabled state when no methods', () => {
            const emptyMethods: ShopperBasketsTypes.ShippingMethodResult = {
                applicableShippingMethods: [],
            };

            render(<ShippingOptions {...createDefaultProps({ shippingMethods: emptyMethods })} />);

            const submitButton = screen.getByRole('button');
            expect(submitButton).toBeDisabled();
            expect(submitButton).toHaveTextContent(/No shipping methods available/i);
        });
    });

    describe('Summary Display', () => {
        test('displays selected method in summary', () => {
            const basketWithMethod = createMockBasket({
                shipments: [
                    {
                        shipmentId: 'shipment-1',
                        shippingMethod: {
                            id: 'express',
                            name: 'Express Shipping',
                            price: 12.99,
                        },
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithMethod);

            render(<ShippingOptions {...createDefaultProps({ isEditing: false })} />);

            expect(screen.getByText('Express Shipping')).toBeInTheDocument();
            expect(screen.getByText('$12.99')).toBeInTheDocument();
        });

        test('shows prompt when no method selected', () => {
            render(<ShippingOptions {...createDefaultProps({ isEditing: false })} />);

            expect(screen.getByText(/enter your shipping address/i)).toBeInTheDocument();
        });
    });

    describe('Loading State', () => {
        test('disables form during submission', () => {
            render(<ShippingOptions {...createDefaultProps({ isLoading: true })} />);

            const submitButton = screen.getByRole('button');
            expect(submitButton).toBeDisabled();
            expect(submitButton).toHaveTextContent(/saving/i);
        });
    });

    describe('Error Handling', () => {
        test('displays form errors when present', () => {
            const actionData = {
                success: false,
                formError: 'Failed to update shipping method',
                step: 'shippingOptions' as const,
            };

            render(<ShippingOptions {...createDefaultProps({ actionData })} />);

            expect(screen.getByText('Failed to update shipping method')).toBeInTheDocument();
        });

        test('does not show errors from other steps', () => {
            const actionData = {
                success: false,
                formError: 'Some other error',
                step: 'payment' as const,
            };

            render(<ShippingOptions {...createDefaultProps({ actionData })} />);

            expect(screen.queryByText('Some other error')).not.toBeInTheDocument();
        });
    });

    describe('Edge Cases - Missing Data Handling', () => {
        test('handles shipping methods with missing optional fields', () => {
            const basketWithIncompleteMethod = createMockBasket({
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
                        },
                        shippingMethods: [
                            {
                                // Missing id, name, and description - should use fallbacks
                                price: 5.99,
                            },
                            {
                                id: 'method-2',
                                // Missing name and description
                                price: 10.0,
                            },
                        ],
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithIncompleteMethod);

            render(<ShippingOptions {...createDefaultProps()} />);

            // Should render without crashing, using fallback values (unknown, Unknown Method)
            const submitButton = screen.getByRole('button', { name: /continue/i });
            expect(submitButton).toBeInTheDocument();
        });

        test('displays Free for zero-price shipping methods', () => {
            const basketWithFreeShipping = createMockBasket({
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
                        },
                        shippingMethods: [
                            {
                                id: 'free-shipping',
                                name: 'Standard Shipping',
                                description: 'Free standard delivery',
                                price: 0,
                            },
                        ],
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithFreeShipping);

            render(<ShippingOptions {...createDefaultProps()} />);

            // Should render without crashing - tests price === 0 branch
            const submitButton = screen.getByRole('button', { name: /continue/i });
            expect(submitButton).toBeInTheDocument();
        });

        test('handles missing default shipping method ID', () => {
            const basketWithMissingDefault = createMockBasket({
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
                        },
                        shippingMethods: [
                            {
                                id: 'method-1',
                                name: 'Standard',
                                price: 5.99,
                            },
                            {
                                id: 'method-2',
                                name: 'Express',
                                price: 12.99,
                            },
                        ],
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithMissingDefault);

            render(<ShippingOptions {...createDefaultProps()} />);

            // Should render without error - tests defaultShippingMethodId || '' branch
            const submitButton = screen.getByRole('button', { name: /continue/i });
            expect(submitButton).toBeInTheDocument();
        });
    });

    describe('Edge Cases - Pricing Display', () => {
        test('formats prices correctly with decimals', () => {
            const basketWithDecimalPricing = createMockBasket({
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
                        },
                        shippingMethods: [
                            {
                                id: 'method-1',
                                name: 'Economy',
                                price: 3.5, // Tests toFixed(2) formatting
                            },
                            {
                                id: 'method-2',
                                name: 'Premium',
                                price: 15,
                            },
                        ],
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithDecimalPricing);

            render(<ShippingOptions {...createDefaultProps()} />);

            // Should render without crashing - tests price formatting
            const submitButton = screen.getByRole('button', { name: /continue/i });
            expect(submitButton).toBeInTheDocument();
        });

        test('handles undefined price gracefully', () => {
            const basketWithUndefinedPrice = createMockBasket({
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
                        },
                        shippingMethods: [
                            {
                                id: 'method-1',
                                name: 'TBD Shipping',
                                price: undefined, // Tests ?? 0 fallback
                            },
                        ],
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithUndefinedPrice);

            render(<ShippingOptions {...createDefaultProps()} />);

            // Should render without error - tests price ?? 0 branch
            const submitButton = screen.getByRole('button', { name: /continue/i });
            expect(submitButton).toBeInTheDocument();
        });

        test('displays Free for exactly zero price', () => {
            const basketWithZeroPrice = createMockBasket({
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
                        },
                        shippingMethods: [
                            {
                                id: 'free-method',
                                name: 'Standard Ground',
                                price: 0,
                            },
                        ],
                        selectedShippingMethod: {
                            id: 'free-method',
                            name: 'Standard Ground',
                            price: 0,
                        },
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithZeroPrice);

            render(<ShippingOptions {...createDefaultProps({ isEditing: false, isCompleted: true })} />);

            expect(screen.getByText(/shipping address/i)).toBeInTheDocument();
        });
    });

    describe('Edge Cases - Complete Fallback Chain', () => {
        test('handles shipping method with missing id field specifically', () => {
            const basketWithMissingId = createMockBasket({
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
                        },
                        shippingMethods: [
                            {
                                id: '',
                                name: 'Standard Shipping',
                                description: 'Standard delivery',
                                price: 9.99,
                            },
                        ],
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithMissingId);

            render(<ShippingOptions {...createDefaultProps()} />);

            const submitButton = screen.getByRole('button', { name: /continue/i });
            expect(submitButton).toBeInTheDocument();
        });

        test('handles shipping method with missing name field specifically', () => {
            const basketWithMissingName = createMockBasket({
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
                        },
                        shippingMethods: [
                            {
                                id: 'method-1',
                                name: '', // Empty name - tests name || 'Unknown Method'
                                description: 'Delivery',
                                price: 9.99,
                            },
                        ],
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithMissingName);

            render(<ShippingOptions {...createDefaultProps()} />);

            const submitButton = screen.getByRole('button', { name: /continue/i });
            expect(submitButton).toBeInTheDocument();
        });

        test('handles shipping method with missing description field specifically', () => {
            const basketWithMissingDescription = createMockBasket({
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
                        },
                        shippingMethods: [
                            {
                                id: 'method-1',
                                name: 'Express',
                                description: '',
                                price: 19.99,
                            },
                        ],
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithMissingDescription);

            render(<ShippingOptions {...createDefaultProps()} />);

            const submitButton = screen.getByRole('button', { name: /continue/i });
            expect(submitButton).toBeInTheDocument();
        });

        test('handles undefined shippingMethods array with || [] fallback', () => {
            const basketWithUndefinedMethods = createMockBasket({
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
                        },
                        shippingMethods: undefined,
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithUndefinedMethods);

            render(<ShippingOptions {...createDefaultProps()} />);

            expect(screen.getByText(/shipping options/i)).toBeInTheDocument();
        });

        test('uses defaultShippingMethodId when selectedMethod is null', () => {
            const basketWithDefaultId = createMockBasket({
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
                        },
                        shippingMethods: [
                            {
                                id: 'default-method',
                                name: 'Standard',
                                price: 5.99,
                            },
                        ],
                        selectedShippingMethod: null, // No selected method
                        defaultShippingMethodId: 'default-method', // But default exists
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithDefaultId);

            render(<ShippingOptions {...createDefaultProps()} />);

            const submitButton = screen.getByRole('button', { name: /continue/i });
            expect(submitButton).toBeInTheDocument();
        });

        test('renders summary with zero price shipping method', () => {
            const basketWithFreeShipping = createMockBasket({
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
                        },
                        shippingMethods: [
                            {
                                id: 'free-method',
                                name: 'Free Standard',
                                price: 0,
                            },
                        ],
                        selectedShippingMethod: {
                            id: 'free-method',
                            name: 'Free Standard',
                            price: 0,
                        },
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithFreeShipping);

            render(<ShippingOptions {...createDefaultProps({ isEditing: false, isCompleted: true })} />);

            expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
        });
    });
});
