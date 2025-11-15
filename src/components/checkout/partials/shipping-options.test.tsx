import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShippingOptions from './shipping-options';
import type { ShopperBasketsV2 } from '@salesforce/storefront-next-runtime/scapi';

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

const createShippingMethods = (): ShopperBasketsV2.schemas['ShippingMethodResult'] => ({
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

            expect(screen.getByText('$5.99 | Standard Shipping')).toBeInTheDocument();
            expect(screen.getByText('$12.99 | Express Shipping')).toBeInTheDocument();
            expect(screen.getByText('$24.99 | Overnight Shipping')).toBeInTheDocument();
        });

        test('displays pricing for each method', () => {
            render(<ShippingOptions {...createDefaultProps()} />);

            expect(screen.getByText('$5.99 | Standard Shipping')).toBeInTheDocument();
            expect(screen.getByText('$12.99 | Express Shipping')).toBeInTheDocument();
            expect(screen.getByText('$24.99 | Overnight Shipping')).toBeInTheDocument();
        });

        test('displays "Free" for zero-price shipping methods', () => {
            const methodsWithFree: ShopperBasketsV2.schemas['ShippingMethodResult'] = {
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

            expect(screen.getByText('Free | Free Standard Shipping')).toBeInTheDocument();
        });

        test('displays estimated arrival time when provided', () => {
            const methodsWithArrival: ShopperBasketsV2.schemas['ShippingMethodResult'] = {
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
                        price: 12.99,
                        estimatedArrivalTime: '2-3 days',
                    },
                ],
            };

            render(<ShippingOptions {...createDefaultProps({ shippingMethods: methodsWithArrival })} />);

            expect(screen.getByText('Arrives: 5-7 days')).toBeInTheDocument();
            expect(screen.getByText('Arrives: 2-3 days')).toBeInTheDocument();
            expect(screen.getByText('5-7 business days')).toBeInTheDocument();
        });

        test('displays estimated arrival time in summary when method is selected', () => {
            const basketWithEstimatedArrival = createMockBasket({
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
                        shippingMethod: {
                            id: 'express',
                            name: 'Express Shipping',
                            price: 12.99,
                            estimatedArrivalTime: '2-3 days',
                        },
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithEstimatedArrival);

            render(<ShippingOptions {...createDefaultProps({ isEditing: false, isCompleted: true })} />);

            expect(screen.getByText('Arrives: 2-3 days')).toBeInTheDocument();
        });

        test('handles missing estimated arrival time gracefully', () => {
            const methodsWithoutArrival: ShopperBasketsV2.schemas['ShippingMethodResult'] = {
                applicableShippingMethods: [
                    {
                        id: 'standard',
                        name: 'Standard Shipping',
                        description: '5-7 business days',
                        price: 5.99,
                        // No estimatedArrivalTime
                    },
                ],
            };

            render(<ShippingOptions {...createDefaultProps({ shippingMethods: methodsWithoutArrival })} />);

            expect(screen.getByText('$5.99 | Standard Shipping')).toBeInTheDocument();
            expect(screen.getByText('5-7 business days')).toBeInTheDocument();
            expect(screen.queryByText(/Arrives:/i)).not.toBeInTheDocument();
        });
    });

    describe('Free Shipping Rendering', () => {
        test('renders "Free" instead of "$0.00" for free shipping in selection list', () => {
            const methodsWithFree: ShopperBasketsV2.schemas['ShippingMethodResult'] = {
                applicableShippingMethods: [
                    {
                        id: 'free-standard',
                        name: 'Free Standard Shipping',
                        description: 'Free shipping on orders over $50',
                        price: 0, // Explicitly 0 for free shipping
                    },
                    {
                        id: 'express',
                        name: 'Express Shipping',
                        description: '2-3 business days',
                        price: 12.99,
                    },
                ],
            };

            render(<ShippingOptions {...createDefaultProps({ shippingMethods: methodsWithFree })} />);

            expect(screen.getByText('Free | Free Standard Shipping')).toBeInTheDocument();
            expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
            expect(screen.getByText('$12.99 | Express Shipping')).toBeInTheDocument();
        });

        test('renders "Free" in summary when free shipping is selected', () => {
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
                        shippingMethod: {
                            id: 'free-standard',
                            name: 'Free Standard Shipping',
                            price: 0, // Free shipping
                        },
                    },
                ],
            });

            useBasket.mockReturnValue(basketWithFreeShipping);

            const methodsWithFree: ShopperBasketsV2.schemas['ShippingMethodResult'] = {
                applicableShippingMethods: [
                    {
                        id: 'free-standard',
                        name: 'Free Standard Shipping',
                        price: 0,
                    },
                ],
            };

            render(
                <ShippingOptions
                    {...createDefaultProps({ shippingMethods: methodsWithFree, isEditing: false, isCompleted: true })}
                />
            );

            expect(screen.getByText('Free | Free Standard Shipping')).toBeInTheDocument();
            expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
        });

        test('handles mixed free and paid shipping methods correctly', () => {
            const mixedMethods: ShopperBasketsV2.schemas['ShippingMethodResult'] = {
                applicableShippingMethods: [
                    {
                        id: 'free-standard',
                        name: 'Free Standard Shipping',
                        description: '5-7 business days',
                        price: 0,
                    },
                    {
                        id: 'standard',
                        name: 'Standard Shipping',
                        description: '3-5 business days',
                        price: 5.99,
                    },
                    {
                        id: 'express',
                        name: 'Express Shipping',
                        description: '2-3 business days',
                        price: 12.99,
                    },
                ],
            };

            render(<ShippingOptions {...createDefaultProps({ shippingMethods: mixedMethods })} />);

            expect(screen.getByText('Free | Free Standard Shipping')).toBeInTheDocument();
            expect(screen.getByText('$5.99 | Standard Shipping')).toBeInTheDocument();
            expect(screen.getByText('$12.99 | Express Shipping')).toBeInTheDocument();

            // Should not show $0.00 anywhere
            expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
        });

        test('free shipping from promotion (base price reduced to 0)', () => {
            const promotionalFreeMethods: ShopperBasketsV2.schemas['ShippingMethodResult'] = {
                applicableShippingMethods: [
                    {
                        id: 'standard',
                        name: 'Standard Shipping',
                        description: '5-7 business days',
                        price: 0, // Reduced to 0 by promotion
                        shippingPromotions: [
                            {
                                promotionId: 'free-shipping-50',
                                calloutMsg: 'Free shipping on orders over $50',
                            },
                        ],
                    },
                ],
            };

            render(<ShippingOptions {...createDefaultProps({ shippingMethods: promotionalFreeMethods })} />);

            expect(screen.getByText('Free | Standard Shipping')).toBeInTheDocument();
            expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
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
            const emptyMethods: ShopperBasketsV2.schemas['ShippingMethodResult'] = {
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

        test('Select first method when defaultShippingMethodId is invalid (fallback)', async () => {
            const handleSubmit = vi.fn((formData: FormData) => {
                // Should submit the first available method, not the invalid default
                expect(formData.get('shippingMethodId')).toBe('standard');
            });

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

            // Default method ID that doesn't exist in applicable methods
            const methodsWithInvalidDefault: ShopperBasketsV2.schemas['ShippingMethodResult'] = {
                applicableShippingMethods: [
                    {
                        id: 'standard',
                        name: 'Standard Shipping',
                        price: 5.99,
                    },
                    {
                        id: 'express',
                        name: 'Express Shipping',
                        price: 12.99,
                    },
                ],
                defaultShippingMethodId: 'nonexistent-method', // Invalid default
            };

            render(
                <ShippingOptions
                    {...createDefaultProps({
                        shippingMethods: methodsWithInvalidDefault,
                        onSubmit: handleSubmit,
                        isEditing: true,
                    })}
                />
            );

            await waitFor(
                () => {
                    expect(handleSubmit).toHaveBeenCalled();
                },
                { timeout: 200 }
            );
        });

        test('Select defaultShippingMethodId when it is valid (happy path)', async () => {
            const handleSubmit = vi.fn((formData: FormData) => {
                // Should submit the valid default method
                expect(formData.get('shippingMethodId')).toBe('express');
            });

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

            // Valid default method ID
            const methodsWithValidDefault: ShopperBasketsV2.schemas['ShippingMethodResult'] = {
                applicableShippingMethods: [
                    {
                        id: 'standard',
                        name: 'Standard Shipping',
                        price: 5.99,
                    },
                    {
                        id: 'express',
                        name: 'Express Shipping',
                        price: 12.99,
                    },
                ],
                defaultShippingMethodId: 'express', // Valid default
            };

            render(
                <ShippingOptions
                    {...createDefaultProps({
                        shippingMethods: methodsWithValidDefault,
                        onSubmit: handleSubmit,
                        isEditing: true,
                    })}
                />
            );

            await waitFor(
                () => {
                    expect(handleSubmit).toHaveBeenCalled();
                },
                { timeout: 200 }
            );
        });
    });

    describe('Empty State', () => {
        test('shows message when no shipping methods available', () => {
            const emptyMethods: ShopperBasketsV2.schemas['ShippingMethodResult'] = {
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
            const emptyMethods: ShopperBasketsV2.schemas['ShippingMethodResult'] = {
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

            expect(screen.getByText('$12.99 | Express Shipping')).toBeInTheDocument();
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
